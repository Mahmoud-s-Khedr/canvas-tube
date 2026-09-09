import { AssetEntry } from '../project/project-manifest'

export interface AssetRegisterOptions {
  id?: string
  originalFilename: string
  mimeType: string
  hash: string
  sizeBytes: number
  extension?: string
}

export class AssetRegistry {
  private assets = new Map<string, AssetEntry>()
  private hashToId = new Map<string, string>()

  constructor(initialAssets?: Record<string, AssetEntry>) {
    if (initialAssets) {
      for (const [id, entry] of Object.entries(initialAssets)) {
        this.assets.set(id, entry)
        this.hashToId.set(entry.hash, id)
      }
    }
  }

  public register(opts: AssetRegisterOptions): AssetEntry {
    // If an identical asset (by SHA-256 hash) is already registered, reuse it (deduplication)
    const existingId = this.hashToId.get(opts.hash)
    if (existingId) {
      const existing = this.assets.get(existingId)
      if (existing) {
        return existing
      }
    }

    const id = opts.id || `ast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const ext = opts.extension || this.getExtensionFromFilename(opts.originalFilename)
    const relativePath = `assets/${opts.hash}${ext ? `.${ext}` : ''}`

    const type = this.detectAssetType(opts.mimeType, opts.originalFilename)

    const entry: AssetEntry = {
      id,
      type,
      originalFilename: opts.originalFilename,
      mimeType: opts.mimeType,
      hash: opts.hash,
      relativePath,
      sizeBytes: opts.sizeBytes,
      createdAt: new Date().toISOString()
    }

    this.assets.set(id, entry)
    this.hashToId.set(opts.hash, id)
    return entry
  }

  public get(id: string): AssetEntry | undefined {
    return this.assets.get(id)
  }

  public getByHash(hash: string): AssetEntry | undefined {
    const id = this.hashToId.get(hash)
    return id ? this.assets.get(id) : undefined
  }

  public has(id: string): boolean {
    return this.assets.has(id)
  }

  public list(): AssetEntry[] {
    return Array.from(this.assets.values())
  }

  public toRecord(): Record<string, AssetEntry> {
    const rec: Record<string, AssetEntry> = {}
    for (const [id, entry] of this.assets.entries()) {
      rec[id] = entry
    }
    return rec
  }

  private detectAssetType(mimeType: string, filename: string): AssetEntry['type'] {
    const lowerMime = mimeType.toLowerCase()
    const lowerName = filename.toLowerCase()

    if (lowerMime.includes('pdf') || lowerName.endsWith('.pdf')) {
      return 'pdf'
    }
    if (lowerMime.includes('svg') || lowerName.endsWith('.svg')) {
      return 'svg'
    }
    if (lowerMime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/.test(lowerName)) {
      return 'image'
    }
    return 'other'
  }

  private getExtensionFromFilename(filename: string): string {
    const dotIdx = filename.lastIndexOf('.')
    if (dotIdx === -1 || dotIdx === filename.length - 1) return ''
    return filename.substring(dotIdx + 1).toLowerCase()
  }
}
