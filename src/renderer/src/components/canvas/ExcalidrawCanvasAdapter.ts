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
import { interpolateCamera } from '@core/canvas/camera-animation'
import type {
  ExcalidrawImperativeAPI,
  AppState,
  BinaryFiles
} from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { convertToExcalidrawElements } from '@excalidraw/excalidraw'

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

    const appState = this.api?.getAppState()
    const scrollX = appState?.scrollX ?? 0
    const scrollY = appState?.scrollY ?? 0
    const zoom = appState?.zoom?.value ?? 1

    const canvasX = (event.clientX - scrollX) / zoom
    const canvasY = (event.clientY - scrollY) / zoom

    const snapshot: CanvasPointerSnapshot = {
      pointerType: event.pointerType,
      pressure: event.pressure,
      tiltX: event.tiltX,
      tiltY: event.tiltY,
      twist: event.twist,
      clientX: event.clientX,
      clientY: event.clientY,
      canvasX: Math.round(canvasX),
      canvasY: Math.round(canvasY),
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

    let skeleton: any
    switch (shape.type) {
      case 'rectangle':
      case 'diamond':
      case 'ellipse':
        skeleton = {
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
          locked: shape.locked ?? false
        }
        break
      case 'image':
        skeleton = {
          id,
          type: 'image',
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
          fileId: shape.fileId,
          locked: shape.locked ?? false
        }
        break
      case 'text':
        skeleton = {
          id,
          type: 'text',
          x: shape.x,
          y: shape.y,
          text: shape.text || 'Text',
          fontSize: 20,
          fontFamily: 1,
          strokeColor: shape.strokeColor || '#1e1e1e',
          locked: shape.locked ?? false
        }
        break
      case 'arrow':
        skeleton = {
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
          locked: shape.locked ?? false
        }
        break
      default:
        skeleton = {
          id,
          type: 'rectangle',
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
          locked: shape.locked ?? false
        }
    }

    const converted = convertToExcalidrawElements([skeleton])
    this.api.updateScene({
      elements: [...currentElements, ...converted]
    })

    return id
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
    const camera = this.getCamera()
    return {
      x: (clientX - camera.x) / camera.zoom,
      y: (clientY - camera.y) / camera.zoom
    }
  }

  public zoomTo(bounds: Bounds): void {
    this.stopCameraAnimation()
    if (!this.api) return
    // Adjust camera to center on bounds
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const zoomX = viewportWidth / (bounds.width + 100)
    const zoomY = viewportHeight / (bounds.height + 100)
    const zoom = Math.max(0.2, Math.min(2, Math.min(zoomX, zoomY)))

    const scrollX = -(bounds.x + bounds.width / 2) * zoom + viewportWidth / 2
    const scrollY = -(bounds.y + bounds.height / 2) * zoom + viewportHeight / 2

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

  public addFile(file: { id: string; mimeType: string; dataURL: string; created: number }): void {
    if (!this.api) return
    this.api.addFiles([file as any])
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
