import React, { useState, useEffect, useRef, useCallback } from 'react'
import { CanvasAdapter, Bounds } from '@core/canvas/canvas-adapter'
import { Crop, X } from 'lucide-react'

interface MarqueeSelectorProps {
  adapter: CanvasAdapter | null
  onSelectBounds: (bounds: Bounds) => void
  onCancel: () => void
}

export const MarqueeSelector: React.FC<MarqueeSelectorProps> = ({
  adapter,
  onSelectBounds,
  onCancel
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle ESC key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [onCancel])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    setStartPoint({ x: e.clientX, y: e.clientY })
    setCurrentPoint({ x: e.clientX, y: e.clientY })
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !startPoint) return
      e.preventDefault()
      e.stopPropagation()
      setCurrentPoint({ x: e.clientX, y: e.clientY })
    },
    [isDragging, startPoint]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !startPoint) return
      e.preventDefault()
      e.stopPropagation()

      const endX = e.clientX
      const endY = e.clientY

      const screenMinX = Math.min(startPoint.x, endX)
      const screenMinY = Math.min(startPoint.y, endY)
      const screenMaxX = Math.max(startPoint.x, endX)
      const screenMaxY = Math.max(startPoint.y, endY)

      const screenWidth = screenMaxX - screenMinX
      const screenHeight = screenMaxY - screenMinY

      // Ignore trivial micro-clicks (< 10px)
      if (screenWidth < 10 || screenHeight < 10) {
        setIsDragging(false)
        setStartPoint(null)
        setCurrentPoint(null)
        return
      }

      if (adapter) {
        const topLeft = adapter.screenToScene(screenMinX, screenMinY)
        const bottomRight = adapter.screenToScene(screenMaxX, screenMaxY)

        const sceneBounds: Bounds = {
          x: Math.round(topLeft.x),
          y: Math.round(topLeft.y),
          width: Math.round(bottomRight.x - topLeft.x),
          height: Math.round(bottomRight.y - topLeft.y)
        }
        onSelectBounds(sceneBounds)
      } else {
        onCancel()
      }
    },
    [isDragging, startPoint, adapter, onSelectBounds, onCancel]
  )

  // Compute screen rect for visual box
  let boxStyle: React.CSSProperties | null = null
  let boxWidth = 0
  let boxHeight = 0

  if (startPoint && currentPoint) {
    const left = Math.min(startPoint.x, currentPoint.x)
    const top = Math.min(startPoint.y, currentPoint.y)
    boxWidth = Math.abs(currentPoint.x - startPoint.x)
    boxHeight = Math.abs(currentPoint.y - startPoint.y)

    boxStyle = {
      position: 'absolute',
      left,
      top,
      width: boxWidth,
      height: boxHeight,
      border: '2px dashed #3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.15)',
      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
      pointerEvents: 'none',
      borderRadius: 4
    }
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        cursor: 'crosshair',
        userSelect: 'none',
        backgroundColor: isDragging ? 'transparent' : 'rgba(0, 0, 0, 0.35)'
      }}
    >
      {/* Top Banner Guide */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#18181b',
          border: '1px solid #3b82f6',
          borderRadius: 20,
          padding: '8px 18px',
          color: '#ffffff',
          fontSize: 13,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          pointerEvents: 'auto'
        }}
      >
        <Crop size={16} color="#60a5fa" />
        <span>Click and drag across the canvas to define your export area</span>
        <span style={{ color: '#71717a', fontSize: 11 }}>• Esc to cancel</span>
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            color: '#a1a1aa',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: 2,
            marginLeft: 4
          }}
          title="Cancel Bounded Selection"
        >
          <X size={16} />
        </button>
      </div>

      {/* Marquee Selection Rectangle */}
      {boxStyle && (
        <div style={boxStyle}>
          {boxWidth > 40 && boxHeight > 24 && (
            <div
              style={{
                position: 'absolute',
                bottom: -26,
                right: 0,
                backgroundColor: '#18181b',
                border: '1px solid #3b82f6',
                color: '#93c5fd',
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 4,
                whiteSpace: 'nowrap'
              }}
            >
              {boxWidth} × {boxHeight} px
            </div>
          )}
        </div>
      )}
    </div>
  )
}
