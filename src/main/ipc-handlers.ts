import type { BrowserWindow, IpcMain, Dialog, Clipboard, NativeImage, IpcMainInvokeEvent } from 'electron'
import * as path from 'node:path'
import type { ProjectService } from './services/project-service'
import { CanvasProjectBundle, validateProjectManifest } from '../core/project/project-manifest'
import { detectCompositor, isWaylandEnv } from '../core/wayland/wayland-detector'
import { isValidBase64, assetBase64 } from '../core/assets/base64'

export interface IpcServices {
  ipcMain: Pick<IpcMain, 'handle'>
  dialog: Pick<Dialog, 'showOpenDialog' | 'showSaveDialog' | 'showErrorBox'>
  clipboard: Pick<Clipboard, 'writeImage' | 'writeText'>
  nativeImage: { createFromDataURL(dataUrl: string): NativeImage }
  projectService: Pick<typeof ProjectService, 'openProject' | 'saveProject' | 'readAssetFile' | 'readPdfFile'>
  writeFile: (filePath: string, buffer: Buffer) => Promise<unknown>
  getMainWindow: () => BrowserWindow | null
}

function isWaylandSession(): boolean { return isWaylandEnv(process.env) }

function record(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function validateSaveArgs(args: unknown): string | undefined {
  if (!record(args) || !record(args.bundle)) return 'Invalid bundle'
  const validation = validateProjectManifest(args.bundle.manifest)
  if (!validation.valid) return `Invalid project manifest: ${validation.error}`
  const manifest = args.bundle.manifest
  if (manifest.canvas.adapter !== 'excalidraw' || !record(manifest.assets)) return 'Invalid manifest configuration'
  if (manifest.documents.some((doc: unknown) => !record(doc) || typeof doc.assetId !== 'string' || typeof doc.id !== 'string' || typeof doc.filename !== 'string' || !Number.isInteger(doc.pageCount) || doc.pageCount < 0)) return 'Invalid document entry'
  if (Object.values(manifest.assets).some((asset: unknown) => !record(asset) || typeof asset.id !== 'string' || typeof asset.relativePath !== 'string' || !asset.relativePath || path.isAbsolute(asset.relativePath) || path.win32.isAbsolute(asset.relativePath) || asset.relativePath.split(/[\\/]/).includes('..') || typeof asset.originalFilename !== 'string' || typeof asset.mimeType !== 'string' || !/^[a-f0-9]{64}$/.test(asset.hash) || !Number.isInteger(asset.sizeBytes) || asset.sizeBytes < 0)) return 'Invalid asset entry'
  const scene = args.bundle.sceneData
  if (!record(scene) || !Array.isArray(scene.elements) || (scene.appState !== undefined && !record(scene.appState)) || (scene.files !== undefined && !record(scene.files))) return 'Invalid scene'
  if (args.assetData !== undefined) {
    if (!record(args.assetData)) return 'Invalid asset data'
    try {
      for (const [id, encoded] of Object.entries(args.assetData)) {
        if (!manifest.assets[id] || typeof encoded !== 'string') return 'Invalid asset data'
        assetBase64(encoded)
      }
    } catch { return 'Invalid Base64 asset data' }
  }
}

function validExportArgs(args: unknown): boolean {
  return record(args) && typeof args.defaultFilename === 'string' && args.defaultFilename.length > 0 &&
    isValidBase64(args.dataBase64) && Array.isArray(args.filters) && args.filters.every((filter: unknown) =>
      record(filter) && typeof filter.name === 'string' && Array.isArray(filter.extensions) &&
      filter.extensions.length > 0 && filter.extensions.every((ext: unknown) => typeof ext === 'string' && /^[a-zA-Z0-9]+$/.test(ext)))
}

export function registerIpcHandlers(services: IpcServices): void {
  const { dialog, clipboard, nativeImage, projectService: ProjectService, writeFile, getMainWindow } = services
  const approvedProjectDirectories = new Set<string>()
  const approveProjectDirectory = (dir: string) => {
    const resolved = path.resolve(dir)
    approvedProjectDirectories.add(resolved)
    return resolved
  }
  const isApprovedProjectDirectory = (dir: string) => approvedProjectDirectories.has(path.resolve(dir))
  const isMainRenderer = (event: IpcMainInvokeEvent) => {
    const window = getMainWindow()
    return Boolean(window && event.sender === window.webContents && event.senderFrame === window.webContents.mainFrame)
  }
  // One gate covers every current and future registered channel, before any side effect.
  const ipcMain = {
    handle(channel: string, handler: (event: IpcMainInvokeEvent, ...args: any[]) => unknown) {
      services.ipcMain.handle(channel, (event, ...args) => {
        if (!isMainRenderer(event)) throw new Error('Untrusted renderer')
        return handler(event, ...args)
      })
    }
  }
  ipcMain.handle('system:getInfo', () => {
    const compositor = detectCompositor(process.env)
    return {
      platform: process.platform,
      arch: process.arch,
      isWayland: isWaylandSession(),
      compositor: compositor.name,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome
    }
  })

  ipcMain.handle('window:toggleDevTools', () => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools()
    } else {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
  })

  ipcMain.handle('project:open', async () => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open Canvas Project Folder',
      properties: ['openDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const projectDir = result.filePaths[0]
    try {
      const opened = await ProjectService.openProject(projectDir)
      return { ...opened, projectDir: approveProjectDirectory(opened.projectDir) }
    } catch (err) {
      dialog.showErrorBox('Open Project Failed', err instanceof Error ? err.message : 'Unknown error')
      return null
    }
  })

  ipcMain.handle(
    'project:save',
    async (
      _event,
      args: { projectDir: string; bundle: CanvasProjectBundle; assetData?: Record<string, string> }
    ) => {
      if (!args || typeof args.projectDir !== 'string' || validateSaveArgs(args)) {
        return { success: false, error: 'Invalid save arguments' }
      }
      if (!isApprovedProjectDirectory(args.projectDir)) {
        return { success: false, error: 'Project directory was not selected through CanvasTube' }
      }

      const validation = validateProjectManifest(args.bundle.manifest)
      if (!validation.valid) {
        return { success: false, error: `Invalid project manifest: ${validation.error}` }
      }

      return ProjectService.saveProject(path.resolve(args.projectDir), args.bundle, args.assetData)
    }
  )

  ipcMain.handle(
    'project:saveAs',
    async (
      _event,
      args: { defaultTitle: string; bundle: CanvasProjectBundle; assetData?: Record<string, string> }
    ) => {
      const mainWindow = getMainWindow()
      if (!mainWindow) return null
      const error = validateSaveArgs(args)
      if (error || typeof args?.defaultTitle !== 'string') return { success: false, error: error || 'Invalid title' }
      const defaultName = (args?.defaultTitle || 'untitled').replace(/[^a-zA-Z0-9_-]/g, '_')
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Project As',
        defaultPath: `${defaultName}.canvasproject`,
        properties: ['showOverwriteConfirmation', 'createDirectory']
      })

      if (result.canceled || !result.filePath) {
        return null
      }

      const validation = validateProjectManifest(args.bundle.manifest)
      if (!validation.valid) {
        return { success: false, error: `Invalid project manifest: ${validation.error}` }
      }

      const projectDir = path.resolve(result.filePath)
      const saved = await ProjectService.saveProject(projectDir, args.bundle, args.assetData)
      if (saved.success) approveProjectDirectory(projectDir)
      return saved
    }
  )

  ipcMain.handle('asset:import', async () => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Image Asset',
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    try {
      return await ProjectService.readAssetFile(result.filePaths[0])
    } catch (err) {
      dialog.showErrorBox('Import Asset Failed', err instanceof Error ? err.message : 'Unknown error')
      return null
    }
  })

  ipcMain.handle('pdf:import', async () => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import PDF Document or Slide Deck',
      filters: [
        { name: 'PDF Documents', extensions: ['pdf'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    try {
      return await ProjectService.readPdfFile(result.filePaths[0])
    } catch (err) {
      dialog.showErrorBox('Import PDF Failed', err instanceof Error ? err.message : 'Unknown error')
      return null
    }
  })

  // Export File IPC Handler (Native Save Dialog & Atomic Write)
  ipcMain.handle(
    'export:saveFile',
    async (
      _event,
      args: {
        defaultFilename: string
        dataBase64: string
        filters: Array<{ name: string; extensions: string[] }>
      }
    ) => {
      const mainWindow = getMainWindow()
      if (!mainWindow) return { success: false, error: 'No main window available' }
      if (!validExportArgs(args)) return { success: false, error: 'Invalid export arguments' }
      try {
        const result = await dialog.showSaveDialog(mainWindow, {
          title: 'Export Diagram',
          defaultPath: args.defaultFilename,
          filters: args.filters,
          properties: ['showOverwriteConfirmation']
        })

        if (result.canceled || !result.filePath) {
          return { success: false, canceled: true }
        }

        const buffer = Buffer.from(args.dataBase64, 'base64')
        await writeFile(result.filePath, buffer)
        return { success: true, filePath: result.filePath }
      } catch (err) {
        dialog.showErrorBox('Export Failed', err instanceof Error ? err.message : 'Unknown error')
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
      }
    }
  )

  // System Clipboard IPC Handlers (Wayland, X11, and Windows native clipboard)
  ipcMain.handle('clipboard:writeImage', (_event, dataUrl: string) => {
    if (typeof dataUrl !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(dataUrl) || !isValidBase64(dataUrl.split(',')[1])) return false
    try {
      const image = nativeImage.createFromDataURL(dataUrl)
      if (image.isEmpty()) return false
      clipboard.writeImage(image)
      return true
    } catch (err) {
      console.error('[clipboard:writeImage] Failed:', err)
      return false
    }
  })

  ipcMain.handle('clipboard:writeText', (_event, text: string) => {
    if (typeof text !== 'string') return false
    try {
      clipboard.writeText(text)
      return true
    } catch (err) {
      console.error('[clipboard:writeText] Failed:', err)
      return false
    }
  })
}

