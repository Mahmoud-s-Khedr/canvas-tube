import type { CanvasPointerSnapshot, Point } from './canvas-adapter'

export type CanvasPointerEventType = CanvasPointerSnapshot['eventType']

/** The native PointerEvent fields used by the opt-in Inspector. */
export interface PointerDiagnosticEvent {
  pointerType: string
  button: number
  buttons: number
  pressure: number
  tiltX: number
  tiltY: number
  twist: number
  clientX: number
  clientY: number
  pointerId: number
  isPrimary: boolean
  timeStamp: number
  getCoalescedEvents?: () => readonly unknown[]
}

/**
 * Captures one diagnostic record for a received browser PointerEvent. Coalesced
 * samples are deliberately counted but never replayed or transformed.
 */
export const createCanvasPointerSnapshot = (
  event: PointerDiagnosticEvent,
  eventType: CanvasPointerEventType,
  screenToScene: (clientX: number, clientY: number) => Point
): CanvasPointerSnapshot => {
  const point = screenToScene(event.clientX, event.clientY)
  // Some implementations expose an empty array. A received event still counts
  // as one diagnostic event, so never report a misleading zero.
  const coalescedEventCount = Math.max(event.getCoalescedEvents?.().length ?? 1, 1)

  return {
    eventType,
    pointerType: event.pointerType,
    button: event.button,
    pressure: event.pressure,
    tiltX: event.tiltX,
    tiltY: event.tiltY,
    twist: event.twist,
    clientX: event.clientX,
    clientY: event.clientY,
    canvasX: Math.round(point.x),
    canvasY: Math.round(point.y),
    buttons: event.buttons,
    coalescedEventCount,
    pointerId: event.pointerId,
    isPrimary: event.isPrimary,
    timestamp: event.timeStamp
  }
}
