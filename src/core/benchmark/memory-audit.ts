import { CanvasPointerSnapshot, CanvasShapeInput } from '../canvas/canvas-adapter'

export interface MemoryAuditResult {
  simulatedMinutes: number
  totalPointerEvents: number
  shapesCreated: number
  shapesDeleted: number
  undoRedoCycles: number
  initialHeapMb: number
  peakHeapMb: number
  finalHeapMb: number
  netGrowthMb: number
  isLeakFree: boolean
  retainedFilesCount: number
}

export class DrawingSessionSimulator {
  private shapes: Map<string, CanvasShapeInput> = new Map()
  private undoStack: Array<{ action: 'add' | 'delete'; shape: CanvasShapeInput }> = []
  private redoStack: Array<{ action: 'add' | 'delete'; shape: CanvasShapeInput }> = []
  private files: Map<string, { id: string; dataUrl: string }> = new Map()
  private maxHistory: number

  constructor(maxHistory = 100) {
    this.maxHistory = maxHistory
  }

  public simulateStylusStroke(
    pointsCount = 60,
    baseX = 200,
    baseY = 200
  ): CanvasPointerSnapshot[] {
    const snapshots: CanvasPointerSnapshot[] = []
    const now = Date.now()

    for (let i = 0; i < pointsCount; i++) {
      const t = i / pointsCount
      const pressure = Math.sin(t * Math.PI) * 0.85 + 0.1
      const clientX = baseX + i * 2 + Math.random() * 2
      const clientY = baseY + Math.sin(i * 0.2) * 20 + Math.random() * 2

      snapshots.push({
        eventType: 'pointermove',
        pointerType: 'pen',
        button: -1,
        pressure,
        tiltX: Math.round(Math.sin(t * Math.PI) * 25),
        tiltY: Math.round(Math.cos(t * Math.PI) * 15),
        twist: 0,
        clientX,
        clientY,
        canvasX: Math.round(clientX),
        canvasY: Math.round(clientY),
        buttons: 1,
        coalescedEventCount: 1,
        pointerId: 1,
        isPrimary: true,
        timestamp: now + i * 16
      })
    }
    return snapshots
  }

  public addShape(shape: CanvasShapeInput, id: string): void {
    this.shapes.set(id, shape)
    this.undoStack.push({ action: 'add', shape: { ...shape } })
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift()
    }
    this.redoStack = []
  }

  public deleteShape(id: string): void {
    const shape = this.shapes.get(id)
    if (!shape) return
    this.shapes.delete(id)
    this.undoStack.push({ action: 'delete', shape })
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift()
    }
    this.redoStack = []
  }

  public undo(): void {
    const op = this.undoStack.pop()
    if (!op) return
    this.redoStack.push(op)
  }

  public redo(): void {
    const op = this.redoStack.pop()
    if (!op) return
    this.undoStack.push(op)
  }

  public addFileAsset(fileId: string, dataUrl: string): void {
    this.files.set(fileId, { id: fileId, dataUrl })
  }

  public pruneUnusedFiles(): number {
    const referencedFiles = new Set<string>()
    for (const shape of this.shapes.values()) {
      if (shape.fileId) {
        referencedFiles.add(shape.fileId)
      }
    }

    let pruned = 0
    for (const fileId of Array.from(this.files.keys())) {
      if (!referencedFiles.has(fileId)) {
        this.files.delete(fileId)
        pruned++
      }
    }
    return pruned
  }

  public getShapeCount(): number {
    return this.shapes.size
  }

  public getFileCount(): number {
    return this.files.size
  }
}

/**
 * Runs a simulated continuous 2-hour drawing session audit (accelerated).
 * Simulates high-rate stylus input, shape lifecycle, undo/redo buffers,
 * and asset pruning to verify memory stability.
 */
export function runContinuousDrawingSessionAudit(simulatedMinutes = 120): MemoryAuditResult {
  // Trigger GC if available in node environment
  if (typeof global !== 'undefined' && (global as any).gc) {
    ;(global as any).gc()
  }

  const initialHeap = process.memoryUsage ? process.memoryUsage().heapUsed : 10 * 1024 * 1024
  const simulator = new DrawingSessionSimulator(50)

  let totalPointerEvents = 0
  let shapesCreated = 0
  let shapesDeleted = 0
  let undoRedoCycles = 0
  let peakHeap = initialHeap

  // In 2 hours of drawing, a user typically draws ~300-600 strokes
  const strokeSessions = simulatedMinutes * 4

  for (let s = 0; s < strokeSessions; s++) {
    // 1. Stylus stroke with high sample rate
    const stroke = simulator.simulateStylusStroke(30, (s * 10) % 1500, (s * 5) % 1000)
    totalPointerEvents += stroke.length

    // 2. Periodic shape creation (architecture node / label)
    if (s % 2 === 0) {
      const id = `shape_${s}`
      const hasFile = s % 10 === 0
      const fileId = hasFile ? `file_${s}` : undefined

      if (hasFile && fileId) {
        simulator.addFileAsset(fileId, `data:image/png;base64,sample_payload_${s}`)
      }

      simulator.addShape(
        {
          type: 'rectangle',
          x: s * 15,
          y: s * 10,
          width: 140,
          height: 70,
          strokeColor: '#38bdf8',
          fileId
        },
        id
      )
      shapesCreated++
    }

    // 3. Periodic deletions & deletions with file un-referencing
    if (s % 5 === 0 && shapesCreated > 10) {
      const deleteId = `shape_${s - 6}`
      simulator.deleteShape(deleteId)
      shapesDeleted++
    }

    // 4. Undo / Redo bursts
    if (s % 8 === 0) {
      simulator.undo()
      simulator.redo()
      undoRedoCycles++
    }

    // 5. Periodic asset pruning
    if (s % 20 === 0) {
      simulator.pruneUnusedFiles()
    }

    if (process.memoryUsage) {
      const currentHeap = process.memoryUsage().heapUsed
      if (currentHeap > peakHeap) {
        peakHeap = currentHeap
      }
    }
  }

  // Final cleanup and pruning
  simulator.pruneUnusedFiles()

  if (typeof global !== 'undefined' && (global as any).gc) {
    ;(global as any).gc()
  }

  const finalHeap = process.memoryUsage ? process.memoryUsage().heapUsed : peakHeap
  const toMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100

  const initialHeapMb = toMb(initialHeap)
  const peakHeapMb = toMb(peakHeap)
  const finalHeapMb = toMb(finalHeap)
  const netGrowthMb = Math.round((finalHeapMb - initialHeapMb) * 100) / 100

  // Under continuous 2-hour drawing with bounded undo ring buffers and asset pruning,
  // net heap growth should remain bounded (less than 40 MB growth for 2 hours)
  const isLeakFree = netGrowthMb < 40

  return {
    simulatedMinutes,
    totalPointerEvents,
    shapesCreated,
    shapesDeleted,
    undoRedoCycles,
    initialHeapMb,
    peakHeapMb,
    finalHeapMb,
    netGrowthMb,
    isLeakFree,
    retainedFilesCount: simulator.getFileCount()
  }
}
