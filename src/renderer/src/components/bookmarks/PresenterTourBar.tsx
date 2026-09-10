import React, { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  ChevronDown,
  ChevronUp,
  Bookmark
} from 'lucide-react'
import { CameraBookmark } from '@core/project/project-manifest'

interface PresenterTourBarProps {
  bookmarks: CameraBookmark[]
  activeBookmarkIndex: number | null
  isRecordingMode: boolean
  onJumpToBookmark: (index: number) => void
  onNextBookmark: () => void
  onPreviousBookmark: () => void
  onToggleDrawer?: () => void
}

export const PresenterTourBar: React.FC<PresenterTourBarProps> = ({
  bookmarks,
  activeBookmarkIndex,
  isRecordingMode,
  onJumpToBookmark,
  onNextBookmark,
  onPreviousBookmark,
  onToggleDrawer
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  if (bookmarks.length === 0) {
    return null
  }

  const currentBookmark =
    activeBookmarkIndex !== null && activeBookmarkIndex >= 0 && activeBookmarkIndex < bookmarks.length
      ? bookmarks[activeBookmarkIndex]
      : null

  const displayStepText = currentBookmark
    ? `Step ${activeBookmarkIndex! + 1} of ${bookmarks.length}: ${currentBookmark.name}`
    : `Tour: ${bookmarks.length} Scenes`

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        style={{
          position: 'fixed',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          backgroundColor: 'rgba(24, 24, 27, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #3f3f46',
          borderRadius: 20,
          padding: '4px 12px',
          color: '#e4e4e7',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          transition: 'all 0.2s ease',
          opacity: isRecordingMode ? 0.75 : 1
        }}
        title="Expand Scene Tour Bar"
      >
        <Compass size={14} color="#60a5fa" />
        <span>{currentBookmark ? `Step ${activeBookmarkIndex! + 1}/${bookmarks.length}` : 'Tour'}</span>
        <ChevronUp size={12} color="#a1a1aa" />
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        backgroundColor: 'rgba(24, 24, 27, 0.92)',
        backdropFilter: 'blur(12px)',
        border: '1px solid #3f3f46',
        borderRadius: 24,
        padding: '4px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.5)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        userSelect: 'none',
        transition: 'opacity 0.2s ease'
      }}
    >
      {/* Previous Step Button */}
      <button
        onClick={onPreviousBookmark}
        disabled={activeBookmarkIndex === null || activeBookmarkIndex <= 0}
        style={{
          background: 'none',
          border: 'none',
          color: activeBookmarkIndex !== null && activeBookmarkIndex > 0 ? '#ffffff' : '#52525b',
          cursor: activeBookmarkIndex !== null && activeBookmarkIndex > 0 ? 'pointer' : 'default',
          padding: '6px 8px',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 12,
          fontWeight: 600,
          transition: 'background-color 0.15s'
        }}
        title="Previous Viewpoint (PageUp or Alt+Left)"
      >
        <ChevronLeft size={16} />
        <span style={{ fontSize: 11 }}>Prev</span>
      </button>

      {/* Center Step Indicator & Popover Selector */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setIsMenuOpen((prev) => !prev)}
          style={{
            background: 'rgba(39, 39, 42, 0.8)',
            border: '1px solid #52525b',
            borderRadius: 14,
            padding: '4px 10px',
            color: '#93c5fd',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            maxWidth: 240
          }}
          title="Click to select specific scene bookmark"
        >
          <Compass size={13} color="#60a5fa" />
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {displayStepText}
          </span>
          <ChevronDown size={12} color="#a1a1aa" />
        </button>

        {/* Quick Dropdown Menu */}
        {isMenuOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: '125%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 220,
              maxHeight: 220,
              overflowY: 'auto',
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
              padding: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              zIndex: 1001
            }}
          >
            {bookmarks.map((bm, idx) => {
              const isActive = activeBookmarkIndex === idx
              return (
                <button
                  key={bm.id}
                  onClick={() => {
                    onJumpToBookmark(idx)
                    setIsMenuOpen(false)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: 4,
                    border: 'none',
                    backgroundColor: isActive ? '#2563eb' : 'transparent',
                    color: isActive ? '#ffffff' : '#d4d4d8',
                    cursor: 'pointer',
                    fontSize: 11,
                    textAlign: 'left'
                  }}
                >
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}
                  >
                    {idx + 1}. {bm.name}
                  </span>
                  {idx < 9 && (
                    <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 6 }}>
                      Alt+{idx + 1}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Next Step Button */}
      <button
        onClick={onNextBookmark}
        disabled={activeBookmarkIndex !== null && activeBookmarkIndex >= bookmarks.length - 1}
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
          padding: '6px 8px',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 12,
          fontWeight: 600,
          transition: 'background-color 0.15s'
        }}
        title="Next Viewpoint (PageDown or Alt+Right)"
      >
        <span style={{ fontSize: 11 }}>Next</span>
        <ChevronRight size={16} />
      </button>

      {/* Divider */}
      <div style={{ height: 16, width: 1, backgroundColor: '#3f3f46', margin: '0 2px' }} />

      {/* Drawer Toggle (in standard mode) */}
      {!isRecordingMode && onToggleDrawer && (
        <button
          onClick={onToggleDrawer}
          style={{
            background: 'none',
            border: 'none',
            color: '#a1a1aa',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center'
          }}
          title="Open Bookmarks Drawer"
        >
          <Bookmark size={14} />
        </button>
      )}

      {/* Minimize Button */}
      <button
        onClick={() => {
          setIsCollapsed(true)
          setIsMenuOpen(false)
        }}
        style={{
          background: 'none',
          border: 'none',
          color: '#71717a',
          cursor: 'pointer',
          padding: 4,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center'
        }}
        title="Collapse Tour Bar"
      >
        <ChevronDown size={14} />
      </button>
    </div>
  )
}
