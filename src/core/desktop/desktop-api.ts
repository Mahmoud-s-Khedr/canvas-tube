import { CanvasProjectBundle, AssetEntry, DocumentEntry } from '../project/project-manifest'

export interface SaveProjectResult {
  success: boolean
  path?: string
  error?: string
}

export interface OpenProjectResult {
  projectDir: string
  bundle: CanvasProjectBundle
}

export interface ImportAssetResult {
  asset: AssetEntry
  dataUrl: string
}

export interface ImportPdfResult {
  asset: AssetEntry
  document: DocumentEntry
  pdfBase64: string
}

export interface SystemInfo {
  platform: string
  arch: string
  isWayland: boolean
  electronVersion: string
  nodeVersion: string
  chromeVersion: string
}

export interface DesktopApi {
  openProject(): Promise<OpenProjectResult | null>
  saveProject(projectDir: string, bundle: CanvasProjectBundle): Promise<SaveProjectResult>
  saveProjectAs(defaultTitle: string, bundle: CanvasProjectBundle): Promise<SaveProjectResult | null>
  importAsset(): Promise<ImportAssetResult | null>
  importPdf(): Promise<ImportPdfResult | null>
  readDocumentFile(projectDir: string, relativePath: string): Promise<string | null>
  selectDirectory(): Promise<string | null>
  getSystemInfo(): Promise<SystemInfo>
  toggleDevTools(): Promise<void>
}

declare global {
  interface Window {
    desktopApi?: DesktopApi
    EXCALIDRAW_ASSET_PATH?: string
  }
}
