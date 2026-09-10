import React from 'react'
import {
  FolderOpen,
  Save,
  FilePlus,
  Image as ImageIcon,
  FileText,
  Terminal,
  Activity,
  Video,
  Minimize2,
  Code,
  Bookmark,
  BookmarkPlus,
  Download
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
  onImportImage: () => void
  onImportPdf: () => void
  onOpenCodeSnippetModal: () => void
  onOpenExport: () => void
  onToggleDevTools: () => void
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
  onImportImage,
  onImportPdf,
  onOpenCodeSnippetModal,
  onOpenExport,
  onToggleDevTools
}) => {
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

      {/* Center: File, Assets, PDF, Code Snippet & Export Actions */}
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

        <button
          onClick={onSaveProject}
          style={{ ...buttonStyle, backgroundColor: '#2563eb', color: '#ffffff' }}
          title="Save Project (Ctrl+S)"
        >
          <Save size={15} />
          <span>Save</span>
        </button>

        <button
          onClick={onSaveProjectAs}
          style={buttonStyle}
          title="Save Project As... (Ctrl+Shift+S)"
        >
          <span>Save As...</span>
        </button>

        <div style={{ height: 18, width: 1, backgroundColor: '#3f3f46', margin: '0 4px' }} />

        <button
          onClick={onImportImage}
          style={buttonStyle}
          title="Import Image Asset onto Canvas"
        >
          <ImageIcon size={15} color="#38bdf8" />
          <span>Image</span>
        </button>

        <button
          onClick={onImportPdf}
          style={buttonStyle}
          title="Import PDF Document or Presentation Slides"
        >
          <FileText size={15} color="#ef4444" />
          <span>PDF / Slides</span>
        </button>

        <button
          onClick={onOpenCodeSnippetModal}
          style={buttonStyle}
          title="Insert Syntax-Highlighted Code Card"
        >
          <Terminal size={15} color="#10b981" />
          <span>Code Card</span>
        </button>

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

        {/* Bookmark viewpoint button */}
        <button
          onClick={onAddBookmark}
          style={buttonStyle}
          title="Save Current Camera Viewpoint as Bookmark (Ctrl+B)"
        >
          <BookmarkPlus size={15} color="#60a5fa" />
          <span>Bookmark View</span>
        </button>

        {/* Bookmarks Drawer Toggle */}
        <button
          onClick={onToggleBookmarks}
          style={{
            ...buttonStyle,
            backgroundColor: isBookmarksOpen ? '#1e3a8a' : '#27272a',
            border: `1px solid ${isBookmarksOpen ? '#3b82f6' : '#3f3f46'}`,
            color: isBookmarksOpen ? '#93c5fd' : '#e4e4e7'
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
