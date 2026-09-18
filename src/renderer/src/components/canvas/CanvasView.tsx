import React, { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { FileText, Image as ImageIcon, Terminal } from 'lucide-react'
import { ExcalidrawCanvasAdapter } from './ExcalidrawCanvasAdapter'
import { IconRegistry, INITIAL_ICON_DEFINITIONS } from '@core/icons/icon-registry'
import { placeIcon } from '@core/icons/icon-placement'
import '@excalidraw/excalidraw/index.css'

interface CanvasViewProps {
  adapter: ExcalidrawCanvasAdapter
  isRecordingMode: boolean
  isSidebarOpen: boolean
  sidebarWidth?: number
  isResizingSidebar?: boolean
  onDropPdfPage?: (pageNumber: number, sceneX: number, sceneY: number) => void
  onImportPdf?: () => void
  onImportImage?: () => void
  onOpenCodeSnippetModal?: () => void
}

const ICON_REGISTRY = new IconRegistry(INITIAL_ICON_DEFINITIONS)

export const CanvasView: React.FC<CanvasViewProps> = ({
  adapter,
  isRecordingMode,
  isSidebarOpen,
  sidebarWidth = 280,
  isResizingSidebar = false,
  onDropPdfPage,
  onImportPdf,
  onImportImage,
  onOpenCodeSnippetModal
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [toolbarEl, setToolbarEl] = useState<HTMLElement | null>(null)

  // Find the Excalidraw toolbar stack container and attach custom dock actions
  useEffect(() => {
    const updateToolbar = () => {
      const el = (containerRef.current?.querySelector('.App-toolbar .Stack_horizontal') ||
        containerRef.current?.querySelector('.App-toolbar')) as HTMLElement | null
      if (el !== toolbarEl) {
        setToolbarEl(el)
      }
    }

    updateToolbar()

    const observer = new MutationObserver(() => {
      updateToolbar()
    })

    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true })
    }

    return () => observer.disconnect()
  }, [toolbarEl])

  const handlePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    adapter.recordPointerEvent(e)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (
      e.dataTransfer.types.includes('application/json') ||
      e.dataTransfer.types.includes('text/plain')
    ) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const rawData = e.dataTransfer.getData('application/json')
    if (!rawData) return

    try {
      const data = JSON.parse(rawData)

      // 1. Check if dropped item is a PDF slide page
      if (data?.type === 'pdf-page' && data.pageNumber) {
        e.preventDefault()
        const scenePoint = adapter.screenToScene(e.clientX, e.clientY)
        if (onDropPdfPage) {
          onDropPdfPage(data.pageNumber, scenePoint.x, scenePoint.y)
        }
        return
      }

      // 2. Check if dropped item is an architecture icon stencil
      if (data?.type !== 'architecture-icon' || typeof data.id !== 'string') return
      const icon = ICON_REGISTRY.get(data.id)
      if (!icon) return

      e.preventDefault()

      // Convert drop client coordinates directly to infinite canvas scene space
      const scenePoint = adapter.screenToScene(e.clientX, e.clientY)

      placeIcon(adapter, icon, scenePoint)
    } catch (err) {
      console.error('[CanvasView] Failed to process dropped item:', err)
    }
  }

  return (
    <div
      ref={containerRef}
      onPointerDownCapture={handlePointer}
      onPointerMoveCapture={handlePointer}
      onPointerUpCapture={handlePointer}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        position: 'absolute',
        top: isRecordingMode ? 0 : 48,
        left: isRecordingMode || !isSidebarOpen ? 0 : sidebarWidth,
        right: 0,
        bottom: 0,
        transition: isResizingSidebar ? 'none' : 'left 0.2s ease, top 0.2s ease',
        backgroundColor: '#121212',
        overflow: 'hidden'
      }}
    >
      <Excalidraw
        excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
          adapter.setApi(api)
        }}
        theme="dark"
        zenModeEnabled={isRecordingMode}
        viewModeEnabled={false}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: true,
            clearCanvas: false,
            export: false,
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: true,
            saveAsImage: false
          },
          tools: {
            // PDF pages and the custom image-import button both create Excalidraw image
            // elements. Disabling this tool also disables those programmatic inserts.
            image: true
          }
        }}
      />

      {/* Portaled Dock Extensions: PDF / Slides & Code Card */}
      {toolbarEl &&
        createPortal(
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <div className="App-toolbar__divider" />
            <button
              type="button"
              className="canvastube-dock-btn"
              onClick={onImportPdf}
              title="Import PDF / Presentation Slides onto Canvas"
              aria-label="Import PDF / Slides"
            >
              <FileText size={17} color="#ef4444" />
            </button>
            <button
              type="button"
              className="canvastube-dock-btn"
              onClick={onImportImage}
              title="Import Image onto Canvas"
              aria-label="Import Image"
            >
              <ImageIcon size={17} color="#38bdf8" />
            </button>
            <button
              type="button"
              className="canvastube-dock-btn"
              onClick={onOpenCodeSnippetModal}
              title="Insert Syntax-Highlighted Code Card"
              aria-label="Insert Code Card"
            >
              <Terminal size={17} color="#10b981" />
            </button>
          </div>,
          toolbarEl
        )}
    </div>
  )
}
