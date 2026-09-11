import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import {
  IconRegistry,
  IconDefinition,
  IconProvider,
  INITIAL_ICON_DEFINITIONS
} from '@core/icons/icon-registry'
import { CanvasAdapter } from '@core/canvas/canvas-adapter'
import { Search, ChevronLeft, ChevronRight, Layers, Box } from 'lucide-react'

interface IconSidebarProps {
  adapter: CanvasAdapter | null
  isOpen: boolean
  onToggle: () => void
  width?: number
  onWidthChange?: (width: number) => void
  onResizeStart?: () => void
  onResizeEnd?: () => void
}

export const IconSidebar: React.FC<IconSidebarProps> = ({
  adapter,
  isOpen,
  onToggle,
  width,
  onWidthChange,
  onResizeStart,
  onResizeEnd
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<IconProvider | 'all'>('all')

  const sidebarWidth = width ?? 280
  const [isDragging, setIsDragging] = useState(false)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(sidebarWidth)

  const registry = useMemo(() => new IconRegistry(INITIAL_ICON_DEFINITIONS), [])

  const filteredIcons = useMemo(() => {
    return registry.search(searchQuery, selectedProvider)
  }, [registry, searchQuery, selectedProvider])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
      isDraggingRef.current = true
      startXRef.current = e.clientX
      startWidthRef.current = sidebarWidth
      onResizeStart?.()

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDraggingRef.current) return
        const deltaX = moveEvent.clientX - startXRef.current
        const minW = 220
        const maxW = Math.max(minW, Math.min(window.innerWidth * 0.75, 720))
        const newWidth = Math.round(Math.max(minW, Math.min(maxW, startWidthRef.current + deltaX)))
        onWidthChange?.(newWidth)
      }

      const handleMouseUp = () => {
        setIsDragging(false)
        isDraggingRef.current = false
        onResizeEnd?.()
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [sidebarWidth, onWidthChange, onResizeStart, onResizeEnd]
  )

  const handleResetWidth = useCallback(() => {
    onWidthChange?.(280)
  }, [onWidthChange])

  useEffect(() => {
    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [])

  const handleAddIcon = (icon: IconDefinition) => {
    if (!adapter) return

    // Calculate center of current viewport using adapter screenToScene
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const sceneCenter = adapter.screenToScene(viewportWidth / 2, viewportHeight / 2)

    const dataUrl = IconRegistry.svgToDataUrl(icon.svgContent)
    const fileId = `icon_file_${icon.id}_${Date.now()}`

    // Register image file with the adapter
    adapter.addFile({
      id: fileId,
      mimeType: 'image/svg+xml',
      dataURL: dataUrl,
      created: Date.now()
    })

    // Add image element to canvas
    const size = 64
    adapter.addObject({
      type: 'image',
      x: Math.round(sceneCenter.x - size / 2),
      y: Math.round(sceneCenter.y - size / 2),
      width: size,
      height: size,
      fileId,
      customData: {
        iconId: icon.id,
        name: icon.name,
        provider: icon.provider
      }
    })
  }

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        style={{
          position: 'fixed',
          top: 60,
          left: 12,
          zIndex: 100,
          backgroundColor: '#18181b',
          border: '1px solid #3f3f46',
          borderRadius: 8,
          color: '#e4e4e7',
          padding: '8px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
          fontSize: 12,
          fontWeight: 600
        }}
        title="Open Architecture Icon Library"
      >
        <Box size={16} color="#38bdf8" />
        <span>Icons</span>
        <ChevronRight size={14} />
      </button>
    )
  }

  const providers: { id: IconProvider | 'all'; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: registry.getAll().length },
    { id: 'generic', label: 'Generic', count: registry.search('', 'generic').length },
    { id: 'aws', label: 'AWS', count: registry.search('', 'aws').length },
    { id: 'gcp', label: 'GCP', count: registry.search('', 'gcp').length },
    { id: 'azure', label: 'Azure', count: registry.search('', 'azure').length },
    { id: 'kubernetes', label: 'K8s', count: registry.search('', 'kubernetes').length }
  ]

  return (
    <aside
      style={{
        position: 'fixed',
        top: 48,
        left: 0,
        bottom: 0,
        width: sidebarWidth,
        backgroundColor: 'rgba(24, 24, 27, 0.96)',
        backdropFilter: 'blur(10px)',
        borderRight: '1px solid #27272a',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 15px rgba(0, 0, 0, 0.4)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        userSelect: isDragging ? 'none' : 'auto'
      }}
    >
      {/* Draggable Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={handleResetWidth}
        style={{
          position: 'absolute',
          top: 0,
          right: -4,
          bottom: 0,
          width: 8,
          cursor: 'col-resize',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Drag to resize sidebar (Double-click to reset to default)"
      >
        <div
          style={{
            width: 2,
            height: '100%',
            backgroundColor: isDragging ? '#38bdf8' : 'transparent',
            borderRadius: 1,
            transition: isDragging ? 'none' : 'background-color 0.15s ease'
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              e.currentTarget.style.backgroundColor = '#38bdf8'
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          }}
        />
      </div>

      {/* Header */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid #27272a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, color: '#f4f4f5' }}>
          <Layers size={16} color="#38bdf8" />
          <span>Architecture Library</span>
        </div>
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            color: '#a1a1aa',
            cursor: 'pointer',
            padding: 4,
            display: 'flex'
          }}
          title="Collapse Library"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #27272a', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#09090b',
            border: '1px solid #3f3f46',
            borderRadius: 6,
            padding: '4px 8px',
            gap: 6
          }}
        >
          <Search size={14} color="#71717a" />
          <input
            type="text"
            placeholder="Search ec2, s3, sql, pod..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f4f4f5',
              fontSize: 12,
              width: '100%'
            }}
          />
        </div>
      </div>

      {/* Provider Filter Tabs */}
      <div
        style={{
          padding: '8px 14px',
          display: 'flex',
          gap: 4,
          overflowX: 'auto',
          borderBottom: '1px solid #27272a',
          scrollbarWidth: 'none',
          flexShrink: 0
        }}
      >
        {providers.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedProvider(p.id)}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              backgroundColor: selectedProvider === p.id ? '#2563eb' : '#27272a',
              color: selectedProvider === p.id ? '#ffffff' : '#a1a1aa',
              fontWeight: selectedProvider === p.id ? 600 : 400,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span>{p.label}</span>
            <span
              style={{
                fontSize: 9,
                opacity: 0.75,
                backgroundColor: selectedProvider === p.id ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                padding: '1px 4px',
                borderRadius: 4
              }}
            >
              {p.count}
            </span>
          </button>
        ))}
      </div>

      {/* Icons List Grid */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'grid',
          gridTemplateColumns:
            sidebarWidth < 240 ? '1fr' : 'repeat(auto-fill, minmax(105px, 1fr))',
          gridAutoRows: 'minmax(110px, max-content)',
          gap: 10,
          alignContent: 'start'
        }}
      >
        {filteredIcons.map((icon) => (
          <div
            key={icon.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/json', JSON.stringify(icon))
              e.dataTransfer.setData('text/plain', icon.name)
              e.dataTransfer.effectAllowed = 'copy'
            }}
            onClick={() => handleAddIcon(icon)}
            style={{
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: 8,
              padding: '10px 6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              cursor: 'grab',
              transition: 'all 0.15s ease',
              textAlign: 'center',
              userSelect: 'none',
              minWidth: 0,
              minHeight: 110,
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#38bdf8'
              e.currentTarget.style.backgroundColor = '#27272a'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#3f3f46'
              e.currentTarget.style.backgroundColor = '#18181b'
            }}
            title={`Click to place at center, or drag & drop anywhere onto canvas (${icon.name})`}
          >
            <div
              className="canvastube-icon-preview"
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                minHeight: 44,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              dangerouslySetInnerHTML={{ __html: icon.svgContent }}
            />
            <span
              style={{
                marginTop: 6,
                fontSize: 11,
                color: '#e4e4e7',
                fontWeight: 500,
                lineHeight: 1.25,
                wordBreak: 'break-word',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                flexShrink: 0
              }}
            >
              {icon.name}
            </span>
            <span
              style={{
                fontSize: 9,
                color: '#71717a',
                marginTop: 'auto',
                paddingTop: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                flexShrink: 0
              }}
            >
              {icon.category}
            </span>
          </div>
        ))}

        {filteredIcons.length === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '24px 0',
              textAlign: 'center',
              color: '#71717a',
              fontSize: 12
            }}
          >
            No matching icons found
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div
        style={{
          padding: '8px 14px',
          borderTop: '1px solid #27272a',
          fontSize: 10,
          color: '#71717a',
          lineHeight: 1.4,
          flexShrink: 0
        }}
      >
        Click to place at center, or <strong>drag & drop</strong> directly onto the canvas.
      </div>
    </aside>
  )
}
