import { _electron, type ElectronApplication, type Page, type TestInfo } from '@playwright/test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'

export async function temporaryWorkspace() {
  const root = await mkdtemp(join(tmpdir(), 'canvastube-e2e-'))
  await mkdir(join(root, 'user-data'))
  return root
}

export async function launchDesktop(root: string) {
  const logs: string[] = []; const errors: string[] = []
  const env = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined))
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  const packaged = Boolean(env.CANVASTUBE_PACKAGED)
  const app = await _electron.launch({
    ...(packaged ? { executablePath: resolve(process.platform === 'win32' ? 'dist/win-unpacked/CanvasTube.exe' : 'dist/linux-unpacked/canvastube') } : {}),
    args: [...(packaged ? [] : [resolve('.')]), `--user-data-dir=${join(root, 'user-data')}`, '--ozone-platform=x11'],
    env, timeout: 30_000
  })
  app.process().stdout?.on('data', data => logs.push(String(data)))
  app.process().stderr?.on('data', data => logs.push(String(data)))
  app.on('window', window => {
    window.on('pageerror', error => errors.push(error.message))
    window.on('crash', () => errors.push('Renderer crashed'))
  })
  const page = await app.firstWindow()
  page.on('pageerror', error => { if (!errors.includes(error.message)) errors.push(error.message) })
  await app.context().tracing.start({ screenshots: true, snapshots: true, sources: true })
  await page.getByRole('button', { name: 'Save', exact: true }).waitFor()
  return { app, page, errors, logs }
}
export type DesktopSession = Awaited<ReturnType<typeof launchDesktop>>

export async function dialogs(app: ElectronApplication, paths: { open?: string; save?: string }) {
  await app.evaluate(({ dialog }, values) => {
    dialog.showOpenDialog = async () => ({ canceled: !values.open, filePaths: values.open ? [values.open] : [] })
    dialog.showSaveDialog = async () => ({ canceled: !values.save, filePath: values.save ?? '' })
  }, paths)
}

export async function closeDesktop(session: DesktopSession, info?: TestInfo) {
  try {
    if (info && info.status !== info.expectedStatus) {
      await session.page.screenshot({ path: info.outputPath('failure.png') }).catch(() => {})
      await session.app.context().tracing.stop({ path: info.outputPath('trace.zip') })
    } else await session.app.context().tracing.stop()
    if (info) await writeFile(info.outputPath('process.log'), session.logs.join(''))
  } finally { await session.app.close() }
}
export async function removeWorkspace(root: string) { await rm(root, { recursive: true, force: true }) }

export async function drawRectangle(page: Page) {
  await page.keyboard.press('r')
  await page.mouse.move(650, 300); await page.mouse.down()
  await page.mouse.move(850, 440, { steps: 12 }); await page.mouse.up()
  await page.keyboard.press('Escape')
}
