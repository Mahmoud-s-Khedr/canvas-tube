import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { temporaryWorkspace, launchDesktop, dialogs, closeDesktop, removeWorkspace, drawRectangle, type DesktopSession } from './harness'

let root: string
let session: DesktopSession | undefined
test.beforeEach(async () => { root = await temporaryWorkspace(); session = await launchDesktop(root) })
// Playwright requires destructured fixture arguments for hooks.
// eslint-disable-next-line no-empty-pattern
test.afterEach(async ({}, info) => {
  try {
    if (session) { const errors = [...session.errors]; await closeDesktop(session, info); expect(errors).toEqual([]) }
  } finally { await removeWorkspace(root); session = undefined }
})

test('launch exposes the desktop bridge and sandboxed window', async () => {
  const { app, page } = session!
  expect(await page.evaluate(() => Object.keys(window.desktopApi ?? {}).sort())).toEqual(['copyImageToClipboard', 'copyTextToClipboard', 'getSystemInfo', 'importAsset', 'importPdf', 'openProject', 'saveExportFile', 'saveProject', 'saveProjectAs', 'toggleDevTools'].sort())
  expect(await page.evaluate(() => window.desktopApi!.getSystemInfo())).toHaveProperty('electronVersion')
  expect(await app.evaluate(({ BrowserWindow }) => (BrowserWindow.getAllWindows()[0].webContents as any).getLastWebPreferences())).toMatchObject({ sandbox: true, contextIsolation: true, nodeIntegration: false })
})

test('draw, save, restart and reopen persisted scene through the real bridge', async () => {
  const project = join(root, 'drawing.canvasproject')
  await dialogs(session!.app, { save: project })
  await drawRectangle(session!.page)
  await session!.page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(session!.page.getByText('Project saved successfully!', { exact: true })).toBeVisible()
  const scene = JSON.parse(await readFile(join(project, 'scene.json'), 'utf8'))
  expect(scene.elements.some((e: { type: string; width: number }) => e.type === 'rectangle' && e.width > 100)).toBe(true)
  const errors = [...session!.errors]; await closeDesktop(session!); session = undefined; expect(errors).toEqual([])
  session = await launchDesktop(root)
  await dialogs(session.app, { open: project })
  await session.page.getByRole('button', { name: 'Open', exact: true }).click()
  await expect(session.page.getByRole('button', { name: /Rename canvas: System Design/ })).toBeVisible()
  await expect(session.page.getByText(`(${project})`, { exact: true })).toBeVisible()
  // Save again to verify reopened renderer state, rather than trusting a screenshot.
  await session.page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(session.page.getByText('Project saved successfully!', { exact: true })).toBeVisible()
  expect(JSON.parse(await readFile(join(project, 'scene.json'), 'utf8')).elements).toEqual(scene.elements)
})

test('imports original PNG/PDF assets and exports decoded PNG/SVG content', async () => {
  const { app, page } = session!
  await dialogs(app, { open: resolve('e2e/fixtures/small.png') })
  await page.getByRole('button', { name: 'Import Image', exact: true }).click()
  await expect(page.getByText('Image inserted onto canvas', { exact: true })).toBeVisible()
  await dialogs(app, { open: resolve('e2e/fixtures/small.pdf') })
  await page.getByRole('button', { name: 'Import PDF / Slides', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Slide Dock', exact: true })).toBeVisible()
  const project = join(root, 'imports.canvasproject')
  await dialogs(app, { save: project })
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Project saved successfully!', { exact: true })).toBeVisible()
  const manifest = JSON.parse(await readFile(join(project, 'project.json'), 'utf8'))
  expect(manifest.documents[0].pageCount).toBe(1)
  for (const asset of Object.values(manifest.assets) as { originalFilename: string; relativePath: string }[]) {
    expect(await readFile(join(project, asset.relativePath))).toEqual(await readFile(resolve('e2e/fixtures', asset.originalFilename)))
  }
  for (const format of ['PNG', 'SVG']) {
    await page.getByRole('button', { name: 'Export', exact: true }).click()
    const destination = join(root, `diagram.${format.toLowerCase()}`)
    await dialogs(app, { save: destination })
    await page.getByRole('button', { name: format === 'PNG' ? /^PNG Raster/ : /^Vector SVG/ }).first().click()
    await page.getByRole('button', { name: `Save ${format} Diagram...`, exact: true }).click()
    await expect(page.getByText(`Export saved successfully to: ${destination}`, { exact: true })).toBeVisible()
    const bytes = await readFile(destination)
    if (format === 'PNG') {
      expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      expect(bytes.readUInt32BE(16)).toBeGreaterThan(0); expect(bytes.readUInt32BE(20)).toBeGreaterThan(0)
    } else { expect(bytes.toString()).toContain('<svg'); expect(bytes.toString()).toContain('<image') }
  }
})
