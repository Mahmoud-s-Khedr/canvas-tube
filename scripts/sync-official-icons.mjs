import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const rootDir = path.resolve(path.dirname(__filename), '..')
const targetDir = path.join(rootDir, 'assets/icons')
const catalogPath = path.join(targetDir, 'catalog.json')

// Pinned release URLs: update these deliberately after reviewing an upstream
// release, then commit the resulting SVGs and generated catalog.
const SOURCES = {
  aws: {
    version: '2026-07-31',
    url: 'https://d1.awsstatic.com/onedam/marketing-channels/website/public/shared/architecture-icon-release/Icon-package_07312026.5846e92413caa21490223536cc97f1269e44fa92.zip',
    attribution: 'AWS Architecture Icons'
  },
  azure: {
    version: 'V24',
    url: 'https://arch-center.azureedge.net/icons/Azure_Public_Service_Icons_V24.zip',
    attribution: 'Microsoft Azure Architecture Icons'
  },
  gcp: {
    version: '2025-product-icons',
    urls: [
      'https://services.google.com/fh/files/misc/category-icons.zip',
      'https://services.google.com/fh/files/misc/core-products-icons.zip',
      'https://services.google.com/fh/files/misc/google-cloud-legacy-icons.zip'
    ],
    attribution: 'Google Cloud Product Icons'
  },
  kubernetes: {
    version: 'community-main',
    url: 'https://github.com/kubernetes/community.git',
    attribution: 'Kubernetes Community Icons'
  }
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'canvastube-icons-'))
const catalog = []
const usedDestinations = new Set()

// The official Kubernetes files use familiar shorthand (for example `ing`
// and `svc`). Preserve the authoritative artwork while exposing searchable
// resource names in CanvasTube.
const KUBERNETES_DISPLAY_NAMES = {
  api: 'API Server',
  'c-c-m': 'Cloud Controller Manager',
  'c-m': 'Controller Manager',
  'k-proxy': 'Kube Proxy',
  sched: 'Scheduler',
  'c-role': 'Cluster Role',
  cm: 'Config Map',
  crb: 'Cluster Role Binding',
  crd: 'Custom Resource Definition',
  deploy: 'Deployment',
  ds: 'Daemon Set',
  ep: 'Endpoint',
  hpa: 'Horizontal Pod Autoscaler',
  ing: 'Ingress',
  limits: 'Limit Range',
  netpol: 'Network Policy',
  ns: 'Namespace',
  psp: 'Pod Security Policy',
  pv: 'Persistent Volume',
  pvc: 'Persistent Volume Claim',
  quota: 'Resource Quota',
  rb: 'Role Binding',
  rs: 'Replica Set',
  sa: 'Service Account',
  sc: 'Storage Class',
  sts: 'Stateful Set',
  svc: 'Service',
  vol: 'Volume'
}

// These folders follow Google Cloud's public product taxonomy, rather than
// archive provenance or a one-service-per-directory layout. The order is
// deliberate: a security service with "network" in its name, for example,
// belongs in Security_and_identity rather than Networking.
const GCP_CATEGORY_RULES = [
  ['Security_and_identity', /(?:access|assured|audit|authorization|beyondcorp|certificate|cloud-(?:armor|ekm|hsm|ids)|data-loss|ekm|identity|key-|managed-service-for-microsoft-active-directory|mandiant|phishing|policy|risk|sec-ops|secret|security|threat|workload-identity)/],
  ['Migration', /(?:database-migration|migrate|migration|transfer(?:-|$))/],
  ['Maps_and_geospatial', /(?:maps|geospatial|real-world-insights)/],
  ['Media_services', /(?:media|video-intelligence|mixed-reality)/],
  ['Industry_specific', /(?:financial|for-marketing|game-servers|genomics|healthcare|retail)/],
  ['AI_and_Machine_Learning', /(?:^ai|agent|automl|cloud-(?:gpu|inference|natural-language|optimization|tpu|translation|vision)|contact-center-ai|data-labeling|dialogflow|document-ai|recommendations-ai|speech-to-text|tensorflow|text-to-speech|vertex|visual-inspection)/],
  ['Databases', /(?:alloy|bigtable|cloud-sql|databases?$|datastore|firestore|memorystore|spanner)/],
  ['Data_analytics', /(?:analytics|big-?query|business-intelligence|cloud-composer|data(?:-|$)|dataflow|datalab|dataplex|datapol|dataprep|dataproc|datashare|datastream|looker|stream-suite)/],
  ['Storage', /(?:cloud-storage|filestore|hyperdisk|local-ssd|persistent-disk|^storage$)/],
  ['Containers', /(?:container|gke|google-kubernetes-engine|kuberun)/],
  ['Hybrid_and_multicloud', /(?:anthos|distributed-cloud|fleet|hybrid|vmware)/],
  ['Serverless', /(?:app-engine|cloud-functions|cloud-run|eventarc|serverless|cloud-scheduler|cloud-tasks|workflows)/],
  ['Integration_services', /(?:api(?:-|$)|apigee|cloud-apis|cloud-endpoints|connectors|integration-services|pubsub)/],
  ['Developer_tools', /(?:artifact-registry|cloud-build|cloud-code|cloud-deploy|cloud-shell|cloud-test-lab|debugger|dev-ops|developer|os-configuration|tools-for-powershell)/],
  ['Operations', /(?:cloud-(?:logging|monitoring|ops)|error-reporting|observability|performance-dashboard|profiler|stackdriver|trace)/],
  ['Networking', /(?:cdn|cloud-dns|cloud-domains|cloud-external-ip|cloud-firewall|cloud-interconnect|cloud-load-balancing|cloud-nat|cloud-network|cloud-router|cloud-routes|cloud-vpn|connectivity|interconnect|load-balancing|network|private-connectivity|private-service-connect|service-discovery|traffic-director|virtual-private-cloud)/],
  ['Compute', /(?:bare-metal|batch|cloud-jobs|compute|container-optimized-os|gce-|os-inventory|os-patch|quantum|^router$)/],
  ['Management_tools', /(?:administration|asset-inventory|billing|catalog|cloud-marketplace|early-access|free-trial|launcher|management|marketplace|my-cloud|onboarding|operations|permissions|project|quotas|release-notes|runtime-config|support|user-preferences)/],
  ['Productivity_and_collaboration', /(?:collaboration|home|partner|portal)/],
  ['IoT', /^iot-/],
  ['Web3', /^web3$/],
  ['Web_and_mobile', /(?:web-mobile|web-risk|web-security-scanner)/]
]

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' })
}

function removeAndCreate(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
}

function download(url, filename) {
  const destination = path.join(tempDir, filename)
  run('curl', ['--fail', '--location', '--retry', '3', '--silent', '--show-error', url, '--output', destination])
  return destination
}

function extract(archive, name) {
  const destination = path.join(tempDir, name)
  fs.mkdirSync(destination, { recursive: true })
  run('unzip', ['-qq', archive, '-d', destination])
  return destination
}

function walk(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__MACOSX' || entry.name === '.DS_Store') continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(fullPath))
    else files.push(fullPath)
  }
  return files
}

function slug(value) {
  return value
    .replace(/&/g, ' and ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function title(value) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function cleanSvg(raw) {
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/<\?xml[^>]*\?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!DOCTYPE[^>]*(?:\[[\s\S]*?\]\s*)?>/gi, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
    .replace(/<sodipodi:namedview[\s\S]*?(?:\/>|<\/sodipodi:namedview>)/gi, '')
    .replace(/\s(?:inkscape|sodipodi):[a-z0-9_-]+=(['"]).*?\1/gi, '')
    .replace(/\sxmlns:(?:sodipodi|inkscape|dc|cc|rdf|svg)=(['"]).*?\1/gi, '')
    .trim()
}

function uniqueDestination(provider, category, name, flat = false) {
  const base = slug(name) || 'icon'
  let candidate = base
  let suffix = 2
  const keyFor = (value) => flat ? `${provider}/${value}` : `${provider}/${category}/${value}`

  // Flat provider folders are easier to inspect. If two upstream packages
  // use the same filename, retain both with a readable category prefix.
  if (flat && usedDestinations.has(keyFor(candidate))) {
    candidate = `${slug(category) || 'general'}--${base}`
  }
  const collisionBase = candidate
  while (usedDestinations.has(keyFor(candidate))) candidate = `${collisionBase}-${suffix++}`
  usedDestinations.add(keyFor(candidate))
  return candidate
}

function copyIcon({ provider, category, name, source, tags = [], flat = false }) {
  const iconName = uniqueDestination(provider, category, name, flat)
  const providerDir = flat
    ? path.join(targetDir, provider)
    : path.join(targetDir, provider, category)
  fs.mkdirSync(providerDir, { recursive: true })
  fs.writeFileSync(path.join(providerDir, `${iconName}.svg`), `${cleanSvg(fs.readFileSync(source, 'utf8'))}\n`)
  const idPrefix = provider === 'kubernetes' ? 'k8s' : provider === 'generic' ? 'gen' : provider
  catalog.push({
    file: flat
      ? `${provider}/${iconName}.svg`
      : `${provider}/${category}/${iconName}.svg`,
    id: `${idPrefix}-${category}-${iconName}`,
    name,
    provider,
    category,
    tags: [...new Set([provider, category, ...tags])]
  })
}

function normalizedCategory(value, fallback) {
  const result = slug(value)
    .replace(/^(?:arch|res|icon|icons|category)-/, '')
    .replace(/^(?:aws|amazon|azure|google|cloud)-/, '')
  return result || fallback
}

function gcpCategory(rawName) {
  const iconName = slug(rawName)
  return GCP_CATEGORY_RULES.find(([, pattern]) => pattern.test(iconName))?.[0] ?? 'General'
}

function syncAws() {
  const sourceDir = extract(download(SOURCES.aws.url, 'aws.zip'), 'aws')
  const candidates = new Map()

  for (const file of walk(sourceDir)) {
    if (!file.endsWith('.svg')) continue
    const rel = path.relative(sourceDir, file).split(path.sep)
    const root = rel[0]
    const filename = path.basename(file, '.svg')
    const size = Number(filename.match(/_(16|32|48|64)(?:_Dark)?$/)?.[1] ?? 0)
    const dark = /_Dark$/i.test(filename)
    const rawName = filename
      .replace(/^Arch_/, '')
      .replace(/^Res_/, '')
      .replace(/^Arch-Category_/, '')
      .replace(/_(16|32|48|64)(?:_Dark)?$/i, '')
    const category = root.startsWith('Architecture-Group') ? 'groups'
      : root.startsWith('Category-Icons') ? 'categories'
        : rel.length > 2 ? normalizedCategory(rel[1], 'general') : 'general'
    const identity = `${category}/${slug(rawName)}`
    const current = candidates.get(identity)

    // AWS supplies the same logical icon in several resolutions. Keep one
    // canonical light SVG, preferring 64px and then the largest available.
    if (!current || (!dark && current.dark) || (dark === current.dark && size > current.size)) {
      candidates.set(identity, { file, category, name: title(rawName), size, dark })
    }
  }

  for (const entry of [...candidates.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    copyIcon({ provider: 'aws', category: entry.category, name: entry.name, source: entry.file })
  }
}

function syncAzure() {
  const sourceDir = extract(download(SOURCES.azure.url, 'azure.zip'), 'azure')
  for (const file of walk(sourceDir).sort()) {
    if (!file.endsWith('.svg')) continue
    const rel = path.relative(sourceDir, file).split(path.sep)
    const iconIndex = rel.indexOf('Icons')
    if (iconIndex < 0) continue
    const category = normalizedCategory(rel[iconIndex + 1] ?? 'general', 'general')
    const rawName = path.basename(file, '.svg')
      .replace(/^\d+-icon-(?:service|resource|management)-/i, '')
      .replace(/^icon-(?:service|resource|management)-/i, '')
    copyIcon({ provider: 'azure', category, name: title(rawName), source: file })
  }
}

function syncGcp() {
  const seen = new Set()
  for (const [index, url] of SOURCES.gcp.urls.entries()) {
    const sourceDir = extract(download(url, `gcp-${index}.zip`), `gcp-${index}`)
    for (const file of walk(sourceDir).sort()) {
      if (!file.endsWith('.svg')) continue
      const rawName = path.basename(file, '.svg')
        .replace(/[-_](?:512|64)-color(?:-rgb)?$/i, '')
        .replace(/[-_](?:512|64)-mono(?:-rgb)?$/i, '')
      const category = gcpCategory(rawName)
      const identity = `${category}/${slug(rawName)}`
      if (seen.has(identity)) continue
      seen.add(identity)
      copyIcon({
        provider: 'gcp',
        category,
        name: title(rawName),
        source: file
      })
    }
  }
}

function syncKubernetes() {
  const cloneDir = path.join(tempDir, 'kubernetes-community')
  run('git', ['clone', '--depth', '1', '--filter=blob:none', '--sparse', SOURCES.kubernetes.url, cloneDir])
  run('git', ['-C', cloneDir, 'sparse-checkout', 'set', 'icons'])
  const sourceDir = path.join(cloneDir, 'icons', 'svg')

  for (const file of walk(sourceDir).sort()) {
    if (!file.endsWith('.svg')) continue
    const rel = path.relative(sourceDir, file).split(path.sep)
    const category = normalizedCategory(rel.slice(0, -1).join('-'), 'resources')
    const basename = path.basename(file, '.svg')
    copyIcon({
      provider: 'kubernetes',
      category,
      name: KUBERNETES_DISPLAY_NAMES[basename] ?? title(basename),
      source: file
    })
  }
}

function writeCatalog() {
  catalog.sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name))
  const counts = catalog.reduce((result, icon) => {
    result[icon.provider] = (result[icon.provider] ?? 0) + 1
    return result
  }, {})

  fs.writeFileSync(catalogPath, `${JSON.stringify({
    sources: SOURCES,
    counts,
    icons: catalog
  }, null, 2)}\n`)
  console.log(`Synced ${catalog.length} icons: ${Object.entries(counts).map(([provider, count]) => `${provider} ${count}`).join(', ')}.`)
}

try {
  for (const provider of ['aws', 'azure', 'gcp', 'kubernetes', 'generic']) {
    removeAndCreate(path.join(targetDir, provider))
  }
  syncAws()
  syncAzure()
  syncGcp()
  syncKubernetes()
  writeCatalog()
}
finally {
  fs.rmSync(tempDir, { recursive: true, force: true })
}
