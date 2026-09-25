import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as crypto from 'node:crypto'
import {
  CanvasProjectBundle,
  serializeProjectBundle,
  deserializeProjectBundle,
  AssetEntry,
  DocumentEntry
} from '../../core/project/project-manifest'

export class ProjectService {
  public static async saveProject(
    projectDir: string,
    bundle: CanvasProjectBundle,
    assetData: Record<string, string> = {}
  ): Promise<{ success: boolean; path: string; error?: string }> {
    try {
      await fs.mkdir(projectDir, { recursive: true })
      await fs.mkdir(path.join(projectDir, 'assets'), { recursive: true })
      await fs.mkdir(path.join(projectDir, 'documents'), { recursive: true })
      await fs.mkdir(path.join(projectDir, 'cache'), { recursive: true })

      const { projectJson, sceneJson } = serializeProjectBundle(bundle)

      await this.writeAssetData(projectDir, bundle, assetData)
      await Promise.all([
        this.writeFileAtomically(path.join(projectDir, 'project.json'), projectJson),
        this.writeFileAtomically(path.join(projectDir, 'scene.json'), sceneJson)
      ])

      console.log(`[ProjectService] Successfully saved project to: ${projectDir}`)
      return { success: true, path: projectDir }
    } catch (err) {
      console.error('[ProjectService] Failed to save project:', err)
      return {
        success: false,
        path: projectDir,
        error: err instanceof Error ? err.message : 'Unknown error during save'
      }
    }
  }

  public static async openProject(
    projectDir: string
  ): Promise<{ bundle: CanvasProjectBundle; projectDir: string; assetData: Record<string, string> }> {
    const projectJsonPath = path.join(projectDir, 'project.json')
    const sceneJsonPath = path.join(projectDir, 'scene.json')

    const projectJson = await fs.readFile(projectJsonPath, 'utf-8')
    let sceneJson: string
    try {
      sceneJson = await fs.readFile(sceneJsonPath, 'utf-8')
    } catch {
      sceneJson = JSON.stringify({ elements: [], appState: {} })
    }

    const deserialized = deserializeProjectBundle(projectJson, sceneJson)
    if (!deserialized.success || !deserialized.bundle) {
      throw new Error(deserialized.error || 'Failed to parse project bundle')
    }

    console.log(`[ProjectService] Successfully loaded project from: ${projectDir}`)
    return {
      projectDir,
      bundle: deserialized.bundle,
      assetData: await this.readProjectAssetData(projectDir, deserialized.bundle)
    }
  }

  public static async readAssetFile(filePath: string): Promise<{
    asset: AssetEntry
    dataUrl: string
  }> {
    const buffer = await fs.readFile(filePath)
    const hash = crypto.createHash('sha256').update(buffer).digest('hex')
    const filename = path.basename(filePath)
    const ext = path.extname(filename).toLowerCase().replace('.', '')
    const mimeType = this.getMimeType(ext)

    const base64 = buffer.toString('base64')
    const dataUrl = `data:${mimeType};base64,${base64}`

    const asset: AssetEntry = {
      id: `ast_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type: mimeType.startsWith('image/') ? 'image' : mimeType.includes('svg') ? 'svg' : 'other',
      originalFilename: filename,
      mimeType,
      hash,
      relativePath: `assets/${hash}${ext ? `.${ext}` : ''}`,
      sizeBytes: buffer.byteLength,
      createdAt: new Date().toISOString()
    }

    return { asset, dataUrl }
  }

  public static async readPdfFile(filePath: string): Promise<{
    asset: AssetEntry
    document: DocumentEntry
    pdfBase64: string
  }> {
    const buffer = await fs.readFile(filePath)
    const hash = crypto.createHash('sha256').update(buffer).digest('hex')
    const filename = path.basename(filePath)
    const pdfBase64 = buffer.toString('base64')

    const assetId = `ast_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    const asset: AssetEntry = {
      id: assetId,
      type: 'pdf',
      originalFilename: filename,
      mimeType: 'application/pdf',
      hash,
      relativePath: `documents/${hash}.pdf`,
      sizeBytes: buffer.byteLength,
      createdAt: new Date().toISOString()
    }

    const document: DocumentEntry = {
      id: docId,
      assetId,
      filename,
      pageCount: 0,
      type: 'pdf'
    }

    return { asset, document, pdfBase64 }
  }

  private static async writeAssetData(
    projectDir: string,
    bundle: CanvasProjectBundle,
    assetData: Record<string, string>
  ): Promise<void> {
    for (const [assetId, asset] of Object.entries(bundle.manifest.assets)) {
      const encoded = assetData[assetId]
      if (!encoded) continue

      const targetPath = this.resolveProjectPath(projectDir, asset.relativePath)
      if (!targetPath) {
        throw new Error(`Invalid path for asset "${asset.originalFilename}"`)
      }

      const base64 = encoded.replace(/^data:[^,]*,/, '').replace(/\s/g, '')
      const buffer = Buffer.from(base64, 'base64')
      const hash = crypto.createHash('sha256').update(buffer).digest('hex')
      if (hash !== asset.hash) {
        throw new Error(`Asset data does not match the recorded checksum for "${asset.originalFilename}"`)
      }

      await fs.mkdir(path.dirname(targetPath), { recursive: true })
      await this.writeFileAtomically(targetPath, buffer)
    }
  }

  private static async readProjectAssetData(
    projectDir: string,
    bundle: CanvasProjectBundle
  ): Promise<Record<string, string>> {
    const assetData: Record<string, string> = {}

    await Promise.all(
      Object.entries(bundle.manifest.assets).map(async ([assetId, asset]) => {
        const fullPath = this.resolveProjectPath(projectDir, asset.relativePath)
        if (!fullPath) return

        try {
          const buffer = await fs.readFile(fullPath)
          const hash = crypto.createHash('sha256').update(buffer).digest('hex')
          if (hash === asset.hash) {
            assetData[assetId] = buffer.toString('base64')
          } else {
            console.warn(`[ProjectService] Ignoring checksum-mismatched asset: ${asset.relativePath}`)
          }
        } catch {
          // Older projects may have a manifest entry without an on-disk asset.
        }
      })
    )

    return assetData
  }

  private static resolveProjectPath(projectDir: string, relativePath: string): string | null {
    if (!relativePath || path.isAbsolute(relativePath)) return null

    const root = path.resolve(projectDir)
    const resolved = path.resolve(root, relativePath)
    return resolved === root || resolved.startsWith(`${root}${path.sep}`) ? resolved : null
  }

  private static async writeFileAtomically(filePath: string, data: string | Buffer): Promise<void> {
    const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
    await fs.writeFile(temporaryPath, data)
    await fs.rename(temporaryPath, filePath)
  }

  private static getMimeType(ext: string): string {
    switch (ext) {
      case 'png':
        return 'image/png'
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg'
      case 'svg':
        return 'image/svg+xml'
      case 'webp':
        return 'image/webp'
      case 'gif':
        return 'image/gif'
      case 'pdf':
        return 'application/pdf'
      default:
        return 'application/octet-stream'
    }
  }
}
