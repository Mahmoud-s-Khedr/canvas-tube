import React, { useState, useMemo } from 'react'
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
}

export const IconSidebar: React.FC<IconSidebarProps> = ({ adapter, isOpen, onToggle }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<IconProvider | 'all'>('all')

  const registry = useMemo(() => new IconRegistry(INITIAL_ICON_DEFINITIONS), [])

  const filteredIcons = useMemo(() => {
    return registry.search(searchQuery, selectedProvider)
  }, [registry, searchQuery, selectedProvider])

  const handleAddIcon = (icon: IconDefinition) => {
    if (!adapter) return

    const camera = adapter.getCamera()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Center of current viewport in scene coordinates
    const sceneCenterX = -camera.x / camera.zoom + viewportWidth / (2 * camera.zoom)
    const sceneCenterY = -camera.y / camera.zoom + viewportHeight / (2 * camera.zoom)

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
      x: sceneCenterX - size / 2,
      y: sceneCenterY - size / 2,
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

  const providers: { id: IconProvider | 'all'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'generic', label: 'Generic' },
    { id: 'kubernetes', label: 'Kubernetes' },
    { id: 'aws', label: 'AWS (Future)' },
    { id: 'gcp', label: 'GCP (Future)' },
    { id: 'azure', label: 'Azure (Future)' }
  ]

  return (
    <aside
      style={{
        position: 'fixed',
        top: 48,
        left: 0,
        bottom: 0,
        width: 280,
        backgroundColor: 'rgba(24, 24, 27, 0.96)',
        backdropFilter: 'blur(10px)',
        borderRight: '1px solid #27272a',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 15px rgba(0, 0, 0, 0.4)',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid #27272a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
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
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #27272a' }}>
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
            placeholder="Search servers, databases..."
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
          scrollbarWidth: 'none'
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
              fontWeight: selectedProvider === p.id ? 600 : 400
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Icons List Grid */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
          alignContent: 'start'
        }}
      >
        {filteredIcons.map((icon) => (
          <div
            key={icon.id}
            onClick={() => handleAddIcon(icon)}
            style={{
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: 8,
              padding: '10px 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              textAlign: 'center',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#38bdf8'
              e.currentTarget.style.backgroundColor = '#27272a'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#3f3f46'
              e.currentTarget.style.backgroundColor = '#18181b'
            }}
            title={`Click to add ${icon.name} to canvas`}
          >
            <div
              style={{ width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              dangerouslySetInnerHTML={{ __html: icon.svgContent }}
            />
            <span
              style={{
                marginTop: 6,
                fontSize: 11,
                color: '#e4e4e7',
                fontWeight: 500,
                lineHeight: 1.2
              }}
            >
              {icon.name}
            </span>
            <span
              style={{
                fontSize: 9,
                color: '#71717a',
                marginTop: 2,
                textTransform: 'uppercase'
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
          lineHeight: 1.4
        }}
      >
        Click any icon to place it onto the active canvas viewport.
      </div>
    </aside>
  )
}
