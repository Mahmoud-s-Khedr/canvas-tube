import type { CanvasToolType } from '@core/canvas/canvas-adapter'

export type ShortcutCategory =
  | 'CanvasTube'
  | 'Canvas Tools'
  | 'Navigation / History'
  | 'Presentation / Recording'
  | 'Native Excalidraw'

export interface ShortcutBinding {
  key: string
  primary?: boolean
  alt?: boolean
  shift?: boolean
}

export interface ShortcutCommand {
  id: string
  label: string
  category: ShortcutCategory
  defaultBinding: ShortcutBinding
  /** Additional defaults are retained until the user changes the main binding. */
  defaultAliases?: ShortcutBinding[]
  editable: boolean
  execute?: () => boolean | void
}

export interface ShortcutPreferences {
  version: 1
  overrides: Record<string, ShortcutBinding | null>
}

export const SHORTCUTS_STORAGE_KEY = 'canvastube_shortcut_preferences'
export const SHORTCUTS_PREFERENCES_VERSION = 1 as const

const keyNames: Record<string, string> = {
  ' ': 'Space',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  Escape: 'Esc',
  PageDown: 'Page Down',
  PageUp: 'Page Up'
}

export const normalizeKey = (key: string): string => {
  if (key === ' ') return ' '
  if (key.length === 1) return key.toLowerCase()
  return key
}

export const normalizeBinding = (binding: ShortcutBinding): ShortcutBinding => ({
  key: normalizeKey(binding.key),
  primary: Boolean(binding.primary),
  alt: Boolean(binding.alt),
  shift: Boolean(binding.shift)
})

export const bindingId = (binding: ShortcutBinding): string => {
  const normalized = normalizeBinding(binding)
  return [
    normalized.primary ? 'primary' : '',
    normalized.alt ? 'alt' : '',
    normalized.shift ? 'shift' : '',
    normalized.key
  ].filter(Boolean).join('+')
}

export const bindingFromEvent = (event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>): ShortcutBinding => ({
  key: normalizeKey(event.key),
  primary: event.ctrlKey || event.metaKey,
  alt: event.altKey,
  shift: event.shiftKey
})

export const bindingMatchesEvent = (binding: ShortcutBinding, event: KeyboardEvent): boolean =>
  bindingId(binding) === bindingId(bindingFromEvent(event))

export const formatBinding = (binding: ShortcutBinding, platform = typeof navigator === 'undefined' ? '' : navigator.platform): string => {
  const normalized = normalizeBinding(binding)
  const isMac = /Mac|iPhone|iPad|iPod/i.test(platform)
  return [
    normalized.primary ? (isMac ? '⌘' : 'Ctrl') : '',
    normalized.alt ? (isMac ? '⌥' : 'Alt') : '',
    normalized.shift ? (isMac ? '⇧' : 'Shift') : '',
    keyNames[normalized.key] || (normalized.key.length === 1 ? normalized.key.toUpperCase() : normalized.key)
  ].filter(Boolean).join(isMac ? '' : ' + ')
}

export const isReservedBinding = (binding: ShortcutBinding): boolean => {
  const normalized = normalizeBinding(binding)
  // Browser/window controls must remain available even when CanvasTube is used in Electron.
  if (normalized.primary && ['w', 'q', 't', 'l', 'r'].includes(normalized.key)) return true
  if (normalized.alt && normalized.key === 'F4') return true
  return normalized.key === 'F5' || normalized.key === 'F11'
}

export const isTypingTarget = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null
  return Boolean(element && (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'SELECT' ||
    element.isContentEditable ||
    (typeof element.closest === 'function' && element.closest('[contenteditable="true"], .excalidraw-textEditorContainer'))
  ))
}

export const loadShortcutPreferences = (): ShortcutPreferences => {
  try {
    const raw = localStorage.getItem(SHORTCUTS_STORAGE_KEY)
    if (!raw) return { version: SHORTCUTS_PREFERENCES_VERSION, overrides: {} }
    const parsed = JSON.parse(raw) as Partial<ShortcutPreferences>
    if (parsed.version !== SHORTCUTS_PREFERENCES_VERSION || !parsed.overrides || typeof parsed.overrides !== 'object') {
      return { version: SHORTCUTS_PREFERENCES_VERSION, overrides: {} }
    }
    const overrides: Record<string, ShortcutBinding | null> = {}
    for (const [id, binding] of Object.entries(parsed.overrides)) {
      if (binding === null) overrides[id] = null
      else if (typeof binding === 'object' && typeof binding.key === 'string') overrides[id] = normalizeBinding(binding)
    }
    return { version: SHORTCUTS_PREFERENCES_VERSION, overrides }
  } catch {
    return { version: SHORTCUTS_PREFERENCES_VERSION, overrides: {} }
  }
}

export const saveShortcutPreferences = (preferences: ShortcutPreferences): void => {
  try {
    localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // Shortcut remapping should remain usable for this session if storage is unavailable.
  }
}

export const getActiveBindings = (
  command: ShortcutCommand,
  overrides: ShortcutPreferences['overrides']
): ShortcutBinding[] => {
  const override = overrides[command.id]
  if (override === null) return []
  if (override) return [override]
  return [command.defaultBinding, ...(command.defaultAliases || [])]
}

export const getActiveBinding = (
  command: ShortcutCommand,
  overrides: ShortcutPreferences['overrides']
): ShortcutBinding | null => getActiveBindings(command, overrides)[0] || null

export interface ShortcutActions {
  newProject: () => void
  openProject: () => void
  saveProject: () => void
  saveProjectAs: () => void
  exportProject: () => void
  quickCopy: () => void
  setTool: (tool: CanvasToolType) => void
  importImage: () => void
  undo: () => void
  redo: () => void
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  toggleSidebar: () => void
  toggleDocumentDock: () => void
  toggleBookmarks: () => void
  addBookmark: () => void
  jumpToBookmark: (index: number) => void
  nextBookmark: () => void
  previousBookmark: () => void
  toggleRecordingMode: () => void
  addChapter: () => void
  toggleInspector: () => void
  /** Returns true only when CanvasTube closed a panel or exited recording mode. */
  dismiss: () => boolean
}

const tool = (id: string, label: string, defaultBinding: ShortcutBinding, value: CanvasToolType, actions: ShortcutActions): ShortcutCommand => ({
  id, label, category: 'Canvas Tools', defaultBinding, editable: true, execute: () => actions.setTool(value)
})

export const createShortcutRegistry = (actions: ShortcutActions): ShortcutCommand[] => [
  { id: 'project.new', label: 'New canvas', category: 'CanvasTube', defaultBinding: { key: 'n', primary: true }, editable: true, execute: actions.newProject },
  { id: 'project.open', label: 'Open canvas', category: 'CanvasTube', defaultBinding: { key: 'o', primary: true }, editable: true, execute: actions.openProject },
  { id: 'project.save', label: 'Save canvas', category: 'CanvasTube', defaultBinding: { key: 's', primary: true }, editable: true, execute: actions.saveProject },
  { id: 'project.saveAs', label: 'Save canvas as', category: 'CanvasTube', defaultBinding: { key: 's', primary: true, shift: true }, editable: true, execute: actions.saveProjectAs },
  { id: 'project.export', label: 'Open export', category: 'CanvasTube', defaultBinding: { key: 'e', primary: true, shift: true }, editable: true, execute: actions.exportProject },
  { id: 'project.quickCopy', label: 'Quick copy canvas', category: 'CanvasTube', defaultBinding: { key: 'c', primary: true, shift: true }, editable: true, execute: actions.quickCopy },
  tool('tool.select', 'Select', { key: 'v' }, 'selection', actions),
  tool('tool.rectangle', 'Rectangle', { key: 'r' }, 'rectangle', actions),
  tool('tool.diamond', 'Diamond', { key: 'd' }, 'diamond', actions),
  tool('tool.ellipse', 'Ellipse', { key: 'o' }, 'ellipse', actions),
  tool('tool.arrow', 'Arrow', { key: 'a' }, 'arrow', actions),
  tool('tool.line', 'Line', { key: 'l' }, 'line', actions),
  tool('tool.ink', 'Ink', { key: 'p' }, 'freedraw', actions),
  tool('tool.text', 'Text', { key: 't' }, 'text', actions),
  { id: 'tool.image', label: 'Import image', category: 'Canvas Tools', defaultBinding: { key: 'i', primary: true, shift: true }, editable: true, execute: actions.importImage },
  tool('tool.eraser', 'Eraser', { key: 'e' }, 'eraser', actions),
  tool('tool.laser', 'Laser pointer', { key: 'k' }, 'laser', actions),
  { id: 'canvas.undo', label: 'Undo', category: 'Navigation / History', defaultBinding: { key: 'z', primary: true }, editable: true, execute: actions.undo },
  { id: 'canvas.redo', label: 'Redo', category: 'Navigation / History', defaultBinding: { key: 'y', primary: true }, defaultAliases: [{ key: 'z', primary: true, shift: true }], editable: true, execute: actions.redo },
  { id: 'canvas.zoomIn', label: 'Zoom in', category: 'Navigation / History', defaultBinding: { key: '+', shift: true }, defaultAliases: [{ key: '=' }], editable: true, execute: actions.zoomIn },
  { id: 'canvas.zoomOut', label: 'Zoom out', category: 'Navigation / History', defaultBinding: { key: '-' }, editable: true, execute: actions.zoomOut },
  { id: 'canvas.resetView', label: 'Reset canvas view', category: 'Navigation / History', defaultBinding: { key: '0', primary: true }, editable: true, execute: actions.resetView },
  { id: 'canvas.sidebar', label: 'Toggle library sidebar', category: 'Navigation / History', defaultBinding: { key: 'b', primary: true, shift: true }, editable: true, execute: actions.toggleSidebar },
  { id: 'canvas.documentDock', label: 'Toggle document dock', category: 'Navigation / History', defaultBinding: { key: 'g', primary: true, shift: true }, editable: true, execute: actions.toggleDocumentDock },
  { id: 'canvas.bookmarks', label: 'Toggle bookmarks', category: 'Navigation / History', defaultBinding: { key: 'm', primary: true, shift: true }, editable: true, execute: actions.toggleBookmarks },
  { id: 'presentation.bookmark', label: 'Create bookmark', category: 'Presentation / Recording', defaultBinding: { key: 'b', primary: true }, editable: true, execute: actions.addBookmark },
  ...Array.from({ length: 9 }, (_, index): ShortcutCommand => ({
    id: `presentation.jumpToBookmark${index + 1}`,
    label: `Jump to bookmark ${index + 1}`,
    category: 'Presentation / Recording',
    defaultBinding: { key: String(index + 1), alt: true },
    editable: true,
    execute: () => actions.jumpToBookmark(index)
  })),
  { id: 'presentation.nextBookmark', label: 'Next bookmark', category: 'Presentation / Recording', defaultBinding: { key: 'PageDown' }, defaultAliases: [{ key: 'ArrowRight', alt: true }], editable: true, execute: actions.nextBookmark },
  { id: 'presentation.previousBookmark', label: 'Previous bookmark', category: 'Presentation / Recording', defaultBinding: { key: 'PageUp' }, defaultAliases: [{ key: 'ArrowLeft', alt: true }], editable: true, execute: actions.previousBookmark },
  { id: 'presentation.recordingMode', label: 'Toggle recording mode', category: 'Presentation / Recording', defaultBinding: { key: 'F10' }, defaultAliases: [{ key: 'r', primary: true, shift: true }], editable: true, execute: actions.toggleRecordingMode },
  { id: 'presentation.chapter', label: 'Add chapter marker', category: 'Presentation / Recording', defaultBinding: { key: 'c', alt: true }, editable: true, execute: actions.addChapter },
  { id: 'presentation.inspector', label: 'Toggle stylus inspector', category: 'Presentation / Recording', defaultBinding: { key: 'i', primary: true, shift: true }, editable: true, execute: actions.toggleInspector },
  { id: 'canvas.dismiss', label: 'Close active panel', category: 'Navigation / History', defaultBinding: { key: 'Escape' }, editable: true, execute: actions.dismiss },
  { id: 'native.selectAll', label: 'Select all elements', category: 'Native Excalidraw', defaultBinding: { key: 'a', primary: true }, editable: false },
  { id: 'native.duplicate', label: 'Duplicate selection', category: 'Native Excalidraw', defaultBinding: { key: 'd', primary: true }, editable: false },
  { id: 'native.delete', label: 'Delete selection', category: 'Native Excalidraw', defaultBinding: { key: 'Delete' }, defaultAliases: [{ key: 'Backspace' }], editable: false },
  { id: 'native.pan', label: 'Pan canvas', category: 'Native Excalidraw', defaultBinding: { key: ' ' }, editable: false },
  { id: 'native.tool1', label: 'Select tool (number-row alias)', category: 'Native Excalidraw', defaultBinding: { key: '1' }, editable: false },
  { id: 'native.tool2', label: 'Rectangle tool (number-row alias)', category: 'Native Excalidraw', defaultBinding: { key: '2' }, editable: false },
  { id: 'native.tool3', label: 'Diamond tool (number-row alias)', category: 'Native Excalidraw', defaultBinding: { key: '3' }, editable: false },
  { id: 'native.tool4', label: 'Ellipse tool (number-row alias)', category: 'Native Excalidraw', defaultBinding: { key: '4' }, editable: false },
  { id: 'native.tool5', label: 'Arrow tool (number-row alias)', category: 'Native Excalidraw', defaultBinding: { key: '5' }, editable: false },
  { id: 'native.tool6', label: 'Line tool (number-row alias)', category: 'Native Excalidraw', defaultBinding: { key: '6' }, editable: false },
  { id: 'native.tool7', label: 'Draw tool (number-row alias)', category: 'Native Excalidraw', defaultBinding: { key: '7' }, editable: false },
  { id: 'native.tool8', label: 'Text tool (number-row alias)', category: 'Native Excalidraw', defaultBinding: { key: '8' }, editable: false },
  { id: 'native.tool9', label: 'Image tool (number-row alias)', category: 'Native Excalidraw', defaultBinding: { key: '9' }, editable: false },
  { id: 'native.tool0', label: 'Eraser tool (number-row alias)', category: 'Native Excalidraw', defaultBinding: { key: '0' }, editable: false }
]
