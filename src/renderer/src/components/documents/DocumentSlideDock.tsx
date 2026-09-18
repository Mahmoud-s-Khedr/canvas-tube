import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { DocumentEntry } from '@core/project/project-manifest'
import { CanvasAdapter } from '@core/canvas/canvas-adapter'
import { PdfService } from '../../services/pdf-service'
import {
  FileText,
  X,
  Plus,
  Rows,
  Columns,
  Maximize2,
  Lock
} from 'lucide-react'

// Rendering hundreds of canvases and keeping their PNG data URLs in React state makes
// large PDFs consume excessive CPU and memory. Keep previews close to the selected page.
const THUMBNAIL_WINDOW = 12
const MAX_BULK_INSERT_PAGES = 30
const SLIDE_WIDTH = 800
const HORIZONTAL_SLIDE_SPACING = 80
const VERTICAL_SLIDE_SPACING = 100

interface RenderedSlide {
  pageNumber: number
  dataUrl: string
  height: number
}

interface DocumentSlideDockProps {
  documentEntry: DocumentEntry | null
  pdfDoc: PDFDocumentProxy | null
  adapter: CanvasAdapter | null
  isOpen: boolean
  onClose: () => void
}

export const DocumentSlideDock: React.FC<DocumentSlideDockProps> = ({
  documentEntry,
  pdfDoc,
  adapter,
  isOpen,
  onClose
}) => {
  const [selectedPage, setSelectedPage] = useState<number>(1)
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map())
  const [isInserting, setIsInserting] = useState<boolean>(false)
  const [isMinimized, setIsMinimized] = useState<boolean>(false)
  const [insertError, setInsertError] = useState<string | null>(null)
  const requestedThumbnailPages = useRef<Set<number>>(new Set())

  const numPages = pdfDoc?.numPages ?? documentEntry?.pageCount ?? 0

  // Reset state when active document changes
  useEffect(() => {
    setThumbnails(new Map())
    setSelectedPage(1)
    requestedThumbnailPages.current.clear()
  }, [documentEntry?.id])

  const thumbnailPages = useMemo(() => {
    const start = Math.max(1, Math.min(selectedPage - 3, numPages - THUMBNAIL_WINDOW + 1))
    const end = Math.min(numPages, start + THUMBNAIL_WINDOW - 1)
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index)
  }, [numPages, selectedPage])

  // Render only a small window around the selected page. This keeps very large PDFs
  // responsive while allowing any page to be selected and previewed on demand.
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return

    let isMounted = true

    const loadThumbnails = async () => {
      for (const p of thumbnailPages) {
        if (!isMounted) break
        if (requestedThumbnailPages.current.has(p)) continue
        requestedThumbnailPages.current.add(p)

        try {
          const thumb = await PdfService.renderThumbnail(pdfDoc, p, 150)
          if (isMounted) {
            setThumbnails((prev) => new Map(prev).set(p, thumb))
          }
          // Yield main thread to keep UI responsive during multi-page rendering
          await new Promise((resolve) => setTimeout(resolve, 0))
        } catch (err) {
          requestedThumbnailPages.current.delete(p)
          console.error(`[DocumentSlideDock] Failed rendering thumbnail for page ${p}:`, err)
        }
      }
    }

    loadThumbnails()

    return () => {
      isMounted = false
    }
  }, [pdfDoc, numPages, documentEntry?.id, thumbnailPages])

  const insertPageAtCoordinates = useCallback(
    async (pageNumber: number, sceneX: number, sceneY: number, targetWidth = 800) => {
      if (!pdfDoc || !adapter) return

      setIsInserting(true)
      setInsertError(null)
      try {
        const rendered = await PdfService.renderPage(pdfDoc, pageNumber, 2.0)
        const targetHeight = Math.round(targetWidth / rendered.aspectRatio)

        const fileId = `pdf_page_${documentEntry?.id || 'doc'}_p${pageNumber}_${Date.now()}`

        adapter.addFile({
          id: fileId,
          mimeType: 'image/png',
          dataURL: rendered.dataUrl,
          created: Date.now()
        })

        adapter.addObject({
          type: 'image',
          x: Math.round(sceneX - targetWidth / 2),
          y: Math.round(sceneY - targetHeight / 2),
          width: targetWidth,
          height: targetHeight,
          fileId,
          locked: true,
          customData: {
            type: 'pdf-slide',
            docId: documentEntry?.id,
            pageNumber
          }
        })
      } catch (err) {
        console.error(`[DocumentSlideDock] Failed inserting page ${pageNumber}:`, err)
        setInsertError(`Could not insert page ${pageNumber}.`)
      } finally {
        setIsInserting(false)
      }
    },
    [pdfDoc, adapter, documentEntry]
  )

  const handleInsertCurrentPage = async () => {
    if (!adapter) return
    const sceneCenter = adapter.getViewportCenter()
    await insertPageAtCoordinates(selectedPage, sceneCenter.x, sceneCenter.y)
  }

  const handleInsertAllHorizontal = async () => {
    if (!pdfDoc || !adapter || numPages > MAX_BULK_INSERT_PAGES) return
    setIsInserting(true)
    setInsertError(null)

    try {
      const sceneCenter = adapter.getViewportCenter()
      const slides: RenderedSlide[] = []
      for (let p = 1; p <= numPages; p++) {
        const rendered = await PdfService.renderPage(pdfDoc, p, 1.8)
        slides.push({
          pageNumber: p,
          dataUrl: rendered.dataUrl,
          height: Math.round(SLIDE_WIDTH / rendered.aspectRatio)
        })
      }

      const totalWidth =
        slides.length * SLIDE_WIDTH + Math.max(0, slides.length - 1) * HORIZONTAL_SLIDE_SPACING
      let currentX = sceneCenter.x - totalWidth / 2
      const batchId = Date.now()
      const shapes = slides.map((slide) => {
        const shape = {
          type: 'image' as const,
          x: Math.round(currentX),
          y: Math.round(sceneCenter.y - slide.height / 2),
          width: SLIDE_WIDTH,
          height: slide.height,
          fileId: `pdf_page_${documentEntry?.id || 'doc'}_p${slide.pageNumber}_${batchId}`,
          locked: true,
          customData: {
            type: 'pdf-slide',
            docId: documentEntry?.id,
            pageNumber: slide.pageNumber
          }
        }
        currentX += SLIDE_WIDTH + HORIZONTAL_SLIDE_SPACING
        return shape
      })

      slides.forEach((slide, index) => {
        adapter.addFile({
          id: shapes[index].fileId!,
          mimeType: 'image/png',
          dataURL: slide.dataUrl,
          created: batchId
        })
      })
      if (adapter.addObjects) {
        adapter.addObjects(shapes)
      } else {
        shapes.forEach((shape) => adapter.addObject(shape))
      }
    } catch (err) {
      console.error('[DocumentSlideDock] Failed inserting pages horizontally:', err)
      setInsertError('Could not insert all pages horizontally.')
    } finally {
      setIsInserting(false)
    }
  }

  const handleInsertAllVertical = async () => {
    if (!pdfDoc || !adapter || numPages > MAX_BULK_INSERT_PAGES) return
    setIsInserting(true)
    setInsertError(null)

    try {
      const sceneCenter = adapter.getViewportCenter()
      const slides: RenderedSlide[] = []
      for (let p = 1; p <= numPages; p++) {
        const rendered = await PdfService.renderPage(pdfDoc, p, 1.8)
        slides.push({
          pageNumber: p,
          dataUrl: rendered.dataUrl,
          height: Math.round(SLIDE_WIDTH / rendered.aspectRatio)
        })
      }

      const totalHeight =
        slides.reduce((sum, slide) => sum + slide.height, 0) +
        Math.max(0, slides.length - 1) * VERTICAL_SLIDE_SPACING
      let currentY = sceneCenter.y - totalHeight / 2
      const batchId = Date.now()
      const shapes = slides.map((slide) => {
        const shape = {
          type: 'image' as const,
          x: Math.round(sceneCenter.x - SLIDE_WIDTH / 2),
          y: Math.round(currentY),
          width: SLIDE_WIDTH,
          height: slide.height,
          fileId: `pdf_page_${documentEntry?.id || 'doc'}_p${slide.pageNumber}_${batchId}`,
          locked: true,
          customData: {
            type: 'pdf-slide',
            docId: documentEntry?.id,
            pageNumber: slide.pageNumber
          }
        }
        currentY += slide.height + VERTICAL_SLIDE_SPACING
        return shape
      })

      slides.forEach((slide, index) => {
        adapter.addFile({
          id: shapes[index].fileId!,
          mimeType: 'image/png',
          dataURL: slide.dataUrl,
          created: batchId
        })
      })
      if (adapter.addObjects) {
        adapter.addObjects(shapes)
      } else {
        shapes.forEach((shape) => adapter.addObject(shape))
      }
    } catch (err) {
      console.error('[DocumentSlideDock] Failed inserting pages vertically:', err)
      setInsertError('Could not insert all pages vertically.')
    } finally {
      setIsInserting(false)
    }
  }

  if (!isOpen || !documentEntry) return null

  if (isMinimized) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          backgroundColor: '#18181b',
          border: '1px solid #3f3f46',
          borderRadius: 24,
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          color: '#f4f4f5',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 12
        }}
      >
        <FileText size={15} color="#ef4444" />
        <span style={{ fontWeight: 600 }}>{documentEntry.filename}</span>
        <span style={{ color: '#71717a' }}>({numPages} pages)</span>
        <button
          onClick={() => setIsMinimized(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#38bdf8',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
          title="Expand Slide Strip"
        >
          <Maximize2 size={13} />
          <span>Expand</span>
        </button>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#a1a1aa',
            cursor: 'pointer',
            padding: 2
          }}
          title="Close Dock"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100vw - 120px)',
        maxWidth: 960,
        backgroundColor: 'rgba(24, 24, 27, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid #3f3f46',
        borderRadius: 12,
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#f4f4f5'
      }}
    >
      {/* Dock Top Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          borderBottom: '1px solid #27272a',
          backgroundColor: '#18181b'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={16} color="#ef4444" />
          <span style={{ fontWeight: 600, fontSize: 13, color: '#f4f4f5' }}>
            {documentEntry.filename}
          </span>
          <span
            style={{
              fontSize: 11,
              backgroundColor: '#27272a',
              color: '#a1a1aa',
              padding: '2px 6px',
              borderRadius: 4
            }}
          >
            {numPages} {numPages === 1 ? 'page' : 'pages'}
          </span>
          <span
            title="Every inserted PDF page is locked so you can ink over it without moving it."
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              color: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              padding: '2px 6px',
              borderRadius: 4,
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}
          >
            <Lock size={10} /> Auto-Locked for Inking
          </span>
          {insertError && (
            <span role="alert" style={{ fontSize: 10, color: '#fca5a5' }}>
              {insertError}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleInsertCurrentPage}
            disabled={isInserting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: 6,
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 600,
              cursor: isInserting ? 'wait' : 'pointer'
            }}
            title="Insert selected page onto canvas"
          >
            <Plus size={14} />
            <span>Insert Page {selectedPage}</span>
          </button>

          <button
            onClick={handleInsertAllHorizontal}
            disabled={isInserting || numPages > MAX_BULK_INSERT_PAGES}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              backgroundColor: '#27272a',
              border: '1px solid #3f3f46',
              borderRadius: 6,
              color: '#e4e4e7',
              fontSize: 11,
              cursor: isInserting ? 'wait' : 'pointer'
            }}
            title={
              numPages > MAX_BULK_INSERT_PAGES
                ? `Bulk insertion is limited to ${MAX_BULK_INSERT_PAGES} pages. Insert individual pages instead.`
                : 'Place all pages side-by-side on canvas'
            }
          >
            <Columns size={13} />
            <span>All (Horizontal)</span>
          </button>

          <button
            onClick={handleInsertAllVertical}
            disabled={isInserting || numPages > MAX_BULK_INSERT_PAGES}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              backgroundColor: '#27272a',
              border: '1px solid #3f3f46',
              borderRadius: 6,
              color: '#e4e4e7',
              fontSize: 11,
              cursor: isInserting ? 'wait' : 'pointer'
            }}
            title={
              numPages > MAX_BULK_INSERT_PAGES
                ? `Bulk insertion is limited to ${MAX_BULK_INSERT_PAGES} pages. Insert individual pages instead.`
                : 'Place all pages vertically top-to-bottom on canvas'
            }
          >
            <Rows size={13} />
            <span>All (Vertical)</span>
          </button>

          <div style={{ width: 1, height: 16, backgroundColor: '#3f3f46' }} />

          <button
            onClick={() => setIsMinimized(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              padding: 4
            }}
            title="Minimize Dock"
          >
            <Maximize2 size={13} />
          </button>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              padding: 4
            }}
            title="Close Slide Dock"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Slide Thumbnails Scroll Track */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          overflowX: 'auto',
          scrollbarWidth: 'thin',
          backgroundColor: '#09090b',
          minHeight: 110
        }}
      >
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
          const thumbUrl = thumbnails.get(pageNum)
          const isSelected = selectedPage === pageNum

          return (
            <div
              key={pageNum}
              onClick={() => setSelectedPage(pageNum)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  'application/json',
                  JSON.stringify({
                    type: 'pdf-page',
                    docId: documentEntry.id,
                    pageNumber: pageNum
                  })
                )
                e.dataTransfer.effectAllowed = 'copy'
              }}
              style={{
                flexShrink: 0,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: 4,
                borderRadius: 6,
                backgroundColor: isSelected ? '#1e293b' : '#18181b',
                border: `2px solid ${isSelected ? '#38bdf8' : '#27272a'}`,
                transition: 'all 0.15s ease',
                userSelect: 'none'
              }}
              title={`Page ${pageNum} (Click to select, or drag onto canvas)`}
            >
              {thumbUrl ? (
                <img
                  src={thumbUrl}
                  alt={`Page ${pageNum}`}
                  style={{
                    height: 80,
                    width: 'auto',
                    objectFit: 'contain',
                    borderRadius: 3,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    backgroundColor: '#ffffff'
                  }}
                />
              ) : (
                <div
                  style={{
                    height: 80,
                    width: 60,
                    backgroundColor: '#27272a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#71717a',
                    fontSize: 10,
                    borderRadius: 3
                  }}
                >
                  Loading...
                </div>
              )}
              <span
                style={{
                  marginTop: 4,
                  fontSize: 10,
                  fontWeight: isSelected ? 700 : 400,
                  color: isSelected ? '#38bdf8' : '#a1a1aa'
                }}
              >
                Page {pageNum}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
