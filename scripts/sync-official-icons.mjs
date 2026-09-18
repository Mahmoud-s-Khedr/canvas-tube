import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const rootDir = path.resolve(path.dirname(__filename), '..')
const targetDir = path.join(rootDir, 'assets/icons')
const k8sCloneDir = '/tmp/canvastube-k8s-icons/community'
const k8sBase = path.join(k8sCloneDir, 'icons/svg')
const simpleIconsDir = path.join(rootDir, 'node_modules/simple-icons/icons')
const simpleIconsDataPath = path.join(rootDir, 'node_modules/simple-icons/data/simple-icons.json')

// These vendor-neutral technology stencils are copied from the pinned
// simple-icons dev dependency. Metadata lives in icon-metadata.ts, which this
// script deliberately never rewrites.
const TECHNOLOGY_LOGOS = [
  ['redis', 'redis'], ['postgresql', 'postgresql'], ['mysql', 'mysql'],
  ['mongodb', 'mongodb'], ['elasticsearch', 'elasticsearch'], ['cassandra', 'apachecassandra'],
  ['cockroachdb', 'cockroachlabs'], ['kafka', 'apachekafka'], ['rabbitmq', 'rabbitmq'],
  ['nats', 'natsdotio'], ['pulsar', 'apachepulsar'], ['docker', 'docker'],
  ['nginx', 'nginx'], ['traefik', 'traefikproxy'], ['vault', 'vault'],
  ['prometheus', 'prometheus'], ['grafana', 'grafana'], ['jaeger', 'jaeger'],
  ['opentelemetry', 'opentelemetry'], ['elastic', 'elasticstack'], ['terraform', 'terraform'],
  ['ansible', 'ansible'], ['jenkins', 'jenkins'], ['github-actions', 'githubactions'],
  ['gitlab', 'gitlab'], ['minio', 'minio'], ['airflow', 'apacheairflow'], ['envoy', 'envoyproxy']
]

const K8S_MAPPINGS = [
  ['pod.svg', 'resources/unlabeled/pod.svg'], ['deployment.svg', 'resources/unlabeled/deploy.svg'],
  ['service.svg', 'resources/unlabeled/svc.svg'], ['ingress.svg', 'resources/unlabeled/ing.svg'],
  ['configmap.svg', 'resources/unlabeled/cm.svg'], ['secret.svg', 'resources/unlabeled/secret.svg'],
  ['statefulset.svg', 'resources/unlabeled/sts.svg'], ['daemonset.svg', 'resources/unlabeled/ds.svg'],
  ['job.svg', 'resources/unlabeled/job.svg'], ['cronjob.svg', 'resources/unlabeled/cronjob.svg'],
  ['pv.svg', 'resources/unlabeled/pv.svg'], ['pvc.svg', 'resources/unlabeled/pvc.svg'],
  ['storageclass.svg', 'resources/unlabeled/sc.svg'], ['namespace.svg', 'resources/unlabeled/ns.svg'],
  ['network-policy.svg', 'resources/unlabeled/netpol.svg'], ['hpa.svg', 'resources/unlabeled/hpa.svg'],
  ['crd.svg', 'resources/unlabeled/crd.svg'], ['service-account.svg', 'resources/unlabeled/sa.svg'],
  ['role.svg', 'resources/unlabeled/role.svg'], ['cluster-role.svg', 'resources/unlabeled/c-role.svg'],
  ['node.svg', 'infrastructure_components/unlabeled/node.svg'],
  ['control-plane.svg', 'infrastructure_components/unlabeled/control-plane.svg'],
  ['etcd.svg', 'infrastructure_components/unlabeled/etcd.svg']
]

function cleanK8sSvg(raw) {
  return raw
    .replace(/<\?xml[^>]*\?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
    .replace(/<sodipodi:namedview[\s\S]*?(?:\/>|<\/sodipodi:namedview>)/gi, '')
    .replace(/\s(inkscape|sodipodi):[a-z0-9_-]+="[^"]*"/gi, '')
    .replace(/\sxmlns:(sodipodi|inkscape|dc|cc|rdf|svg)="[^"]*"/gi, '')
    .replace(/\swidth="[^"]*"/i, ' width="64"')
    .replace(/\sheight="[^"]*"/i, ' height="64"')
    .trim()
}

function ensureK8sRepo() {
  if (fs.existsSync(k8sBase)) return
  fs.mkdirSync(path.dirname(k8sCloneDir), { recursive: true })
  execSync(
    `git clone --depth 1 --filter=blob:none --sparse https://github.com/kubernetes/community.git ${k8sCloneDir} && cd ${k8sCloneDir} && git sparse-checkout set icons`,
    { stdio: 'inherit' }
  )
}

function syncTechnologyLogos() {
  if (!fs.existsSync(simpleIconsDir) || !fs.existsSync(simpleIconsDataPath)) {
    throw new Error('simple-icons is not installed. Run npm install before syncing technology logos.')
  }
  const iconColors = new Map(
    JSON.parse(fs.readFileSync(simpleIconsDataPath, 'utf8')).map((icon) => [icon.slug, icon.hex])
  )
  const genericDir = path.join(targetDir, 'generic')
  fs.mkdirSync(genericDir, { recursive: true })
  for (const [filename, source] of TECHNOLOGY_LOGOS) {
    const color = iconColors.get(source)
    if (!color) throw new Error(`No brand color found for Simple Icon: ${source}`)
    const svg = fs.readFileSync(path.join(simpleIconsDir, `${source}.svg`), 'utf8')
      .replace(/<svg\b([^>]*)>/i, `<svg$1 fill="#${color}">`)
      .replace(/(<title>.*?<\/title>)/i, '$1<rect width="24" height="24" rx="2" fill="#ffffff"/>')
    fs.writeFileSync(path.join(genericDir, `${filename}.svg`), `${svg}\n`)
  }
  console.log(`Synced ${TECHNOLOGY_LOGOS.length} colored generic technology logos.`)
}

function syncKubernetesIcons() {
  ensureK8sRepo()
  const outputDir = path.join(targetDir, 'kubernetes')
  fs.mkdirSync(outputDir, { recursive: true })
  for (const [filename, source] of K8S_MAPPINGS) {
    const sourcePath = path.join(k8sBase, source)
    if (!fs.existsSync(sourcePath)) throw new Error(`Kubernetes icon not found: ${source}`)
    fs.writeFileSync(path.join(outputDir, filename), `${cleanK8sSvg(fs.readFileSync(sourcePath, 'utf8'))}\n`)
  }
  console.log(`Synced ${K8S_MAPPINGS.length} Kubernetes icons.`)
}

syncTechnologyLogos()
syncKubernetesIcons()
