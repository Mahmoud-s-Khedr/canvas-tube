import { contextBridge, ipcRenderer } from 'electron'
import {
  DesktopApi,
  OpenProjectResult,
  SaveProjectResult,
  ImportAssetResult,
  ImportPdfResult,
  SaveExportFileOptions,
  SaveExportFileResult,
  SystemInfo
} from '../core/desktop/desktop-api'
import { CanvasProjectBundle } from '../core/project/project-manifest'

const desktopApi: DesktopApi = {
  async openProject(): Promise<OpenProjectResult | null> {
    return ipcRenderer.invoke('project:open')
  },

  async saveProject(
    projectDir: string,
    bundle: CanvasProjectBundle,
    assetData: Record<string, string> = {}
  ): Promise<SaveProjectResult> {
    return ipcRenderer.invoke('project:save', { projectDir, bundle, assetData })
  },

  async saveProjectAs(
    defaultTitle: string,
    bundle: CanvasProjectBundle,
    assetData: Record<string, string> = {}
  ): Promise<SaveProjectResult | null> {
    return ipcRenderer.invoke('project:saveAs', { defaultTitle, bundle, assetData })
  },

  async importAsset(): Promise<ImportAssetResult | null> {
    return ipcRenderer.invoke('asset:import')
  },

  async importPdf(): Promise<ImportPdfResult | null> {
    return ipcRenderer.invoke('pdf:import')
  },

  async readDocumentFile(projectDir: string, relativePath: string): Promise<string | null> {
    return ipcRenderer.invoke('pdf:readDocument', { projectDir, relativePath })
  },

  async selectDirectory(): Promise<string | null> {
    return ipcRenderer.invoke('dialog:selectDirectory')
  },

  async saveExportFile(options: SaveExportFileOptions): Promise<SaveExportFileResult> {
    return ipcRenderer.invoke('export:saveFile', options)
  },

  async copyImageToClipboard(dataUrl: string): Promise<boolean> {
    return ipcRenderer.invoke('clipboard:writeImage', dataUrl)
  },

  async copyTextToClipboard(text: string): Promise<boolean> {
    return ipcRenderer.invoke('clipboard:writeText', text)
  },

  async getSystemInfo(): Promise<SystemInfo> {
    return ipcRenderer.invoke('system:getInfo')
  },

  async toggleDevTools(): Promise<void> {
    return ipcRenderer.invoke('window:toggleDevTools')
  }
}

try {
  contextBridge.exposeInMainWorld('desktopApi', desktopApi)
} catch (error) {
  console.error('Failed to expose desktopApi via contextBridge:', error)
}
