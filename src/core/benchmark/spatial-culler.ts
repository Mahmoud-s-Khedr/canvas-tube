import { CameraState } from '../canvas/canvas-adapter'
import { BenchmarkElement } from './scene-generator'

export interface ViewportFrustum {
  minX: number
  minY: number
  maxX: number
  maxY: number
  zoom: number
}

export function computeFrustum(
  camera: CameraState,
  screenWidth = 1920,
  screenHeight = 1080,
  margin = 200
): ViewportFrustum {
  const marginWorld = margin / camera.zoom
  const rawMinX = (-camera.x / camera.zoom) - marginWorld
  const rawMinY = (-camera.y / camera.zoom) - marginWorld
  const minX = Object.is(rawMinX, -0) ? 0 : rawMinX
  const minY = Object.is(rawMinY, -0) ? 0 : rawMinY
  const maxX = minX + (screenWidth / camera.zoom) + (2 * marginWorld)
  const maxY = minY + (screenHeight / camera.zoom) + (2 * marginWorld)

  return { minX, minY, maxX, maxY, zoom: camera.zoom }
}

export function isElementInFrustum(
  element: { x: number; y: number; width: number; height: number; isDeleted?: boolean },
  frustum: ViewportFrustum
): boolean {
  if (element.isDeleted) return false

  const elRight = element.x + element.width
  const elBottom = element.y + element.height

  return (
    element.x <= frustum.maxX &&
    elRight >= frustum.minX &&
    element.y <= frustum.maxY &&
    elBottom >= frustum.minY
  )
}

/**
 * Filter an arbitrary element array against a visible viewport frustum.
 * Applies zoom-adaptive Level-of-Detail (LOD): when zoomed out below threshold,
 * micro-elements (< 20px) are culled to prevent CPU/GPU raster overhead.
 */
export function cullElementsForViewport(
  elements: BenchmarkElement[],
  camera: CameraState,
  screenWidth = 1920,
  screenHeight = 1080,
  lodThreshold = 0.2
): { visibleElements: BenchmarkElement[]; culledCount: number; totalCount: number } {
  const frustum = computeFrustum(camera, screenWidth, screenHeight)
  const visibleElements: BenchmarkElement[] = []

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]
    if (!isElementInFrustum(el, frustum)) {
      continue
    }

    // LOD Culling for extreme zoom out
    if (camera.zoom < lodThreshold && (el.width < 25 || el.height < 25)) {
      continue
    }

    visibleElements.push(el)
  }

  return {
    visibleElements,
    culledCount: elements.length - visibleElements.length,
    totalCount: elements.length
  }
}

/**
 * Spatial Grid index for high performance O(1) frustum culling on massive canvas scenes (>5,000 elements).
 */
export class SpatialGridIndex {
  private cellSize: number
  private grid: Map<string, BenchmarkElement[]> = new Map()

  constructor(cellSize = 1000) {
    this.cellSize = cellSize
  }

  private getCellKey(cellX: number, cellY: number): string {
    return `${cellX}:${cellY}`
  }

  public insert(element: BenchmarkElement): void {
    const startX = Math.floor(element.x / this.cellSize)
    const endX = Math.floor((element.x + element.width) / this.cellSize)
    const startY = Math.floor(element.y / this.cellSize)
    const endY = Math.floor((element.y + element.height) / this.cellSize)

    for (let cx = startX; cx <= endX; cx++) {
      for (let cy = startY; cy <= endY; cy++) {
        const key = this.getCellKey(cx, cy)
        let list = this.grid.get(key)
        if (!list) {
          list = []
          this.grid.set(key, list)
        }
        list.push(element)
      }
    }
  }

  public build(elements: BenchmarkElement[]): void {
    this.grid.clear()
    for (let i = 0; i < elements.length; i++) {
      this.insert(elements[i])
    }
  }

  public queryFrustum(frustum: ViewportFrustum): BenchmarkElement[] {
    const startX = Math.floor(frustum.minX / this.cellSize)
    const endX = Math.floor(frustum.maxX / this.cellSize)
    const startY = Math.floor(frustum.minY / this.cellSize)
    const endY = Math.floor(frustum.maxY / this.cellSize)

    const seenIds = new Set<string>()
    const results: BenchmarkElement[] = []

    for (let cx = startX; cx <= endX; cx++) {
      for (let cy = startY; cy <= endY; cy++) {
        const key = this.getCellKey(cx, cy)
        const cellElements = this.grid.get(key)
        if (!cellElements) continue

        for (let i = 0; i < cellElements.length; i++) {
          const el = cellElements[i]
          if (!seenIds.has(el.id)) {
            seenIds.add(el.id)
            if (isElementInFrustum(el, frustum)) {
              results.push(el)
            }
          }
        }
      }
    }

    return results
  }
}
