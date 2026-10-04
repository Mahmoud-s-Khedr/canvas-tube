import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PDFDocumentProxy } from 'pdfjs-dist'
const pdfjs = vi.hoisted(() => ({ getDocument: vi.fn(), GlobalWorkerOptions: { workerSrc: '' }, VerbosityLevel: { ERRORS: 0 } }))
vi.mock('pdfjs-dist', () => pdfjs)
vi.mock('pdfjs-dist/build/pdf.worker.mjs', () => ({}))
import { PdfService } from '../../src/renderer/src/services/pdf-service'
beforeEach(() => { PdfService.clearCache(); vi.clearAllMocks() })
afterEach(() => PdfService.clearCache())
function documentDouble() {
  const page = { cleanup: vi.fn(), getViewport: vi.fn(() => ({ width: 100, height: 80 })), render: vi.fn(() => ({ promise: Promise.resolve() })) }
  const doc = { numPages: 1, getPage: vi.fn().mockResolvedValue(page), cleanup: vi.fn(), loadingTask: { destroy: vi.fn().mockResolvedValue(undefined) } }
  return { page, doc, proxy: doc as unknown as PDFDocumentProxy }
}
describe('PDF failure and cleanup boundaries', () => {
  it('rejects load errors without caching failed tasks', async () => {
    pdfjs.getDocument.mockReturnValue({ promise: Promise.reject(new Error('invalid PDF')) })
    await expect(PdfService.loadPdfFromBase64('YQ==', 'doc')).rejects.toThrow('invalid PDF')
    const { proxy } = documentDouble(); pdfjs.getDocument.mockReturnValue({ promise: Promise.resolve(proxy) })
    expect(await PdfService.loadPdfFromBase64('YQ==', 'doc')).toBe(proxy)
    expect(pdfjs.getDocument).toHaveBeenCalledTimes(2)
  })
  it.each(['renderPage', 'renderThumbnail'] as const)('cleans page resources after %s rejects', async method => {
    const { page, proxy } = documentDouble()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillRect: vi.fn() } as unknown as CanvasRenderingContext2D)
    page.render.mockReturnValue({ promise: Promise.reject(new Error('render failed')) })
    await expect(PdfService[method](proxy, 1)).rejects.toThrow('render failed'); expect(page.cleanup).toHaveBeenCalledOnce()
  })
  it.each(['renderPage', 'renderThumbnail'] as const)('cleans resources when %s cannot create a context', async method => {
    const { page, proxy } = documentDouble(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    await expect(PdfService[method](proxy, 1)).rejects.toThrow('2D canvas context'); expect(page.cleanup).toHaveBeenCalledOnce()
  })
  it('evicts cached documents, handles asynchronous cleanup failure, and still destroys the task', async () => {
    const { doc, proxy } = documentDouble(); pdfjs.getDocument.mockReturnValue({ promise: Promise.resolve(proxy) })
    await PdfService.loadPdfFromBase64('YQ==', 'doc')
    doc.cleanup.mockImplementation(() => Promise.reject(new Error('cleanup failed')))
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    PdfService.evictDocument('doc'); await Promise.resolve()
    expect(doc.loadingTask.destroy).toHaveBeenCalledOnce(); expect(warning).toHaveBeenCalledOnce()
    doc.cleanup.mockReset()
    await PdfService.loadPdfFromBase64('YQ==', 'doc'); expect(pdfjs.getDocument).toHaveBeenCalledTimes(2)
  })
})
