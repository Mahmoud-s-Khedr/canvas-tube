import { test, expect } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { cpus, totalmem, platform, release, arch } from 'node:os'
import { join, resolve } from 'node:path'
import { performance as nodePerformance } from 'node:perf_hooks'
import { temporaryWorkspace, launchDesktop, dialogs, drawRectangle, closeDesktop, removeWorkspace, type DesktopSession } from './harness'

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]

// eslint-disable-next-line no-empty-pattern
test('advisory actual Electron renderer measurements', async ({}, info) => {
  test.setTimeout(600_000)
  const root = await temporaryWorkspace()
  let session: DesktopSession | undefined
  try {
    session = await launchDesktop(root)
    const { app, page } = session
    const seedProject = join(root, 'seed.canvasproject')
    await dialogs(app, { save: seedProject })
    await drawRectangle(page); await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Project saved successfully!', { exact: true })).toBeVisible()
    const manifest = JSON.parse(await readFile(join(seedProject, 'project.json'), 'utf8'))
    const seedScene = JSON.parse(await readFile(join(seedProject, 'scene.json'), 'utf8'))
    const rectangle = seedScene.elements.find((element: { type: string }) => element.type === 'rectangle')
    expect(rectangle).toBeDefined()
    const cdp = await app.context().newCDPSession(page)
    const heap = async () => (await cdp.send('Runtime.getHeapUsage')).usedSize
    const rendererRuntime = await app.evaluate(() => process.versions)
    const measurements = []
    // Fixed seed 42; coordinates are deterministic and every record originates
    // from a real drawn element, without depending on Excalidraw internals.
    for (const count of [1000, 5000, 10000]) {
      const project = join(root, `scene-${count}.canvasproject`)
      await mkdir(project)
      await writeFile(join(project, 'project.json'), JSON.stringify({ ...manifest, title: `Scene ${count}` }))
      const elements = Array.from({ length: count }, (_, index) => ({ ...rectangle, id: `seed42-${index}`, seed: (index * 16807 + 42) % 2147483647, x: (index % 100) * 24, y: Math.floor(index / 100) * 18, boundElements: null }))
      await writeFile(join(project, 'scene.json'), JSON.stringify({ ...seedScene, elements }))
      const runs = []
      for (let run = 0; run < 4; run++) {
        await page.getByRole('button', { name: 'New', exact: true }).click()
        await dialogs(app, { open: project })
        const loadStart = nodePerformance.now()
        await page.getByRole('button', { name: 'Open', exact: true }).click()
        await expect(page.getByRole('button', { name: `Rename canvas: Scene ${count}`, exact: true })).toBeVisible()
        await page.evaluate(() => new Promise<void>(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()))))
        const loadMs = nodePerformance.now() - loadStart
        const framesPromise = page.evaluate(() => new Promise<number[]>(resolveFrames => {
          const frames: number[] = []; let last = performance.now()
          const sample = (now: number) => { frames.push(now - last); last = now; if (frames.length < 120) requestAnimationFrame(sample); else resolveFrames(frames) }
          requestAnimationFrame(sample)
        }))
        await page.mouse.move(750, 400)
        for (let interaction = 0; interaction < 12; interaction++) { await page.mouse.wheel(0, interaction % 2 ? -80 : 80); await page.waitForTimeout(50) }
        const frameIntervalsMs = await framesPromise
        await page.getByRole('button', { name: 'Export', exact: true }).click()
        await page.getByRole('button', { name: /Screen Viewport/ }).click()
        const destination = join(root, `export-${count}-${run}.png`)
        await dialogs(app, { save: destination })
        const exportStart = nodePerformance.now()
        await page.getByRole('button', { name: 'Save PNG Diagram...', exact: true }).click()
        await expect(page.getByText(`Export saved successfully to: ${destination}`, { exact: true })).toBeVisible()
        const exportMs = nodePerformance.now() - exportStart
        await page.keyboard.press('Escape')
        const usedHeapBytes = await heap()
        await page.getByRole('button', { name: 'Save', exact: true }).click()
        await expect(page.getByText('Project saved successfully!', { exact: true })).toBeVisible()
        expect(JSON.parse(await readFile(join(project, 'scene.json'), 'utf8')).elements).toHaveLength(count)
        if (run > 0) runs.push({ loadMs, exportMs, frameMedianMs: median(frameIntervalsMs), frameIntervalsMs, usedHeapBytes })
      }
      measurements.push({ count, runs, medians: { loadMs: median(runs.map(run => run.loadMs)), exportMs: median(runs.map(run => run.exportMs)), frameMedianMs: median(runs.map(run => run.frameMedianMs)), usedHeapBytes: median(runs.map(run => run.usedHeapBytes)) } })
    }
    await page.getByRole('button', { name: 'New', exact: true }).click()
    const heapCycles = [{ cycle: 0, usedHeapBytes: await heap() }]
    for (let cycle = 1; cycle <= 10; cycle++) {
      await drawRectangle(page)
      await dialogs(app, { open: resolve('e2e/fixtures/small.png') })
      await page.getByRole('button', { name: 'Import Image', exact: true }).click()
      await expect(page.getByText('Image inserted onto canvas', { exact: true })).toBeVisible()
      await page.mouse.click(750, 400); await page.keyboard.press('Control+a'); await page.keyboard.press('Delete')
      await page.getByRole('button', { name: 'New', exact: true }).click()
      heapCycles.push({ cycle, usedHeapBytes: await heap() })
    }
    const report = {
      kind: 'actual Electron renderer, advisory timings', timestamp: new Date().toISOString(), seed: 42, warmupRuns: 1, repeatedRuns: 3,
      metadata: { platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model, logicalCpus: cpus().length, totalMemoryBytes: totalmem(), runtime: rendererRuntime },
      method: 'UI open to two animation frames; UI viewport PNG export to saved-file feedback; RAF intervals during wheel input; CDP Runtime.getHeapUsage without forced GC. UI timings include IPC/filesystem and preview rendering.',
      measurements, heapCycles
    }
    await mkdir('benchmark-results', { recursive: true })
    await writeFile('benchmark-results/renderer.json', JSON.stringify(report, null, 2) + '\n')
    await writeFile('benchmark-results/renderer.md', ['# Actual Electron renderer measurements', '', report.method, '', '| Elements | Load median ms | PNG export median ms | Frame interval median ms | Heap bytes median |', '| --- | --- | --- | --- | --- |', ...measurements.map(row => `| ${row.count} | ${row.medians.loadMs.toFixed(2)} | ${row.medians.exportMs.toFixed(2)} | ${row.medians.frameMedianMs.toFixed(2)} | ${row.medians.usedHeapBytes} |`), '', `Create/delete/import/reset heap samples: ${JSON.stringify(heapCycles)}`, '', 'Advisory only. Heap samples without forced GC do not establish the absence of leaks.'].join('\n') + '\n')
    expect(session.errors).toEqual([])
  } finally {
    try { if (session) await closeDesktop(session, info) } finally { await removeWorkspace(root) }
  }
})
