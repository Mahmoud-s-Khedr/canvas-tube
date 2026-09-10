import { app, BrowserWindow, ipcMain, dialog, clipboard, nativeImage } from 'electron'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { ProjectService } from './services/project-service'
import { CanvasProjectBundle, validateProjectManifest } from '../core/project/project-manifest'
import { detectCompositor, isWaylandEnv } from '../core/wayland/wayland-detector'

let mainWindow: BrowserWindow | null = null

function isWaylandSession(): boolean {
  return isWaylandEnv(process.env)
}

// Configure Linux Wayland Ozone switches before app is ready
if (process.platform === 'linux') {
  if (isWaylandSession() || process.env.ELECTRON_OZONE_PLATFORM_HINT === 'wayland') {
    app.commandLine.appendSwitch('ozone-platform-hint', 'auto')
    app.commandLine.appendSwitch('enable-features', 'UseOzonePlatform,WaylandWindowDecorations')
    app.commandLine.appendSwitch('enable-pointer-lock-options')
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'CanvasTube — Offline Technical Explanation Workspace',
    backgroundColor: '#121212',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Load renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function setupIpcHandlers(): void {
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
    if (!mainWindow) return
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools()
    } else {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
  })

  ipcMain.handle('dialog:selectDirectory', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Project Directory',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  ipcMain.handle('project:open', async () => {
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
      return opened
    } catch (err) {
      dialog.showErrorBox('Open Project Failed', err instanceof Error ? err.message : 'Unknown error')
      return null
    }
  })

  ipcMain.handle(
    'project:save',
    async (_event, args: { projectDir: string; bundle: CanvasProjectBundle }) => {
      if (!args || typeof args.projectDir !== 'string' || !args.bundle) {
        return { success: false, error: 'Invalid save arguments' }
      }

      const validation = validateProjectManifest(args.bundle.manifest)
      if (!validation.valid) {
        return { success: false, error: `Invalid project manifest: ${validation.error}` }
      }

      return ProjectService.saveProject(args.projectDir, args.bundle)
    }
  )

  ipcMain.handle(
    'project:saveAs',
    async (_event, args: { defaultTitle: string; bundle: CanvasProjectBundle }) => {
      if (!mainWindow) return null
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

      return ProjectService.saveProject(result.filePath, args.bundle)
    }
  )

  ipcMain.handle('asset:import', async () => {
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

  ipcMain.handle('pdf:readDocument', async (_event, args: { projectDir: string; relativePath: string }) => {
    if (!args || !args.projectDir || !args.relativePath) return null
    try {
      return await ProjectService.readDocumentFile(args.projectDir, args.relativePath)
    } catch (err) {
      console.error('[pdf:readDocument] Failed:', err)
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
      if (!mainWindow) return { success: false, error: 'No main window available' }
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
        await fs.promises.writeFile(result.filePath, buffer)
        return { success: true, filePath: result.filePath }
      } catch (err) {
        dialog.showErrorBox('Export Failed', err instanceof Error ? err.message : 'Unknown error')
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
      }
    }
  )

  // System Clipboard IPC Handlers (Wayland, X11, and Windows native clipboard)
  ipcMain.handle('clipboard:writeImage', (_event, dataUrl: string) => {
    try {
      const image = nativeImage.createFromDataURL(dataUrl)
      clipboard.writeImage(image)
      return true
    } catch (err) {
      console.error('[clipboard:writeImage] Failed:', err)
      return false
    }
  })

  ipcMain.handle('clipboard:writeText', (_event, text: string) => {
    try {
      clipboard.writeText(text)
      return true
    } catch (err) {
      console.error('[clipboard:writeText] Failed:', err)
      return false
    }
  })
}

// App lifecycle
app.whenReady().then(() => {
  setupIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
