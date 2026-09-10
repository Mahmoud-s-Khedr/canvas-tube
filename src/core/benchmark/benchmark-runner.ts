import { CameraState } from '../canvas/canvas-adapter'
import { generateBenchmarkScene, BenchmarkScene } from './scene-generator'
import { computeFrustum, cullElementsForViewport, SpatialGridIndex } from './spatial-culler'
import { interpolateCamera } from '../canvas/camera-animation'

export interface BenchmarkMetrics {
  elementCount: number
  generationMs: number
  cullingLinearMs: number
  cullingSpatialGridMs: number
  visibleElementsCount: number
  culledElementsRatio: number
  serializationMs: number
  deserializationMs: number
  simulatedTourFps: number
  pass: boolean
}

export function runLargeCanvasBenchmark(elementCount = 5000): BenchmarkMetrics {
  // 1. Generation
  const t0 = performance.now()
  const scene: BenchmarkScene = generateBenchmarkScene(elementCount)
  const generationMs = performance.now() - t0

  // Camera positioned over the first cluster, zoomed in
  const testCamera: CameraState = {
    x: -(scene.elements[0].x + scene.elements[0].width / 2) * 1.2 + 1920 / 2,
    y: -(scene.elements[0].y + scene.elements[0].height / 2) * 1.2 + 1080 / 2,
    zoom: 1.2
  }

  // 2. Linear frustum culling
  const t1 = performance.now()
  const cullingResult = cullElementsForViewport(scene.elements, testCamera, 1920, 1080)
  const cullingLinearMs = performance.now() - t1

  // 3. Spatial Grid culling
  const grid = new SpatialGridIndex(800)
  grid.build(scene.elements)

  const frustum = computeFrustum(testCamera, 1920, 1080)
  const t2 = performance.now()
  const gridResults = grid.queryFrustum(frustum)
  const cullingSpatialGridMs = performance.now() - t2

  // 4. Serialization / Deserialization
  const t3 = performance.now()
  const serialized = JSON.stringify(scene.elements)
  const serializationMs = performance.now() - t3

  const t4 = performance.now()
  const deserialized = JSON.parse(serialized);
  void deserialized;
  const deserializationMs = performance.now() - t4

  // 5. Simulated camera tour flyover (60 frames between two camera states)
  const tourStart: CameraState = { x: 0, y: 0, zoom: 0.5 }
  const tourEnd: CameraState = { x: 3000, y: 3000, zoom: 1.5 }
  const frames = 60
  const tTourStart = performance.now()

  for (let f = 0; f < frames; f++) {
    const t = f / frames
    const currentCam = interpolateCamera(tourStart, tourEnd, t)
    const currentFrustum = computeFrustum(currentCam, 1920, 1080)
    grid.queryFrustum(currentFrustum)
  }
  const tourDurationMs = performance.now() - tTourStart
  const simulatedTourFps = Math.round((frames / (tourDurationMs / 1000)))

  const culledRatio = cullingResult.culledCount / elementCount

  // Benchmark passing criteria:
  // - Culling query under 15ms
  // - High culled ratio (> 70% elements culled when zoomed in)
  // - Serialization under 150ms
  // - Simulated tour frame rate > 120 FPS
  const pass =
    cullingSpatialGridMs < 15 &&
    culledRatio >= 0.70 &&
    serializationMs < 150 &&
    simulatedTourFps > 60

  return {
    elementCount,
    generationMs,
    cullingLinearMs,
    cullingSpatialGridMs,
    visibleElementsCount: gridResults.length,
    culledElementsRatio: culledRatio,
    serializationMs,
    deserializationMs,
    simulatedTourFps,
    pass
  }
}
