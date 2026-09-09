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
  it('loads initial safe icon definitions and searches by keyword and provider', () => {
    const registry = new IconRegistry(INITIAL_ICON_DEFINITIONS)
    expect(registry.getAll().length).toBeGreaterThan(5)

    // Search for database
    const dbResults = registry.search('database')
    expect(dbResults.some((i) => i.name === 'Database')).toBe(true)

    // Search with provider filter
    const k8sResults = registry.search('', 'kubernetes')
    expect(k8sResults.length).toBe(1)
    expect(k8sResults[0].id).toBe('gen-k8s-pod')

    // SQS / Kafka tag search
    const queueResults = registry.search('kafka')
    expect(queueResults.some((i) => i.id === 'gen-queue')).toBe(true)
  })

  it('converts SVG content to valid data URL', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>'
    const dataUrl = IconRegistry.svgToDataUrl(svg)
    expect(dataUrl.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true)
  })
})
