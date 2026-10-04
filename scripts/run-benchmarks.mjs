import { mkdir, writeFile } from 'node:fs/promises'
import { cpus, totalmem, platform, release, arch } from 'node:os'
import { runLargeCanvasBenchmark } from '../src/core/benchmark/benchmark-runner.ts'
import { runContinuousDrawingSessionAudit } from '../src/core/benchmark/memory-audit.ts'
import { runCompositorRegressionSuite } from '../src/core/wayland/compositor-verifier.ts'

const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
const measurements = [1000, 5000, 10000].map(count => {
  runLargeCanvasBenchmark(count) // warmup
  const runs = Array.from({ length: 5 }, () => runLargeCanvasBenchmark(count))
  const medians = Object.fromEntries(Object.keys(runs[0]).filter(key => typeof runs[0][key] === 'number').map(key => [key, median(runs.map(run => run[key]))]))
  return { count, runs, medians }
})
const report = {
  kind: 'algorithm benchmarks and simulations; no renderer or hardware input is measured',
  timestamp: new Date().toISOString(),
  metadata: { platform: platform(), release: release(), arch: arch(), node: process.version, cpu: cpus()[0]?.model, logicalCpus: cpus().length, totalMemoryBytes: totalmem() },
  deterministicScene: 'fixed trigonometric generator, no random input',
  measurements,
  simulations: { memory: runContinuousDrawingSessionAudit(120), compositor: runCompositorRegressionSuite() }
}
await mkdir('benchmark-results', { recursive: true })
await writeFile('benchmark-results/algorithms.json', JSON.stringify(report, null, 2) + '\n')
const readable = ['# Algorithm benchmarks', '', report.kind, '', `Runtime: ${process.version}; CPU: ${report.metadata.cpu}`, '', '| Elements | Spatial query median (ms) | Serialization median (ms) |', '| --- | --- | --- |', ...measurements.map(row => `| ${row.count} | ${row.medians.cullingSpatialGridMs.toFixed(3)} | ${row.medians.serializationMs.toFixed(3)} |`), '', 'Memory and compositor outputs are simulations, not evidence of hardware compatibility or renderer heap usage.']
await writeFile('benchmark-results/algorithms.md', readable.join('\n') + '\n')
console.log(readable.join('\n'))
