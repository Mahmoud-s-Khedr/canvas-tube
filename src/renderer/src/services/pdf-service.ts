import '../platform-polyfills'
import * as pdfjsLib from 'pdfjs-dist'
// @ts-expect-error - pdf.worker.mjs is an ES module bundled with pdfjs-dist
import * as pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs'
import type { PDFDocumentProxy } from 'pdfjs-dist'

// Polyfill ECMAScript features if running in environments lacking them
if (typeof (Promise as unknown as Record<string, unknown>).try !== 'function') {
  ;(Promise as unknown as Record<string, unknown>).try = function (
    fn: (...args: unknown[]) => unknown,
    ...args: unknown[]
  ) {
    return new Promise((resolve) => resolve(fn(...args)))
  }
}
if (typeof (Uint8Array.prototype as unknown as Record<string, unknown>).toHex !== 'function') {
  ;(Uint8Array.prototype as unknown as Record<string, unknown>).toHex = function () {
    return Array.from(this as unknown as Uint8Array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
}

// In modern Electron packaged apps running on file:// protocol, external Web Workers
// fail to load because origin is "null" and absolute paths resolve to file:///<root>.
// Supplying pdfjsWorker directly to globalThis ensures self-contained,
// zero-dependency in-memory PDF parsing across development, production, and tests.
if (typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).pdfjsWorker = pdfjsWorker
}
;(globalThis as unknown as Record<string, unknown>).pdfjsWorker = pdfjsWorker

// Clear workerSrc to ensure PDF.js relies on the embedded mainThreadWorkerMessageHandler
pdfjsLib.GlobalWorkerOptions.workerSrc = ''

export interface RenderedPage {
  pageNumber: number
  dataUrl: string
  thumbnailUrl: string
  width: number
  height: number
  aspectRatio: number
}

export class PdfService {
  private static cache = new Map<string, PDFDocumentProxy>()

  public static async loadPdfFromBase64(base64Data: string, docId?: string): Promise<PDFDocumentProxy> {
    if (!base64Data) {
      throw new Error('No PDF data provided')
    }

    if (docId && this.cache.has(docId)) {
      return this.cache.get(docId)!
    }

    // Strip optional data URI scheme prefix (e.g. data:application/pdf;base64,) and any whitespace/newlines
    const base64Clean = (base64Data.includes(',') ? base64Data.split(',')[1] : base64Data).replace(/\s+/g, '')
    const binaryString = atob(base64Clean)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    const loadingTask = pdfjsLib.getDocument({
      data: bytes
    })

    const pdfDoc = await loadingTask.promise
    if (docId) {
      this.cache.set(docId, pdfDoc)
    }
    return pdfDoc
  }

  public static async renderPage(
    pdfDoc: PDFDocumentProxy,
    pageNumber: number,
    scale = 2.0
  ): Promise<{ dataUrl: string; width: number; height: number; aspectRatio: number }> {
    const page = await pdfDoc.getPage(pageNumber)
    try {
      const viewport = page.getViewport({ scale })

      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)

      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('Failed to create 2D canvas context for PDF rendering')
      }

      // Fill white background in case PDF page is transparent
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)

      await page.render({
        canvasContext: context,
        viewport,
        canvas
      }).promise

      const dataUrl = canvas.toDataURL('image/png')
      const unscaledViewport = page.getViewport({ scale: 1.0 })

      return {
        dataUrl,
        width: Math.round(unscaledViewport.width),
        height: Math.round(unscaledViewport.height),
        aspectRatio: unscaledViewport.width / unscaledViewport.height
      }
    } finally {
      page.cleanup()
    }
  }

  public static async renderThumbnail(
    pdfDoc: PDFDocumentProxy,
    pageNumber: number,
    thumbWidth = 180
  ): Promise<string> {
    const page = await pdfDoc.getPage(pageNumber)
    try {
      const unscaledViewport = page.getViewport({ scale: 1.0 })
      const scale = thumbWidth / unscaledViewport.width
      const viewport = page.getViewport({ scale })

      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)

      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('Failed to create 2D canvas context for PDF thumbnail')
      }

      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)

      await page.render({
        canvasContext: context,
        viewport,
        canvas
      }).promise

      return canvas.toDataURL('image/png')
    } finally {
      page.cleanup()
    }
  }

  public static clearCache(): void {
    for (const doc of this.cache.values()) {
      try {
        doc.cleanup()
        doc.loadingTask?.destroy?.()
      } catch (err) {
        console.warn('[PdfService] Error cleaning up PDF document:', err)
      }
    }
    this.cache.clear()
  }

  public static evictDocument(docId: string): void {
    const doc = this.cache.get(docId)
    if (doc) {
      try {
        doc.cleanup()
        doc.loadingTask?.destroy?.()
      } catch (err) {
        console.warn('[PdfService] Error cleaning up PDF document:', err)
      }
      this.cache.delete(docId)
    }
  }
}
