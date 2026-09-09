import React, { useRef } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { ExcalidrawCanvasAdapter } from './ExcalidrawCanvasAdapter'
import '@excalidraw/excalidraw/index.css'

interface CanvasViewProps {
  adapter: ExcalidrawCanvasAdapter
  isRecordingMode: boolean
  isSidebarOpen: boolean
}

export const CanvasView: React.FC<CanvasViewProps> = ({
  adapter,
  isRecordingMode,
  isSidebarOpen
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const handlePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    adapter.recordPointerEvent(e)
  }

  return (
    <div
      ref={containerRef}
      onPointerDownCapture={handlePointer}
      onPointerMoveCapture={handlePointer}
      onPointerUpCapture={handlePointer}
      style={{
        position: 'absolute',
        top: isRecordingMode ? 0 : 48,
        left: isRecordingMode || !isSidebarOpen ? 0 : 280,
        right: 0,
        bottom: 0,
        transition: 'left 0.2s ease, top 0.2s ease',
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
