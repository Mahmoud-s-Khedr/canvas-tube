import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultManifest } from '../../src/core/project/project-manifest'
import { desktopDouble } from './desktop-double'

vi.mock('../../src/core/icons/icon-loader', () => ({ loadAllIcons: () => [] }))

const canvas = vi.hoisted(() => ({
  scene: { elements: [] as unknown[], appState: {}, files: {} },
  camera: { x: 10, y: 20, zoom: 2 },
  animate: vi.fn(), addFile: vi.fn(), addObject: vi.fn(),
  export: vi.fn().mockResolvedValue({ dataUrl: 'data:image/png;base64,YQ==', width: 100, height: 80 })
}))
vi.mock('../../src/renderer/src/components/canvas/ExcalidrawCanvasAdapter', () => ({
  ExcalidrawCanvasAdapter: class {
    serialize() { return canvas.scene }
    deserialize(scene: typeof canvas.scene) { canvas.scene = scene }
    getCamera() { return canvas.camera }
    getViewportCenter() { return { x: 0, y: 0 } }
    animateCameraTo = canvas.animate
    setPointerListener() {}
    addFile = canvas.addFile
    addObject = canvas.addObject
    getElementsCount() { return canvas.scene.elements.length }
    getExportBounds() { return { x: 0, y: 0, width: 100, height: 80 } }
    exportCanvas = canvas.export
    setBackgroundColor() {}
  }
}))
// Canvas rendering is an independent boundary; all surrounding UI is real.
vi.mock('../../src/renderer/src/components/canvas/CanvasView', () => ({
  CanvasView: ({ onImportImage, onImportPdf }: { onImportImage: () => void; onImportPdf: () => void }) => <div>
    <button onClick={onImportImage}>Import image</button><button onClick={onImportPdf}>Import PDF</button>
  </div>
}))
const pdf = vi.hoisted(() => ({ loadPdfFromBase64: vi.fn(), clearCache: vi.fn(), renderThumbnail: vi.fn().mockResolvedValue('data:image/png;base64,YQ==') }))
vi.mock('../../src/renderer/src/services/pdf-service', () => ({ PdfService: pdf }))
import { App } from '../../src/renderer/src/App'

let desktop: ReturnType<typeof desktopDouble>
beforeEach(() => {
  vi.clearAllMocks()
  // jsdom cannot produce trusted native input. Preserve real dispatch/listener
  // disposal, but present user-event keydown events as native keyboard input.
  const add = window.addEventListener.bind(window)
  const remove = window.removeEventListener.bind(window)
  const wrappers = new Map<EventListenerOrEventListenerObject, EventListener>()
  vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
    if (type !== 'keydown' || typeof listener !== 'function') return add(type, listener, options)
    const wrapper: EventListener = event => listener(new Proxy(event, {
      get(target, key) {
        if (key === 'isTrusted') return true
        const value = Reflect.get(target, key, target)
        return typeof value === 'function' ? value.bind(target) : value
      }
    }))
    wrappers.set(listener, wrapper); add(type, wrapper, options)
  })
  vi.spyOn(window, 'removeEventListener').mockImplementation((type, listener, options) => {
    remove(type, wrappers.get(listener) ?? listener, options)
  })
  canvas.export.mockResolvedValue({ dataUrl: 'data:image/png;base64,YQ==', width: 100, height: 80 })
  pdf.renderThumbnail.mockResolvedValue('data:image/png;base64,YQ==')
  canvas.scene = { elements: [], appState: {}, files: {} }
  desktop = desktopDouble(); window.desktopApi = desktop
  pdf.loadPdfFromBase64.mockResolvedValue({ numPages: 1 })
})
const asset = { id: 'a', type: 'image' as const, originalFilename: 'small.png', mimeType: 'image/png', hash: 'abc', relativePath: 'assets/small.png', sizeBytes: 1, createdAt: new Date().toISOString() }

async function click(name: string | RegExp) { await userEvent.click(screen.getByRole('button', { name })) }

describe('project workflows through real application UI', () => {
  it('renames with keyboard, delegates first save, saves again, Save As and resets', async () => {
    render(<App />)
    canvas.scene.elements.push({ id: 'rectangle' })
    await click(/Rename canvas:/)
    const input = screen.getByRole('textbox', { name: 'Canvas title' })
    await userEvent.clear(input); await userEvent.type(input, 'Diagram{Enter}')
    await click('Save')
    await waitFor(() => expect(desktop.saveProjectAs).toHaveBeenCalledWith('Diagram', expect.objectContaining({ sceneData: canvas.scene }), {}))
    await click('Save'); expect(desktop.saveProject).toHaveBeenCalledWith('/project', expect.anything(), {})
    await click('Save options'); await click(/Save As/)
    expect(desktop.saveProjectAs).toHaveBeenCalledTimes(2)
    await click('New')
    expect(screen.getByRole('button', { name: /Rename canvas: New Architecture Canvas/ })).toBeInTheDocument()
    expect(canvas.scene.elements).toEqual([])
    await click('Save'); expect(desktop.saveProjectAs).toHaveBeenCalledTimes(3)
  })

  it('cancellation preserves the title, scene and first-save delegation', async () => {
    desktop.openProject.mockResolvedValue(null); desktop.saveProjectAs.mockResolvedValue(null)
    render(<App />); canvas.scene.elements.push({ id: 'keep' })
    await click('Open'); await click('Save'); await click('Save')
    expect(canvas.scene.elements).toEqual([{ id: 'keep' }])
    expect(desktop.saveProject).not.toHaveBeenCalled()
    expect(desktop.saveProjectAs).toHaveBeenCalledTimes(2)
  })

  it.each(['Open', 'Save', 'Import image', 'Import PDF'])("handles rejected %s without destroying existing state", async (name) => {
    desktop.openProject.mockRejectedValue(new Error('offline'))
    desktop.saveProjectAs.mockRejectedValue(new Error('offline'))
    desktop.importAsset.mockRejectedValue(new Error('offline'))
    desktop.importPdf.mockRejectedValue(new Error('offline'))
    render(<App />); canvas.scene.elements.push({ id: 'keep' })
    await click(name)
    expect(await screen.findByText(/failed: offline/)).toBeInTheDocument()
    expect(canvas.scene.elements).toEqual([{ id: 'keep' }])
  })

  it('reports unsuccessful saves and missing desktop APIs', async () => {
    desktop.saveProjectAs.mockResolvedValue({ success: false, error: 'disk full' })
    render(<App />); await click('Save')
    expect(await screen.findByText('Save failed: disk full')).toBeInTheDocument()
    delete window.desktopApi; await click('Open')
    expect(await screen.findByText('Desktop API is unavailable.')).toBeInTheDocument()
  })

  it('preserves project state when image/PDF import dialogs are cancelled', async () => {
    render(<App />); canvas.scene.elements.push({ id: 'keep' })
    await click('Import image'); await click('Import PDF'); await click('Save')
    expect(canvas.addObject).not.toHaveBeenCalled()
    expect(desktop.saveProjectAs.mock.calls[0][1].manifest.assets).toEqual({})
    expect(desktop.saveProjectAs.mock.calls[0][1].manifest.documents).toEqual([])
    expect(canvas.scene.elements).toEqual([{ id: 'keep' }])
  })

  it('reports a later save failure and Save As failures without changing the existing directory', async () => {
    render(<App />); await click('Save')
    desktop.saveProject.mockResolvedValue({ success: false, error: 'read only' })
    await click('Save'); expect(await screen.findByText('Save failed: read only')).toBeInTheDocument()
    desktop.saveProjectAs.mockResolvedValue({ success: false, error: 'disk full' })
    await click('Save options'); await click(/Save As/)
    expect(await screen.findByText('Save As failed: disk full')).toBeInTheDocument()
    desktop.saveProjectAs.mockRejectedValue(new Error('permission denied'))
    await click('Save options'); await click(/Save As/)
    expect(await screen.findByText('Save As failed: permission denied')).toBeInTheDocument()
    await click('Save')
    expect(desktop.saveProject).toHaveBeenLastCalledWith('/project', expect.anything(), {})
  })

  it('reports native copy failure and export cancellation/failure', async () => {
    render(<App />); canvas.scene.elements.push({ id: 'diagram' })
    desktop.copyImageToClipboard.mockResolvedValue(false)
    await userEvent.keyboard('{Control>}{Shift>}C{/Shift}{/Control}')
    expect(await screen.findByText('Failed to copy diagram to clipboard')).toBeInTheDocument()
    desktop.saveExportFile.mockResolvedValue({ success: false, canceled: true })
    await click('Export'); await click(/Save PNG Diagram/)
    expect(screen.getByText('Production Diagram Export')).toBeInTheDocument()
    desktop.saveExportFile.mockResolvedValue({ success: false, error: 'read only' })
    await click(/Save PNG Diagram/)
    expect(await screen.findByText(/read only/)).toBeInTheDocument()
  })

  it('restores project scene and document, reports missing persisted PDF bytes', async () => {
    const manifest = createDefaultManifest('Reopened')
    manifest.documents.push({ id: 'doc', assetId: 'a', filename: 'slides.pdf', pageCount: 1, type: 'pdf' })
    desktop.openProject.mockResolvedValue({ projectDir: '/reopened', bundle: { manifest, sceneData: { elements: [{ id: 'saved' }], files: {} } }, assetData: {} })
    render(<App />); await click('Open')
    expect(await screen.findByText(/source file for "slides.pdf" is missing/)).toBeInTheDocument()
    expect(canvas.scene.elements).toEqual([{ id: 'saved' }])
    desktop.openProject.mockResolvedValue({ projectDir: '/reopened', bundle: { manifest, sceneData: canvas.scene }, assetData: { a: 'YQ==' } })
    await click('Open')
    await waitFor(() => expect(pdf.loadPdfFromBase64).toHaveBeenCalledWith('YQ==', 'doc'))
    expect(await screen.findByRole('button', { name: 'Slide Dock' })).toBeInTheDocument()
  })

  it('imports image bytes into the saved bundle', async () => {
    desktop.importAsset.mockResolvedValue({ asset, dataUrl: 'data:image/png;base64,YQ==' })
    render(<App />); await click('Import image'); await click('Save')
    expect(canvas.addFile).toHaveBeenCalledWith(expect.objectContaining({ dataURL: 'data:image/png;base64,YQ==' }))
    expect(canvas.addObject).toHaveBeenCalledWith(expect.objectContaining({ type: 'image' }))
    expect(desktop.saveProjectAs).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ manifest: expect.objectContaining({ assets: { a: asset } }) }), { a: 'YQ==' })
  })

  it('rejects a malformed PDF while preserving the manifest', async () => {
    desktop.importPdf.mockResolvedValue({ asset: { ...asset, type: 'pdf' }, document: { id: 'doc', assetId: 'a', filename: 'bad.pdf', pageCount: 0, type: 'pdf' }, pdfBase64: 'bad' })
    pdf.loadPdfFromBase64.mockRejectedValue(new Error('invalid PDF'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<App />); await click('Import PDF')
    expect(await screen.findByText(/Failed to parse and load PDF document: invalid PDF/)).toBeInTheDocument()
    expect(error).toHaveBeenCalledOnce()
    await click('Save')
    expect(desktop.saveProjectAs.mock.calls[0][1].manifest.documents).toEqual([])
  })

  it('adds a bookmark, saves its camera and enters/exits recording mode', async () => {
    render(<App />); await click('Bookmark current view'); await click('Save')
    expect(desktop.saveProjectAs.mock.calls[0][1].manifest.presentation.cameraBookmarks).toEqual([expect.objectContaining(canvas.camera)])
    await click('Recording Mode')
    expect(screen.getByText('RECORDING MODE')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Recording Mode' })).toBeInTheDocument()
  })

  it('exports through the desktop bridge', async () => {
    render(<App />); canvas.scene.elements.push({ id: 'diagram' })
    await click('Export'); await click(/Save PNG Diagram/)
    expect(desktop.saveExportFile).toHaveBeenCalledWith(expect.objectContaining({ dataBase64: 'YQ==' }))
  })

  it('dispatches save/copy shortcuts and suppresses save in an editable field', async () => {
    render(<App />); canvas.scene.elements.push({ id: 'diagram' })
    await userEvent.keyboard('{Control>}s{/Control}')
    expect(desktop.saveProjectAs).toHaveBeenCalledOnce()
    await userEvent.keyboard('{Control>}{Shift>}C{/Shift}{/Control}')
    await waitFor(() => expect(desktop.copyImageToClipboard).toHaveBeenCalled())
    await click(/Rename canvas:/)
    await userEvent.keyboard('{Control>}s{/Control}')
    expect(desktop.saveProjectAs).toHaveBeenCalledOnce()
  })
})
