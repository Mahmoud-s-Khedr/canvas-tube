import React, { useState, useEffect } from 'react'
import { CanvasPointerSnapshot } from '@core/canvas/canvas-adapter'
import { SystemInfo } from '@core/desktop/desktop-api'
import { Activity, Tablet, Mouse, Fingerprint, X } from 'lucide-react'

interface InputInspectorProps {
  snapshot: CanvasPointerSnapshot | null
  systemInfo: SystemInfo | null
  isOpen: boolean
  onClose: () => void
}

export const InputInspector: React.FC<InputInspectorProps> = ({
  snapshot,
  systemInfo,
  isOpen,
  onClose
}) => {
  const [recentPenEvents, setRecentPenEvents] = useState<CanvasPointerSnapshot[]>([])

  useEffect(() => {
    if (isOpen && snapshot?.pointerType === 'pen') {
      setRecentPenEvents((previous) => [snapshot, ...previous.slice(0, 15)])
    }
  }, [isOpen, snapshot])

  if (!isOpen) return null

  const isPen = snapshot?.pointerType === 'pen'
  const isTouch = snapshot?.pointerType === 'touch'
  const pressurePercent = Math.round((snapshot?.pressure ?? 0) * 100)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 380,
        backgroundColor: 'rgba(24, 24, 27, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid #3f3f46',
        borderRadius: 12,
        color: '#f4f4f5',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid #27272a',
          backgroundColor: '#18181b'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <Activity size={16} color="#38bdf8" />
          <span>Stylus & Pointer Inspector</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#a1a1aa',
            cursor: 'pointer',
            padding: 4,
            display: 'flex'
          }}
          title="Close Inspector"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Device Mode Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderRadius: 8,
            backgroundColor: isPen ? '#064e3b' : isTouch ? '#78350f' : '#27272a',
            border: `1px solid ${isPen ? '#059669' : isTouch ? '#d97706' : '#3f3f46'}`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isPen ? (
              <Tablet size={18} color="#34d399" />
            ) : isTouch ? (
              <Fingerprint size={18} color="#fbbf24" />
            ) : (
              <Mouse size={18} color="#94a3b8" />
            )}
            <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {snapshot ? snapshot.pointerType : 'NO INPUT'}
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 12,
              backgroundColor: isPen ? '#10b981' : '#52525b',
              color: isPen ? '#022c22' : '#ffffff',
              fontWeight: 700
            }}
          >
            {isPen ? 'PEN / STYLUS' : isTouch ? 'TOUCH' : 'MOUSE'}
          </span>
        </div>

        {/* Live Metrics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8,
            backgroundColor: '#09090b',
            padding: 10,
            borderRadius: 8,
            border: '1px solid #27272a'
          }}
        >
          <div>
            <span style={{ color: '#a1a1aa' }}>Client (X, Y):</span>
            <div style={{ fontWeight: 600, color: '#f8fafc' }}>
              {snapshot ? `${snapshot.clientX}, ${snapshot.clientY}` : '-'}
            </div>
          </div>
          <div>
            <span style={{ color: '#a1a1aa' }}>Canvas (X, Y):</span>
            <div style={{ fontWeight: 600, color: '#38bdf8' }}>
              {snapshot ? `${snapshot.canvasX}, ${snapshot.canvasY}` : '-'}
            </div>
          </div>
          <div>
            <span style={{ color: '#a1a1aa' }}>Tilt (X / Y):</span>
            <div style={{ fontWeight: 600, color: '#f8fafc' }}>
              {snapshot ? `${snapshot.tiltX}° / ${snapshot.tiltY}°` : '-'}
            </div>
          </div>
          <div>
            <span style={{ color: '#a1a1aa' }}>Buttons / ID:</span>
            <div style={{ fontWeight: 600, color: '#f8fafc' }}>
              {snapshot ? `btn:${snapshot.buttons} (id:${snapshot.pointerId})` : '-'}
            </div>
          </div>
        </div>

        {/* Pressure Gauge */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 4,
              color: '#d4d4d8'
            }}
          >
            <span>Stylus Pressure:</span>
            <span style={{ fontWeight: 700, color: isPen ? '#34d399' : '#a1a1aa' }}>
              {snapshot ? `${snapshot.pressure.toFixed(3)} (${pressurePercent}%)` : '0.000 (0%)'}
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 12,
              backgroundColor: '#27272a',
              borderRadius: 6,
              overflow: 'hidden',
              border: '1px solid #3f3f46'
            }}
          >
            <div
              style={{
                width: `${pressurePercent}%`,
                height: '100%',
                backgroundColor:
                  pressurePercent > 75
                    ? '#ef4444'
                    : pressurePercent > 40
                      ? '#10b981'
                      : '#3b82f6',
                transition: 'width 0.05s ease-out'
              }}
            />
          </div>
        </div>

        {/* Environment Status */}
        {systemInfo && (
          <div
            style={{
              fontSize: 11,
              color: '#a1a1aa',
              padding: '6px 8px',
              backgroundColor: '#18181b',
              borderRadius: 6,
              border: '1px solid #27272a',
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <div>
              <strong style={{ color: '#d4d4d8' }}>Host:</strong> {systemInfo.platform} (
              {systemInfo.arch}) &bull;{' '}
              <span
                style={{
                  color:
                    systemInfo.platform === 'win32'
                      ? '#38bdf8'
                      : systemInfo.isWayland
                        ? '#34d399'
                        : '#f59e0b',
                  fontWeight: 600
                }}
              >
                {systemInfo.platform === 'win32'
                  ? 'Windows (PointerEvents / DirectManipulation)'
                  : systemInfo.isWayland
                    ? `Wayland (${systemInfo.compositor || 'Native'})`
                    : 'X11'}
              </span>
            </div>
            <div>
              <strong style={{ color: '#d4d4d8' }}>Electron:</strong> v{systemInfo.electronVersion}{' '}
              &bull; <strong style={{ color: '#d4d4d8' }}>Chrome:</strong> v
              {systemInfo.chromeVersion}
            </div>
          </div>
        )}

        {/* Recent pen event stream */}
        {recentPenEvents.length > 0 && (
          <div>
            <div style={{ color: '#71717a', fontSize: 11, marginBottom: 4 }}>
              Recent Pointer Trail:
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {recentPenEvents.slice(0, 8).map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 24,
                    backgroundColor:
                      h.pointerType === 'pen'
                        ? '#059669'
                        : h.pointerType === 'touch'
                          ? '#d97706'
                          : '#475569',
                    borderRadius: 4,
                    opacity: 1 - i * 0.12,
                    display: 'flex',
                    alignItems: 'flex-end',
                    overflow: 'hidden'
                  }}
                  title={`Event ${i}: ${h.pointerType} p:${h.pressure.toFixed(2)}`}
                >
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.max(10, Math.round(h.pressure * 100))}%`,
                      backgroundColor: '#f8fafc'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opt-in, one-row-per-browser-event pen diagnostics. */}
        <div>
          <div style={{ color: '#71717a', fontSize: 11, marginBottom: 4 }}>Recent pen events:</div>
          {recentPenEvents.length === 0 ? (
            <div style={{ color: '#71717a', fontSize: 11 }}>Waiting for pen input…</div>
          ) : (
            <div
              style={{
                maxHeight: 220,
                overflow: 'auto',
                border: '1px solid #27272a',
                borderRadius: 6,
                backgroundColor: '#09090b'
              }}
            >
              <table style={{ borderCollapse: 'collapse', fontSize: 10, minWidth: 790, width: '100%' }}>
                <thead style={{ backgroundColor: '#18181b', color: '#a1a1aa', position: 'sticky', top: 0 }}>
                  <tr>
                    {['Type', 'Pointer', 'ID', 'Button', 'Buttons', 'Pressure', 'Tilt X/Y', 'Timestamp', 'Coalesced'].map(
                      (label) => (
                        <th
                          key={label}
                          style={{ padding: '5px 6px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}
                        >
                          {label}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {recentPenEvents.map((event, index) => (
                    <tr key={`${event.timestamp}-${event.pointerId}-${index}`} style={{ borderTop: '1px solid #27272a' }}>
                      <td style={{ padding: '4px 6px' }}>{event.eventType}</td>
                      <td style={{ padding: '4px 6px' }}>{event.pointerType}</td>
                      <td style={{ padding: '4px 6px' }}>{event.pointerId}</td>
                      <td style={{ padding: '4px 6px' }}>{event.button}</td>
                      <td style={{ padding: '4px 6px' }}>{event.buttons}</td>
                      <td style={{ padding: '4px 6px' }}>{event.pressure.toFixed(3)}</td>
                      <td style={{ padding: '4px 6px' }}>{event.tiltX}° / {event.tiltY}°</td>
                      <td style={{ padding: '4px 6px' }}>{event.timestamp.toFixed(1)}</td>
                      <td style={{ padding: '4px 6px' }}>{event.coalescedEventCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
