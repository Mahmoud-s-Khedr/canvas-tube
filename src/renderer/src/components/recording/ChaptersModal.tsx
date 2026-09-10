import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ChapterMarker,
  formatTimestamp,
  parseTimestamp,
  validateYouTubeChapters,
  generateYouTubeDescription,
  addChapterMarker,
  updateChapterMarker,
  deleteChapterMarker
} from '@core/recording/chapter-generator'
import {
  X,
  Copy,
  Check,
  Download,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText
} from 'lucide-react'

interface ChaptersModalProps {
  isOpen: boolean
  projectTitle: string
  chapters: ChapterMarker[]
  currentRecordingSeconds: number
  onClose: () => void
  onUpdateChapters: (chapters: ChapterMarker[]) => void
  onToast: (message: string, type?: 'info' | 'success' | 'warning') => void
}

export const ChaptersModal: React.FC<ChaptersModalProps> = ({
  isOpen,
  projectTitle,
  chapters,
  currentRecordingSeconds,
  onClose,
  onUpdateChapters,
  onToast
}) => {
  const [copied, setCopied] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newTimeStr, setNewTimeStr] = useState('')

  // Set default time in new chapter input when opening
  useEffect(() => {
    if (isOpen) {
      setNewTimeStr(formatTimestamp(currentRecordingSeconds))
      setNewTitle('')
    }
  }, [isOpen, currentRecordingSeconds])

  const validation = useMemo(() => validateYouTubeChapters(chapters), [chapters])

  const formattedDescription = useMemo(() => {
    return generateYouTubeDescription(chapters, {
      projectTitle,
      includeHeader: true
    })
  }, [chapters, projectTitle])

  const handleCopy = useCallback(async () => {
    try {
      const textToCopy = generateYouTubeDescription(chapters)
      if (window.desktopApi?.copyTextToClipboard) {
        await window.desktopApi.copyTextToClipboard(textToCopy)
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy)
      }
      setCopied(true)
      onToast('YouTube chapters copied to clipboard!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      onToast('Failed to copy chapters to clipboard', 'warning')
    }
  }, [chapters, onToast])

  const handleExportFile = useCallback(async () => {
    try {
      const textToSave = generateYouTubeDescription(chapters, {
        projectTitle,
        includeHeader: true
      })
      const defaultFilename = `${projectTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_chapters.txt`

      if (window.desktopApi?.saveExportFile) {
        const base64Data = btoa(unescape(encodeURIComponent(textToSave)))
        const res = await window.desktopApi.saveExportFile({
          defaultFilename,
          dataBase64: base64Data,
          filters: [{ name: 'Text Documents', extensions: ['txt'] }]
        })
        if (res.success && res.filePath) {
          onToast(`Chapters saved to ${res.filePath}`, 'success')
        }
      } else {
        // Fallback browser download
        const blob = new Blob([textToSave], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = defaultFilename
        a.click()
        URL.revokeObjectURL(url)
        onToast('Chapters downloaded as chapters.txt', 'success')
      }
    } catch (err) {
      console.error(err)
      onToast('Failed to export chapters.txt file', 'warning')
    }
  }, [chapters, projectTitle, onToast])

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const seconds = parseTimestamp(newTimeStr)
    if (seconds === null) {
      onToast('Invalid timestamp format (use MM:SS or HH:MM:SS)', 'warning')
      return
    }

    const title = newTitle.trim() || `Chapter ${chapters.length + 1}`
    const updated = addChapterMarker(chapters, title, seconds)
    onUpdateChapters(updated)
    setNewTitle('')
    setNewTimeStr(formatTimestamp(currentRecordingSeconds))
  }

  const handleDelete = (id: string) => {
    onUpdateChapters(deleteChapterMarker(chapters, id))
  }

  const handleTitleChange = (id: string, title: string) => {
    onUpdateChapters(updateChapterMarker(chapters, id, { title }))
  }

  const handleTimeChange = (id: string, timeStr: string) => {
    const sec = parseTimestamp(timeStr)
    if (sec !== null) {
      onUpdateChapters(updateChapterMarker(chapters, id, { timestampSeconds: sec }))
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 2100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1e1e1e',
          color: '#e0e0e0',
          borderRadius: 12,
          border: '1px solid #333',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          width: '100%',
          maxWidth: 680,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #2d2d2d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Clock size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#f3f4f6' }}>
                YouTube Video Chapters
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
                Generate compliant timestamps for YouTube video descriptions & chapters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Validation Status Badge */}
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: validation.isValid ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
            borderBottom: '1px solid #2d2d2d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {validation.isValid ? (
              <>
                <CheckCircle2 size={16} color="#22c55e" />
                <span style={{ color: '#22c55e', fontWeight: 500 }}>
                  YouTube Guideline Compliant ({chapters.length} chapters)
                </span>
              </>
            ) : (
              <>
                <AlertTriangle size={16} color="#eab308" />
                <span style={{ color: '#eab308', fontWeight: 500 }}>
                  {validation.errors[0] || 'YouTube requirements not yet met'}
                </span>
              </>
            )}
          </div>
          <span style={{ color: '#9ca3af', fontSize: 11 }}>
            Timer: {formatTimestamp(currentRecordingSeconds)}
          </span>
        </div>

        {/* Chapters Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          {/* Add New Chapter Form */}
          <form
            onSubmit={handleAdd}
            style={{
              display: 'flex',
              gap: 8,
              backgroundColor: '#262626',
              padding: 10,
              borderRadius: 8,
              border: '1px solid #383838'
            }}
          >
            <input
              type="text"
              value={newTimeStr}
              onChange={(e) => setNewTimeStr(e.target.value)}
              placeholder="00:00"
              style={{
                width: 75,
                backgroundColor: '#1a1a1a',
                border: '1px solid #404040',
                borderRadius: 6,
                color: '#fff',
                padding: '6px 10px',
                fontSize: 13,
                textAlign: 'center',
                fontFamily: 'monospace'
              }}
            />
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Chapter title (e.g. Distributed Database Architecture)"
              style={{
                flex: 1,
                backgroundColor: '#1a1a1a',
                border: '1px solid #404040',
                borderRadius: 6,
                color: '#fff',
                padding: '6px 12px',
                fontSize: 13
              }}
            />
            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#3b82f6',
                border: 'none',
                color: '#fff',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Plus size={15} />
              Add
            </button>
          </form>

          {/* Chapter Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {chapters.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '30px 20px',
                  color: '#737373',
                  fontSize: 13
                }}
              >
                No chapters added yet. Chapters are automatically generated when stepping through
                Camera Bookmarks during a recording session, or you can add them manually above.
              </div>
            ) : (
              chapters.map((ch, idx) => (
                <div
                  key={ch.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    backgroundColor: '#262626',
                    borderRadius: 6,
                    border: '1px solid #333'
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: '#6b7280',
                      minWidth: 20,
                      textAlign: 'center'
                    }}
                  >
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    defaultValue={formatTimestamp(ch.timestampSeconds)}
                    onBlur={(e) => handleTimeChange(ch.id, e.target.value)}
                    style={{
                      width: 75,
                      backgroundColor: '#171717',
                      border: '1px solid #404040',
                      borderRadius: 4,
                      color: '#60a5fa',
                      padding: '4px 8px',
                      fontSize: 12,
                      textAlign: 'center',
                      fontFamily: 'monospace'
                    }}
                  />
                  <input
                    type="text"
                    defaultValue={ch.title}
                    onBlur={(e) => handleTitleChange(ch.id, e.target.value)}
                    style={{
                      flex: 1,
                      backgroundColor: 'transparent',
                      border: '1px solid transparent',
                      borderRadius: 4,
                      color: '#f3f4f6',
                      padding: '4px 8px',
                      fontSize: 13
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#404040')}
                  />
                  <button
                    onClick={() => handleDelete(ch.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: 4,
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Delete chapter"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* YouTube Description Preview */}
          {chapters.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#9ca3af',
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <FileText size={14} />
                YouTube Description Preview
              </div>
              <textarea
                readOnly
                value={formattedDescription}
                rows={Math.min(8, Math.max(3, chapters.length + 2))}
                style={{
                  width: '100%',
                  backgroundColor: '#171717',
                  border: '1px solid #333',
                  borderRadius: 6,
                  color: '#9ca3af',
                  padding: 10,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  resize: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #2d2d2d',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#1a1a1a'
          }}
        >
          <button
            onClick={() => onUpdateChapters([])}
            disabled={chapters.length === 0}
            style={{
              background: 'transparent',
              border: 'none',
              color: chapters.length > 0 ? '#ef4444' : '#525252',
              fontSize: 12,
              cursor: chapters.length > 0 ? 'pointer' : 'default'
            }}
          >
            Clear All
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleExportFile}
              disabled={chapters.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#262626',
                border: '1px solid #383838',
                color: chapters.length > 0 ? '#e0e0e0' : '#525252',
                padding: '7px 14px',
                borderRadius: 6,
                fontSize: 13,
                cursor: chapters.length > 0 ? 'pointer' : 'default'
              }}
            >
              <Download size={14} />
              Save chapters.txt
            </button>

            <button
              onClick={handleCopy}
              disabled={chapters.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#3b82f6',
                border: 'none',
                color: '#fff',
                padding: '7px 16px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: chapters.length > 0 ? 'pointer' : 'default',
                opacity: chapters.length > 0 ? 1 : 0.6
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy for YouTube'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
