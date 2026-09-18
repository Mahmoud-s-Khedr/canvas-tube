import { afterEach, describe, expect, it } from 'vitest'
import * as crypto from 'node:crypto'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { ProjectService } from '../src/main/services/project-service'
import { CanvasProjectBundle, createDefaultManifest } from '../src/core/project/project-manifest'

const temporaryDirectories: string[] = []

async function createTemporaryProjectDirectory(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'canvastube-project-service-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })))
})

describe('ProjectService asset persistence', () => {
  it('writes manifest assets into the project bundle and restores them on open', async () => {
    const projectDirectory = await createTemporaryProjectDirectory()
    const source = Buffer.from('PDF fixture bytes')
    const hash = crypto.createHash('sha256').update(source).digest('hex')
    const manifest = createDefaultManifest('Persistent PDF')
    manifest.assets.asset_pdf = {
      id: 'asset_pdf',
      type: 'pdf',
      originalFilename: 'slides.pdf',
      mimeType: 'application/pdf',
      hash,
      relativePath: `documents/${hash}.pdf`,
      sizeBytes: source.length,
      createdAt: new Date().toISOString()
    }
    manifest.documents.push({
      id: 'document_pdf',
      assetId: 'asset_pdf',
      filename: 'slides.pdf',
      pageCount: 1,
      type: 'pdf'
    })

    const bundle: CanvasProjectBundle = { manifest, sceneData: { elements: [], appState: {} } }
    const saved = await ProjectService.saveProject(projectDirectory, bundle, {
      asset_pdf: source.toString('base64')
    })

    expect(saved.success).toBe(true)
    await expect(fs.readFile(path.join(projectDirectory, `documents/${hash}.pdf`))).resolves.toEqual(source)

    const opened = await ProjectService.openProject(projectDirectory)
    expect(opened.assetData.asset_pdf).toBe(source.toString('base64'))
    expect(opened.bundle.manifest.documents).toEqual(manifest.documents)
  })

  it('rejects assets whose bytes do not match their manifest checksum', async () => {
    const projectDirectory = await createTemporaryProjectDirectory()
    const manifest = createDefaultManifest('Checksum validation')
    manifest.assets.asset_image = {
      id: 'asset_image',
      type: 'image',
      originalFilename: 'diagram.png',
      mimeType: 'image/png',
      hash: crypto.createHash('sha256').update('expected').digest('hex'),
      relativePath: 'assets/diagram.png',
      sizeBytes: 8,
      createdAt: new Date().toISOString()
    }

    const result = await ProjectService.saveProject(
      projectDirectory,
      { manifest, sceneData: { elements: [], appState: {} } },
      { asset_image: Buffer.from('different').toString('base64') }
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('checksum')
  })
})
