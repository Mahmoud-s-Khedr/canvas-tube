import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as crypto from 'node:crypto'
import {
  CanvasProjectBundle,
  serializeProjectBundle,
  deserializeProjectBundle,
  AssetEntry
} from '../../core/project/project-manifest'

export class ProjectService {
  public static async saveProject(
    projectDir: string,
    bundle: CanvasProjectBundle
  ): Promise<{ success: boolean; path: string; error?: string }> {
    try {
      await fs.mkdir(projectDir, { recursive: true })
      await fs.mkdir(path.join(projectDir, 'assets'), { recursive: true })
      await fs.mkdir(path.join(projectDir, 'documents'), { recursive: true })
      await fs.mkdir(path.join(projectDir, 'cache'), { recursive: true })

      const { projectJson, sceneJson } = serializeProjectBundle(bundle)

      const projectJsonPath = path.join(projectDir, 'project.json')
      const sceneJsonPath = path.join(projectDir, 'scene.json')

      await fs.writeFile(projectJsonPath, projectJson, 'utf-8')
      await fs.writeFile(sceneJsonPath, sceneJson, 'utf-8')

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
  ): Promise<{ bundle: CanvasProjectBundle; projectDir: string }> {
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
      bundle: deserialized.bundle
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
