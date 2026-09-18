import {
  bindingFromEvent,
  bindingId,
  formatBinding,
  getActiveBindings,
  isReservedBinding,
  loadShortcutPreferences,
  saveShortcutPreferences,
  SHORTCUTS_STORAGE_KEY,
  createShortcutRegistry,
  type ShortcutActions,
  type ShortcutCommand
} from '../src/renderer/src/shortcuts/shortcut-registry'
import { dispatchShortcutEvent } from '../src/renderer/src/shortcuts/use-shortcut-dispatcher'
import { beforeEach, describe, expect, it } from 'vitest'

const storage = new Map<string, string>()

beforeEach(() => {
  storage.clear()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value)
    }
  })
})

const command: ShortcutCommand = {
  id: 'sample', label: 'Sample', category: 'CanvasTube', defaultBinding: { key: 's', primary: true }, editable: true
}

describe('shortcut registry bindings', () => {
  it('normalizes platform primary modifiers and formats their display', () => {
    const binding = bindingFromEvent({ key: 'S', ctrlKey: false, metaKey: true, altKey: false, shiftKey: true })
    expect(bindingId(binding)).toBe('primary+shift+s')
    expect(formatBinding(binding, 'MacIntel')).toBe('⌘⇧S')
    expect(formatBinding(binding, 'Linux x86_64')).toBe('Ctrl + Shift + S')
  })

  it('dispatches editable chords but skips text inputs and disabled mappings', () => {
    let calls = 0
    const executable: ShortcutCommand = { ...command, execute: () => { calls += 1 } }
    const event = (target: EventTarget | null = null) => ({
      key: 's', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, repeat: false, target,
      preventDefault: () => undefined, stopPropagation: () => undefined, stopImmediatePropagation: () => undefined
    } as unknown as KeyboardEvent)

    expect(dispatchShortcutEvent(event(), [executable], { version: 1, overrides: {} })).toBe(true)
    expect(calls).toBe(1)
    expect(dispatchShortcutEvent(event({ tagName: 'INPUT', isContentEditable: false, closest: () => null } as unknown as EventTarget), [executable], { version: 1, overrides: {} })).toBe(false)
    expect(dispatchShortcutEvent(event(), [executable], { version: 1, overrides: { sample: null } })).toBe(false)
  })

  it('only consumes Escape when CanvasTube actually dismisses something', () => {
    let dismissCalls = 0
    let canDismiss = false
    const dismiss: ShortcutCommand = {
      id: 'canvas.dismiss',
      label: 'Close active panel',
      category: 'Navigation / History',
      defaultBinding: { key: 'Escape' },
      editable: true,
      execute: () => {
        dismissCalls += 1
        return canDismiss
      }
    }
    const input = { tagName: 'INPUT', isContentEditable: false, closest: () => null } as unknown as EventTarget
    const event = (key: string, target: EventTarget | null = null) => ({
      key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, repeat: false, target,
      preventDefault: () => undefined, stopPropagation: () => undefined, stopImmediatePropagation: () => undefined
    } as unknown as KeyboardEvent)

    expect(dispatchShortcutEvent(event('Escape'), [dismiss], { version: 1, overrides: {} })).toBe(false)
    expect(dispatchShortcutEvent(event('Escape', input), [dismiss], { version: 1, overrides: {} })).toBe(false)
    expect(dismissCalls).toBe(2)

    canDismiss = true
    expect(dispatchShortcutEvent(event('Escape', input), [dismiss], { version: 1, overrides: {} })).toBe(true)
    expect(dispatchShortcutEvent(event('x', input), [dismiss], {
      version: 1,
      overrides: { 'canvas.dismiss': { key: 'x' } }
    })).toBe(false)
  })

  it('restores Alt+1 through Alt+9 bookmark jumps as shortcut commands', () => {
    let jumpedTo: number | null = null
    const commands = createShortcutRegistry({
      jumpToBookmark: (index) => { jumpedTo = index }
    } as ShortcutActions)
    const jumpToThird = commands.find((command) => command.id === 'presentation.jumpToBookmark3')
    const event = {
      key: '3', ctrlKey: false, metaKey: false, altKey: true, shiftKey: false, repeat: false, target: null,
      preventDefault: () => undefined, stopPropagation: () => undefined, stopImmediatePropagation: () => undefined
    } as unknown as KeyboardEvent

    expect(jumpToThird?.defaultBinding).toEqual({ key: '3', alt: true })
    expect(dispatchShortcutEvent(event, commands, { version: 1, overrides: {} })).toBe(true)
    expect(jumpedTo).toBe(2)
  })

  it('rejects browser and system-reserved combinations', () => {
    expect(isReservedBinding({ key: 'w', primary: true })).toBe(true)
    expect(isReservedBinding({ key: 'F5' })).toBe(true)
    expect(isReservedBinding({ key: 's', primary: true })).toBe(false)
  })

  it('clears a command and restores its default when no override exists', () => {
    expect(getActiveBindings(command, { sample: null })).toEqual([])
    expect(getActiveBindings(command, {})).toEqual([{ key: 's', primary: true }])
  })

  it('persists valid mappings and falls back for malformed or obsolete preferences', () => {
    saveShortcutPreferences({ version: 1, overrides: { sample: { key: 'x', alt: true } } })
    expect(loadShortcutPreferences().overrides.sample).toEqual({ key: 'x', primary: false, alt: true, shift: false })

    storage.set(SHORTCUTS_STORAGE_KEY, JSON.stringify({ version: 99, overrides: { sample: { key: 'x' } } }))
    expect(loadShortcutPreferences()).toEqual({ version: 1, overrides: {} })

    storage.set(SHORTCUTS_STORAGE_KEY, '{broken')
    expect(loadShortcutPreferences()).toEqual({ version: 1, overrides: {} })
  })
})
