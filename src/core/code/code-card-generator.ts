import Prism from 'prismjs'

// Import standard languages for syntax highlighting
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-bash'

export interface CodeCardOptions {
  code: string
  language: string
  title?: string
  theme?: string
  fontSize?: number
  showLineNumbers?: boolean
}

export interface CodeCardResult {
  svg: string
  dataUrl: string
  width: number
  height: number
}

interface HighlightSpan {
  text: string
  color: string
  italic?: boolean
}

// VS Code Dark+ theme color palette
const THEME = {
  background: '#1e1e1e',
  headerBg: '#252526',
  border: '#3c3c3c',
  titleColor: '#cccccc',
  lineNumColor: '#858585',
  defaultText: '#d4d4d4',
  comment: '#6a9955',
  string: '#ce9178',
  number: '#b5cea8',
  keyword: '#569cd6',
  boolean: '#569cd6',
  function: '#dcdcaa',
  operator: '#d4d4d4',
  punctuation: '#d4d4d4',
  tag: '#569cd6',
  attrName: '#9cdcfe',
  attrValue: '#ce9178',
  className: '#4ec9b0',
  property: '#9cdcfe',
  variable: '#9cdcfe',
  type: '#4ec9b0'
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export class CodeCardGenerator {
  public static generate(options: CodeCardOptions): CodeCardResult {
    const {
      code,
      language = 'typescript',
      title = '',
      fontSize = 14,
      showLineNumbers = true
    } = options

    const lines = code.split(/\r?\n/)
    const grammar = Prism.languages[language] || Prism.languages.javascript || Prism.languages.clike

    const tokens = Prism.tokenize(code, grammar)

    // Layout constants
    const charWidth = fontSize * 0.605 // monospace character width approx
    const lineHeight = Math.round(fontSize * 1.5)
    const headerHeight = title ? 36 : 16
    const padding = 20

    // Measure line numbers gutter width
    const lineNumDigits = String(lines.length).length
    const gutterWidth = showLineNumbers ? (lineNumDigits + 2) * charWidth : 0

    // Compute max line length to size container
    let maxLineChars = 0
    for (const line of lines) {
      if (line.length > maxLineChars) {
        maxLineChars = line.length
      }
    }

    const calculatedWidth = Math.max(
      340,
      Math.round(padding * 2 + gutterWidth + maxLineChars * charWidth + 24)
    )
    const calculatedHeight = Math.max(
      80,
      headerHeight + lines.length * lineHeight + padding * 2
    )

    const svgParts: string[] = []

    // SVG Root with crisp monospace font definitions
    svgParts.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${calculatedWidth}" height="${calculatedHeight}" viewBox="0 0 ${calculatedWidth} ${calculatedHeight}">`
    )

    svgParts.push(`
      <style>
        .code-card-bg { fill: ${THEME.background}; rx: 8px; stroke: ${THEME.border}; stroke-width: 1.5px; }
        .code-header-bg { fill: ${THEME.headerBg}; rx: 8px; }
        .code-header-clip { clip-path: url(#header-clip); }
        .window-dot-red { fill: #ff5f56; }
        .window-dot-yellow { fill: #ffbd2e; }
        .window-dot-green { fill: #27c93f; }
        .code-title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; fill: ${THEME.titleColor}; font-weight: 500; }
        .code-text { font-family: "JetBrains Mono", "Fira Code", "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace; font-size: ${fontSize}px; }
        .line-num { fill: ${THEME.lineNumColor}; text-anchor: end; user-select: none; }
      </style>
    `)

    // Background container
    svgParts.push(
      `<rect width="${calculatedWidth}" height="${calculatedHeight}" class="code-card-bg" />`
    )

    // Header bar (Window Dots & Optional File Tab)
    if (title || headerHeight > 16) {
      svgParts.push(
        `<rect width="${calculatedWidth}" height="32" rx="8" class="code-header-bg" />`
      )
      // Dots
      svgParts.push(`
        <circle cx="18" cy="16" r="4.5" class="window-dot-red" />
        <circle cx="32" cy="16" r="4.5" class="window-dot-yellow" />
        <circle cx="46" cy="16" r="4.5" class="window-dot-green" />
      `)

      if (title) {
        svgParts.push(
          `<text x="${calculatedWidth / 2}" y="19" class="code-title" text-anchor="middle">${escapeXml(
            title
          )}</text>`
        )
      }

      // Separator line
      svgParts.push(
        `<line x1="0" y1="32" x2="${calculatedWidth}" y2="32" stroke="${THEME.border}" stroke-width="1" />`
      )
    }

    // Code lines rendering
    svgParts.push(`<g class="code-text" xml:space="preserve">`)

    lines.forEach((_, idx) => {
      const lineY = headerHeight + padding + idx * lineHeight + Math.round(fontSize * 0.8)
      const lineSpans = this.getSpansForLine(tokens, idx)

      // Line numbers
      if (showLineNumbers) {
        const lineNumX = padding + (lineNumDigits + 1) * charWidth
        svgParts.push(
          `<text x="${Math.round(lineNumX)}" y="${lineY}" class="line-num">${idx + 1}</text>`
        )
      }

      // Line Content Spans
      const codeStartX = padding + gutterWidth

      svgParts.push(`<text x="${Math.round(codeStartX)}" y="${lineY}">`)
      for (const span of lineSpans) {
        const escaped = escapeXml(span.text)
        const fontStyle = span.italic ? ' font-style="italic"' : ''
        svgParts.push(`<tspan fill="${span.color}"${fontStyle}>${escaped}</tspan>`)
      }
      svgParts.push('</text>')
    })

    svgParts.push('</g>')
    svgParts.push('</svg>')

    const svg = svgParts.join('\n')
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

    return {
      svg,
      dataUrl,
      width: calculatedWidth,
      height: calculatedHeight
    }
  }

  private static getSpansForLine(
    tokens: (string | Prism.Token)[],
    targetLineIndex: number
  ): HighlightSpan[] {
    let currentLine = 0
    const spans: HighlightSpan[] = []

    const processToken = (tok: string | Prism.Token) => {
      const type = typeof tok === 'string' ? 'text' : tok.type
      const content = typeof tok === 'string' ? tok : tok.content
      const color = this.getTokenColor(type)
      const italic = type === 'comment'

      if (typeof content === 'string') {
        const parts = content.split('\n')
        parts.forEach((part, idx) => {
          if (idx > 0) currentLine++
          if (currentLine === targetLineIndex && part.length > 0) {
            spans.push({ text: part, color, italic })
          }
        })
      } else if (Array.isArray(content)) {
        for (const sub of content) {
          processToken(sub)
        }
      }
    }

    for (const tok of tokens) {
      processToken(tok)
    }

    return spans
  }

  private static getTokenColor(tokenType: string): string {
    switch (tokenType) {
      case 'comment':
        return THEME.comment
      case 'string':
        return THEME.string
      case 'number':
        return THEME.number
      case 'keyword':
        return THEME.keyword
      case 'boolean':
        return THEME.boolean
      case 'function':
        return THEME.function
      case 'class-name':
        return THEME.className
      case 'tag':
        return THEME.tag
      case 'attr-name':
        return THEME.attrName
      case 'attr-value':
        return THEME.attrValue
      case 'property':
        return THEME.property
      case 'variable':
        return THEME.variable
      default:
        return THEME.defaultText
    }
  }
}
