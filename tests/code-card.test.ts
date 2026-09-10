import { describe, it, expect } from 'vitest'
import { CodeCardGenerator } from '../src/core/code/code-card-generator'

describe('CodeCardGenerator', () => {
  it('generates an SVG code card with syntax highlighting', () => {
    const code = `
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
    `.trim()

    const result = CodeCardGenerator.generate({
      code,
      language: 'typescript',
      title: 'calculate.ts'
    })

    expect(result.svg).toContain('calculateTotal')
    expect(result.width).toBeGreaterThanOrEqual(380)
    expect(result.height).toBeGreaterThanOrEqual(80)
    expect(result.dataUrl.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true)
  })

  it('correctly escapes XML characters (<, >, &, ")', () => {
    const code = `const isGreater = a < b && b > c;\nconst tag = "<Component attr=\\"value\\" />"`
    const result = CodeCardGenerator.generate({
      code,
      language: 'typescript',
      title: 'escaping.tsx'
    })

    expect(result.svg).toContain('&lt;')
    expect(result.svg).toContain('&gt;')
    expect(result.svg).toContain('&amp;')
  })

  it('respects showLineNumbers flag', () => {
    const code = `console.log("hello");`
    const withLines = CodeCardGenerator.generate({
      code,
      language: 'javascript',
      showLineNumbers: true
    })
    expect(withLines.svg).toContain('class="line-num"')

    const withoutLines = CodeCardGenerator.generate({
      code,
      language: 'javascript',
      showLineNumbers: false
    })
    expect(withoutLines.svg).not.toContain('class="line-num"')
  })

  it('supports custom titles and window dots', () => {
    const result = CodeCardGenerator.generate({
      code: 'let x = 1;',
      language: 'javascript',
      title: 'index.js'
    })

    expect(result.svg).toContain('index.js')
    expect(result.svg).toContain('class="window-dot-red"')
    expect(result.svg).toContain('class="window-dot-yellow"')
    expect(result.svg).toContain('class="window-dot-green"')
  })

  it('handles multiple programming languages properly', () => {
    const pythonResult = CodeCardGenerator.generate({
      code: 'def add(a: int, b: int) -> int:\n    return a + b',
      language: 'python'
    })
    expect(pythonResult.svg).toContain('add')

    const sqlResult = CodeCardGenerator.generate({
      code: 'SELECT id, name FROM users WHERE active = true;',
      language: 'sql'
    })
    expect(sqlResult.svg).toContain('SELECT')
  })
})
