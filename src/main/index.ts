import { app, BrowserWindow, ipcMain, dialog, clipboard, nativeImage } from 'electron'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { ProjectService } from './services/project-service'
import { registerIpcHandlers } from './ipc-handlers'
import { isWaylandEnv } from '../core/wayland/wayland-detector'

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

  const window = mainWindow
  mainWindow.on('closed', () => { if (mainWindow === window) mainWindow = null })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Keep the privileged preload bridge attached only to the application UI.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault())

  // Load renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// App lifecycle
app.whenReady().then(() => {
  registerIpcHandlers({ ipcMain, dialog, clipboard, nativeImage, projectService: ProjectService,
    writeFile: fs.promises.writeFile, getMainWindow: () => mainWindow })
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
