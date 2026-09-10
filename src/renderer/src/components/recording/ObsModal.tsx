import React, { useState, useEffect } from 'react'
import {
  obsClient,
  ObsConnectionStatus
} from '@core/obs/obs-client'
import { ObsScene, ObsRecordState } from '@core/obs/obs-types'
import {
  Radio,
  X,
  RefreshCw,
  Tv,
  Circle,
  Video,
  VideoOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

interface ObsModalProps {
  isOpen: boolean
  onClose: () => void
  autoSwitchScene: boolean
  onToggleAutoSwitchScene: (enabled: boolean) => void
  onToast: (message: string, type?: 'info' | 'success' | 'warning') => void
}

export const ObsModal: React.FC<ObsModalProps> = ({
  isOpen,
  onClose,
  autoSwitchScene,
  onToggleAutoSwitchScene,
  onToast
}) => {
  const [url, setUrl] = useState(() => {
    return localStorage.getItem('canvastube_obs_url') || 'ws://localhost:4455'
  })
  const [password, setPassword] = useState(() => {
    return localStorage.getItem('canvastube_obs_password') || ''
  })
  const [status, setStatus] = useState<ObsConnectionStatus>(obsClient.getStatus())
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [currentScene, setCurrentScene] = useState<string | null>(obsClient.getCurrentScene())
  const [scenes, setScenes] = useState<ObsScene[]>(obsClient.getScenes())
  const [isRecording, setIsRecording] = useState<boolean>(obsClient.getIsRecording())
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    const unsubStatus = obsClient.onStatusChange((newStatus, msg) => {
      setStatus(newStatus)
      if (msg) setStatusMessage(msg)
    })

    const unsubScene = obsClient.onSceneChange((scene, sceneList) => {
      setCurrentScene(scene)
      setScenes(sceneList)
    })

    const unsubRecord = obsClient.onRecordStateChange((recState: ObsRecordState) => {
      setIsRecording(recState.outputActive)
    })

    return () => {
      unsubStatus()
      unsubScene()
      unsubRecord()
    }
  }, [])

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsBusy(true)
    try {
      localStorage.setItem('canvastube_obs_url', url)
      localStorage.setItem('canvastube_obs_password', password)

      await obsClient.connect({
        url,
        password,
        autoReconnect: true
      })
      onToast('Connected to OBS Studio!', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed'
      onToast(`Failed to connect to OBS: ${msg}`, 'warning')
    } finally {
      setIsBusy(false)
    }
  }

  const handleDisconnect = () => {
    obsClient.disconnect()
    onToast('Disconnected from OBS Studio', 'info')
  }

  const handleSelectScene = async (sceneName: string) => {
    try {
      const success = await obsClient.setCurrentProgramScene(sceneName)
      if (success) {
        onToast(`Switched OBS to scene: ${sceneName}`, 'info')
      }
    } catch {
      onToast('Failed to switch OBS scene', 'warning')
    }
  }

  const handleToggleRecord = async () => {
    try {
      const active = await obsClient.toggleRecord()
      setIsRecording(active)
      onToast(active ? 'OBS recording started' : 'OBS recording stopped', 'info')
    } catch {
      onToast('Failed to toggle OBS recording', 'warning')
    }
  }

  if (!isOpen) return null

  const isConnected = status === 'connected'

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
          maxWidth: 520,
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
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Radio size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#f3f4f6' }}>
                OBS Studio WebSocket Bridge
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
                Synchronize scenes, camera bookmarks & recording state with OBS Studio
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

        {/* Connection Status Bar */}
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: isConnected
              ? 'rgba(34, 197, 94, 0.1)'
              : status === 'connecting'
                ? 'rgba(234, 179, 8, 0.1)'
                : 'rgba(239, 68, 68, 0.08)',
            borderBottom: '1px solid #2d2d2d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Circle
              size={10}
              fill={isConnected ? '#22c55e' : status === 'connecting' ? '#eab308' : '#ef4444'}
              color={isConnected ? '#22c55e' : status === 'connecting' ? '#eab308' : '#ef4444'}
            />
            <span
              style={{
                color: isConnected ? '#22c55e' : status === 'connecting' ? '#eab308' : '#f87171',
                fontWeight: 500,
                textTransform: 'capitalize'
              }}
            >
              {status}
              {statusMessage ? ` — ${statusMessage}` : ''}
            </span>
          </div>

          {isConnected && (
            <span style={{ color: '#9ca3af', fontSize: 11 }}>
              {scenes.length} Scenes detected
            </span>
          )}
        </div>

        {/* Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 18
          }}
        >
          {/* Connection Settings */}
          {!isConnected ? (
            <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                  OBS WebSocket URL (v5)
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="ws://localhost:4455"
                  style={{
                    width: '100%',
                    backgroundColor: '#171717',
                    border: '1px solid #383838',
                    borderRadius: 6,
                    color: '#fff',
                    padding: '8px 12px',
                    fontSize: 13,
                    fontFamily: 'monospace',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                  Server Password (Optional)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty if authentication is disabled"
                  style={{
                    width: '100%',
                    backgroundColor: '#171717',
                    border: '1px solid #383838',
                    borderRadius: 6,
                    color: '#fff',
                    padding: '8px 12px',
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isBusy}
                style={{
                  marginTop: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  color: '#fff',
                  padding: '9px 16px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: isBusy ? 'wait' : 'pointer'
                }}
              >
                {isBusy ? <RefreshCw size={15} className="animate-spin" /> : <Radio size={15} />}
                Connect to OBS Studio
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Disconnect & Record Control Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#262626',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #383838'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={handleToggleRecord}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: isRecording ? '#dc2626' : '#22c55e',
                      border: 'none',
                      color: '#fff',
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {isRecording ? <VideoOff size={14} /> : <Video size={14} />}
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                  </button>
                  {isRecording && (
                    <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
                      ● REC ACTIVE
                    </span>
                  )}
                </div>

                <button
                  onClick={handleDisconnect}
                  style={{
                    backgroundColor: '#1f1f1f',
                    border: '1px solid #404040',
                    color: '#9ca3af',
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  Disconnect
                </button>
              </div>

              {/* Automation Toggles */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: '#262626',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #383838'
                }}
              >
                <input
                  type="checkbox"
                  id="autoSwitchScene"
                  checked={autoSwitchScene}
                  onChange={(e) => onToggleAutoSwitchScene(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label
                  htmlFor="autoSwitchScene"
                  style={{ fontSize: 13, color: '#f3f4f6', cursor: 'pointer' }}
                >
                  Auto-switch OBS scene on Camera Bookmark navigation
                </label>
              </div>

              {/* OBS Scenes List */}
              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#9ca3af',
                    marginBottom: 8
                  }}
                >
                  <Tv size={14} />
                  Available OBS Scenes (Click to Switch)
                </label>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    maxHeight: 180,
                    overflowY: 'auto',
                    backgroundColor: '#171717',
                    border: '1px solid #333',
                    borderRadius: 6,
                    padding: 4
                  }}
                >
                  {scenes.map((scene) => {
                    const isActive = scene.sceneName === currentScene
                    return (
                      <button
                        key={scene.sceneName}
                        onClick={() => handleSelectScene(scene.sceneName)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          backgroundColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                          border: 'none',
                          borderRadius: 4,
                          color: isActive ? '#60a5fa' : '#d1d5db',
                          fontSize: 13,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <span>{scene.sceneName}</span>
                        {isActive && <CheckCircle2 size={15} color="#60a5fa" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Configuration Hint */}
          <div
            style={{
              padding: 12,
              backgroundColor: '#171717',
              border: '1px solid #2d2d2d',
              borderRadius: 6,
              fontSize: 11,
              color: '#888',
              lineHeight: 1.5
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: '#aaa' }}>
              <AlertCircle size={13} />
              <strong>OBS Studio Setup Instructions:</strong>
            </div>
            1. In OBS Studio, navigate to <em>Tools → WebSocket Server Settings</em>.<br />
            2. Check <strong>Enable WebSocket server</strong> (Server Port <code>4455</code>).<br />
            3. If authentication is enabled, copy the password into the field above.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #2d2d2d',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#1a1a1a'
          }}
        >
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#262626',
              border: '1px solid #383838',
              color: '#e0e0e0',
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
