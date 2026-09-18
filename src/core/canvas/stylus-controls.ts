import type { CanvasToolType } from './canvas-adapter'

/**
 * Preferences for the small amount of policy that sits on top of the browser's
 * native Pointer Events support.  Pressure and tilt deliberately remain native
 * so that tablet drivers can provide their full resolution to Excalidraw.
 */
export interface StylusPreferences {
  /** Ignore fingers while a pen is in range/contact to avoid palm marks. */
  palmRejection: boolean
  /** Treat either pen barrel switch as a momentary eraser. */
  barrelButtonEraser: boolean
}

export const DEFAULT_STYLUS_PREFERENCES: StylusPreferences = {
  palmRejection: true,
  barrelButtonEraser: true
}

export interface PointerButtonState {
  pointerType: string
  button: number
  buttons: number
}

// Pointer Events reserves button 5 / bit 32 for an eraser end of a pen.
const PEN_ERASER_BUTTON = 5
const PEN_ERASER_BUTTON_MASK = 32
const PEN_BARREL_BUTTON_MASK = 2 | 4

export function shouldRejectPointerForPalm(
  pointerType: string,
  activePenCount: number,
  palmRejectionEnabled: boolean
): boolean {
  return palmRejectionEnabled && activePenCount > 0 && pointerType === 'touch'
}

export function isPenEraser(pointer: PointerButtonState): boolean {
  return (
    pointer.pointerType === 'pen' &&
    (pointer.button === PEN_ERASER_BUTTON || (pointer.buttons & PEN_ERASER_BUTTON_MASK) !== 0)
  )
}

export function shouldUseMomentaryEraser(
  pointer: PointerButtonState,
  barrelButtonEraserEnabled: boolean
): boolean {
  return (
    isPenEraser(pointer) ||
    (pointer.pointerType === 'pen' &&
      barrelButtonEraserEnabled &&
      (pointer.buttons & PEN_BARREL_BUTTON_MASK) !== 0)
  )
}

export function getPenContactTool(
  pointer: PointerButtonState,
  preferences: StylusPreferences
): CanvasToolType | null {
  if (pointer.pointerType !== 'pen') return null
  if (shouldUseMomentaryEraser(pointer, preferences.barrelButtonEraser)) return 'eraser'
  return null
}
