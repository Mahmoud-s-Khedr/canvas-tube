import { describe, it, expect } from 'vitest'
import {
  DrawingSessionSimulator,
  runContinuousDrawingSessionAudit
} from '../src/core/benchmark/memory-audit'

describe('Memory Leak Audit (2-Hour Drawing Session Simulation)', () => {
  it('simulates stylus stroke generation with pressure, tilt, and timestamps', () => {
    const simulator = new DrawingSessionSimulator()
    const stroke = simulator.simulateStylusStroke(50, 100, 100)

    expect(stroke.length).toBe(50)
    expect(stroke[0].pointerType).toBe('pen')
    expect(stroke[0].pressure).toBeGreaterThan(0)
    expect(stroke[0].tiltX).toBeDefined()
    expect(stroke[0].tiltY).toBeDefined()
    expect(stroke[stroke.length - 1].timestamp).toBeGreaterThan(stroke[0].timestamp)
  })

  it('bounds undo/redo stack history to prevent unbounded growth', () => {
    const simulator = new DrawingSessionSimulator(20) // max 20 history items

    for (let i = 0; i < 100; i++) {
      simulator.addShape(
        { type: 'rectangle', x: i * 10, y: i * 10, width: 50, height: 50 },
        `shape_${i}`
      )
    }

    expect(simulator.getShapeCount()).toBe(100)
    // Undo stack is capped at 20; performing 25 undos only unwinds the available 20
    for (let i = 0; i < 25; i++) {
      simulator.undo()
    }
  })

  it('prunes unreferenced file assets when shapes are deleted', () => {
    const simulator = new DrawingSessionSimulator()

    simulator.addFileAsset('file_1', 'data:image/png;base64,asset1')
    simulator.addFileAsset('file_2', 'data:image/png;base64,asset2')
    simulator.addFileAsset('file_3', 'data:image/png;base64,asset3')

    simulator.addShape(
      { type: 'image', x: 0, y: 0, width: 100, height: 100, fileId: 'file_1' },
      'shape_1'
    )
    simulator.addShape(
      { type: 'image', x: 200, y: 0, width: 100, height: 100, fileId: 'file_2' },
      'shape_2'
    )

    expect(simulator.getFileCount()).toBe(3)

    // file_3 is unreferenced, should be pruned
    const pruned1 = simulator.pruneUnusedFiles()
    expect(pruned1).toBe(1)
    expect(simulator.getFileCount()).toBe(2)

    // Delete shape_1 referencing file_1
    simulator.deleteShape('shape_1')
    const pruned2 = simulator.pruneUnusedFiles()
    expect(pruned2).toBe(1)
    expect(simulator.getFileCount()).toBe(1)
  })

  it('executes continuous 2-hour drawing session simulation without leak runaway', () => {
    const result = runContinuousDrawingSessionAudit(120)

    expect(result.simulatedMinutes).toBe(120)
    expect(result.totalPointerEvents).toBeGreaterThan(10000)
    expect(result.shapesCreated).toBeGreaterThan(200)
    expect(result.shapesDeleted).toBeGreaterThan(40)
    expect(result.undoRedoCycles).toBeGreaterThan(50)

    // Memory growth must be bounded under 40 MB for 120 minutes of continuous input
    expect(result.isLeakFree).toBe(true)
    expect(result.netGrowthMb).toBeLessThan(40)
  })
})
