import { useEffect } from 'react'
import {
  bindingMatchesEvent,
  getActiveBindings,
  isTypingTarget,
  type ShortcutCommand,
  type ShortcutPreferences
} from './shortcut-registry'

/** Routes one browser event and returns whether CanvasTube consumed it. Exported for unit tests. */
export const dispatchShortcutEvent = (
  event: KeyboardEvent,
  commands: ShortcutCommand[],
  preferences: ShortcutPreferences
): boolean => {
  if (event.repeat) return false
  const command = commands.find((candidate) =>
    candidate.editable && getActiveBindings(candidate, preferences.overrides)
      .some((binding) => bindingMatchesEvent(binding, event))
  )
  if (!command?.execute) return false

  // Only an actual Escape press may dismiss CanvasTube while an input has focus.
  // A remapped dismissal key must remain available for typing, as must Escape
  // when there is no CanvasTube panel to close.
  const isDismiss = command.id === 'canvas.dismiss'
  if (isTypingTarget(event.target) && !(isDismiss && event.key === 'Escape')) return false

  // Do this before consuming Escape. Returning false lets Excalidraw receive
  // the event for native cancellation, deselection, and text editing behavior.
  if (isDismiss && command.execute() !== true) return false

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
  if (!isDismiss) command.execute()
  return true
}

/** Installs the single capture-phase keyboard route for CanvasTube commands. */
export const useShortcutDispatcher = (
  commands: ShortcutCommand[],
  preferences: ShortcutPreferences
): void => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Adapter undo/redo forwards an untrusted event to Excalidraw itself.
      // Do not route that second event back through CanvasTube.
      if (!event.isTrusted) return
      dispatchShortcutEvent(event, commands, preferences)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [commands, preferences])
}
