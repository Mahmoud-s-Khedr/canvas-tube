import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShortcutSettingsModal } from '../../src/renderer/src/components/shortcuts/ShortcutSettingsModal'
import { describe, expect, it, vi } from 'vitest'
import { isSafeIconSvg } from '../../src/core/icons/icon-safety'
import { loadShortcutPreferences, SHORTCUTS_STORAGE_KEY, type ShortcutCommand } from '../../src/renderer/src/shortcuts/shortcut-registry'

describe('stored shortcut and SVG boundaries', () => {
  it.each(['null', '[]', '{"version":1,"overrides":null}', '{"version":1,"overrides":{"bad":3,"a":{"key":3}}}'])('ignores malformed persisted preferences: %s', raw => {
    localStorage.setItem(SHORTCUTS_STORAGE_KEY, raw)
    expect(loadShortcutPreferences()).toEqual({ version: 1, overrides: {} })
  })
  it('reports conflicting command bindings', async () => {
    const commands: ShortcutCommand[] = ['a', 'b'].map(id => ({ id, label: id, category: 'CanvasTube', editable: true, defaultBinding: { key: 's', primary: true } }))
    const set = vi.fn()
    render(<ShortcutSettingsModal isOpen commands={commands} preferences={{ version: 1, overrides: {} }} onClose={() => {}} onSetBinding={set} onRestoreDefault={() => {}} onRestoreAllDefaults={() => {}} />)
    await userEvent.click(screen.getByRole('textbox', { name: 'a shortcut' }))
    await userEvent.keyboard('{Control>}s{/Control}')
    expect(screen.getByRole('alert')).toHaveTextContent('already assigned to b')
    expect(set).not.toHaveBeenCalled()
  })
  it.each(['<svg><script/></svg>', '<svg onload="evil()"></svg>', '<svg><image href="https://evil"/></svg>', '<svg><foreignObject/></svg>', '', '<svg>' + ' '.repeat(256 * 1024) + '</svg>'])('rejects unsafe or oversized SVG', svg => expect(isSafeIconSvg(svg)).toBe(false))
  it('accepts safe self-contained geometry', () => expect(isSafeIconSvg('<svg viewBox="0 0 1 1"><path d="M0 0L1 1"/></svg>')).toBe(true))
})
