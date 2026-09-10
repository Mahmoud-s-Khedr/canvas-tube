import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import * as path from 'node:path'
import { ProjectService } from './services/project-service'
import { CanvasProjectBundle, validateProjectManifest } from '../core/project/project-manifest'

let mainWindow: BrowserWindow | null = null

function isWaylandSession(): boolean {
  return process.env.XDG_SESSION_TYPE === 'wayland' || Boolean(process.env.WAYLAND_DISPLAY)
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
    return {
      platform: process.platform,
      arch: process.arch,
      isWayland: isWaylandSession(),
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
