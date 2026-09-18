import { describe, it, expect } from 'vitest'
import {
  createDefaultManifest,
  validateProjectManifest,
  serializeProjectBundle,
  deserializeProjectBundle,
  CanvasProjectBundle
} from '../src/core/project/project-manifest'
import { AssetRegistry } from '../src/core/assets/asset-registry'
import { IconRegistry, INITIAL_ICON_DEFINITIONS } from '../src/core/icons/icon-registry'
import { KNOWN_STENCILS } from '../src/core/icons/icon-metadata'
import { placeIcon } from '../src/core/icons/icon-placement'
import { loadSvgIcons } from '../src/core/icons/icon-loader'

describe('Project Manifest and Serialization', () => {
  it('creates a valid default manifest with formatVersion 1', () => {
    const manifest = createDefaultManifest('System Design 101')
    expect(manifest.formatVersion).toBe(1)
    expect(manifest.title).toBe('System Design 101')
    expect(manifest.projectId).toMatch(/^proj_/)
    expect(manifest.canvas.adapter).toBe('excalidraw')
    expect(manifest.documents).toEqual([])
    expect(manifest.assets).toEqual({})

    const validation = validateProjectManifest(manifest)
    expect(validation.valid).toBe(true)
    expect(validation.manifest).toBeDefined()
  })

  it('rejects invalid manifests or unsupported format versions', () => {
    expect(validateProjectManifest(null).valid).toBe(false)
    expect(validateProjectManifest({}).valid).toBe(false)

    // Unsupported format version
    const badVersion = { ...createDefaultManifest(), formatVersion: 99 }
    const result = validateProjectManifest(badVersion)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Unsupported format version')

    // Missing projectId
    const noId = { ...createDefaultManifest(), projectId: '' }
    expect(validateProjectManifest(noId).valid).toBe(false)
  })

  it('serializes and deserializes a project bundle round-trip', () => {
    const bundle: CanvasProjectBundle = {
      manifest: createDefaultManifest('Cache Tier Architecture'),
      sceneData: {
        elements: [
          { id: 'el_1', type: 'rectangle', x: 100, y: 100, width: 200, height: 100 }
        ],
        appState: { viewBackgroundColor: '#121212' }
      }
    }

    const { projectJson, sceneJson } = serializeProjectBundle(bundle)
    expect(projectJson).toContain('Cache Tier Architecture')
    expect(sceneJson).toContain('el_1')

    const deserialized = deserializeProjectBundle(projectJson, sceneJson)
    expect(deserialized.success).toBe(true)
    expect(deserialized.bundle?.manifest.title).toBe('Cache Tier Architecture')
    expect((deserialized.bundle?.sceneData as any).elements.length).toBe(1)
  })
})

describe('Asset Registry & Deduplication', () => {
  it('registers an asset and computes content-addressed relative path', () => {
    const registry = new AssetRegistry()
    const sampleHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

    const asset = registry.register({
      originalFilename: 'architecture-diagram.png',
      mimeType: 'image/png',
      hash: sampleHash,
      sizeBytes: 1024
    })

    expect(asset.id).toMatch(/^ast_/)
    expect(asset.type).toBe('image')
    expect(asset.relativePath).toBe(`assets/${sampleHash}.png`)
    expect(registry.get(asset.id)).toEqual(asset)
    expect(registry.getByHash(sampleHash)).toEqual(asset)
  })

  it('deduplicates identical assets by hash', () => {
    const registry = new AssetRegistry()
    const sampleHash = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'

    const asset1 = registry.register({
      originalFilename: 'icon1.svg',
      mimeType: 'image/svg+xml',
      hash: sampleHash,
      sizeBytes: 500
    })

    const asset2 = registry.register({
      originalFilename: 'icon1_copy.svg',
      mimeType: 'image/svg+xml',
      hash: sampleHash,
      sizeBytes: 500
    })

    // Must return same asset entry (same ID)
    expect(asset1.id).toBe(asset2.id)
    expect(registry.list().length).toBe(1)
  })

  it('correctly categorizes PDF, SVG, and images', () => {
    const registry = new AssetRegistry()

    const pdf = registry.register({
      originalFilename: 'paper.pdf',
      mimeType: 'application/pdf',
      hash: 'hash_pdf_1',
      sizeBytes: 2048
    })
    expect(pdf.type).toBe('pdf')
    expect(pdf.relativePath).toBe('assets/hash_pdf_1.pdf')

    const svg = registry.register({
      originalFilename: 'server.svg',
      mimeType: 'image/svg+xml',
      hash: 'hash_svg_1',
      sizeBytes: 300
    })
    expect(svg.type).toBe('svg')
    expect(svg.relativePath).toBe('assets/hash_svg_1.svg')
  })
})

describe('Icon Registry & Search', () => {
  it('loads svg icons from assets folder via glob', () => {
    const svgs = loadSvgIcons()
    expect(Object.keys(svgs).length).toBeGreaterThan(120)
  })

  it('loads expanded official icon catalog across all cloud and k8s providers', () => {
    const registry = new IconRegistry(INITIAL_ICON_DEFINITIONS)
    expect(registry.getAll().length).toBeGreaterThanOrEqual(160)

    // Check each provider has rich catalog
    const providers = registry.getProviders()
    expect(providers).toContain('generic')
    expect(providers).toContain('aws')
    expect(providers).toContain('gcp')
    expect(providers).toContain('azure')
    expect(providers).toContain('kubernetes')

    expect(registry.search('', 'aws').length).toBeGreaterThanOrEqual(30)
    expect(registry.search('', 'gcp').length).toBeGreaterThanOrEqual(30)
    expect(registry.search('', 'azure').length).toBeGreaterThanOrEqual(25)
    expect(registry.search('', 'kubernetes').length).toBeGreaterThanOrEqual(20)
    expect(registry.search('', 'generic').length).toBeGreaterThanOrEqual(40)
  })

  it('keeps every bundled SVG and metadata entry in lockstep', () => {
    const assetKeys = Object.keys(loadSvgIcons())
      .map((filePath) => filePath.replace(/^.*\/icons\//, '').replace(/\.svg$/, ''))
      .sort()
    expect(Object.keys(KNOWN_STENCILS).sort()).toEqual(assetKeys)
    expect(new Set(INITIAL_ICON_DEFINITIONS.map((icon) => icon.id)).size).toBe(
      INITIAL_ICON_DEFINITIONS.length
    )
  })

  it('searches by keyword across names and tags', () => {
    const registry = new IconRegistry(INITIAL_ICON_DEFINITIONS)

    // Search for lambda in AWS
    const lambdaResults = registry.search('lambda')
    expect(lambdaResults.some((i) => i.id === 'aws-lambda')).toBe(true)

    // Search for BigQuery in GCP
    const bqResults = registry.search('bigquery')
    expect(bqResults.some((i) => i.id === 'gcp-bigquery')).toBe(true)

    // Search for Cosmos in Azure
    const cosmosResults = registry.search('cosmos')
    expect(cosmosResults.some((i) => i.id === 'azure-cosmos')).toBe(true)

    // Search for Ingress & Pod in official Kubernetes
    const ingressResults = registry.search('ingress')
    expect(ingressResults.some((i) => i.id === 'k8s-ingress')).toBe(true)

    const podResults = registry.search('pod')
    expect(podResults.some((i) => i.id === 'k8s-pod')).toBe(true)

    // Search for cache/redis in generic
    const cacheResults = registry.search('redis')
    expect(cacheResults.some((i) => i.id === 'gen-cache')).toBe(true)

    const multiTermResults = registry.search('aws lambda')
    expect(multiTermResults.some((i) => i.id === 'aws-lambda')).toBe(true)

    const redisResults = registry.search('redis cache', 'generic')
    expect(redisResults.some((i) => i.id === 'gen-redis')).toBe(true)

    const databaseResults = registry.search('', 'generic', 'database')
    expect(databaseResults.every((i) => i.category === 'database')).toBe(true)
    expect(databaseResults.some((i) => i.id === 'gen-postgresql')).toBe(true)
  })

  it('converts SVG content to valid data URL', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>'
    const dataUrl = IconRegistry.svgToDataUrl(svg)
    expect(dataUrl.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true)
    expect(() => IconRegistry.svgToDataUrl('<svg><script>alert(1)</script></svg>')).toThrow(
      'Refusing unsafe SVG content'
    )
  })

  it('reuses a bundled SVG file ID for every placement', () => {
    const icon = INITIAL_ICON_DEFINITIONS.find((item) => item.id === 'gen-redis')!
    const files: unknown[] = []
    const objects: unknown[] = []
    const adapter = {
      addFile: (file: unknown) => files.push(file),
      addObject: (object: unknown) => {
        objects.push(object)
        return 'element-id'
      }
    }

    placeIcon(adapter as any, icon, { x: 100, y: 100 })
    placeIcon(adapter as any, icon, { x: 200, y: 200 })

    expect(files).toHaveLength(2)
    expect((files[0] as { id: string }).id).toBe('builtin-icon-gen-redis')
    expect((files[1] as { id: string }).id).toBe('builtin-icon-gen-redis')
    expect((objects[0] as { fileId: string }).fileId).toBe('builtin-icon-gen-redis')
  })
})
