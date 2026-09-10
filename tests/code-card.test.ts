import { describe, it, expect } from 'vitest'
import { CodeCardGenerator } from '../src/core/code/code-card-generator'

describe('CodeCardGenerator', () => {
  it('generates an SVG code card with default options', () => {
    const code = `function calculateTotal(items: Item[]): number {\n  return items.reduce((sum, item) => sum + item.price, 0)\n}`
    const result = CodeCardGenerator.generate({
      code,
      language: 'typescript',
      title: 'calculator.ts'
    })

    expect(result.svg).toContain('<svg')
    expect(result.svg).toContain('calculator.ts')
    expect(result.svg).toContain('calculateTotal')
    expect(result.width).toBeGreaterThanOrEqual(380)
    expect(result.height).toBeGreaterThanOrEqual(80)
    expect(result.dataUrl.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true)
  })

  it('correctly escapes XML characters (<, >, &, \")', () => {
    const code = `const isGreater = a < b && b > c;\nconst tag = "<Component attr=\\"value\\" />"`
    const result = CodeCardGenerator.generate({
      code,
      language: 'typescript',
      title: 'escaping.tsx'
    })

    expect(result.svg).not.toContain('a < b')
    expect(result.svg).toContain('&lt;')
    expect(result.svg).toContain('&gt;')
    expect(result.svg).toContain('&amp;&amp;')
  })

  it('supports multiple languages (Python, Go, Rust, SQL, Bash)', () => {
    const py = CodeCardGenerator.generate({
      code: 'def fetch_user(user_id: int) -> dict:\n    return {"id": user_id}',
      language: 'python',
      title: 'users.py'
    })
    expect(py.svg).toContain('fetch_user')

    const go = CodeCardGenerator.generate({
      code: 'func HandleOrder(w http.ResponseWriter, r *http.Request) {\n    fmt.Println("order")\n}',
      language: 'go',
      title: 'order.go'
    })
    expect(go.svg).toContain('HandleOrder')

    const rust = CodeCardGenerator.generate({
      code: 'pub async fn query_cache() -> Result<Data, Error> {\n    Ok(data)\n}',
      language: 'rust',
      title: 'cache.rs'
    })
    expect(rust.svg).toContain('query_cache')

    const sql = CodeCardGenerator.generate({
      code: 'SELECT id, username FROM users WHERE active = TRUE ORDER BY created_at DESC;',
      language: 'sql',
      title: 'query.sql'
    })
    expect(sql.svg).toContain('SELECT')

    const bash = CodeCardGenerator.generate({
      code: 'docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=secret postgres:16',
      language: 'bash',
      title: 'run.sh'
    })
    expect(bash.svg).toContain('docker')
    expect(bash.svg).toContain('run.sh')
    expect(bash.svg).toContain('POSTGRES_PASSWORD')
  })

  it('toggles line numbers and adapts dimensions', () => {
    const code = 'const a = 1\nconst b = 2\nconst c = 3'
    const withLines = CodeCardGenerator.generate({ code, showLineNumbers: true })
    const withoutLines = CodeCardGenerator.generate({ code, showLineNumbers: false })

    expect(withLines.svg).toContain('class="line-num"')
    expect(withoutLines.svg).not.toContain('class="line-num"')
  })

  it('supports different color themes', () => {
    const code = 'const hello = "world"'
    const dark = CodeCardGenerator.generate({ code, theme: 'dark' })
    const dracula = CodeCardGenerator.generate({ code, theme: 'dracula' })
    const gh = CodeCardGenerator.generate({ code, theme: 'github-dark' })

    expect(dark.svg).toContain('#18181b')
    expect(dracula.svg).toContain('#282a36')
    expect(gh.svg).toContain('#0d1117')
  })
})
