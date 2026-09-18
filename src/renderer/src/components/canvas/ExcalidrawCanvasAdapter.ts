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

  public setApi(api: ExcalidrawImperativeAPI | null): void {
    if (this.unsubscribeOnChange) {
      this.unsubscribeOnChange()
      this.unsubscribeOnChange = undefined
    }

    this.api = api

    if (api) {
      this.unsubscribeOnChange = api.onChange((elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
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

  public setPointerListener(listener?: (snapshot: CanvasPointerSnapshot) => void): void {
    this.pointerListener = listener
  }

  public setChangeListener(listener?: (sceneData: unknown) => void): void {
    this.changeListener = listener
  }

  public recordPointerEvent(event: React.PointerEvent<HTMLElement> | PointerEvent): void {
    // If user presses a button / stylus touch on canvas while camera is animating, stop animation smoothly
    if (event.buttons > 0) {
      this.stopCameraAnimation()
    }

    if (!this.pointerListener) return

    const point = this.screenToScene(event.clientX, event.clientY)

    const snapshot: CanvasPointerSnapshot = {
      pointerType: event.pointerType,
      pressure: event.pressure,
      tiltX: event.tiltX,
      tiltY: event.tiltY,
      twist: event.twist,
      clientX: event.clientX,
      clientY: event.clientY,
      canvasX: Math.round(point.x),
      canvasY: Math.round(point.y),
      buttons: event.buttons,
      pointerId: event.pointerId,
      isPrimary: event.isPrimary,
      timestamp: Date.now()
    }

    this.pointerListener(snapshot)
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
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })
    )
  }

  public redo(): void {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true })
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

    const elements = Array.isArray(data.elements) ? data.elements : []
    const appState = data.appState || {}
    const files = data.files || {}

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

    let baseWidth = 800
    let baseHeight = 600

    if (exportingFrame) {
      baseWidth = exportingFrame.width
      baseHeight = exportingFrame.height
    } else {
      const bounds = this.getExportBounds(config.scope === 'selection' ? 'selection' : 'all')
      if (bounds) {
        baseWidth = bounds.width
        baseHeight = bounds.height
      }
    }

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
    const exportPadding =
      config.scope === 'viewport' || config.scope === 'custom' ? 0 : (config.padding ?? 16)

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
