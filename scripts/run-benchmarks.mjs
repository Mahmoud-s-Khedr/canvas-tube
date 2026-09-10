import { generateBenchmarkScene } from '../src/core/benchmark/scene-generator.ts'
import { computeFrustum, cullElementsForViewport, SpatialGridIndex } from '../src/core/benchmark/spatial-culler.ts'
import { runLargeCanvasBenchmark } from '../src/core/benchmark/benchmark-runner.ts'
import { runContinuousDrawingSessionAudit } from '../src/core/benchmark/memory-audit.ts'
import { runCompositorRegressionSuite } from '../src/core/wayland/compositor-verifier.ts'

console.log('\n============================================================')
console.log('   CANVAS-TUBE PERFORMANCE, MEMORY & WAYLAND AUDIT SUITE   ')
console.log('============================================================\n')

// 1. Virtualized Rendering Benchmark (>5,000 Elements)
console.log('>>> [1/3] Running Large Canvas & Virtualized Frustum Benchmark...')
const counts = [1000, 5000, 10000]
const benchRows = []

for (const count of counts) {
  const t0 = performance.now()
  const scene = generateBenchmarkScene(count)
  const genTime = (performance.now() - t0).toFixed(2)

  const camera = {
    x: -(scene.elements[0].x + scene.elements[0].width / 2) * 1.5 + 1920 / 2,
    y: -(scene.elements[0].y + scene.elements[0].height / 2) * 1.5 + 1080 / 2,
    zoom: 1.5
  }

  const t1 = performance.now()
  const { visibleElements, culledCount } = cullElementsForViewport(scene.elements, camera, 1920, 1080)
  const linearTime = (performance.now() - t1).toFixed(2)

  const grid = new SpatialGridIndex(800)
  grid.build(scene.elements)
  const frustum = computeFrustum(camera, 1920, 1080)

  const t2 = performance.now()
  const gridResults = grid.queryFrustum(frustum)
  const gridTime = (performance.now() - t2).toFixed(2)

  const culledPct = ((culledCount / count) * 100).toFixed(1)

  benchRows.push({
    'Elements': count,
    'Gen (ms)': `${genTime}ms`,
    'Linear Query': `${linearTime}ms`,
    'SpatialGrid Query': `${gridTime}ms`,
    'Visible / Culled': `${gridResults.length} / ${culledCount} (${culledPct}% culled)`,
    'Status': Number(gridTime) < 15 ? 'PASS (60fps ready)' : 'WARN'
  })
}
console.table(benchRows)

const full5k = runLargeCanvasBenchmark(5000)
console.log(`> 5,000 Element Flyover Tour Throughput: ${full5k.simulatedTourFps} FPS`)
console.log(`> Serialization Latency: ${full5k.serializationMs.toFixed(2)}ms`)

// 2. Memory Leak Audit (2-Hour Drawing Session Simulation)
console.log('\n>>> [2/3] Running Accelerated 2-Hour Continuous Drawing Session Audit...')
const audit = runContinuousDrawingSessionAudit(120)
console.table([
  {
    'Metric': 'Simulated Duration',
    'Value': `${audit.simulatedMinutes} minutes`
  },
  {
    'Metric': 'Stylus Pointer Events',
    'Value': audit.totalPointerEvents.toLocaleString()
  },
  {
    'Metric': 'Shapes Created / Deleted',
    'Value': `${audit.shapesCreated} / ${audit.shapesDeleted}`
  },
  {
    'Metric': 'Undo / Redo Cycles',
    'Value': audit.undoRedoCycles
  },
  {
    'Metric': 'Initial Heap',
    'Value': `${audit.initialHeapMb} MB`
  },
  {
    'Metric': 'Peak Heap',
    'Value': `${audit.peakHeapMb} MB`
  },
  {
    'Metric': 'Final Heap',
    'Value': `${audit.finalHeapMb} MB`
  },
  {
    'Metric': 'Net Heap Delta',
    'Value': `${audit.netGrowthMb >= 0 ? '+' : ''}${audit.netGrowthMb} MB (Threshold < 40MB)`
  },
  {
    'Metric': 'Leak Defense Status',
    'Value': audit.isLeakFree ? 'PASS (Bounded memory growth)' : 'FAIL'
  }
])

// 3. Automated Wayland Compositor Regression Suite
console.log('\n>>> [3/3] Running Wayland Compositors Compatibility Suite...')
const { results, allPassed } = runCompositorRegressionSuite()
const compRows = results.map((r) => ({
  'Compositor': r.compositor,
  'Ozone Switches': r.ozoneFlagsValid ? 'Configured' : 'Missing',
  'Tablet-v2': r.tabletV2Active ? 'Supported' : 'N/A',
  'Clipboard Protocol': r.profile.clipboardProtocol,
  'Decorations': r.windowDecorationMode.toUpperCase(),
  'Suite Status': r.passed ? 'PASS' : 'FAIL'
}))
console.table(compRows)

console.log(`\nOverall Test Suite Result: ${allPassed && full5k.pass && audit.isLeakFree ? 'ALL CHECKS PASSED' : 'CHECK ISSUES'}\n`)
