import React, { useState } from 'react'
import {
  Bookmark,
  Camera,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Crosshair,
  X,
  Play,
  Tv
} from 'lucide-react'
import { CameraBookmark } from '@core/project/project-manifest'

interface BookmarksDrawerProps {
  isOpen: boolean
  bookmarks: CameraBookmark[]
  activeBookmarkIndex: number | null
  onClose: () => void
  onAddBookmark: () => void
  onJumpToBookmark: (index: number) => void
  onNextBookmark: () => void
  onPreviousBookmark: () => void
  onUpdateBookmarkCamera: (id: string) => void
  onRenameBookmark: (id: string, name: string) => void
  onDeleteBookmark: (id: string) => void
  onReorderBookmarks: (fromIndex: number, toIndex: number) => void
  obsScenes?: string[]
  onUpdateBookmarkObsScene?: (id: string, obsSceneName?: string) => void
}

export const BookmarksDrawer: React.FC<BookmarksDrawerProps> = ({
  isOpen,
  bookmarks,
  activeBookmarkIndex,
  onClose,
  onAddBookmark,
  onJumpToBookmark,
  onNextBookmark,
  onPreviousBookmark,
  onUpdateBookmarkCamera,
  onRenameBookmark,
  onDeleteBookmark,
  onReorderBookmarks,
  obsScenes = [],
  onUpdateBookmarkObsScene
}) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState<string>('')

  if (!isOpen) return null

  const handleStartEdit = (bm: CameraBookmark) => {
    setEditingId(bm.id)
    setEditName(bm.name)
  }

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      onRenameBookmark(id, editName.trim())
    }
    setEditingId(null)
  }

  const handleKeyDownEdit = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(id)
    } else if (e.key === 'Escape') {
      setEditingId(null)
    }
  }

  return (
    <aside
      style={{
        position: 'fixed',
        top: 48,
        right: 0,
        bottom: 0,
        width: 340,
        backgroundColor: '#18181b',
        borderLeft: '1px solid #27272a',
        boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 60,
        color: '#f4f4f5',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid #27272a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bookmark size={18} color="#3b82f6" />
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Camera Tour</h2>
          <span
            style={{
              fontSize: 11,
              backgroundColor: '#27272a',
              color: '#93c5fd',
              padding: '2px 8px',
              borderRadius: 12,
              fontWeight: 600
            }}
          >
            {bookmarks.length}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#a1a1aa',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Close drawer (Esc)"
        >
          <X size={18} />
        </button>
      </div>

      {/* Top Controls: Add Viewpoint & Tour Stepper */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #27272a',
          backgroundColor: '#1c1c20',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}
      >
        <button
          onClick={onAddBookmark}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '8px 12px',
            backgroundColor: '#2563eb',
            border: 'none',
            borderRadius: 6,
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
          title="Save current camera viewpoint (Ctrl+B)"
        >
          <Camera size={16} />
          <span>Capture View (Ctrl+B)</span>
        </button>

        {bookmarks.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#27272a',
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 12
            }}
          >
            <button
              onClick={onPreviousBookmark}
              disabled={activeBookmarkIndex === null || activeBookmarkIndex <= 0}
              style={{
                background: 'none',
                border: 'none',
                color: activeBookmarkIndex !== null && activeBookmarkIndex > 0 ? '#ffffff' : '#52525b',
                cursor: activeBookmarkIndex !== null && activeBookmarkIndex > 0 ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 6px',
                borderRadius: 4
              }}
              title="Previous Step (PageUp / Alt+Left)"
            >
              <ChevronLeft size={16} />
              <span>Prev</span>
            </button>

            <span style={{ fontWeight: 600, color: '#93c5fd' }}>
              {activeBookmarkIndex !== null
                ? `Step ${activeBookmarkIndex + 1} of ${bookmarks.length}`
                : `Ready (${bookmarks.length} steps)`}
            </span>

            <button
              onClick={onNextBookmark}
              disabled={
                activeBookmarkIndex !== null && activeBookmarkIndex >= bookmarks.length - 1
              }
              style={{
                background: 'none',
                border: 'none',
                color:
                  activeBookmarkIndex === null || activeBookmarkIndex < bookmarks.length - 1
                    ? '#ffffff'
                    : '#52525b',
                cursor:
                  activeBookmarkIndex === null || activeBookmarkIndex < bookmarks.length - 1
                    ? 'pointer'
                    : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 6px',
                borderRadius: 4
              }}
              title="Next Step (PageDown / Alt+Right)"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Bookmarks List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}
      >
        {bookmarks.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: '#71717a',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12
            }}
          >
            <Bookmark size={36} color="#3f3f46" />
            <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>
              No viewpoints saved yet.
            </p>
            <p style={{ fontSize: 12, lineHeight: 1.4, margin: 0, color: '#52525b' }}>
              Pan and zoom to a section of your architecture diagram, then click <strong>Capture View</strong> or press <strong>Ctrl+B</strong>.
            </p>
          </div>
        ) : (
          bookmarks.map((bm, index) => {
            const isActive = activeBookmarkIndex === index
            const isEditing = editingId === bm.id

            return (
              <div
                key={bm.id}
                style={{
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.12)' : '#232326',
                  border: `1px solid ${isActive ? '#3b82f6' : '#2e2e33'}`,
                  borderRadius: 8,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Top Row: Hotkey Badge & Title */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                    {index < 9 && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          backgroundColor: '#3f3f46',
                          color: '#e4e4e7',
                          padding: '1px 5px',
                          borderRadius: 4,
                          flexShrink: 0
                        }}
                        title={`Quick Jump: Alt+${index + 1}`}
                      >
                        Alt+{index + 1}
                      </span>
                    )}

                    {isEditing ? (
                      <input
                        type="text"
                        value={editName}
                        autoFocus
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => handleSaveEdit(bm.id)}
                        onKeyDown={(e) => handleKeyDownEdit(e, bm.id)}
                        style={{
                          flex: 1,
                          backgroundColor: '#18181b',
                          border: '1px solid #3b82f6',
                          borderRadius: 4,
                          color: '#ffffff',
                          fontSize: 13,
                          padding: '2px 6px',
                          outline: 'none'
                        }}
                      />
                    ) : (
                      <span
                        onClick={() => handleStartEdit(bm)}
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: isActive ? '#93c5fd' : '#f4f4f5',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer'
                        }}
                        title="Click to rename"
                      >
                        {bm.name}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onJumpToBookmark(index)}
                    style={{
                      background: isActive ? '#3b82f6' : '#27272a',
                      border: 'none',
                      borderRadius: 4,
                      color: '#ffffff',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 600
                    }}
                    title="Jump to this camera view"
                  >
                    <Play size={11} fill="#ffffff" />
                    <span>Go</span>
                  </button>
                </div>

                {/* Metadata Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 11,
                    color: '#71717a'
                  }}
                >
                  <span>Zoom: {Math.round(bm.zoom * 100)}%</span>
                  <span>
                    Pos: ({bm.x}, {bm.y})
                  </span>
                </div>

                {/* OBS Scene Binding */}
                {obsScenes.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    <Tv size={12} color="#9ca3af" />
                    <select
                      value={bm.obsSceneName || ''}
                      onChange={(e) => onUpdateBookmarkObsScene?.(bm.id, e.target.value || undefined)}
                      style={{
                        backgroundColor: '#18181b',
                        border: '1px solid #3f3f46',
                        color: bm.obsSceneName ? '#60a5fa' : '#9ca3af',
                        borderRadius: 4,
                        fontSize: 11,
                        padding: '2px 4px',
                        outline: 'none',
                        flex: 1
                      }}
                    >
                      <option value="">No OBS Scene Link</option>
                      {obsScenes.map((s) => (
                        <option key={s} value={s}>
                          OBS: {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Actions Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #2a2a2e',
                    paddingTop: 6
                  }}
                >
                  <button
                    onClick={() => onUpdateBookmarkCamera(bm.id)}
                    style={iconActionStyle}
                    title="Overwrite coordinates with current canvas viewpoint"
                  >
                    <Crosshair size={13} />
                    <span style={{ fontSize: 11 }}>Update to View</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <button
                      onClick={() => onReorderBookmarks(index, index - 1)}
                      disabled={index === 0}
                      style={{
                        ...iconActionStyle,
                        opacity: index === 0 ? 0.3 : 1,
                        cursor: index === 0 ? 'default' : 'pointer'
                      }}
                      title="Move Up"
                    >
                      <ChevronUp size={14} />
                    </button>

                    <button
                      onClick={() => onReorderBookmarks(index, index + 1)}
                      disabled={index === bookmarks.length - 1}
                      style={{
                        ...iconActionStyle,
                        opacity: index === bookmarks.length - 1 ? 0.3 : 1,
                        cursor: index === bookmarks.length - 1 ? 'default' : 'pointer'
                      }}
                      title="Move Down"
                    >
                      <ChevronDown size={14} />
                    </button>

                    <button
                      onClick={() => onDeleteBookmark(bm.id)}
                      style={{
                        ...iconActionStyle,
                        color: '#ef4444'
                      }}
                      title="Delete Bookmark"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}

const iconActionStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#a1a1aa',
  cursor: 'pointer',
  padding: '4px 6px',
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  transition: 'color 0.15s'
}
