import { CanvasProjectBundle, AssetEntry, DocumentEntry } from '../project/project-manifest'

export interface SaveProjectResult {
  success: boolean
  path?: string
  error?: string
}

export interface OpenProjectResult {
  projectDir: string
  bundle: CanvasProjectBundle
  /** Base64-encoded source bytes for project assets, keyed by manifest asset id. */
  assetData: Record<string, string>
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

export interface SaveExportFileOptions {
  defaultFilename: string
  dataBase64: string
  filters: Array<{ name: string; extensions: string[] }>
}

export interface SaveExportFileResult {
  success: boolean
  filePath?: string
  canceled?: boolean
  error?: string
}

export interface SystemInfo {
  platform: string
  arch: string
  isWayland: boolean
  compositor?: string
  electronVersion: string
  nodeVersion: string
  chromeVersion: string
}

export interface DesktopApi {
  openProject(): Promise<OpenProjectResult | null>
  saveProject(
    projectDir: string,
    bundle: CanvasProjectBundle,
    assetData?: Record<string, string>
  ): Promise<SaveProjectResult>
  saveProjectAs(
    defaultTitle: string,
    bundle: CanvasProjectBundle,
    assetData?: Record<string, string>
  ): Promise<SaveProjectResult | null>
  importAsset(): Promise<ImportAssetResult | null>
  importPdf(): Promise<ImportPdfResult | null>
  readDocumentFile(projectDir: string, relativePath: string): Promise<string | null>
  selectDirectory(): Promise<string | null>
  saveExportFile(options: SaveExportFileOptions): Promise<SaveExportFileResult>
  copyImageToClipboard(dataUrl: string): Promise<boolean>
  copyTextToClipboard(text: string): Promise<boolean>
  getSystemInfo(): Promise<SystemInfo>
  toggleDevTools(): Promise<void>
}

declare global {
  interface Window {
    desktopApi?: DesktopApi
    EXCALIDRAW_ASSET_PATH?: string
  }
}
