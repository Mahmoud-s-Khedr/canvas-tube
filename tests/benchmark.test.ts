import { describe, it, expect } from 'vitest'
import { generateBenchmarkScene, convertToShapeInputs } from '../src/core/benchmark/scene-generator'
import {
  computeFrustum,
  cullElementsForViewport,
  SpatialGridIndex
} from '../src/core/benchmark/spatial-culler'
import { runLargeCanvasBenchmark } from '../src/core/benchmark/benchmark-runner'

describe('Virtualized Rendering Benchmark (>5,000 Elements)', () => {
  it('generates a synthetic architecture scene with 5,000 elements across clusters', () => {
    const scene = generateBenchmarkScene(5000, { clusters: 20, spreadRadius: 5000 })
    expect(scene.elementCount).toBe(5000)
    expect(scene.elements.length).toBe(5000)
    expect(scene.clustersCount).toBe(20)

    // Bounding box should span multiple clusters
    expect(scene.boundingBox.maxX - scene.boundingBox.minX).toBeGreaterThan(3000)
    expect(scene.boundingBox.maxY - scene.boundingBox.minY).toBeGreaterThan(3000)

    // Shape types should include services, connectors, and freehand annotations
    const types = new Set(scene.elements.map((el) => el.type))
    expect(types.has('rectangle')).toBe(true)
    expect(types.has('diamond')).toBe(true)
    expect(types.has('arrow')).toBe(true)
    expect(types.has('text')).toBe(true)
    expect(types.has('freedraw')).toBe(true)
  })

  it('converts benchmark elements to CanvasShapeInput batch array', () => {
    const scene = generateBenchmarkScene(100)
    const inputs = convertToShapeInputs(scene.elements)
    expect(inputs.length).toBe(100)
    expect(inputs[0].width).toBeGreaterThan(0)
    expect(inputs[0].strokeColor).toBeDefined()
  })

  it('computes accurate camera viewport frustum in world coordinates', () => {
    // Camera centered at (0, 0) with 1x zoom
    const frustum1 = computeFrustum({ x: 0, y: 0, zoom: 1 }, 1920, 1080, 0)
    expect(frustum1.minX).toBe(0)
    expect(frustum1.minY).toBe(0)
    expect(frustum1.maxX).toBe(1920)
    expect(frustum1.maxY).toBe(1080)

    // Zoomed in 2x: visible region spans half the coordinates
    const frustumZoom = computeFrustum({ x: -500, y: -500, zoom: 2 }, 1920, 1080, 0)
    expect(frustumZoom.minX).toBe(250)
    expect(frustumZoom.minY).toBe(250)
    expect(frustumZoom.maxX).toBe(250 + 960)
    expect(frustumZoom.maxY).toBe(250 + 540)
  })

  it('culls elements outside viewport frustum when zoomed into cluster (>70% culled)', () => {
    const scene = generateBenchmarkScene(5000)
    const targetClusterEl = scene.elements[0]

    // Camera focused tightly on the first element
    const camera = {
      x: -(targetClusterEl.x + targetClusterEl.width / 2) * 1.5 + 1920 / 2,
      y: -(targetClusterEl.y + targetClusterEl.height / 2) * 1.5 + 1080 / 2,
      zoom: 1.5
    }

    const { visibleElements, culledCount, totalCount } = cullElementsForViewport(
      scene.elements,
      camera,
      1920,
      1080
    )

    expect(totalCount).toBe(5000)
    expect(culledCount).toBeGreaterThan(3500) // > 70% culled
    expect(visibleElements.length).toBeLessThan(1500)
    expect(visibleElements.some((el) => el.id === targetClusterEl.id)).toBe(true)
  })

  it('SpatialGridIndex executes frustum queries with O(1) cell hashing', () => {
    const scene = generateBenchmarkScene(5000)
    const grid = new SpatialGridIndex(1000)
    grid.build(scene.elements)

    const frustum = computeFrustum({ x: 0, y: 0, zoom: 1 }, 1920, 1080)
    const t0 = performance.now()
    const queried = grid.queryFrustum(frustum)
    const queryDuration = performance.now() - t0

    expect(queryDuration).toBeLessThan(10) // under 10ms
    expect(queried.length).toBeLessThan(scene.elements.length)
  })

  it('passes large canvas benchmark performance thresholds for 5,000 elements', () => {
    const metrics = runLargeCanvasBenchmark(5000)

    expect(metrics.elementCount).toBe(5000)
    expect(metrics.cullingSpatialGridMs).toBeLessThan(15)
    expect(metrics.culledElementsRatio).toBeGreaterThan(0.70)
    expect(metrics.serializationMs).toBeLessThan(150)
    expect(metrics.simulatedTourFps).toBeGreaterThan(60)
    expect(metrics.pass).toBe(true)
  })
})
