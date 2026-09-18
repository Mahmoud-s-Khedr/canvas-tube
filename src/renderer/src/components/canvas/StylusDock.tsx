import React from 'react'
import { Eraser, Hand, PenLine, ShieldCheck, Tablet } from 'lucide-react'
import type { CanvasToolType } from '@core/canvas/canvas-adapter'
import type { StylusPreferences } from '@core/canvas/stylus-controls'

interface StylusDockProps {
  preferences: StylusPreferences
  activeTool: CanvasToolType
  lastInput: { pointerType: string; pressure: number } | null
  onUpdatePreferences: (update: Partial<StylusPreferences>) => void
  onSetTool: (tool: CanvasToolType) => void
  shortcutLabel?: (id: string) => string | undefined
}

const toolButtonStyle = (selected: boolean): React.CSSProperties => ({
  alignItems: 'center',
  background: selected ? '#164e63' : '#27272a',
  border: `1px solid ${selected ? '#22d3ee' : '#3f3f46'}`,
  borderRadius: 6,
  color: selected ? '#cffafe' : '#d4d4d8',
  cursor: 'pointer',
  display: 'flex',
  gap: 5,
  fontSize: 11,
  fontWeight: 650,
  minHeight: 30,
  padding: '0 8px'
})

export const StylusDock: React.FC<StylusDockProps> = ({
  preferences,
  activeTool,
  lastInput,
  onUpdatePreferences,
  onSetTool,
  shortcutLabel
}) => {
  const penActive = lastInput?.pointerType === 'pen'
  const pressure = Math.round((lastInput?.pressure ?? 0) * 100)

  return (
    <aside
      aria-label="Tablet controls"
      className="canvastube-stylus-dock"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="canvastube-stylus-dock__heading">
        <Tablet size={16} />
        <span>Tablet</span>
        <span className={`canvastube-stylus-dock__status ${penActive ? 'is-pen' : ''}`}>
          {penActive ? `PEN · ${pressure}%` : 'READY'}
        </span>
      </div>

      <div className="canvastube-stylus-dock__tools" role="group" aria-label="Pen tool">
        <button
          type="button"
          style={toolButtonStyle(activeTool === 'freedraw')}
          onClick={() => onSetTool('freedraw')}
          title={`Ink${shortcutLabel?.('tool.ink') ? ` (${shortcutLabel('tool.ink')})` : ''}`}
        >
          <PenLine size={14} /> Ink
        </button>
        <button
          type="button"
          style={toolButtonStyle(activeTool === 'eraser')}
          onClick={() => onSetTool('eraser')}
          title={`Eraser${shortcutLabel?.('tool.eraser') ? ` (${shortcutLabel('tool.eraser')})` : ''}`}
        >
          <Eraser size={14} /> Erase
        </button>
        <button
          type="button"
          style={toolButtonStyle(activeTool === 'selection')}
          onClick={() => onSetTool('selection')}
          title={`Select${shortcutLabel?.('tool.select') ? ` (${shortcutLabel('tool.select')})` : ''}`}
        >
          <Hand size={14} /> Select
        </button>
      </div>

      <label className="canvastube-stylus-dock__toggle" title="The pen selects freehand ink on contact">
        <input
          type="checkbox"
          checked={preferences.penDefaultsToDraw}
          onChange={(event) => onUpdatePreferences({ penDefaultsToDraw: event.target.checked })}
        />
        Pen draws by default
      </label>
      <label className="canvastube-stylus-dock__toggle" title="Ignore touch events while the pen is active">
        <input
          type="checkbox"
          checked={preferences.palmRejection}
          onChange={(event) => onUpdatePreferences({ palmRejection: event.target.checked })}
        />
        <ShieldCheck size={13} /> Palm lock
      </label>
      <label className="canvastube-stylus-dock__toggle" title="Use a pen barrel switch as a momentary eraser">
        <input
          type="checkbox"
          checked={preferences.barrelButtonEraser}
          onChange={(event) => onUpdatePreferences({ barrelButtonEraser: event.target.checked })}
        />
        Barrel button erases
      </label>
      <div className="canvastube-stylus-dock__shortcuts" aria-label="Tablet express-key shortcuts">
        <span>Keys:</span> <kbd>{shortcutLabel?.('tool.select') || 'V'}</kbd> select <kbd>{shortcutLabel?.('tool.ink') || 'P'}</kbd> ink <kbd>{shortcutLabel?.('tool.eraser') || 'E'}</kbd> erase
      </div>
    </aside>
  )
}
