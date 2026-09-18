import type {
  CanvasExportConfig,
  CanvasExportResult,
  ExportScope
} from '../export/export-types'

export type ObjectId = string

export interface Point {
  x: number
  y: number
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export interface CameraState {
  x: number
  y: number
  zoom: number
}

export type CanvasToolType =
  | 'selection'
  | 'freedraw'
  | 'rectangle'
  | 'diamond'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'text'
  | 'eraser'
  | 'laser'

export interface CanvasShapeInput {
  type: 'rectangle' | 'ellipse' | 'diamond' | 'arrow' | 'line' | 'text' | 'image'
  x: number
  y: number
  width: number
  height: number
  strokeColor?: string
  backgroundColor?: string
  text?: string
  fileId?: string
  locked?: boolean
  customData?: Record<string, unknown>
}

export interface CanvasPointerSnapshot {
  pointerType: string
  pressure: number
  tiltX: number
  tiltY: number
  twist: number
  clientX: number
  clientY: number
  canvasX: number
  canvasY: number
  buttons: number
  pointerId: number
  isPrimary: boolean
  timestamp: number
}

export interface CanvasAdapterEvents {
  onPointerUpdate?: (snapshot: CanvasPointerSnapshot) => void
  onChange?: (sceneData: unknown) => void
  onSelectionChange?: (selectedIds: ObjectId[]) => void
}

export interface CanvasAdapter {
  readonly name: string

  addObject(shape: CanvasShapeInput): ObjectId
  addObjects?(shapes: CanvasShapeInput[]): ObjectId[]
  removeObject(id: ObjectId): void
  getSelection(): ObjectId[]
  clearSelection(): void

  getCamera(): CameraState
  setCamera(camera: CameraState): void
  animateCameraTo(target: CameraState, durationMs?: number): Promise<void>
  stopCameraAnimation(): void
  zoomTo(bounds: Bounds): void
  resetView(): void
  screenToScene(clientX: number, clientY: number): Point
  getViewportCenter(): Point

  getTool(): CanvasToolType
  setTool(tool: CanvasToolType): void

  undo(): void
  redo(): void

  serialize(): unknown
  deserialize(scene: unknown): void

  addFile(file: { id: string; mimeType: string; dataURL: string; created: number }): void
  pruneUnusedFiles?(): number

  /** Update the lock state of elements created with matching metadata. */
  setObjectsLockedByCustomData?(criteria: Record<string, unknown>, locked: boolean): number

  // Background / Chroma-key methods
  getBackgroundColor(): string
  setBackgroundColor(color: string): void

  // Export subsystem methods
  exportCanvas(config: CanvasExportConfig): Promise<CanvasExportResult>
  getExportBounds(scope: ExportScope, customBounds?: Bounds): Bounds | null
  getElementsCount(scope?: 'all' | 'selection'): number

  destroy?(): void
}
