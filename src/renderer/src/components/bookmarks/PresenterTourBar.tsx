import React, { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Radio,
  Clock,
  Plus,
  Video,
  Circle
} from 'lucide-react'
import { CameraBookmark } from '@core/project/project-manifest'
import { formatTimestamp } from '@core/recording/chapter-generator'
import { ObsConnectionStatus } from '@core/obs/obs-client'

interface PresenterTourBarProps {
  bookmarks: CameraBookmark[]
  activeBookmarkIndex: number | null
  isRecordingMode: boolean
  onJumpToBookmark: (index: number) => void
  onNextBookmark: () => void
  onPreviousBookmark: () => void
  onToggleDrawer?: () => void
  // Recording & Production additions
  recordingState?: {
    isRecording: boolean
    seconds: number
    chaptersCount: number
  }
  onToggleRecording?: () => void
  onAddChapterMarker?: () => void
  onOpenChapters?: () => void
  obsStatus?: ObsConnectionStatus
  onOpenObs?: () => void
  chromaMode?: string
  onCycleChroma?: () => void
}

export const PresenterTourBar: React.FC<PresenterTourBarProps> = ({
  bookmarks,
  activeBookmarkIndex,
  isRecordingMode,
  onJumpToBookmark,
  onNextBookmark,
  onPreviousBookmark,
  onToggleDrawer,
  recordingState,
  onToggleRecording,
  onAddChapterMarker,
  onOpenChapters,
  obsStatus = 'disconnected',
  onOpenObs,
  chromaMode = 'dark',
  onCycleChroma
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  if (bookmarks.length === 0 && !recordingState?.isRecording) {
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
          opacity: isRecordingMode ? 0.85 : 1
        }}
        title="Expand Scene Tour & Production Bar"
      >
        {recordingState?.isRecording && (
          <Circle size={8} fill="#ef4444" color="#ef4444" className="animate-pulse" />
        )}
        <Compass size={14} color="#60a5fa" />
        <span>
          {recordingState?.isRecording
            ? formatTimestamp(recordingState.seconds)
            : currentBookmark
              ? `Step ${activeBookmarkIndex! + 1}/${bookmarks.length}`
              : 'Tour'}
        </span>
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
        backgroundColor: 'rgba(24, 24, 27, 0.94)',
        backdropFilter: 'blur(12px)',
        border: '1px solid #3f3f46',
        borderRadius: 24,
        padding: '4px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.6)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        userSelect: 'none',
        transition: 'opacity 0.2s ease'
      }}
    >
      {/* Recording Timer & Toggle */}
      {onToggleRecording && (
        <button
          onClick={onToggleRecording}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 8px',
            backgroundColor: recordingState?.isRecording ? '#991b1b' : 'rgba(39, 39, 42, 0.7)',
            border: `1px solid ${recordingState?.isRecording ? '#ef4444' : '#52525b'}`,
            borderRadius: 14,
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer'
          }}
          title={recordingState?.isRecording ? 'Stop Recording' : 'Start Recording Session'}
        >
          {recordingState?.isRecording ? (
            <>
              <Circle size={8} fill="#ffffff" color="#ffffff" className="animate-pulse" />
              <span>{formatTimestamp(recordingState.seconds)}</span>
            </>
          ) : (
            <>
              <Video size={12} color="#ef4444" />
              <span>REC</span>
            </>
          )}
        </button>
      )}

      {/* Quick Chapter Stamp Button (Alt+C) */}
      {onAddChapterMarker && (
        <button
          onClick={onAddChapterMarker}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '4px 7px',
            backgroundColor: 'transparent',
            border: '1px solid #3f3f46',
            borderRadius: 12,
            color: '#93c5fd',
            fontSize: 11,
            cursor: 'pointer'
          }}
          title="Add Chapter Marker at Current Time (Alt+C)"
        >
          <Plus size={11} />
          <span>Ch</span>
        </button>
      )}

      {/* Chapters Modal Launcher */}
      {onOpenChapters && (
        <button
          onClick={onOpenChapters}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 7px',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: 12,
            color: '#d4d4d8',
            fontSize: 11,
            cursor: 'pointer'
          }}
          title="Open YouTube Chapters Manager"
        >
          <Clock size={12} color="#f59e0b" />
          <span>{recordingState?.chaptersCount || 0}</span>
        </button>
      )}

      {/* OBS Status Button */}
      {onOpenObs && (
        <button
          onClick={onOpenObs}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 7px',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: 12,
            color: '#d4d4d8',
            fontSize: 11,
            cursor: 'pointer'
          }}
          title={`OBS Studio: ${obsStatus} (Click to Configure)`}
        >
          <Radio size={12} color={obsStatus === 'connected' ? '#22c55e' : '#71717a'} />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: obsStatus === 'connected' ? '#86efac' : '#71717a'
            }}
          >
            OBS
          </span>
        </button>
      )}

      {/* Chroma-Key Cycler */}
      {onCycleChroma && (
        <button
          onClick={onCycleChroma}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 6px',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: 12,
            cursor: 'pointer'
          }}
          title={`Canvas Chroma: ${chromaMode} (Click to Cycle)`}
        >
          <div
            style={{
              width: 12,
              height: 12,
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
        </button>
      )}

      {/* Divider */}
      {bookmarks.length > 0 && (
        <div style={{ height: 16, width: 1, backgroundColor: '#3f3f46', margin: '0 2px' }} />
      )}

      {/* Previous Step Button */}
      {bookmarks.length > 0 && (
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
      )}

      {/* Center Step Indicator & Popover Selector */}
      {bookmarks.length > 0 && (
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
              maxWidth: 220
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
      )}

      {/* Next Step Button */}
      {bookmarks.length > 0 && (
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
      )}

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
