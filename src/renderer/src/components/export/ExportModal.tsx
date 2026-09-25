import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { CanvasAdapter, Bounds } from '@core/canvas/canvas-adapter'
import {
  ExportFormat,
  ExportScope,
  ExportResolutionPreset,
  ExportBackgroundMode,
  CanvasExportConfig,
  RESOLUTION_PRESETS,
  calculateExportDimensions
} from '@core/export/export-types'
import {
  Download,
  Copy,
  Check,
  X,
  Layers,
  CheckSquare,
  Monitor,
  Crop,
  Sun,
  Moon,
  Maximize2,
  RefreshCw,
  AlertCircle
} from 'lucide-react'

interface ExportModalProps {
  isOpen: boolean
  adapter: CanvasAdapter | null
  projectTitle: string
  onClose: () => void
  onStartMarquee: () => void
  customBounds: Bounds | null
  onToast: (message: string, type?: 'info' | 'success' | 'warning') => void
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  adapter,
  projectTitle,
  onClose,
  onStartMarquee,
  customBounds,
  onToast
}) => {
  const [format, setFormat] = useState<ExportFormat>('png')
  const [scope, setScope] = useState<ExportScope>('all')
  const [preset, setPreset] = useState<ExportResolutionPreset>('2x')
  const [backgroundMode, setBackgroundMode] = useState<ExportBackgroundMode>('dark')
  const [padding, setPadding] = useState<number>(16)

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [copied, setCopied] = useState(false)

  // Elements and bounds inspection
  const selectionCount = useMemo(() => {
    return adapter?.getElementsCount('selection') ?? 0
  }, [adapter, isOpen])

  const totalCount = useMemo(() => {
    return adapter?.getElementsCount('all') ?? 0
  }, [adapter, isOpen])

  // Automatically adjust scope if selection was previously chosen but now 0
  useEffect(() => {
    if (selectionCount > 0 && scope !== 'selection' && !customBounds) {
      setScope('selection')
    } else if (selectionCount === 0 && scope === 'selection') {
      setScope('all')
    }
  }, [selectionCount, isOpen])

  // If customBounds is passed, switch scope to custom
  useEffect(() => {
    if (customBounds) {
      setScope('custom')
    }
  }, [customBounds])

  // Calculate base bounds for current scope
  const currentBounds = useMemo(() => {
    if (!adapter) return null
    return adapter.getExportBounds(scope, customBounds || undefined)
  }, [adapter, scope, customBounds, isOpen])

  // Calculate projected dimensions
  const dimensions = useMemo(() => {
    const paddingForScope = scope === 'viewport' || scope === 'custom' ? 0 : padding * 2
    const baseW = (currentBounds?.width || 800) + paddingForScope
    const baseH = (currentBounds?.height || 600) + paddingForScope
    return calculateExportDimensions(baseW, baseH, preset)
  }, [currentBounds, padding, preset, scope])

  // Generate preview thumbnail
  const refreshPreview = useCallback(async () => {
    if (!adapter || !isOpen) return
    setIsPreviewLoading(true)

    try {
      const config: CanvasExportConfig = {
        format,
        scope,
        resolutionPreset: '1x', // use 1x for fast lightweight preview thumbnail
        backgroundMode,
        padding,
        customBounds: customBounds || undefined
      }

      const result = await adapter.exportCanvas(config)
      setPreviewUrl(result.dataUrl || null)
    } catch (err) {
      console.warn('[ExportModal] Preview generation warning:', err)
      setPreviewUrl(null)
    } finally {
      setIsPreviewLoading(false)
    }
  }, [adapter, isOpen, format, scope, backgroundMode, padding, customBounds])

  // Debounced preview update whenever configuration changes
  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => {
      refreshPreview()
    }, 180)
    return () => clearTimeout(timer)
  }, [refreshPreview, isOpen])

  // Quick clipboard copy action
  const handleCopyClipboard = async () => {
    if (!adapter) return
    setIsExporting(true)
    try {
      const config: CanvasExportConfig = {
        format: 'png',
        scope,
        resolutionPreset: preset,
        backgroundMode,
        padding,
        customBounds: customBounds || undefined
      }

      const result = await adapter.exportCanvas(config)
      let copiedSuccessfully = false

      // Try desktop API native clipboard (works on Wayland, X11, and Windows)
      if (window.desktopApi?.copyImageToClipboard && result.dataUrl) {
        copiedSuccessfully = await window.desktopApi.copyImageToClipboard(result.dataUrl)
      }

      // Try standard browser clipboard as complementary fallback
      if (navigator.clipboard && result.blob) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': result.blob })
          ])
          copiedSuccessfully = true
        } catch {
          // Ignored if desktopApi already handled it
        }
      }

      if (copiedSuccessfully) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        onToast(`Diagram copied to clipboard as PNG (${dimensions.width}×${dimensions.height}px)`, 'success')
      } else {
        onToast('Failed to copy to system clipboard', 'warning')
      }
    } catch (err) {
      console.error('[handleCopyClipboard] Error:', err)
      onToast(`Export copy failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'warning')
    } finally {
      setIsExporting(false)
    }
  }

  // Save to file action
  const handleSaveFile = async () => {
    if (!adapter) return
    setIsExporting(true)

    try {
      const config: CanvasExportConfig = {
        format,
        scope,
        resolutionPreset: preset,
        backgroundMode,
        padding,
        customBounds: customBounds || undefined
      }

      const result = await adapter.exportCanvas(config)
      const sanitizedTitle = (projectTitle || 'diagram').replace(/[^a-zA-Z0-9_-]/g, '_')
      const ext = format === 'svg' ? 'svg' : 'png'
      const defaultFilename = `${sanitizedTitle}_${Date.now()}.${ext}`

      if (window.desktopApi?.saveExportFile) {
        // Base64 payload for native IPC write
        let dataBase64 = ''
        if (format === 'png' && result.dataUrl) {
          dataBase64 = result.dataUrl.split(',')[1]
        } else if (format === 'svg' && result.svgString) {
          dataBase64 = btoa(unescape(encodeURIComponent(result.svgString)))
        }

        const filterName = format === 'svg' ? 'Scalable Vector Graphics' : 'PNG Image'
        const saveRes = await window.desktopApi.saveExportFile({
          defaultFilename,
          dataBase64,
          filters: [{ name: filterName, extensions: [ext] }]
        })

        if (saveRes.success && saveRes.filePath) {
          onToast(`Export saved successfully to: ${saveRes.filePath}`, 'success')
          onClose()
        }
      } else {
        // Browser fallback: trigger anchor download
        const url = result.dataUrl || (result.blob ? URL.createObjectURL(result.blob) : '')
        if (url) {
          const a = document.createElement('a')
          a.href = url
          a.download = defaultFilename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          onToast(`Saved ${defaultFilename}`, 'success')
          onClose()
        }
      }
    } catch (err) {
      console.error('[handleSaveFile] Error:', err)
      onToast(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'warning')
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#18181b',
          border: '1px solid #3f3f46',
          borderRadius: 12,
          width: 820,
          maxWidth: '92vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          color: '#e4e4e7',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #27272a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#1c1c20'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Download size={20} color="#3b82f6" />
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#ffffff' }}>
                Production Diagram Export
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#a1a1aa' }}>
                Export 4K/8K raster PNGs or standalone vector SVGs for videos, slides, and blogs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Column: Settings */}
          <div
            style={{
              flex: '1 1 55%',
              padding: '18px 20px',
              borderRight: '1px solid #27272a',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            {/* Format Selection */}
            <div>
              <label style={labelStyle}>Export Format</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setFormat('png')}
                  style={{
                    ...cardButtonStyle,
                    borderColor: format === 'png' ? '#3b82f6' : '#27272a',
                    backgroundColor: format === 'png' ? '#1e3a8a33' : '#202024'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, color: format === 'png' ? '#93c5fd' : '#ffffff' }}>
                    PNG Raster
                  </div>
                  <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 2 }}>
                    High-res raster for thumbnails, slides & social
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('svg')}
                  style={{
                    ...cardButtonStyle,
                    borderColor: format === 'svg' ? '#3b82f6' : '#27272a',
                    backgroundColor: format === 'svg' ? '#1e3a8a33' : '#202024'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, color: format === 'svg' ? '#93c5fd' : '#ffffff' }}>
                    Vector SVG
                  </div>
                  <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 2 }}>
                    Infinitely scalable vector with embedded fonts
                  </div>
                </button>
              </div>
            </div>

            {/* Scope Selection */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={labelStyle}>Export Scope</label>
                {scope === 'custom' && customBounds && (
                  <span style={{ fontSize: 11, color: '#60a5fa' }}>
                    Bounded: {customBounds.width}×{customBounds.height} px
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {/* Entire Canvas */}
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  style={{
                    ...scopeButtonStyle,
                    borderColor: scope === 'all' ? '#3b82f6' : '#27272a',
                    backgroundColor: scope === 'all' ? '#1e3a8a33' : '#202024'
                  }}
                >
                  <Layers size={15} color={scope === 'all' ? '#60a5fa' : '#a1a1aa'} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>Entire Canvas</div>
                    <div style={{ fontSize: 10, color: '#71717a' }}>{totalCount} elements in scene</div>
                  </div>
                </button>

                {/* Selected Elements */}
                <button
                  type="button"
                  disabled={selectionCount === 0}
                  onClick={() => setScope('selection')}
                  style={{
                    ...scopeButtonStyle,
                    opacity: selectionCount === 0 ? 0.45 : 1,
                    cursor: selectionCount === 0 ? 'not-allowed' : 'pointer',
                    borderColor: scope === 'selection' ? '#3b82f6' : '#27272a',
                    backgroundColor: scope === 'selection' ? '#1e3a8a33' : '#202024'
                  }}
                  title={selectionCount === 0 ? 'Select elements on canvas first' : 'Export only selected items'}
                >
                  <CheckSquare size={15} color={scope === 'selection' ? '#60a5fa' : '#a1a1aa'} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>Selection</div>
                    <div style={{ fontSize: 10, color: '#71717a' }}>
                      {selectionCount > 0 ? `${selectionCount} selected` : 'None selected'}
                    </div>
                  </div>
                </button>

                {/* Camera Viewport */}
                <button
                  type="button"
                  onClick={() => setScope('viewport')}
                  style={{
                    ...scopeButtonStyle,
                    borderColor: scope === 'viewport' ? '#3b82f6' : '#27272a',
                    backgroundColor: scope === 'viewport' ? '#1e3a8a33' : '#202024'
                  }}
                >
                  <Monitor size={15} color={scope === 'viewport' ? '#60a5fa' : '#a1a1aa'} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>Screen Viewport</div>
                    <div style={{ fontSize: 10, color: '#71717a' }}>Visible on-screen camera</div>
                  </div>
                </button>

                {/* Bounded Marquee Region */}
                <button
                  type="button"
                  onClick={() => {
                    setScope('custom')
                    if (!customBounds) {
                      onStartMarquee()
                    }
                  }}
                  style={{
                    ...scopeButtonStyle,
                    borderColor: scope === 'custom' ? '#3b82f6' : '#27272a',
                    backgroundColor: scope === 'custom' ? '#1e3a8a33' : '#202024'
                  }}
                >
                  <Crop size={15} color={scope === 'custom' ? '#60a5fa' : '#a1a1aa'} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>Bounded Region</div>
                    <div style={{ fontSize: 10, color: '#71717a' }}>
                      {customBounds ? 'Region defined' : 'Marquee selection'}
                    </div>
                  </div>
                </button>
              </div>

              {scope === 'custom' && (
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={onStartMarquee}
                    style={{
                      width: '100%',
                      padding: '7px 12px',
                      backgroundColor: '#27272a',
                      border: '1px dashed #60a5fa',
                      borderRadius: 6,
                      color: '#93c5fd',
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Crop size={14} />
                    <span>{customBounds ? 'Re-draw Bounded Area on Canvas' : 'Draw Bounded Area on Canvas'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Resolution Preset (PNG only) */}
            {format === 'png' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={labelStyle}>Resolution & Scale</label>
                  <span style={{ fontSize: 11, color: '#a1a1aa' }}>
                    {RESOLUTION_PRESETS[preset as Exclude<ExportResolutionPreset, 'custom'>]?.description}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {(['1x', '2x', '3x', '4x', '4k', '8k'] as ExportResolutionPreset[]).map((p) => {
                    const isSelected = preset === p
                    const isUltra = p === '4k' || p === '8k'
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPreset(p)}
                        style={{
                          padding: '7px 10px',
                          borderRadius: 6,
                          border: `1px solid ${isSelected ? '#3b82f6' : '#27272a'}`,
                          backgroundColor: isSelected ? '#1e3a8a55' : '#202024',
                          color: isSelected ? '#93c5fd' : '#e4e4e7',
                          fontSize: 12,
                          fontWeight: isSelected || isUltra ? 600 : 400,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4
                        }}
                      >
                        {isUltra && <Maximize2 size={11} color="#60a5fa" />}
                        <span>{p.toUpperCase()}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Background Style */}
            <div>
              <label style={labelStyle}>Background</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setBackgroundMode('dark')}
                  style={{
                    ...radioButtonStyle,
                    borderColor: backgroundMode === 'dark' ? '#3b82f6' : '#27272a',
                    backgroundColor: backgroundMode === 'dark' ? '#1e3a8a33' : '#202024',
                    color: backgroundMode === 'dark' ? '#93c5fd' : '#e4e4e7'
                  }}
                >
                  <Moon size={14} color="#60a5fa" />
                  <span>Canvas Dark</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBackgroundMode('light')}
                  style={{
                    ...radioButtonStyle,
                    borderColor: backgroundMode === 'light' ? '#3b82f6' : '#27272a',
                    backgroundColor: backgroundMode === 'light' ? '#1e3a8a33' : '#202024',
                    color: backgroundMode === 'light' ? '#93c5fd' : '#e4e4e7'
                  }}
                >
                  <Sun size={14} color="#f59e0b" />
                  <span>Paper White</span>
                </button>

                <button
                  type="button"
                  disabled={format === 'svg'} // PNG supports transparent alpha cleanly
                  onClick={() => setBackgroundMode('transparent')}
                  style={{
                    ...radioButtonStyle,
                    opacity: format === 'svg' ? 0.4 : 1,
                    borderColor: backgroundMode === 'transparent' ? '#3b82f6' : '#27272a',
                    backgroundColor: backgroundMode === 'transparent' ? '#1e3a8a33' : '#202024',
                    color: backgroundMode === 'transparent' ? '#93c5fd' : '#e4e4e7'
                  }}
                  title={format === 'svg' ? 'SVG uses vector shapes' : 'Transparent alpha background'}
                >
                  <span style={{ fontSize: 14 }}>🏁</span>
                  <span>Transparent</span>
                </button>
              </div>
            </div>

            {/* Margin Padding (Only when not viewport/custom bounded) */}
            {scope !== 'viewport' && scope !== 'custom' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={labelStyle}>Outer Padding</label>
                  <span style={{ fontSize: 11, color: '#a1a1aa' }}>{padding} px</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[0, 16, 32, 48].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPadding(p)}
                      style={{
                        flex: 1,
                        padding: '5px 8px',
                        borderRadius: 6,
                        border: `1px solid ${padding === p ? '#3b82f6' : '#27272a'}`,
                        backgroundColor: padding === p ? '#1e3a8a44' : '#202024',
                        color: padding === p ? '#93c5fd' : '#a1a1aa',
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      {p} px
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Preview & Specifications */}
          <div
            style={{
              flex: '1 1 45%',
              padding: '18px 20px',
              backgroundColor: '#141416',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase' }}>
                  Output Specifications
                </span>
                <button
                  type="button"
                  onClick={refreshPreview}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#71717a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11
                  }}
                  title="Refresh preview thumbnail"
                >
                  <RefreshCw size={12} className={isPreviewLoading ? 'spin-anim' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Resolution Badges */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  marginBottom: 16
                }}
              >
                <div style={specCardStyle}>
                  <div style={{ fontSize: 11, color: '#71717a' }}>Resolution</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa', marginTop: 2 }}>
                    {dimensions.width} × {dimensions.height}
                  </div>
                </div>

                <div style={specCardStyle}>
                  <div style={{ fontSize: 11, color: '#71717a' }}>Scale Multiplier</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#34d399', marginTop: 2 }}>
                    {format === 'svg' ? 'Vector (Infinite)' : `${dimensions.scale}x`}
                  </div>
                </div>
              </div>

              {/* Live Preview Canvas Container */}
              <div
                style={{
                  border: '1px solid #27272a',
                  borderRadius: 8,
                  height: 230,
                  backgroundColor: backgroundMode === 'transparent' ? '#18181b' : backgroundMode === 'light' ? '#f4f4f5' : '#121212',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {isPreviewLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a1a1aa', fontSize: 12 }}>
                    <RefreshCw size={16} />
                    <span>Rendering preview...</span>
                  </div>
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Export preview"
                    style={{
                      maxWidth: '92%',
                      maxHeight: '92%',
                      objectFit: 'contain',
                      borderRadius: 4,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#71717a', fontSize: 12 }}>
                    <AlertCircle size={20} />
                    <span>No elements to preview</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              {/* Copy to Clipboard (Only for PNG) */}
              {format === 'png' && (
                <button
                  type="button"
                  onClick={handleCopyClipboard}
                  disabled={isExporting}
                  style={{
                    padding: '9px 14px',
                    backgroundColor: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: 6,
                    color: '#e4e4e7',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isExporting ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 0.15s'
                  }}
                >
                  {copied ? <Check size={16} color="#22c55e" /> : <Copy size={16} />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy to Clipboard (Ctrl+Shift+C)'}</span>
                </button>
              )}

              {/* Primary Save Button */}
              <button
                type="button"
                onClick={handleSaveFile}
                disabled={isExporting}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#2563eb',
                  border: 'none',
                  borderRadius: 6,
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isExporting ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                }}
              >
                <Download size={16} />
                <span>{isExporting ? 'Exporting Diagram...' : `Save ${format.toUpperCase()} Diagram...`}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#a1a1aa',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.04em'
}

const cardButtonStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #27272a',
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'all 0.15s'
}

const scopeButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #27272a',
  cursor: 'pointer',
  color: '#ffffff',
  transition: 'all 0.15s'
}

const radioButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #27272a',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s'
}

const specCardStyle: React.CSSProperties = {
  backgroundColor: '#1c1c20',
  border: '1px solid #27272a',
  borderRadius: 6,
  padding: '8px 10px'
}
