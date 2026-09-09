import React from 'react'
import {
  FolderOpen,
  Save,
  FilePlus,
  Image as ImageIcon,
  Activity,
  Video,
  Minimize2,
  Code
} from 'lucide-react'

interface TopToolbarProps {
  projectTitle: string
  projectDir: string | null
  isRecordingMode: boolean
  isInspectorOpen: boolean
  onToggleRecordingMode: () => void
  onToggleInspector: () => void
  onNewProject: () => void
  onOpenProject: () => void
  onSaveProject: () => void
  onSaveProjectAs: () => void
  onImportImage: () => void
  onToggleDevTools: () => void
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  projectTitle,
  projectDir,
  isRecordingMode,
  isInspectorOpen,
  onToggleRecordingMode,
  onToggleInspector,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onSaveProjectAs,
  onImportImage,
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

      {/* Center: File & Project Actions */}
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
          <span>Import Image</span>
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
