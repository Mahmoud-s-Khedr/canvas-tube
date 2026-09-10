import { Bounds } from '../canvas/canvas-adapter'

export type ExportFormat = 'png' | 'svg'

export type ExportScope = 'all' | 'selection' | 'viewport' | 'custom'

export type ExportResolutionPreset = '1x' | '2x' | '3x' | '4x' | '4k' | '8k' | 'custom'

export type ExportBackgroundMode = 'dark' | 'light' | 'transparent'

export interface CanvasExportConfig {
  format: ExportFormat
  scope: ExportScope
  resolutionPreset: ExportResolutionPreset
  scale?: number
  customWidth?: number
  customHeight?: number
  backgroundMode: ExportBackgroundMode
  backgroundColor?: string
  padding?: number
  customBounds?: Bounds
}

export interface CalculatedDimensions {
  width: number
  height: number
  scale: number
}

export interface CanvasExportResult {
  format: ExportFormat
  blob?: Blob
  svgString?: string
  dataUrl?: string
  width: number
  height: number
  scale: number
}

/**
 * 4K UHD standard width: 3840px
 * 8K FUHD standard width: 7680px
 */
export const RESOLUTION_PRESETS: Record<
  Exclude<ExportResolutionPreset, 'custom'>,
  { label: string; scale?: number; targetWidth?: number; description: string }
> = {
  '1x': { label: '1x (Standard)', scale: 1, description: 'Standard native display resolution' },
  '2x': { label: '2x (Retina)', scale: 2, description: 'High-DPI crisp presentation scale' },
  '3x': { label: '3x (Print)', scale: 3, description: 'Sharper vector-to-raster quality' },
  '4x': { label: '4x (Ultra HD)', scale: 4, description: 'Ultra-high detail rasterization' },
  '4k': { label: '4K UHD (3840px)', targetWidth: 3840, description: '3840px wide 4K video thumbnail preset' },
  '8k': { label: '8K FUHD (7680px)', targetWidth: 7680, description: '7680px wide maximum resolution' }
}

/**
 * Calculates output pixel dimensions and scale factor given base bounding dimensions
 * and the requested resolution preset or custom scale/width.
 */
export function calculateExportDimensions(
  baseWidth: number,
  baseHeight: number,
  preset: ExportResolutionPreset = '2x',
  customScale = 1,
  customWidth?: number
): CalculatedDimensions {
  const safeBaseW = Math.max(1, Math.round(baseWidth))
  const safeBaseH = Math.max(1, Math.round(baseHeight))
  const aspectRatio = safeBaseW / safeBaseH

  let scale = 1

  switch (preset) {
    case '1x':
      scale = 1
      break
    case '2x':
      scale = 2
      break
    case '3x':
      scale = 3
      break
    case '4x':
      scale = 4
      break
    case '4k': {
      const targetW = 3840
      scale = Math.max(0.1, targetW / safeBaseW)
      break
    }
    case '8k': {
      const targetW = 7680
      scale = Math.max(0.1, targetW / safeBaseW)
      break
    }
    case 'custom': {
      if (customWidth && customWidth > 0) {
        scale = Math.max(0.1, customWidth / safeBaseW)
      } else if (customScale && customScale > 0) {
        scale = customScale
      } else {
        scale = 1
      }
      break
    }
    default:
      scale = 2
  }

  // Cap extreme scales to prevent browser memory crashes (e.g. max scale 30 or max dimension 16384)
  const MAX_DIMENSION = 16384
  let targetWidth = Math.round(safeBaseW * scale)
  let targetHeight = Math.round(safeBaseH * scale)

  if (targetWidth > MAX_DIMENSION) {
    targetWidth = MAX_DIMENSION
    targetHeight = Math.round(targetWidth / aspectRatio)
    scale = targetWidth / safeBaseW
  }

  if (targetHeight > MAX_DIMENSION) {
    targetHeight = MAX_DIMENSION
    targetWidth = Math.round(targetHeight * aspectRatio)
    scale = targetHeight / safeBaseH
  }

  return {
    width: Math.max(1, targetWidth),
    height: Math.max(1, targetHeight),
    scale: Number(scale.toFixed(4))
  }
}
