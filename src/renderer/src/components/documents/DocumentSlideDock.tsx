import React, { useState, useEffect, useCallback } from 'react'
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

  const numPages = pdfDoc?.numPages ?? documentEntry?.pageCount ?? 0

  // Reset state when active document changes
  useEffect(() => {
    setThumbnails(new Map())
    setSelectedPage(1)
  }, [documentEntry?.id])

  // Asynchronously render thumbnails for all pages
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return

    let isMounted = true

    const loadThumbnails = async () => {
      for (let p = 1; p <= numPages; p++) {
        if (!isMounted) break
        if (thumbnails.has(p)) continue

        try {
          const thumb = await PdfService.renderThumbnail(pdfDoc, p, 150)
          if (isMounted) {
            setThumbnails((prev) => new Map(prev).set(p, thumb))
          }
          // Yield main thread to keep UI responsive during multi-page rendering
          await new Promise((resolve) => setTimeout(resolve, 0))
        } catch (err) {
          console.error(`[DocumentSlideDock] Failed rendering thumbnail for page ${p}:`, err)
        }
      }
    }

    loadThumbnails()

    return () => {
      isMounted = false
    }
  }, [pdfDoc, numPages, documentEntry?.id])

  const insertPageAtCoordinates = useCallback(
    async (pageNumber: number, sceneX: number, sceneY: number, targetWidth = 800) => {
      if (!pdfDoc || !adapter) return

      setIsInserting(true)
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
      } finally {
        setIsInserting(false)
      }
    },
    [pdfDoc, adapter, documentEntry]
  )

  const handleInsertCurrentPage = async () => {
    if (!adapter) return
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Center in scene coordinates
    const sceneCenter = adapter.screenToScene(viewportWidth / 2, viewportHeight / 2)
    await insertPageAtCoordinates(selectedPage, sceneCenter.x, sceneCenter.y)
  }

  const handleInsertAllHorizontal = async () => {
    if (!pdfDoc || !adapter) return
    setIsInserting(true)

    try {
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const sceneCenter = adapter.screenToScene(viewportWidth / 2, viewportHeight / 2)

      const slideWidth = 800
      const spacing = 80
      let currentX = sceneCenter.x - ((numPages * (slideWidth + spacing)) / 2) + slideWidth / 2

      for (let p = 1; p <= numPages; p++) {
        const rendered = await PdfService.renderPage(pdfDoc, p, 1.8)
        const slideHeight = Math.round(slideWidth / rendered.aspectRatio)
        const fileId = `pdf_page_${documentEntry?.id || 'doc'}_p${p}_${Date.now()}`

        adapter.addFile({
          id: fileId,
          mimeType: 'image/png',
          dataURL: rendered.dataUrl,
          created: Date.now()
        })

        adapter.addObject({
          type: 'image',
          x: Math.round(currentX - slideWidth / 2),
          y: Math.round(sceneCenter.y - slideHeight / 2),
          width: slideWidth,
          height: slideHeight,
          fileId,
          locked: true,
          customData: {
            type: 'pdf-slide',
            docId: documentEntry?.id,
            pageNumber: p
          }
        })

        currentX += slideWidth + spacing
      }
    } finally {
      setIsInserting(false)
    }
  }

  const handleInsertAllVertical = async () => {
    if (!pdfDoc || !adapter) return
    setIsInserting(true)

    try {
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const sceneCenter = adapter.screenToScene(viewportWidth / 2, viewportHeight / 2)

      const slideWidth = 800
      const spacing = 100
      let currentY = sceneCenter.y - 300

      for (let p = 1; p <= numPages; p++) {
        const rendered = await PdfService.renderPage(pdfDoc, p, 1.8)
        const slideHeight = Math.round(slideWidth / rendered.aspectRatio)
        const fileId = `pdf_page_${documentEntry?.id || 'doc'}_p${p}_${Date.now()}`

        adapter.addFile({
          id: fileId,
          mimeType: 'image/png',
          dataURL: rendered.dataUrl,
          created: Date.now()
        })

        adapter.addObject({
          type: 'image',
          x: Math.round(sceneCenter.x - slideWidth / 2),
          y: Math.round(currentY),
          width: slideWidth,
          height: slideHeight,
          fileId,
          locked: true,
          customData: {
            type: 'pdf-slide',
            docId: documentEntry?.id,
            pageNumber: p
          }
        })

        currentY += slideHeight + spacing
      }
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
            disabled={isInserting || numPages > 30}
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
            title="Place all pages side-by-side on canvas"
          >
            <Columns size={13} />
            <span>All (Horizontal)</span>
          </button>

          <button
            onClick={handleInsertAllVertical}
            disabled={isInserting || numPages > 30}
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
            title="Place all pages vertically top-to-bottom on canvas"
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
