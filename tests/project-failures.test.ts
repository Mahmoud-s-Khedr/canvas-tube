import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { createDefaultManifest } from '../src/core/project/project-manifest'
const faults = vi.hoisted(() => ({ write: false, rename: false }))
vi.mock('node:fs/promises', async importOriginal => {
  const original = await importOriginal<typeof import('node:fs/promises')>()
  return { ...original,
    writeFile: async (...args: Parameters<typeof original.writeFile>) => {
      if (faults.write && String(args[0]).endsWith('.tmp')) throw new Error('Injected write failure')
      return original.writeFile(...args)
    },
    rename: async (...args: Parameters<typeof original.rename>) => {
      if (faults.rename && String(args[1]).endsWith('scene.json')) throw new Error('Injected rename failure')
      return original.rename(...args)
    }
  }
})
import { ProjectService } from '../src/main/services/project-service'
let root: string
let error: ReturnType<typeof vi.spyOn>
beforeEach(async () => {
  root = await fs.mkdtemp(join(tmpdir(), 'ct-failures-'))
  faults.write = false; faults.rename = false
  error = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(async () => { vi.restoreAllMocks(); await fs.rm(root, { recursive: true, force: true }) })
function bundle() { return { manifest: createDefaultManifest('Original'), sceneData: { elements: [{ id: 'original' }] } } }
function assetBundle(relativePath = 'assets/a.bin') {
  const project = bundle(); project.manifest.assets.a = { id: 'a', type: 'other', originalFilename: 'a.bin', mimeType: 'application/octet-stream', hash: createHash('sha256').update('a').digest('hex'), relativePath, sizeBytes: 1, createdAt: new Date().toISOString() }
  return project
}

describe('persistence failures using real temporary directories', () => {
  it.each(['project.json', 'scene.json'])('rejects corrupt %s', async file => {
    await ProjectService.saveProject(root, bundle()); await fs.writeFile(join(root, file), '{bad')
    await expect(ProjectService.openProject(root)).rejects.toThrow()
  })
  it('keeps the missing scene fallback compatible', async () => {
    await ProjectService.saveProject(root, bundle()); await fs.rm(join(root, 'scene.json'))
    expect((await ProjectService.openProject(root)).bundle.sceneData).toEqual({ elements: [], appState: {} })
  })
  it('omits missing and checksum-mismatched assets, with expected warning captured', async () => {
    const project = assetBundle(); await ProjectService.saveProject(root, project, { a: 'YQ==' })
    await fs.rm(join(root, 'assets/a.bin')); expect((await ProjectService.openProject(root)).assetData).toEqual({})
    await fs.writeFile(join(root, 'assets/a.bin'), 'tampered')
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect((await ProjectService.openProject(root)).assetData).toEqual({})
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('checksum-mismatched'))
  })
  it.each(['../escape.bin', '/absolute.bin', 'C:\\absolute.bin', '..\\escape.bin'])('rejects escaping asset paths: %s', async path => {
    expect(await ProjectService.saveProject(root, assetBundle(path), { a: 'YQ==' })).toMatchObject({ success: false, error: expect.stringContaining('Invalid path') })
    expect(error).toHaveBeenCalledOnce()
  })
  it('rejects invalid Base64 even if Buffer would decode it to the correct checksum', async () => {
    expect(await ProjectService.saveProject(root, assetBundle(), { a: 'YQ==!!' })).toMatchObject({ success: false, error: 'Invalid Base64 asset data' })
    expect(error).toHaveBeenCalledOnce()
  })
  it.each(['write', 'rename'] as const)('cleans temporary files after a %s failure and preserves each old destination atomically', async kind => {
    const original = bundle(); await ProjectService.saveProject(root, original)
    faults[kind] = true
    const next = { ...original, manifest: { ...original.manifest, title: 'Updated' }, sceneData: { elements: [{ id: 'new' }] } }
    expect(await ProjectService.saveProject(root, next)).toMatchObject({ success: false })
    expect(error).toHaveBeenCalledOnce()
    expect((await fs.readdir(root)).filter(file => file.endsWith('.tmp'))).toEqual([])
    expect(JSON.parse(await fs.readFile(join(root, 'scene.json'), 'utf8'))).toEqual(original.sceneData)
    // The manifest may have succeeded while the scene failed. This documents
    // the existing nontransactional format rather than implying rollback.
    expect(JSON.parse(await fs.readFile(join(root, 'project.json'), 'utf8')).title).toBe(kind === 'rename' ? 'Updated' : 'Original')
  })
})
