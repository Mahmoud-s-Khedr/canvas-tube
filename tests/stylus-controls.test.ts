import { describe, expect, it } from 'vitest'
import {
  DEFAULT_STYLUS_PREFERENCES,
  getPenContactTool,
  isPenEraser,
  shouldRejectPointerForPalm,
  shouldUseMomentaryEraser
} from '../src/core/canvas/stylus-controls'

describe('stylus controls', () => {
  it('defaults pen contact to freehand ink without changing mouse behavior', () => {
    expect(
      getPenContactTool({ pointerType: 'pen', button: 0, buttons: 1 }, DEFAULT_STYLUS_PREFERENCES)
    ).toBe('freedraw')
    expect(
      getPenContactTool({ pointerType: 'mouse', button: 0, buttons: 1 }, DEFAULT_STYLUS_PREFERENCES)
    ).toBeNull()
  })

  it('recognizes both a physical eraser end and configured barrel switches', () => {
    expect(isPenEraser({ pointerType: 'pen', button: 5, buttons: 32 })).toBe(true)
    expect(isPenEraser({ pointerType: 'pen', button: 0, buttons: 1 })).toBe(false)
    expect(
      shouldUseMomentaryEraser({ pointerType: 'pen', button: 2, buttons: 2 }, true)
    ).toBe(true)
    expect(
      shouldUseMomentaryEraser({ pointerType: 'pen', button: 2, buttons: 2 }, false)
    ).toBe(false)
  })

  it('only rejects touch while an active pen needs palm protection', () => {
    expect(shouldRejectPointerForPalm('touch', 1, true)).toBe(true)
    expect(shouldRejectPointerForPalm('touch', 0, true)).toBe(false)
    expect(shouldRejectPointerForPalm('pen', 1, true)).toBe(false)
    expect(shouldRejectPointerForPalm('touch', 1, false)).toBe(false)
  })
})
