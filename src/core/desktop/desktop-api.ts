import { CanvasProjectBundle, AssetEntry } from '../project/project-manifest'

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
