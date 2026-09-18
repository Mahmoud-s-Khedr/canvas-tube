import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { DocumentEntry } from '@core/project/project-manifest'
import { CanvasAdapter } from '@core/canvas/canvas-adapter'
import type { CanvasShapeInput } from '@core/canvas/canvas-adapter'
import { PdfService } from '../../services/pdf-service'
import {
  FileText,
  X,
  Plus,
  Rows,
  Columns,
  Maximize2,
  Lock,
  Unlock
} from 'lucide-react'

// Rendering hundreds of canvases and keeping their PNG data URLs in React state makes
// large PDFs consume excessive CPU and memory. Keep previews close to the selected page.
const THUMBNAIL_WINDOW = 12
const SLIDE_WIDTH = 800
const HORIZONTAL_SLIDE_SPACING = 80
const VERTICAL_SLIDE_SPACING = 100
const INSERT_BATCH_SIZE = 6

interface SlideMetric {
  pageNumber: number
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
  const [autoLockPages, setAutoLockPages] = useState<boolean>(false)
  const [insertProgress, setInsertProgress] = useState<{ completed: number; total: number } | null>(null)
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
          locked: autoLockPages,
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
    [pdfDoc, adapter, documentEntry, autoLockPages]
  )

  const handleInsertCurrentPage = async () => {
    if (!adapter) return
    const sceneCenter = adapter.getViewportCenter()
    await insertPageAtCoordinates(selectedPage, sceneCenter.x, sceneCenter.y)
  }

  const handleInsertAll = async (direction: 'horizontal' | 'vertical') => {
    if (!pdfDoc || !adapter || numPages === 0) return
    setIsInserting(true)
    setInsertError(null)
    setInsertProgress({ completed: 0, total: numPages })

    try {
      const sceneCenter = adapter.getViewportCenter()
      const slides: SlideMetric[] = []
      for (let p = 1; p <= numPages; p++) {
        const page = await pdfDoc.getPage(p)
        try {
          const viewport = page.getViewport({ scale: 1 })
          slides.push({ pageNumber: p, height: Math.round(SLIDE_WIDTH / (viewport.width / viewport.height)) })
        } finally {
          page.cleanup()
        }
        // Let the dock repaint while it reads metadata for very long documents.
        if (p % 25 === 0) await new Promise((resolve) => setTimeout(resolve, 0))
      }

      // Anchor the first page at the viewport center. Centering the entire strip
      // would put a middle page at the current canvas position for long documents.
      let currentX = sceneCenter.x - SLIDE_WIDTH / 2
      let currentY = sceneCenter.y - slides[0].height / 2
      const batchId = Date.now()
      let shapes: CanvasShapeInput[] = []

      const createSlideShape = (slide: SlideMetric) => {
        const shape = {
          type: 'image' as const,
          x: Math.round(direction === 'horizontal' ? currentX : sceneCenter.x - SLIDE_WIDTH / 2),
          y: Math.round(direction === 'horizontal' ? sceneCenter.y - slide.height / 2 : currentY),
          width: SLIDE_WIDTH,
          height: slide.height,
          fileId: `pdf_page_${documentEntry?.id || 'doc'}_p${slide.pageNumber}_${batchId}`,
          locked: autoLockPages,
          customData: {
            type: 'pdf-slide',
            docId: documentEntry?.id,
            pageNumber: slide.pageNumber
          }
        }
        currentX += SLIDE_WIDTH + HORIZONTAL_SLIDE_SPACING
        currentY += slide.height + VERTICAL_SLIDE_SPACING
        return shape
      }

      for (let index = 0; index < slides.length; index++) {
        const slide = slides[index]
        const rendered = await PdfService.renderPage(pdfDoc, slide.pageNumber, 1.8)
        const shape = createSlideShape(slide)
        adapter.addFile({
          id: shape.fileId!,
          mimeType: 'image/png',
          dataURL: rendered.dataUrl,
          created: batchId
        })
        shapes.push(shape)

        if (shapes.length === INSERT_BATCH_SIZE || index === slides.length - 1) {
          if (adapter.addObjects) adapter.addObjects(shapes)
          else shapes.forEach((nextShape) => adapter.addObject(nextShape))
          shapes = []
        }
        setInsertProgress({ completed: index + 1, total: slides.length })
        // Rendering and PNG encoding are expensive. Yield between pages so the
        // canvas remains responsive and progress is visible.
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    } catch (err) {
      console.error(`[DocumentSlideDock] Failed inserting pages ${direction}:`, err)
      setInsertError(`Could not insert all pages ${direction === 'horizontal' ? 'horizontally' : 'vertically'}.`)
    } finally {
      setIsInserting(false)
      setInsertProgress(null)
    }
  }

  const handleInsertAllHorizontal = () => handleInsertAll('horizontal')
  const handleInsertAllVertical = () => handleInsertAll('vertical')

  const handleUnlockDocumentPages = () => {
    if (!adapter?.setObjectsLockedByCustomData || !documentEntry) return
    const unlocked = adapter.setObjectsLockedByCustomData(
      { type: 'pdf-slide', docId: documentEntry.id },
      false
    )
    if (unlocked === 0) {
      setInsertError('No locked pages from this document are on the canvas.')
    } else {
      setInsertError(null)
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
          <button
            type="button"
            onClick={() => setAutoLockPages((previous) => !previous)}
            title={
              autoLockPages
                ? 'New PDF pages will be locked. Click to make new pages movable.'
                : 'New PDF pages are movable. Click to lock new pages for inking.'
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              color: autoLockPages ? '#10b981' : '#a1a1aa',
              backgroundColor: autoLockPages ? 'rgba(16, 185, 129, 0.1)' : '#27272a',
              padding: '2px 6px',
              borderRadius: 4,
              border: autoLockPages ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid #3f3f46',
              cursor: 'pointer'
            }}
          >
            {autoLockPages ? <Lock size={10} /> : <Unlock size={10} />}
            {autoLockPages ? 'Lock New Pages' : 'Movable Pages'}
          </button>
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
            onClick={handleUnlockDocumentPages}
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
              cursor: 'pointer'
            }}
            title="Unlock every page from this document that is already on the canvas"
          >
            <Unlock size={13} />
            <span>Unlock Pages</span>
          </button>

          <button
            onClick={handleInsertAllHorizontal}
            disabled={isInserting || numPages === 0}
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
              'Place all pages side-by-side on canvas. Large documents insert progressively.'
            }
          >
            <Columns size={13} />
            <span>All (Horizontal)</span>
          </button>

          <button
            onClick={handleInsertAllVertical}
            disabled={isInserting || numPages === 0}
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
              'Place all pages vertically top-to-bottom on canvas. Large documents insert progressively.'
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

      {insertProgress && (
        <div
          role="status"
          style={{ padding: '5px 14px', fontSize: 11, color: '#93c5fd', backgroundColor: '#172554' }}
        >
          Adding pages: {insertProgress.completed} / {insertProgress.total}
        </div>
      )}

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
