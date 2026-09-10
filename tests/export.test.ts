import { describe, it, expect } from 'vitest'
import {
  calculateExportDimensions,
  RESOLUTION_PRESETS,
  CanvasExportConfig,
  ExportFormat,
  ExportScope
} from '../src/core/export/export-types'

describe('calculateExportDimensions', () => {
  it('calculates standard scale presets correctly', () => {
    const baseW = 1000
    const baseH = 500

    const res1x = calculateExportDimensions(baseW, baseH, '1x')
    expect(res1x.width).toBe(1000)
    expect(res1x.height).toBe(500)
    expect(res1x.scale).toBe(1)

    const res2x = calculateExportDimensions(baseW, baseH, '2x')
    expect(res2x.width).toBe(2000)
    expect(res2x.height).toBe(1000)
    expect(res2x.scale).toBe(2)

    const res3x = calculateExportDimensions(baseW, baseH, '3x')
    expect(res3x.width).toBe(3000)
    expect(res3x.height).toBe(1500)
    expect(res3x.scale).toBe(3)

    const res4x = calculateExportDimensions(baseW, baseH, '4x')
    expect(res4x.width).toBe(4000)
    expect(res4x.height).toBe(2000)
    expect(res4x.scale).toBe(4)
  })

  it('calculates 4K UHD preset to 3840px width maintaining aspect ratio', () => {
    const baseW = 1920
    const baseH = 1080
    const res4k = calculateExportDimensions(baseW, baseH, '4k')

    expect(res4k.width).toBe(3840)
    expect(res4k.height).toBe(2160)
    expect(res4k.scale).toBe(2)
  })

  it('calculates 8K FUHD preset to 7680px width maintaining aspect ratio', () => {
    const baseW = 1920
    const baseH = 1080
    const res8k = calculateExportDimensions(baseW, baseH, '8k')

    expect(res8k.width).toBe(7680)
    expect(res8k.height).toBe(4320)
    expect(res8k.scale).toBe(4)
  })

  it('handles custom resolution scale factor', () => {
    const resCustom = calculateExportDimensions(800, 600, 'custom', 2.5)
    expect(resCustom.width).toBe(2000)
    expect(resCustom.height).toBe(1500)
    expect(resCustom.scale).toBe(2.5)
  })

  it('handles custom target width override', () => {
    const resCustomW = calculateExportDimensions(1000, 500, 'custom', 1, 2500)
    expect(resCustomW.width).toBe(2500)
    expect(resCustomW.height).toBe(1250)
    expect(resCustomW.scale).toBe(2.5)
  })

  it('handles zero or negative dimensions safely without dividing by zero', () => {
    const resZero = calculateExportDimensions(0, 0, '2x')
    expect(resZero.width).toBeGreaterThanOrEqual(1)
    expect(resZero.height).toBeGreaterThanOrEqual(1)
    expect(Number.isFinite(resZero.scale)).toBe(true)
  })

  it('caps extreme output dimension at 16384 to safeguard browser canvas memory', () => {
    const resExtreme = calculateExportDimensions(10000, 5000, 'custom', 10)
    expect(resExtreme.width).toBeLessThanOrEqual(16384)
    expect(resExtreme.height).toBeLessThanOrEqual(16384)
  })

  it('verifies all expected resolution presets are listed', () => {
    expect(RESOLUTION_PRESETS['1x']).toBeDefined()
    expect(RESOLUTION_PRESETS['2x']).toBeDefined()
    expect(RESOLUTION_PRESETS['3x']).toBeDefined()
    expect(RESOLUTION_PRESETS['4x']).toBeDefined()
    expect(RESOLUTION_PRESETS['4k']).toBeDefined()
    expect(RESOLUTION_PRESETS['8k']).toBeDefined()
  })

  it('validates config object integrity', () => {
    const config: CanvasExportConfig = {
      format: 'png',
      scope: 'custom',
      resolutionPreset: '4k',
      backgroundMode: 'transparent',
      padding: 0,
      customBounds: { x: 100, y: 100, width: 800, height: 600 }
    }

    expect(config.format).toBe<ExportFormat>('png')
    expect(config.scope).toBe<ExportScope>('custom')
    expect(config.customBounds?.width).toBe(800)
  })
})
