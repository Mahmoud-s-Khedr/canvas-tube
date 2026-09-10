import React, { useRef } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { ExcalidrawCanvasAdapter } from './ExcalidrawCanvasAdapter'
import { IconRegistry, IconDefinition } from '@core/icons/icon-registry'
import '@excalidraw/excalidraw/index.css'

interface CanvasViewProps {
  adapter: ExcalidrawCanvasAdapter
  isRecordingMode: boolean
  isSidebarOpen: boolean
  sidebarWidth?: number
  isResizingSidebar?: boolean
  onDropPdfPage?: (pageNumber: number, sceneX: number, sceneY: number) => void
}

export const CanvasView: React.FC<CanvasViewProps> = ({
  adapter,
  isRecordingMode,
  isSidebarOpen,
  sidebarWidth = 280,
  isResizingSidebar = false,
  onDropPdfPage
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

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
      const icon = data as IconDefinition
      if (!icon || !icon.id || !icon.svgContent) return

      e.preventDefault()

      // Convert drop client coordinates directly to infinite canvas scene space
      const scenePoint = adapter.screenToScene(e.clientX, e.clientY)

      const dataUrl = IconRegistry.svgToDataUrl(icon.svgContent)
      const fileId = `icon_file_${icon.id}_${Date.now()}`

      adapter.addFile({
        id: fileId,
        mimeType: 'image/svg+xml',
        dataURL: dataUrl,
        created: Date.now()
      })

      const size = 64
      adapter.addObject({
        type: 'image',
        x: Math.round(scenePoint.x - size / 2),
        y: Math.round(scenePoint.y - size / 2),
        width: size,
        height: size,
        fileId,
        customData: {
          iconId: icon.id,
          name: icon.name,
          provider: icon.provider
        }
      })
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
          }
        }}
      />
    </div>
  )
}
