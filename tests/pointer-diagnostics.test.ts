import { describe, expect, it } from 'vitest'
import {
  createCanvasPointerSnapshot,
  type PointerDiagnosticEvent
} from '../src/core/canvas/pointer-diagnostics'

const pointerEvent = (overrides: Partial<PointerDiagnosticEvent> = {}): PointerDiagnosticEvent => ({
  pointerType: 'pen',
  button: 2,
  buttons: 3,
  pressure: 0.625,
  tiltX: 17,
  tiltY: -24,
  twist: 91,
  clientX: 150.4,
  clientY: 88.6,
  pointerId: 42,
  isPrimary: true,
  timeStamp: 1234.5,
  ...overrides
})

describe('pointer diagnostics snapshots', () => {
  it('captures every requested native pointer field for each PointerEvent type', () => {
    const screenToScene = (clientX: number, clientY: number) => ({
      x: clientX - 10.2,
      y: clientY + 5.4
    })

    const eventTypes = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'] as const
    const snapshots = eventTypes.map((eventType) =>
      createCanvasPointerSnapshot(pointerEvent(), eventType, screenToScene)
    )

    expect(snapshots.map((snapshot) => snapshot.eventType)).toEqual(eventTypes)
    expect(snapshots[0]).toEqual({
      eventType: 'pointerdown',
      pointerType: 'pen',
      button: 2,
      buttons: 3,
      pressure: 0.625,
      tiltX: 17,
      tiltY: -24,
      twist: 91,
      clientX: 150.4,
      clientY: 88.6,
      canvasX: 140,
      canvasY: 94,
      coalescedEventCount: 1,
      pointerId: 42,
      isPrimary: true,
      timestamp: 1234.5
    })
  })

  it('reports coalesced sample counts without turning zero into a diagnostic event count', () => {
    const screenToScene = () => ({ x: 0, y: 0 })

    expect(
      createCanvasPointerSnapshot(pointerEvent({ getCoalescedEvents: () => [{}, {}, {}] }), 'pointermove', screenToScene)
        .coalescedEventCount
    ).toBe(3)
    expect(
      createCanvasPointerSnapshot(pointerEvent({ getCoalescedEvents: () => [] }), 'pointermove', screenToScene)
        .coalescedEventCount
    ).toBe(1)
    expect(createCanvasPointerSnapshot(pointerEvent(), 'pointermove', screenToScene).coalescedEventCount).toBe(1)
  })
})
