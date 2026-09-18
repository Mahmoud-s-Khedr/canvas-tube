import React, { useMemo, useState } from 'react'
import { RotateCcw, Search, Settings2, X } from 'lucide-react'
import {
  bindingFromEvent,
  bindingId,
  formatBinding,
  getActiveBinding,
  getActiveBindings,
  isReservedBinding,
  type ShortcutBinding,
  type ShortcutCommand,
  type ShortcutPreferences
} from '../../shortcuts/shortcut-registry'

interface ShortcutSettingsModalProps {
  isOpen: boolean
  commands: ShortcutCommand[]
  preferences: ShortcutPreferences
  onClose: () => void
  onSetBinding: (id: string, binding: ShortcutBinding | null) => void
  onRestoreDefault: (id: string) => void
  onRestoreAllDefaults: () => void
}

const categories = ['CanvasTube', 'Canvas Tools', 'Navigation / History', 'Presentation / Recording', 'Native Excalidraw'] as const

export const ShortcutSettingsModal: React.FC<ShortcutSettingsModalProps> = ({
  isOpen, commands, preferences, onClose, onSetBinding, onRestoreDefault, onRestoreAllDefaults
}) => {
  const [query, setQuery] = useState('')
  const [capturing, setCapturing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const matchingCommands = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return commands.filter((command) => !normalized || `${command.label} ${command.category}`.toLowerCase().includes(normalized))
  }, [commands, query])
  if (!isOpen) return null

  const captureBinding = (command: ShortcutCommand, event: React.KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.key === 'Escape') {
      setCapturing(null)
      return
    }
    const binding = bindingFromEvent(event.nativeEvent)
    if (['Control', 'Meta', 'Alt', 'Shift'].includes(binding.key)) return
    if (isReservedBinding(binding)) {
      setError(`${formatBinding(binding)} is reserved by the browser or operating system.`)
      return
    }
    const conflict = commands.find((candidate) => candidate.editable && candidate.id !== command.id &&
      getActiveBindings(candidate, preferences.overrides).some((activeBinding) => bindingId(activeBinding) === bindingId(binding)))
    if (conflict) {
      setError(`${formatBinding(binding)} is already assigned to ${conflict.label}.`)
      return
    }
    setError(null)
    setCapturing(null)
    onSetBinding(command.id, binding)
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Shortcut settings" style={backdropStyle} onMouseDown={onClose}>
      <section style={modalStyle} onMouseDown={(event) => event.stopPropagation()}>
        <header style={headerStyle}>
          <div><div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}><Settings2 size={18} /> Shortcut Settings</div><p style={subtleStyle}>Bindings are saved on this device and apply to every canvas.</p></div>
          <button type="button" onClick={onClose} style={iconButtonStyle} aria-label="Close shortcut settings"><X size={18} /></button>
        </header>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <label style={{ ...searchStyle, flex: 1 }}><Search size={15} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search commands" style={searchInputStyle} /></label>
          <button type="button" onClick={() => { setError(null); onRestoreAllDefaults() }} style={secondaryButtonStyle}><RotateCcw size={14} /> Restore all</button>
        </div>
        {error && <p role="alert" style={{ color: '#fca5a5', background: '#450a0a', borderRadius: 5, padding: '8px 10px', fontSize: 12, margin: '0 0 10px' }}>{error}</p>}
        <div style={{ overflowY: 'auto', maxHeight: '62vh', paddingRight: 4 }}>
          {categories.map((category) => {
            const entries = matchingCommands.filter((command) => command.category === category)
            if (!entries.length) return null
            return <div key={category} style={{ marginBottom: 16 }}><h3 style={categoryStyle}>{category}</h3>{entries.map((command) => {
              const binding = getActiveBinding(command, preferences.overrides)
              const disabled = preferences.overrides[command.id] === null
              return <div key={command.id} style={rowStyle}>
                <div><div style={{ fontSize: 13, fontWeight: 600 }}>{command.label}</div>{!command.editable && <div style={subtleStyle}>Native-only — unavailable through Excalidraw’s public API</div>}{command.defaultAliases?.length ? <div style={subtleStyle}>Also: {command.defaultAliases.map((alias) => formatBinding(alias)).join(', ')} while using defaults</div> : null}</div>
                {command.editable ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input aria-label={`${command.label} shortcut`} readOnly value={capturing === command.id ? 'Press shortcut…' : disabled ? 'Disabled' : binding ? formatBinding(binding) : 'Disabled'} onFocus={() => { setCapturing(command.id); setError(null) }} onKeyDown={(event) => captureBinding(command, event)} style={bindingInputStyle} />
                  <button type="button" onClick={() => { setCapturing(null); onSetBinding(command.id, null) }} style={smallButtonStyle}>Clear</button>
                  <button type="button" onClick={() => { setCapturing(null); onRestoreDefault(command.id) }} style={smallButtonStyle}>Default</button>
                </div> : <kbd style={kbdStyle}>{formatBinding(command.defaultBinding)}</kbd>}
              </div>
            })}</div>
          })}
        </div>
      </section>
    </div>
  )
}

const backdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.62)', display: 'grid', placeItems: 'center', padding: 20 }
const modalStyle: React.CSSProperties = { width: 'min(820px, 100%)', background: '#18181b', border: '1px solid #3f3f46', borderRadius: 10, color: '#f4f4f5', padding: 18, boxShadow: '0 24px 60px rgba(0,0,0,.65)', fontFamily: 'system-ui, sans-serif' }
const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 14 }
const subtleStyle: React.CSSProperties = { color: '#a1a1aa', fontSize: 11, margin: '4px 0 0' }
const iconButtonStyle: React.CSSProperties = { background: 'transparent', color: '#d4d4d8', border: 0, cursor: 'pointer', padding: 3 }
const searchStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, background: '#27272a', border: '1px solid #3f3f46', borderRadius: 6, padding: '0 8px', color: '#a1a1aa' }
const searchInputStyle: React.CSSProperties = { background: 'transparent', border: 0, color: '#f4f4f5', outline: 0, width: '100%', padding: '8px 0', fontSize: 13 }
const secondaryButtonStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: '#27272a', border: '1px solid #3f3f46', borderRadius: 6, color: '#e4e4e7', cursor: 'pointer', padding: '7px 9px', whiteSpace: 'nowrap', fontSize: 12 }
const categoryStyle: React.CSSProperties = { color: '#93c5fd', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 5px' }
const rowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #27272a' }
const bindingInputStyle: React.CSSProperties = { width: 128, background: '#09090b', border: '1px solid #52525b', borderRadius: 5, color: '#e4e4e7', textAlign: 'center', padding: '6px', fontSize: 12, cursor: 'pointer' }
const smallButtonStyle: React.CSSProperties = { background: 'transparent', border: '1px solid #3f3f46', borderRadius: 4, color: '#a1a1aa', cursor: 'pointer', padding: '5px 6px', fontSize: 11 }
const kbdStyle: React.CSSProperties = { background: '#27272a', border: '1px solid #52525b', borderRadius: 4, padding: '5px 7px', color: '#d4d4d8', fontSize: 11, whiteSpace: 'nowrap' }
