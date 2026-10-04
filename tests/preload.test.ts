import { beforeEach, expect, it, vi } from 'vitest'
import type { DesktopApi } from '../src/core/desktop/desktop-api'
import { createDefaultManifest } from '../src/core/project/project-manifest'
const electron = vi.hoisted(() => ({ contextBridge: { exposeInMainWorld: vi.fn() }, ipcRenderer: { invoke: vi.fn() } }))
vi.mock('electron', () => electron)
let api: DesktopApi
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks()
  await import('../src/preload/index')
  api = electron.contextBridge.exposeInMainWorld.mock.calls[0][1]
  electron.ipcRenderer.invoke.mockResolvedValue({ sentinel: 'returned result' })
})
it('exposes only the declared bridge surface', () => {
  expect(electron.contextBridge.exposeInMainWorld).toHaveBeenCalledOnce()
  expect(electron.contextBridge.exposeInMainWorld.mock.calls[0][0]).toBe('desktopApi')
  expect(Object.keys(api).sort()).toEqual(['openProject', 'saveProject', 'saveProjectAs', 'importAsset', 'importPdf', 'saveExportFile', 'copyImageToClipboard', 'copyTextToClipboard', 'getSystemInfo', 'toggleDevTools'].sort())
})
it('forwards every channel, arguments, defaults and result without exposing ipcRenderer', async () => {
  const bundle = { manifest: createDefaultManifest(), sceneData: { elements: [] } }
  const options = { defaultFilename: 'a.png', dataBase64: 'YQ==', filters: [] }
  const cases: Array<[() => Promise<unknown>, string, ...unknown[]]> = [
    [() => api.openProject(), 'project:open'],
    [() => api.saveProject('/p', bundle), 'project:save', { projectDir: '/p', bundle, assetData: {} }],
    [() => api.saveProject('/p', bundle, { a: 'YQ==' }), 'project:save', { projectDir: '/p', bundle, assetData: { a: 'YQ==' } }],
    [() => api.saveProjectAs('Title', bundle), 'project:saveAs', { defaultTitle: 'Title', bundle, assetData: {} }],
    [() => api.saveProjectAs('Title', bundle, { a: 'YQ==' }), 'project:saveAs', { defaultTitle: 'Title', bundle, assetData: { a: 'YQ==' } }],
    [() => api.importAsset(), 'asset:import'], [() => api.importPdf(), 'pdf:import'],
    [() => api.saveExportFile(options), 'export:saveFile', options],
    [() => api.copyImageToClipboard('image'), 'clipboard:writeImage', 'image'],
    [() => api.copyTextToClipboard('text'), 'clipboard:writeText', 'text'],
    [() => api.getSystemInfo(), 'system:getInfo'], [() => api.toggleDevTools(), 'window:toggleDevTools']
  ]
  for (const [call, ...args] of cases) {
    expect(await call()).toEqual({ sentinel: 'returned result' })
    expect(electron.ipcRenderer.invoke).toHaveBeenLastCalledWith(...args)
  }
})
