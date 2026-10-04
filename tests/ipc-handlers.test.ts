import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolve } from 'node:path'
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron'
import { registerIpcHandlers, type IpcServices } from '../src/main/ipc-handlers'
import { createDefaultManifest } from '../src/core/project/project-manifest'

const selected = resolve('/selected')

function harness() {
  const handlers = new Map<string, (event: IpcMainInvokeEvent, ...args: any[]) => any>()
  const contents = { mainFrame: {}, isDevToolsOpened: vi.fn(() => false), openDevTools: vi.fn(), closeDevTools: vi.fn() }
  let window: BrowserWindow | null = { webContents: contents } as unknown as BrowserWindow
  const bundle = { manifest: createDefaultManifest('Test'), sceneData: { elements: [], appState: {} } }
  const services = {
    ipcMain: { handle: vi.fn((channel, handler) => { handlers.set(channel, handler) }) },
    dialog: { showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: [selected] }), showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: selected }), showErrorBox: vi.fn() },
    clipboard: { writeImage: vi.fn(), writeText: vi.fn() },
    nativeImage: { createFromDataURL: vi.fn().mockReturnValue({ isEmpty: () => false }) },
    projectService: {
      openProject: vi.fn().mockResolvedValue({ projectDir: selected, bundle, assetData: {} }),
      saveProject: vi.fn().mockResolvedValue({ success: true, path: selected }),
      readAssetFile: vi.fn().mockResolvedValue({ dataUrl: 'image' }), readPdfFile: vi.fn().mockResolvedValue({ pdfBase64: 'pdf' })
    },
    writeFile: vi.fn().mockResolvedValue(undefined), getMainWindow: () => window
  } satisfies Omit<IpcServices, 'nativeImage'> & { nativeImage: any }
  registerIpcHandlers(services)
  const event = { sender: contents, senderFrame: contents.mainFrame } as unknown as IpcMainInvokeEvent
  const call = (channel: string, ...args: any[]) => handlers.get(channel)!(event, ...args)
  return { services, handlers, event, contents, bundle, call, close: () => { window = null } }
}
let h: ReturnType<typeof harness>
beforeEach(() => { h = harness() })
const channels = ['system:getInfo', 'window:toggleDevTools', 'project:open', 'project:save', 'project:saveAs', 'asset:import', 'pdf:import', 'export:saveFile', 'clipboard:writeImage', 'clipboard:writeText']

describe('IPC trust boundary and contracts', () => {
  it('registers exactly the declared channels', () => expect([...h.handlers.keys()].sort()).toEqual([...channels].sort()))
  it.each(channels)('rejects foreign senders and subframes for %s before privileged side effects', async channel => {
    for (const event of [{ sender: {}, senderFrame: h.contents.mainFrame }, { sender: h.contents, senderFrame: {} }]) {
      await expect(async () => h.handlers.get(channel)!(event as IpcMainInvokeEvent, {})).rejects.toThrow('Untrusted renderer')
    }
    expect(h.services.dialog.showOpenDialog).not.toHaveBeenCalled()
    expect(h.services.dialog.showSaveDialog).not.toHaveBeenCalled()
    for (const method of Object.values(h.services.projectService)) expect(method).not.toHaveBeenCalled()
    expect(h.services.clipboard.writeText).not.toHaveBeenCalled(); expect(h.services.clipboard.writeImage).not.toHaveBeenCalled()
    expect(h.contents.openDevTools).not.toHaveBeenCalled(); expect(h.services.writeFile).not.toHaveBeenCalled()
  })
  it.each(channels)('rejects requests when no active window exists: %s', async channel => {
    h.close(); await expect(async () => h.call(channel)).rejects.toThrow('Untrusted renderer')
  })
  it('provides system info and toggles devtools', async () => {
    expect(h.call('system:getInfo')).toMatchObject({ platform: process.platform, arch: process.arch })
    h.call('window:toggleDevTools'); expect(h.contents.openDevTools).toHaveBeenCalledWith({ mode: 'detach' })
    h.contents.isDevToolsOpened.mockReturnValue(true)
    h.call('window:toggleDevTools'); expect(h.contents.closeDevTools).toHaveBeenCalledOnce()
  })
  it('approves successful open, preserves directory approval across valid saves', async () => {
    expect(await h.call('project:save', { projectDir: selected, bundle: h.bundle })).toMatchObject({ success: false })
    expect(await h.call('project:open')).toMatchObject({ projectDir: selected, bundle: h.bundle })
    expect(await h.call('project:save', { projectDir: selected, bundle: h.bundle })).toMatchObject({ success: true })
    expect(h.services.projectService.saveProject).toHaveBeenCalledWith(selected, h.bundle, undefined)
  })
  it('cancelled and failed opens do not approve directories', async () => {
    h.services.dialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [selected] })
    expect(await h.call('project:open')).toBeNull()
    h.services.dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [selected] })
    h.services.projectService.openProject.mockRejectedValue(new Error('corrupt'))
    expect(await h.call('project:open')).toBeNull()
    expect(h.services.dialog.showErrorBox).toHaveBeenCalledWith('Open Project Failed', 'corrupt')
    expect(await h.call('project:save', { projectDir: selected, bundle: h.bundle })).toMatchObject({ success: false })
  })
  it('approves Save As only after a successful write, returns cancellation and failures', async () => {
    const args = { defaultTitle: 'A/B', bundle: h.bundle, assetData: {} }
    h.services.dialog.showSaveDialog.mockResolvedValueOnce({ canceled: true })
    expect(await h.call('project:saveAs', args)).toBeNull()
    h.services.projectService.saveProject.mockResolvedValueOnce({ success: false, path: selected, error: 'full' })
    expect(await h.call('project:saveAs', args)).toMatchObject({ success: false })
    expect(await h.call('project:save', { projectDir: selected, bundle: h.bundle })).toMatchObject({ success: false })
    expect(await h.call('project:saveAs', args)).toMatchObject({ success: true })
    expect(await h.call('project:save', { projectDir: selected, bundle: h.bundle })).toMatchObject({ success: true })
    expect(h.services.dialog.showSaveDialog).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ defaultPath: 'A_B.canvasproject' }))
  })
  it.each([null, {}, { defaultTitle: 3, bundle: {} }, { defaultTitle: 'bad', bundle: { manifest: {}, sceneData: {} } }, { defaultTitle: 'bad', bundle: { manifest: createDefaultManifest(), sceneData: null } }, { defaultTitle: 'bad', bundle: { manifest: createDefaultManifest(), sceneData: { elements: [] } }, assetData: { a: '!!!' } }])('validates saves before showing dialogs: %j', async args => {
    expect(await h.call('project:saveAs', args)).toMatchObject({ success: false })
    expect(h.services.dialog.showSaveDialog).not.toHaveBeenCalled(); expect(h.services.projectService.saveProject).not.toHaveBeenCalled()
  })
  it.each([['asset:import', 'readAssetFile', 'dataUrl'], ['pdf:import', 'readPdfFile', 'pdfBase64']] as const)('imports through %s, handles cancellation and read failure', async (channel, method, field) => {
    expect(await h.call(channel)).toHaveProperty(field)
    h.services.dialog.showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] })
    expect(await h.call(channel)).toBeNull()
    h.services.projectService[method].mockRejectedValue(new Error('unreadable'))
    expect(await h.call(channel)).toBeNull(); expect(h.services.dialog.showErrorBox).toHaveBeenCalled()
  })
  it('exports decoded bytes, cancellation and filesystem failures', async () => {
    const args = { defaultFilename: 'diagram.png', dataBase64: 'YQ==', filters: [{ name: 'PNG', extensions: ['png'] }] }
    expect(await h.call('export:saveFile', args)).toEqual({ success: true, filePath: selected })
    expect(h.services.writeFile).toHaveBeenCalledWith(selected, Buffer.from('a'))
    h.services.dialog.showSaveDialog.mockResolvedValueOnce({ canceled: true })
    expect(await h.call('export:saveFile', args)).toEqual({ success: false, canceled: true })
    h.services.writeFile.mockRejectedValue(new Error('disk full'))
    expect(await h.call('export:saveFile', args)).toEqual({ success: false, error: 'disk full' })
  })
  it.each([null, {}, { defaultFilename: 'x', dataBase64: '!!', filters: [] }, { defaultFilename: 'x', dataBase64: 'YQ==', filters: [{ name: 'x', extensions: ['../png'] }] }])('rejects invalid export data: %j', async args => {
    expect(await h.call('export:saveFile', args)).toMatchObject({ success: false })
    expect(h.services.dialog.showSaveDialog).not.toHaveBeenCalled(); expect(h.services.writeFile).not.toHaveBeenCalled()
  })
  it('validates clipboard payloads including empty native images', () => {
    expect(h.call('clipboard:writeText', 'hello')).toBe(true)
    expect(h.call('clipboard:writeText', {})).toBe(false)
    expect(h.call('clipboard:writeImage', 'data:image/png;base64,YQ==')).toBe(true)
    for (const input of [null, 'data:image/svg+xml;base64,YQ==', 'http://image', 'data:image/png;base64,!!']) expect(h.call('clipboard:writeImage', input)).toBe(false)
    h.services.nativeImage.createFromDataURL.mockReturnValue({ isEmpty: () => true })
    expect(h.call('clipboard:writeImage', 'data:image/png;base64,YQ==')).toBe(false)
    expect(h.services.clipboard.writeImage).toHaveBeenCalledOnce()
  })
})
