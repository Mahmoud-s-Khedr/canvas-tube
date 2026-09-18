import React, { useState, useRef, useEffect } from 'react'
import {
  FolderOpen,
  Save,
  FilePlus,
  FileText,
  Activity,
  Video,
  Minimize2,
  Code,
  Bookmark,
  Plus,
  Download,
  ChevronDown,
  FileDown,
  Radio,
  Clock,
} from 'lucide-react'

interface TopToolbarProps {
  projectTitle: string
  projectDir: string | null
  isRecordingMode: boolean
  isInspectorOpen: boolean
  hasDocument: boolean
  isDocumentDockOpen: boolean
  bookmarksCount: number
  isBookmarksOpen: boolean
  onToggleRecordingMode: () => void
  onToggleInspector: () => void
  onToggleDocumentDock: () => void
  onToggleBookmarks: () => void
  onAddBookmark: () => void
  onNewProject: () => void
  onOpenProject: () => void
  onSaveProject: () => void
  onSaveProjectAs: () => void
  onOpenExport: () => void
  onToggleDevTools: () => void
  onOpenChapters?: () => void
  chaptersCount?: number
  onOpenObs?: () => void
  obsStatus?: string
  chromaMode?: string
  onSelectChroma?: (mode: string) => void
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  projectTitle,
  projectDir,
  isRecordingMode,
  isInspectorOpen,
  hasDocument,
  isDocumentDockOpen,
  bookmarksCount,
  isBookmarksOpen,
  onToggleRecordingMode,
  onToggleInspector,
  onToggleDocumentDock,
  onToggleBookmarks,
  onAddBookmark,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onSaveProjectAs,
  onOpenExport,
  onToggleDevTools,
  onOpenChapters,
  chaptersCount = 0,
  onOpenObs,
  obsStatus = 'disconnected',
  chromaMode = 'dark',
  onSelectChroma
}) => {
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false)
  const [isChromaMenuOpen, setIsChromaMenuOpen] = useState(false)
  const saveMenuRef = useRef<HTMLDivElement>(null)

  // Close Save dropdown on click outside
  useEffect(() => {
    if (!isSaveMenuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target as Node)) {
        setIsSaveMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [isSaveMenuOpen])

  if (isRecordingMode) {
    // In recording mode: render a minimal floating bar in the top right
    return (
      <div
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backgroundColor: 'rgba(24, 24, 27, 0.85)',
          backdropFilter: 'blur(8px)',
          padding: '4px 10px',
          borderRadius: 20,
          border: '1px solid #dc2626',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            animation: 'pulse 1.5s infinite'
          }}
        />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#fca5a5' }}>
          RECORDING MODE
        </span>
        <button
          onClick={onToggleRecordingMode}
          style={{
            background: 'none',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '2px 4px',
            fontSize: 11,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
          title="Exit Recording Mode (Ctrl+Shift+R or Esc)"
        >
          <Minimize2 size={12} />
          <span>Exit</span>
        </button>
      </div>
    )
  }

  return (
    <header
      style={{
        height: 48,
        backgroundColor: '#18181b',
        borderBottom: '1px solid #27272a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        color: '#f4f4f5',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        userSelect: 'none',
        zIndex: 50
      }}
    >
      {/* Left: App Brand & Project Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #ef4444, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 12,
              color: '#ffffff'
            }}
          >
            CT
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: -0.2 }}>CanvasTube</span>
        </div>

        <div style={{ height: 18, width: 1, backgroundColor: '#3f3f46' }} />

        {/* Project Name & Path indicator */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e4e4e7' }}>{projectTitle}</span>
          {projectDir && (
            <span
              style={{
                fontSize: 11,
                color: '#71717a',
                maxWidth: 220,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={projectDir}
            >
              ({projectDir})
            </span>
          )}
        </div>
      </div>

      {/* Center: File, Assets, Slide Dock & Export Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={onNewProject}
          style={buttonStyle}
          title="New Project (Ctrl+N)"
        >
          <FilePlus size={15} />
          <span>New</span>
        </button>

        <button
          onClick={onOpenProject}
          style={buttonStyle}
          title="Open Project Directory (Ctrl+O)"
        >
          <FolderOpen size={15} />
          <span>Open</span>
        </button>

        {/* Unified Save & Save As Split-Button */}
        <div ref={saveMenuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button
            onClick={onSaveProject}
            style={{
              ...buttonStyle,
              backgroundColor: '#2563eb',
              borderColor: '#1d4ed8',
              color: '#ffffff',
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
              borderRight: '1px solid #1d4ed8',
              paddingRight: 8
            }}
            title="Save Project (Ctrl+S)"
          >
            <Save size={15} />
            <span>Save</span>
          </button>
          <button
            onClick={() => setIsSaveMenuOpen((prev) => !prev)}
            style={{
              ...buttonStyle,
              backgroundColor: isSaveMenuOpen ? '#1d4ed8' : '#2563eb',
              borderColor: '#1d4ed8',
              color: '#ffffff',
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
              padding: '5px 4px'
            }}
            title="Save Options"
          >
            <ChevronDown size={13} />
          </button>

          {isSaveMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                backgroundColor: '#18181b',
                border: '1px solid #3f3f46',
                borderRadius: 6,
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.6)',
                zIndex: 100,
                minWidth: 165,
                display: 'flex',
                flexDirection: 'column',
                padding: '4px',
                gap: 2
              }}
            >
              <button
                onClick={() => {
                  setIsSaveMenuOpen(false)
                  onSaveProject()
                }}
                style={menuItemStyle}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#27272a')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Save size={14} color="#60a5fa" />
                <span style={{ flex: 1, textAlign: 'left' }}>Save</span>
                <span style={{ color: '#71717a', fontSize: 10, marginLeft: 8 }}>Ctrl+S</span>
              </button>
              <button
                onClick={() => {
                  setIsSaveMenuOpen(false)
                  onSaveProjectAs()
                }}
                style={menuItemStyle}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#27272a')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <FileDown size={14} color="#a1a1aa" />
                <span style={{ flex: 1, textAlign: 'left' }}>Save As...</span>
                <span style={{ color: '#71717a', fontSize: 10, marginLeft: 8 }}>Ctrl+Shift+S</span>
              </button>
            </div>
          )}
        </div>

        <div style={{ height: 18, width: 1, backgroundColor: '#3f3f46', margin: '0 4px' }} />

        <button
          onClick={onOpenExport}
          style={{
            ...buttonStyle,
            backgroundColor: '#1e3a8a33',
            borderColor: '#3b82f6',
            color: '#93c5fd'
          }}
          title="Production Diagram Export (PNG, 4K/8K, SVG, Marquee) [Ctrl+Shift+E]"
        >
          <Download size={15} color="#60a5fa" />
          <span>Export</span>
        </button>

        {hasDocument && (
          <button
            onClick={onToggleDocumentDock}
            style={{
              ...buttonStyle,
              backgroundColor: isDocumentDockOpen ? '#450a0a' : '#27272a',
              border: `1px solid ${isDocumentDockOpen ? '#ef4444' : '#3f3f46'}`,
              color: isDocumentDockOpen ? '#fca5a5' : '#e4e4e7'
            }}
            title="Toggle Document Slide Strip Dock"
          >
            <FileText size={14} color="#ef4444" />
            <span>Slide Dock</span>
          </button>
        )}

        <div style={{ height: 18, width: 1, backgroundColor: '#3f3f46', margin: '0 4px' }} />

        {/* Unified Camera Bookmarks & Scene Tour Control with inline quick-add trigger */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: isBookmarksOpen ? '#1e3a8a' : '#27272a',
            border: `1px solid ${isBookmarksOpen ? '#3b82f6' : '#3f3f46'}`,
            borderRadius: 6,
            overflow: 'hidden'
          }}
        >
          <button
            onClick={onToggleBookmarks}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 9px',
              backgroundColor: 'transparent',
              border: 'none',
              color: isBookmarksOpen ? '#93c5fd' : '#e4e4e7',
              fontSize: 12,
              cursor: 'pointer'
            }}
            title="Toggle Camera Bookmarks & Scene Tour Drawer"
          >
            <Bookmark size={15} color="#60a5fa" />
            <span>Tour</span>
            {bookmarksCount > 0 && (
              <span
                style={{
                  backgroundColor: isBookmarksOpen ? '#3b82f6' : '#3f3f46',
                  color: '#ffffff',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 10,
                  marginLeft: 2
                }}
              >
                {bookmarksCount}
              </span>
            )}
          </button>

          <div
            style={{
              width: 1,
              height: 16,
              backgroundColor: isBookmarksOpen ? '#3b82f6' : '#3f3f46'
            }}
          />

          <button
            onClick={onAddBookmark}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '5px 7px',
              backgroundColor: 'transparent',
              border: 'none',
              color: isBookmarksOpen ? '#93c5fd' : '#a1a1aa',
              cursor: 'pointer'
            }}
            title="Quick Bookmark Current View into Tour (Ctrl+B)"
          >
            <Plus size={14} color="#60a5fa" />
          </button>
        </div>
      </div>

      {/* Right: Recording, OBS, Chapters, & Production Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Chroma Background Switcher */}
        {onSelectChroma && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsChromaMenuOpen((p) => !p)}
              style={{
                ...buttonStyle,
                padding: '5px 8px',
                gap: 5
              }}
              title="Switch Canvas Background / Chroma-Key Mode"
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor:
                    chromaMode === 'green'
                      ? '#00ff00'
                      : chromaMode === 'blue'
                        ? '#0000ff'
                        : chromaMode === 'magenta'
                          ? '#ff00ff'
                          : chromaMode === 'light'
                            ? '#ffffff'
                            : '#121212',
                  border: '1px solid #71717a'
                }}
              />
              <span style={{ fontSize: 11, textTransform: 'capitalize' }}>{chromaMode}</span>
              <ChevronDown size={11} color="#a1a1aa" />
            </button>

            {isChromaMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  backgroundColor: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: 6,
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.6)',
                  zIndex: 100,
                  minWidth: 140,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 4,
                  gap: 2
                }}
              >
                {[
                  { id: 'dark', label: 'Dark Canvas', color: '#121212' },
                  { id: 'light', label: 'Light Canvas', color: '#ffffff' },
                  { id: 'green', label: 'Chroma Green', color: '#00ff00' },
                  { id: 'blue', label: 'Chroma Blue', color: '#0000ff' },
                  { id: 'magenta', label: 'Chroma Magenta', color: '#ff00ff' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setIsChromaMenuOpen(false)
                      onSelectChroma(item.id)
                    }}
                    style={{
                      ...menuItemStyle,
                      backgroundColor: chromaMode === item.id ? '#27272a' : 'transparent'
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: item.color,
                        border: '1px solid #71717a'
                      }}
                    />
                    <span style={{ flex: 1, textAlign: 'left', fontSize: 12 }}>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* OBS WebSocket Button */}
        {onOpenObs && (
          <button
            onClick={onOpenObs}
            style={{
              ...buttonStyle,
              backgroundColor: obsStatus === 'connected' ? 'rgba(34, 197, 94, 0.15)' : '#27272a',
              borderColor: obsStatus === 'connected' ? '#22c55e' : '#3f3f46',
              color: obsStatus === 'connected' ? '#86efac' : '#e4e4e7'
            }}
            title={`OBS WebSocket: ${obsStatus}`}
          >
            <Radio size={14} color={obsStatus === 'connected' ? '#22c55e' : '#9ca3af'} />
            <span>OBS</span>
          </button>
        )}

        {/* YouTube Chapters Button */}
        {onOpenChapters && (
          <button
            onClick={onOpenChapters}
            style={{
              ...buttonStyle,
              gap: 5
            }}
            title="YouTube Video Chapters Generator"
          >
            <Clock size={14} color="#f59e0b" />
            <span>Chapters</span>
            {chaptersCount > 0 && (
              <span
                style={{
                  backgroundColor: '#f59e0b',
                  color: '#000',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 10
                }}
              >
                {chaptersCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Right: Recording Mode & Dev Inspector Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={onToggleInspector}
          style={{
            ...buttonStyle,
            backgroundColor: isInspectorOpen ? '#1e3a8a' : '#27272a',
            color: isInspectorOpen ? '#93c5fd' : '#a1a1aa'
          }}
          title="Toggle Stylus / Pointer Inspector (Ctrl+Shift+I)"
        >
          <Activity size={15} />
          <span>Stylus Inspector</span>
        </button>

        <button
          onClick={onToggleRecordingMode}
          style={{
            ...buttonStyle,
            backgroundColor: '#b91c1c',
            color: '#ffffff',
            fontWeight: 600,
            padding: '6px 12px'
          }}
          title="Enter Clean Recording Mode (Ctrl+Shift+R or F10)"
        >
          <Video size={15} />
          <span>Recording Mode</span>
        </button>

        <button
          onClick={onToggleDevTools}
          style={{ ...buttonStyle, padding: '6px 8px' }}
          title="Toggle Electron Developer Tools"
        >
          <Code size={15} />
        </button>
      </div>
    </header>
  )
}

const buttonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '5px 10px',
  backgroundColor: '#27272a',
  border: '1px solid #3f3f46',
  borderRadius: 6,
  color: '#e4e4e7',
  fontSize: 12,
  cursor: 'pointer',
  transition: 'background-color 0.15s'
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 8px',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: 4,
  color: '#e4e4e7',
  fontSize: 12,
  cursor: 'pointer',
  textAlign: 'left',
  width: '100%',
  transition: 'background-color 0.1s'
}
