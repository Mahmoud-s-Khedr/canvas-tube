import {
  CanvasAdapter,
  CanvasShapeInput,
  ObjectId,
  CameraState,
  Bounds,
  Point,
  CanvasToolType,
  CanvasPointerSnapshot
} from '@core/canvas/canvas-adapter'
import {
  CanvasExportConfig,
  CanvasExportResult,
  ExportScope,
  calculateExportDimensions
} from '@core/export/export-types'
import { interpolateCamera } from '@core/canvas/camera-animation'
import type {
  ExcalidrawImperativeAPI,
  AppState,
  BinaryFiles
} from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import {
  convertToExcalidrawElements,
  exportToCanvas,
  exportToSvg,
  getCommonBounds,
  viewportCoordsToSceneCoords
} from '@excalidraw/excalidraw'
import { IconRegistry } from '@core/icons/icon-registry'
import {
  createCanvasPointerSnapshot,
  type CanvasPointerEventType
} from '@core/canvas/pointer-diagnostics'
import {
  QUICK_CONNECT_METADATA_KEY,
  anchorFixedPoint,
  anchorScenePoint,
  connectorMetadata,
  orthogonalPreviewPoints,
  type CanvasTubeConnectorMetadata,
  type ConnectableElement,
  type ConnectionAnchor
} from '@core/canvas/connectors'


function createShapeSkeleton(shape: CanvasShapeInput, id: string): any {
  const metadata = shape.customData ? { customData: shape.customData } : {}
  switch (shape.type) {
    case 'rectangle':
    case 'diamond':
    case 'ellipse':
      return {
        id,
        type: shape.type,
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        strokeColor: shape.strokeColor || '#1e1e1e',
        backgroundColor: shape.backgroundColor || 'transparent',
        fillStyle: 'solid',
        strokeWidth: 2,
        roughness: 1,
        locked: shape.locked ?? false,
        ...metadata
      }
    case 'image':
      return {
        id,
        type: 'image',
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        fileId: shape.fileId,
        // Programmatic image insertions already have a complete data URL in
        // Excalidraw's file store. Avoid the transient "pending" state, which
        // is intended for an interactive upload and can reapply intrinsic
        // image dimensions after a resize.
        status: 'saved',
        locked: shape.locked ?? false,
        ...metadata
      }
    case 'text':
      return {
        id,
        type: 'text',
        x: shape.x,
        y: shape.y,
        text: shape.text || 'Text',
        fontSize: 20,
        fontFamily: 1,
        strokeColor: shape.strokeColor || '#1e1e1e',
        locked: shape.locked ?? false,
        ...metadata
      }
    case 'arrow':
      return {
        id,
        type: 'arrow',
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        points: [
          [0, 0],
          [shape.width, shape.height]
        ],
        strokeColor: shape.strokeColor || '#1e1e1e',
        strokeWidth: 2,
        locked: shape.locked ?? false,
        ...metadata
      }
    default:
      return {
        id,
        type: 'rectangle',
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        locked: shape.locked ?? false,
        ...metadata
      }
  }
}

export class ExcalidrawCanvasAdapter implements CanvasAdapter {
  public readonly name = 'ExcalidrawCanvasAdapter'
  private api: ExcalidrawImperativeAPI | null = null
  private pointerListener?: (snapshot: CanvasPointerSnapshot) => void
  private changeListener?: (sceneData: unknown) => void
  private unsubscribeOnChange?: () => void
  private pendingScene: unknown = null
  private animationCancelFn?: () => void
  private keyboardTarget: HTMLElement | null = null
  private sceneSubscribers = new Set<() => void>()
  private reconcilingConnectors = false

  public setApi(api: ExcalidrawImperativeAPI | null): void {
    if (this.unsubscribeOnChange) {
      this.unsubscribeOnChange()
      this.unsubscribeOnChange = undefined
    }

    this.api = api

    if (api) {
      this.unsubscribeOnChange = api.onChange((elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
        this.reconcileQuickConnectors(elements)
        this.sceneSubscribers.forEach((listener) => listener())
        if (this.changeListener) {
          this.changeListener({
            elements,
            appState: {
              scrollX: appState.scrollX,
              scrollY: appState.scrollY,
              zoom: appState.zoom,
              viewBackgroundColor: appState.viewBackgroundColor
            },
            files
          })
        }
      })

      if (this.pendingScene) {
        this.deserialize(this.pendingScene)
        this.pendingScene = null
      }
    }
  }

  /**
   * Installs the concrete Excalidraw container that owns its React keyboard
   * handler. Keyboard events dispatched on window cannot reach that handler.
   */
  public setKeyboardTarget(target: HTMLElement | null): void {
    this.keyboardTarget = target
  }

  public setPointerListener(listener?: (snapshot: CanvasPointerSnapshot) => void): void {
    this.pointerListener = listener
  }

  public setChangeListener(listener?: (sceneData: unknown) => void): void {
    this.changeListener = listener
  }

  /** Subscribe to scene, selection, or camera changes without owning onChange. */
  public subscribeToScene(listener: () => void): () => void {
    this.sceneSubscribers.add(listener)
    return () => this.sceneSubscribers.delete(listener)
  }

  public getCurrentElements(): readonly ExcalidrawElement[] {
    return this.api?.getSceneElements().filter((element) => !element.isDeleted) || []
  }

  public sceneToScreen(point: Point): Point {
    const state = this.api?.getAppState()
    if (!state) return point
    return {
      x: state.offsetLeft + (point.x + state.scrollX) * state.zoom.value,
      y: state.offsetTop + (point.y + state.scrollY) * state.zoom.value
    }
  }

  public getQuickConnectorMetadata(element: unknown): CanvasTubeConnectorMetadata | null {
    const customData = (element as { customData?: Record<string, unknown> } | null)?.customData
    return connectorMetadata(customData?.[QUICK_CONNECT_METADATA_KEY])
  }

  /** Creates an Excalidraw elbow arrow and both native bindings in one scene update. */
  public createQuickConnector(
    sourceElementId: string,
    sourceAnchor: ConnectionAnchor,
    targetElementId: string,
    targetAnchor: ConnectionAnchor
  ): ObjectId | null {
    if (!this.api || sourceElementId === targetElementId) return null
    const current = this.api.getSceneElementsIncludingDeleted() as readonly any[]
    const source = current.find((element) => element.id === sourceElementId && !element.isDeleted)
    const target = current.find((element) => element.id === targetElementId && !element.isDeleted)
    if (!source || !target) return null

    const id = `connector_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const metadata: CanvasTubeConnectorMetadata = {
      sourceElementId,
      sourceAnchor,
      targetElementId,
      targetAnchor,
      routingType: 'orthogonal'
    }
    const arrow = this.createElbowArrow(id, source, sourceAnchor, target, targetAnchor, metadata)
    const elements = current.map((element) => {
      if (element.id === sourceElementId || element.id === targetElementId) {
        return this.withBoundArrow(element, id)
      }
      return element
    })
    this.api.updateScene({ elements: [...elements, arrow] })
    return id
  }

  /** Rebinds one endpoint while retaining the other endpoint and arrow identity. */
  public reconnectQuickConnector(
    connectorId: string,
    endpoint: 'source' | 'target',
    elementId: string,
    anchor: ConnectionAnchor
  ): boolean {
    if (!this.api) return false
    const current = this.api.getSceneElementsIncludingDeleted() as readonly any[]
    const connector = current.find((element) => element.id === connectorId && !element.isDeleted)
    const metadata = this.getQuickConnectorMetadata(connector)
    const nextElement = current.find((element) => element.id === elementId && !element.isDeleted)
    if (!connector || !metadata || !nextElement) return false

    const nextMetadata: CanvasTubeConnectorMetadata =
      endpoint === 'source'
        ? { ...metadata, sourceElementId: elementId, sourceAnchor: anchor }
        : { ...metadata, targetElementId: elementId, targetAnchor: anchor }
    if (nextMetadata.sourceElementId === nextMetadata.targetElementId) return false

    const source = current.find((element) => element.id === nextMetadata.sourceElementId && !element.isDeleted)
    const target = current.find((element) => element.id === nextMetadata.targetElementId && !element.isDeleted)
    if (!source || !target) return false

    const routed = this.createElbowArrow(connectorId, source, nextMetadata.sourceAnchor, target, nextMetadata.targetAnchor, nextMetadata, connector)
    const oldEndpointId = endpoint === 'source' ? metadata.sourceElementId : metadata.targetElementId
    const elements = current.map((element) => {
      if (element.id === connectorId) return routed
      if (element.id === oldEndpointId && oldEndpointId !== elementId) return this.withoutBoundArrow(element, connectorId)
      if (element.id === elementId) return this.withBoundArrow(element, connectorId)
      return element
    })
    this.api.updateScene({ elements })
    return true
  }

  private createElbowArrow(
    id: string,
    source: ConnectableElement & Record<string, any>,
    sourceAnchor: ConnectionAnchor,
    target: ConnectableElement & Record<string, any>,
    targetAnchor: ConnectionAnchor,
    metadata: CanvasTubeConnectorMetadata,
    existing?: Record<string, any>
  ): any {
    const sourcePoint = anchorScenePoint(source, sourceAnchor)
    const targetPoint = anchorScenePoint(target, targetAnchor)
    const route = orthogonalPreviewPoints(sourcePoint, sourceAnchor, targetPoint, targetAnchor, 24)
    const points = route.map((point) => [point.x - sourcePoint.x, point.y - sourcePoint.y])
    const skeleton = {
      id,
      type: 'arrow' as const,
      x: sourcePoint.x,
      y: sourcePoint.y,
      width: Math.max(1, Math.abs(targetPoint.x - sourcePoint.x)),
      height: Math.max(1, Math.abs(targetPoint.y - sourcePoint.y)),
      points,
      elbowed: true,
      fixedSegments: [],
      startIsSpecial: false,
      endIsSpecial: false,
      startBinding: { elementId: source.id, focus: 0, gap: 0, fixedPoint: anchorFixedPoint(sourceAnchor) },
      endBinding: { elementId: target.id, focus: 0, gap: 0, fixedPoint: anchorFixedPoint(targetAnchor) },
      startArrowhead: null,
      endArrowhead: 'arrow',
      strokeColor: existing?.strokeColor || '#4da3ff',
      strokeWidth: existing?.strokeWidth || 2,
      strokeStyle: existing?.strokeStyle || 'solid',
      roughness: existing?.roughness ?? 1,
      locked: existing?.locked ?? false,
      customData: {
        ...(existing?.customData || {}),
        [QUICK_CONNECT_METADATA_KEY]: metadata
      }
    }
    // The public skeleton converter intentionally initializes bindings to
    // null (interactive tools add them afterwards). Quick Connect commits a
    // complete arrow in one update, so restore the fixed-point bindings after
    // conversion rather than relying on private Excalidraw internals.
    const converted = convertToExcalidrawElements([skeleton as any], { regenerateIds: false })[0] as any
    return {
      ...converted,
      elbowed: true,
      fixedSegments: [],
      startIsSpecial: false,
      endIsSpecial: false,
      startBinding: skeleton.startBinding,
      endBinding: skeleton.endBinding,
      startArrowhead: null,
      endArrowhead: 'arrow',
      customData: skeleton.customData
    }
  }

  private withBoundArrow(element: Record<string, any>, arrowId: string): Record<string, any> {
    const boundElements = Array.isArray(element.boundElements) ? element.boundElements : []
    return boundElements.some((bound: { id: string }) => bound.id === arrowId)
      ? element
      : { ...element, boundElements: [...boundElements, { id: arrowId, type: 'arrow' }] }
  }

  private withoutBoundArrow(element: Record<string, any>, arrowId: string): Record<string, any> {
    const boundElements = Array.isArray(element.boundElements) ? element.boundElements : []
    return { ...element, boundElements: boundElements.filter((bound: { id: string }) => bound.id !== arrowId) }
  }

  private reconcileQuickConnectors(elements: readonly ExcalidrawElement[]): void {
    if (!this.api || this.reconcilingConnectors) return
    const existingIds = new Set(elements.filter((element) => !element.isDeleted).map((element) => element.id))
    const stale = elements.filter((element) => {
      const metadata = this.getQuickConnectorMetadata(element)
      return metadata && !element.isDeleted && (!existingIds.has(metadata.sourceElementId) || !existingIds.has(metadata.targetElementId))
    })
    if (stale.length === 0) return

    this.reconcilingConnectors = true
    try {
      const staleIds = new Set(stale.map((element) => element.id))
      this.api.updateScene({
        elements: elements.map((element: any) => (staleIds.has(element.id) ? { ...element, isDeleted: true } : element))
      })
    } finally {
      this.reconcilingConnectors = false
    }
  }

  public recordPointerEvent(
    event: React.PointerEvent<HTMLElement> | PointerEvent,
    eventType: CanvasPointerEventType
  ): void {
    // If user presses a button / stylus touch on canvas while camera is animating, stop animation smoothly
    if (event.buttons > 0) {
      this.stopCameraAnimation()
    }

    if (!this.pointerListener) return

    // Record exactly one snapshot per browser event. Coalesced samples are
    // counted for diagnostics only; Excalidraw continues receiving the
    // original event unchanged for its native freehand processing.
    const nativeEvent = 'nativeEvent' in event ? event.nativeEvent : event
    this.pointerListener(createCanvasPointerSnapshot(nativeEvent, eventType, this.screenToScene.bind(this)))
  }

  public addObject(shape: CanvasShapeInput): ObjectId {
    if (!this.api) {
      throw new Error('ExcalidrawCanvasAdapter: API is not ready')
    }

    const id = `el_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const currentElements = this.api.getSceneElements()
    const skeleton = createShapeSkeleton(shape, id)
    const converted = convertToExcalidrawElements([skeleton])
    this.api.updateScene({
      elements: [...currentElements, ...converted]
    })

    return id
  }

  public addObjects(shapes: CanvasShapeInput[]): ObjectId[] {
    if (!this.api) {
      throw new Error('ExcalidrawCanvasAdapter: API is not ready')
    }
    if (shapes.length === 0) return []

    const currentElements = this.api.getSceneElements()
    const ids: ObjectId[] = []
    const skeletons = shapes.map((shape, index) => {
      const id = `el_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 8)}`
      ids.push(id)
      return createShapeSkeleton(shape, id)
    })

    const converted = convertToExcalidrawElements(skeletons)
    this.api.updateScene({
      elements: [...currentElements, ...converted]
    })

    return ids
  }

  public removeObject(id: ObjectId): void {
    if (!this.api) return
    const elements = this.api.getSceneElements().filter((el: ExcalidrawElement) => el.id !== id)
    this.api.updateScene({ elements })
  }

  public getSelection(): ObjectId[] {
    if (!this.api) return []
    const appState = this.api.getAppState()
    return Object.keys(appState.selectedElementIds || {}).filter(
      (id) => appState.selectedElementIds[id]
    )
  }

  public clearSelection(): void {
    if (!this.api) return
    this.api.updateScene({
      appState: {
        selectedElementIds: {}
      }
    })
  }

  public setObjectsLockedByCustomData(criteria: Record<string, unknown>, locked: boolean): number {
    if (!this.api) return 0

    let changed = 0
    const elements = this.api.getSceneElements().map((element: any) => {
      const customData = element.customData as Record<string, unknown> | undefined
      const matches =
        customData && Object.entries(criteria).every(([key, value]) => customData[key] === value)

      if (!matches || element.locked === locked) return element
      changed += 1
      return { ...element, locked }
    })

    if (changed > 0) {
      this.api.updateScene({ elements })
    }
    return changed
  }

  public getCamera(): CameraState {
    if (!this.api) return { x: 0, y: 0, zoom: 1 }
    const state = this.api.getAppState()
    return {
      x: state.scrollX,
      y: state.scrollY,
      zoom: state.zoom?.value ?? 1
    }
  }

  public setCamera(camera: CameraState): void {
    if (!this.api) return
    this.api.updateScene({
      appState: {
        scrollX: camera.x,
        scrollY: camera.y,
        zoom: { value: camera.zoom as any }
      }
    })
  }

  public animateCameraTo(target: CameraState, durationMs = 600): Promise<void> {
    // Cancel any current in-flight animation
    this.stopCameraAnimation()

    if (!this.api) {
      return Promise.resolve()
    }

    if (durationMs <= 0) {
      this.setCamera(target)
      return Promise.resolve()
    }

    const start = this.getCamera()
    const startTime = performance.now()

    return new Promise<void>((resolve) => {
      let rafId: number | null = null
      let isCancelled = false

      const cleanup = () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId)
          rafId = null
        }
        if (this.animationCancelFn === cancelFn) {
          this.animationCancelFn = undefined
        }
      }

      const cancelFn = () => {
        isCancelled = true
        cleanup()
        resolve()
      }

      this.animationCancelFn = cancelFn

      const step = (currentTime: number) => {
        if (isCancelled) return
        const elapsed = currentTime - startTime
        const t = Math.min(1, Math.max(0, elapsed / durationMs))
        const interpolated = interpolateCamera(start, target, t)
        this.setCamera(interpolated)

        if (t >= 1) {
          cleanup()
          resolve()
        } else {
          rafId = requestAnimationFrame(step)
        }
      }

      rafId = requestAnimationFrame(step)
    })
  }

  public stopCameraAnimation(): void {
    if (this.animationCancelFn) {
      this.animationCancelFn()
      this.animationCancelFn = undefined
    }
  }

  public screenToScene(clientX: number, clientY: number): Point {
    const state = this.api?.getAppState()
    if (!state) return { x: clientX, y: clientY }

    return viewportCoordsToSceneCoords(
      { clientX, clientY },
      {
        zoom: state.zoom,
        offsetLeft: state.offsetLeft,
        offsetTop: state.offsetTop,
        scrollX: state.scrollX,
        scrollY: state.scrollY
      }
    )
  }

  public getViewportCenter(): Point {
    const state = this.api?.getAppState()
    if (!state) return { x: 0, y: 0 }
    return this.screenToScene(state.offsetLeft + state.width / 2, state.offsetTop + state.height / 2)
  }

  public zoomTo(bounds: Bounds): void {
    this.stopCameraAnimation()
    if (!this.api) return
    // Adjust camera to center on bounds
    const state = this.api.getAppState()
    const viewportWidth = state.width
    const viewportHeight = state.height
    const zoomX = viewportWidth / (bounds.width + 100)
    const zoomY = viewportHeight / (bounds.height + 100)
    const zoom = Math.max(0.2, Math.min(2, Math.min(zoomX, zoomY)))

    const scrollX = viewportWidth / (2 * zoom) - (bounds.x + bounds.width / 2)
    const scrollY = viewportHeight / (2 * zoom) - (bounds.y + bounds.height / 2)

    this.setCamera({ x: scrollX, y: scrollY, zoom })
  }

  public resetView(): void {
    this.stopCameraAnimation()
    this.setCamera({ x: 0, y: 0, zoom: 1 })
  }

  public getTool(): CanvasToolType {
    if (!this.api) return 'selection'
    const tool = this.api.getAppState().activeTool.type
    return this.mapFromExcalidrawTool(tool)
  }

  public setTool(tool: CanvasToolType): void {
    if (!this.api) return
    const mapped = this.mapToExcalidrawTool(tool)
    this.api.setActiveTool({ type: mapped as any })
  }

  public undo(): void {
    this.dispatchExcalidrawKey('z')
  }

  public redo(): void {
    this.dispatchExcalidrawKey('y')
  }

  private dispatchExcalidrawKey(key: string): void {
    this.keyboardTarget?.dispatchEvent(
      new KeyboardEvent('keydown', { key, ctrlKey: true, bubbles: true, cancelable: true })
    )
  }

  public serialize(): unknown {
    if (!this.api) {
      return this.pendingScene || { elements: [], appState: {}, files: {} }
    }
    const elements = this.api.getSceneElements()
    const appState = this.api.getAppState()
    const files = this.api.getFiles()

    return {
      elements,
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        zoom: appState.zoom
      },
      files
    }
  }

  public deserialize(scene: unknown): void {
    if (!this.api) {
      this.pendingScene = scene
      return
    }

    const data = scene as any
    if (!data) return

    const elements = Array.isArray(data.elements)
      ? data.elements.map((element: any) => {
          // Icon files are ready immediately. Upgrade scenes made before
          // programmatic images were marked saved so an old pending state
          // cannot restore a stale intrinsic size after a resize.
          if (element?.type === 'image' && element.customData?.iconId && element.status !== 'saved') {
            return { ...element, status: 'saved' }
          }
          return element
        })
      : []
    const appState = data.appState || {}
    const files = Object.fromEntries(
      Object.entries(data.files || {}).map(([id, file]: [string, any]) => {
        if (id.startsWith('builtin-icon-') && file?.mimeType === 'image/svg+xml') {
          return [id, { ...file, dataURL: IconRegistry.normalizeSvgDataUrl(file.dataURL) }]
        }
        return [id, file]
      })
    )

    if (Object.keys(files).length > 0) {
      this.api.addFiles(Object.values(files))
    }

    this.api.updateScene({
      elements,
      appState: {
        ...appState,
        theme: 'dark'
      }
    })
  }

  public getBackgroundColor(): string {
    if (!this.api) return '#121212'
    return this.api.getAppState().viewBackgroundColor || '#121212'
  }

  public setBackgroundColor(color: string): void {
    if (!this.api) return
    this.api.updateScene({
      appState: {
        viewBackgroundColor: color
      }
    })
  }

  public addFile(file: { id: string; mimeType: string; dataURL: string; created: number }): void {
    if (!this.api) return
    if (this.api.getFiles()[file.id]) return
    this.api.addFiles([file as any])
  }

  public pruneUnusedFiles(): number {
    if (!this.api) return 0
    const elements = this.api.getSceneElements().filter((el) => !el.isDeleted)
    const usedFileIds = new Set<string>()
    for (const el of elements) {
      if ((el as any).fileId) {
        usedFileIds.add((el as any).fileId)
      }
    }
    const currentFiles = this.api.getFiles()
    let prunedCount = 0
    const nextFiles: Record<string, any> = {}
    for (const [fileId, fileData] of Object.entries(currentFiles)) {
      if (usedFileIds.has(fileId)) {
        nextFiles[fileId] = fileData
      } else {
        prunedCount++
      }
    }
    if (prunedCount > 0 && (this.api as any).files) {
      ;(this.api as any).files = nextFiles
    }
    return prunedCount
  }

  public getElementsCount(scope: 'all' | 'selection' = 'all'): number {
    if (!this.api) return 0
    const nonDeleted = this.api.getSceneElements().filter((el) => !el.isDeleted)
    if (scope === 'selection') {
      const selected = new Set(this.getSelection())
      return nonDeleted.filter((el) => selected.has(el.id)).length
    }
    return nonDeleted.length
  }

  public getExportBounds(scope: ExportScope, customBounds?: Bounds): Bounds | null {
    if (scope === 'custom') {
      return customBounds || null
    }

    if (scope === 'viewport') {
      const state = this.api?.getAppState()
      if (!state) return null
      const width = state.width / state.zoom.value
      const height = state.height / state.zoom.value
      const x = -state.scrollX
      const y = -state.scrollY
      return {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.max(1, Math.round(width)),
        height: Math.max(1, Math.round(height))
      }
    }

    if (!this.api) return null
    const nonDeleted = this.api.getSceneElements().filter((el) => !el.isDeleted)
    if (nonDeleted.length === 0) return null

    let targetElements = nonDeleted
    if (scope === 'selection') {
      const selected = new Set(this.getSelection())
      targetElements = nonDeleted.filter((el) => selected.has(el.id))
      if (targetElements.length === 0) return null
    }

    const [minX, minY, maxX, maxY] = getCommonBounds(targetElements)
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      return null
    }

    return {
      x: Math.round(minX),
      y: Math.round(minY),
      width: Math.max(1, Math.round(maxX - minX)),
      height: Math.max(1, Math.round(maxY - minY))
    }
  }

  public async exportCanvas(config: CanvasExportConfig): Promise<CanvasExportResult> {
    if (!this.api) {
      throw new Error('Canvas API is not ready')
    }

    const allElements = this.api.getSceneElements().filter((el) => !el.isDeleted)
    let exportElements = allElements
    let exportingFrame: any = null

    if (config.scope === 'selection') {
      const selectedIds = new Set(this.getSelection())
      exportElements = allElements.filter((el) => selectedIds.has(el.id))
      if (exportElements.length === 0) {
        throw new Error('No elements are currently selected for export')
      }
    } else if (config.scope === 'viewport' || config.scope === 'custom') {
      const bounds = this.getExportBounds(config.scope, config.customBounds)
      if (!bounds) {
        throw new Error('Unable to determine bounded region for export')
      }
      exportingFrame = {
        type: 'frame',
        id: `__export_frame_${Date.now()}`,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      }
    }

    if (exportElements.length === 0 && !exportingFrame) {
      throw new Error('Canvas scene is empty. Nothing to export.')
    }

    let contentWidth = 800
    let contentHeight = 600

    if (exportingFrame) {
      contentWidth = exportingFrame.width
      contentHeight = exportingFrame.height
    } else {
      const bounds = this.getExportBounds(config.scope === 'selection' ? 'selection' : 'all')
      if (bounds) {
        contentWidth = bounds.width
        contentHeight = bounds.height
      }
    }

    const exportPadding =
      config.scope === 'viewport' || config.scope === 'custom' ? 0 : (config.padding ?? 16)
    // Excalidraw applies exportPadding before drawing. Size the output from
    // those padded bounds as well; otherwise the requested canvas dimensions
    // are too small and crop the right and bottom of PNG exports.
    const baseWidth = contentWidth + exportPadding * 2
    const baseHeight = contentHeight + exportPadding * 2

    const { width: targetWidth, height: targetHeight, scale: targetScale } =
      calculateExportDimensions(
        baseWidth,
        baseHeight,
        config.resolutionPreset,
        config.scale,
        config.customWidth
      )

    const exportBackground = config.backgroundMode !== 'transparent'
    const exportWithDarkMode = config.backgroundMode === 'dark'
    const viewBackgroundColor =
      config.backgroundColor || (config.backgroundMode === 'light' ? '#ffffff' : '#121212')
    const currentAppState = this.api.getAppState()

    if (config.format === 'png') {
      const canvas = await exportToCanvas({
        elements: exportElements,
        appState: {
          ...currentAppState,
          exportBackground,
          viewBackgroundColor,
          exportWithDarkMode,
          exportScale: targetScale
        },
        files: this.api.getFiles(),
        exportPadding,
        exportingFrame,
        getDimensions: () => ({
          width: targetWidth,
          height: targetHeight,
          scale: targetScale
        })
      })

      const dataUrl = canvas.toDataURL('image/png')
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b: Blob | null) => {
          if (b) resolve(b)
          else reject(new Error('Failed to generate PNG blob'))
        }, 'image/png')
      })

      return {
        format: 'png',
        blob,
        dataUrl,
        width: canvas.width,
        height: canvas.height,
        scale: targetScale
      }
    }

    // SVG Export
    const svg = await exportToSvg({
      elements: exportElements,
      appState: {
        ...currentAppState,
        exportBackground,
        viewBackgroundColor,
        exportWithDarkMode,
        exportScale: targetScale,
        exportPadding
      },
      files: this.api.getFiles(),
      exportPadding,
      exportingFrame
    })

    if (!svg.getAttribute('xmlns')) {
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    }

    const svgString = new XMLSerializer().serializeToString(svg)
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`
    const outWidth = parseInt(svg.getAttribute('width') || String(targetWidth), 10)
    const outHeight = parseInt(svg.getAttribute('height') || String(targetHeight), 10)

    return {
      format: 'svg',
      svgString,
      dataUrl,
      width: outWidth,
      height: outHeight,
      scale: targetScale
    }
  }

  public destroy(): void {
    this.stopCameraAnimation()
    if (this.unsubscribeOnChange) {
      this.unsubscribeOnChange()
      this.unsubscribeOnChange = undefined
    }
    this.api = null
  }

  private mapToExcalidrawTool(tool: CanvasToolType): string {
    switch (tool) {
      case 'selection':
        return 'selection'
      case 'freedraw':
        return 'freedraw'
      case 'rectangle':
        return 'rectangle'
      case 'diamond':
        return 'diamond'
      case 'ellipse':
        return 'ellipse'
      case 'arrow':
        return 'arrow'
      case 'line':
        return 'line'
      case 'text':
        return 'text'
      case 'eraser':
        return 'eraser'
      case 'laser':
        return 'laser'
      default:
        return 'selection'
    }
  }

  private mapFromExcalidrawTool(tool: string): CanvasToolType {
    switch (tool) {
      case 'selection':
        return 'selection'
      case 'freedraw':
        return 'freedraw'
      case 'rectangle':
        return 'rectangle'
      case 'diamond':
        return 'diamond'
      case 'ellipse':
        return 'ellipse'
      case 'arrow':
        return 'arrow'
      case 'line':
        return 'line'
      case 'text':
        return 'text'
      case 'eraser':
        return 'eraser'
      case 'laser':
        return 'laser'
      default:
        return 'selection'
    }
  }
}
