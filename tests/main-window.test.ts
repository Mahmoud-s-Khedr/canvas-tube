import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  ready: vi.fn(), lifecycle: vi.fn(), quit: vi.fn(), handlers: new Map<string, (...args: any[]) => void>(),
  window: { on: vi.fn(), show: vi.fn(), loadFile: vi.fn(), loadURL: vi.fn(), webContents: { setWindowOpenHandler: vi.fn(), on: vi.fn() } },
  constructor: vi.fn()
}))
vi.mock('electron', () => ({
  app: { commandLine: { appendSwitch: vi.fn() }, whenReady: () => ({ then: mocks.ready }), on: mocks.lifecycle, quit: mocks.quit },
  BrowserWindow: class { constructor(options: unknown) { mocks.constructor(options); return mocks.window } static getAllWindows() { return [] } },
  ipcMain: {}, dialog: {}, clipboard: {}, nativeImage: {}
}))
vi.mock('../src/main/ipc-handlers', () => ({ registerIpcHandlers: vi.fn() }))
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks(); delete process.env.ELECTRON_RENDERER_URL
  await import('../src/main/index'); mocks.ready.mock.calls[0][0]()
})
it('creates an isolated sandboxed window, denies navigation and new windows', () => {
  expect(mocks.constructor).toHaveBeenCalledWith(expect.objectContaining({ webPreferences: expect.objectContaining({ sandbox: true, contextIsolation: true, nodeIntegration: false }) }))
  expect(mocks.window.webContents.setWindowOpenHandler.mock.calls[0][0]()).toEqual({ action: 'deny' })
  const preventDefault = vi.fn(); mocks.window.webContents.on.mock.calls[0][1]({ preventDefault })
  expect(preventDefault).toHaveBeenCalledOnce()
  expect(mocks.window.loadFile).toHaveBeenCalledWith(expect.stringMatching(/renderer[\\/]index\.html$/))
  mocks.window.on.mock.calls.find(([name]) => name === 'ready-to-show')![1](); expect(mocks.window.show).toHaveBeenCalledOnce()
})
it('recreates windows on activation and quits on non-macOS shutdown', () => {
  const activate = mocks.lifecycle.mock.calls.find(([name]) => name === 'activate')![1]
  activate(); expect(mocks.constructor).toHaveBeenCalledTimes(2)
  mocks.lifecycle.mock.calls.find(([name]) => name === 'window-all-closed')![1]()
  if (process.platform !== 'darwin') expect(mocks.quit).toHaveBeenCalledOnce()
})
