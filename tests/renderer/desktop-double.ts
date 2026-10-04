import { vi } from 'vitest'
import type { DesktopApi } from '../../src/core/desktop/desktop-api'

export function desktopDouble() {
  return {
    openProject: vi.fn<DesktopApi['openProject']>().mockResolvedValue(null),
    saveProject: vi.fn<DesktopApi['saveProject']>().mockResolvedValue({ success: true, path: '/project' }),
    saveProjectAs: vi.fn<DesktopApi['saveProjectAs']>().mockResolvedValue({ success: true, path: '/project' }),
    importAsset: vi.fn<DesktopApi['importAsset']>().mockResolvedValue(null),
    importPdf: vi.fn<DesktopApi['importPdf']>().mockResolvedValue(null),
    saveExportFile: vi.fn<DesktopApi['saveExportFile']>().mockResolvedValue({ success: true }),
    copyImageToClipboard: vi.fn<DesktopApi['copyImageToClipboard']>().mockResolvedValue(true),
    copyTextToClipboard: vi.fn<DesktopApi['copyTextToClipboard']>().mockResolvedValue(true),
    getSystemInfo: vi.fn<DesktopApi['getSystemInfo']>().mockResolvedValue({
      platform: 'linux', arch: 'x64', isWayland: false,
      electronVersion: '34', nodeVersion: '22', chromeVersion: '132'
    }),
    toggleDevTools: vi.fn<DesktopApi['toggleDevTools']>().mockResolvedValue(undefined)
  } satisfies DesktopApi
}
