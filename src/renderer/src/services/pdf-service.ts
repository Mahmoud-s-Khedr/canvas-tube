import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'

// Set worker path relative to public directory (zero CDN dependencies)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

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
    if (docId && this.cache.has(docId)) {
      return this.cache.get(docId)!
    }

    const binaryString = atob(base64Data)
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
  }

  public static async renderThumbnail(
    pdfDoc: PDFDocumentProxy,
    pageNumber: number,
    thumbWidth = 180
  ): Promise<string> {
    const page = await pdfDoc.getPage(pageNumber)
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
  }

  public static clearCache(): void {
    this.cache.clear()
  }
}
