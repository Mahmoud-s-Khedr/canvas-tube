import Prism from 'prismjs'

// Import popular languages
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-docker'

export interface CodeCardOptions {
  code: string
  language?: string
  title?: string
  theme?: 'dark' | 'dracula' | 'github-dark'
  showLineNumbers?: boolean
  fontSize?: number
}

export interface GeneratedCodeCard {
  svg: string
  dataUrl: string
  width: number
  height: number
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const THEME_COLORS = {
  dark: {
    bg: '#18181b',
    headerBg: '#27272a',
    border: '#3f3f46',
    titleColor: '#e4e4e7',
    lineNumberColor: '#52525b',
    defaultText: '#f4f4f5',
    keyword: '#f43f5e',
    string: '#34d399',
    function: '#60a5fa',
    comment: '#71717a',
    number: '#fbbf24',
    operator: '#38bdf8',
    punctuation: '#a1a1aa',
    className: '#a78bfa'
  },
  dracula: {
    bg: '#282a36',
    headerBg: '#21222c',
    border: '#44475a',
    titleColor: '#f8f8f2',
    lineNumberColor: '#6272a4',
    defaultText: '#f8f8f2',
    keyword: '#ff79c6',
    string: '#f1fa8c',
    function: '#50fa7b',
    comment: '#6272a4',
    number: '#bd93f9',
    operator: '#ff79c6',
    punctuation: '#f8f8f2',
    className: '#8be9fd'
  },
  'github-dark': {
    bg: '#0d1117',
    headerBg: '#161b22',
    border: '#30363d',
    titleColor: '#c9d1d9',
    lineNumberColor: '#484f58',
    defaultText: '#c9d1d9',
    keyword: '#ff7b72',
    string: '#a5d6ff',
    function: '#d2a8ff',
    comment: '#8b949e',
    number: '#79c0ff',
    operator: '#ff7b72',
    punctuation: '#c9d1d9',
    className: '#ffa657'
  }
}

export class CodeCardGenerator {
  public static generate(options: CodeCardOptions): GeneratedCodeCard {
    const rawCode = options.code.trimEnd() || '// No code provided'
    const lang = (options.language || 'typescript').toLowerCase()
    const themeName = options.theme || 'dark'
    const colors = THEME_COLORS[themeName] || THEME_COLORS.dark
    const showLines = options.showLineNumbers !== false
    const fontSize = options.fontSize || 14
    const lineHeight = Math.round(fontSize * 1.6)
    const charWidth = fontSize * 0.6
    const title = options.title || (lang ? `snippet.${lang}` : 'snippet.txt')

    const grammar = Prism.languages[lang] || Prism.languages.javascript || Prism.languages.plain
    const tokens = grammar ? Prism.tokenize(rawCode, grammar) : [rawCode]

    // Normalize tokens into lines
    type StyledSpan = { text: string; color: string; italic?: boolean }
    const lines: StyledSpan[][] = [[]]

    const processToken = (token: string | Prism.Token, parentType?: string) => {
      if (typeof token === 'string') {
        const parts = token.split('\n')
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) lines.push([])
          if (parts[i].length > 0) {
            lines[lines.length - 1].push({
              text: parts[i],
              color: this.getColorForType(parentType, colors),
              italic: parentType === 'comment'
            })
          }
        }
      } else if (Array.isArray(token.content)) {
        for (const item of token.content) {
          processToken(item, token.type)
        }
      } else if (typeof token.content === 'string') {
        const parts = token.content.split('\n')
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) lines.push([])
          if (parts[i].length > 0) {
            lines[lines.length - 1].push({
              text: parts[i],
              color: this.getColorForType(token.type, colors),
              italic: token.type === 'comment'
            })
          }
        }
      } else {
        processToken(token.content, token.type)
      }
    }

    for (const tok of tokens) {
      processToken(tok)
    }

    const lineCount = lines.length
    const lineNumDigits = String(lineCount).length
    const gutterWidth = showLines ? (lineNumDigits + 2) * charWidth + 16 : 0
    const padding = 18
    const headerHeight = 36

    let maxLineChars = 0
    for (const line of lines) {
      const lineLen = line.reduce((acc, span) => acc + span.text.length, 0)
      if (lineLen > maxLineChars) maxLineChars = lineLen
    }

    const calculatedWidth = Math.max(
      380,
      Math.ceil(padding * 2 + gutterWidth + maxLineChars * charWidth + 30)
    )
    const calculatedHeight = Math.ceil(headerHeight + padding * 2 + lineCount * lineHeight)

    // Build SVG Elements
    const svgParts: string[] = []

    // SVG Root
    svgParts.push(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${calculatedWidth} ${calculatedHeight}" width="${calculatedWidth}" height="${calculatedHeight}">`
    )

    // Definitions (Font style)
    svgParts.push(`
      <defs>
        <style>
          .code-text {
            font-family: 'Cascadia Code', 'Fira Code', Consolas, Monaco, monospace;
            font-size: ${fontSize}px;
            font-feature-settings: 'liga' 1;
            white-space: pre;
          }
          .line-num {
            font-family: 'Cascadia Code', Consolas, monospace;
            font-size: ${fontSize - 1}px;
            fill: ${colors.lineNumberColor};
            text-anchor: end;
            user-select: none;
          }
        </style>
        <clipPath id="card-clip">
          <rect width="${calculatedWidth}" height="${calculatedHeight}" rx="10" ry="10" />
        </clipPath>
      </defs>
    `)

    // Background Card
    svgParts.push(
      `<g clip-path="url(#card-clip)">
        <rect width="${calculatedWidth}" height="${calculatedHeight}" fill="${colors.bg}" stroke="${colors.border}" stroke-width="2" />
        <!-- Header Bar -->
        <rect width="${calculatedWidth}" height="${headerHeight}" fill="${colors.headerBg}" />
        <line x1="0" y1="${headerHeight}" x2="${calculatedWidth}" y2="${headerHeight}" stroke="${colors.border}" stroke-width="1" />
        <!-- Window Dots -->
        <circle cx="18" cy="18" r="5" fill="#ff5f56" />
        <circle cx="34" cy="18" r="5" fill="#ffbd2e" />
        <circle cx="50" cy="18" r="5" fill="#27c93f" />
        <!-- Filename Title -->
        <text x="${calculatedWidth / 2}" y="22" fill="${colors.titleColor}" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" text-anchor="middle">${escapeXml(title)}</text>
      </g>`
    )

    // Code Body
    svgParts.push('<g class="code-text">')

    lines.forEach((lineSpans, idx) => {
      const lineY = headerHeight + padding + (idx + 1) * lineHeight - 4

      // Line Number
      if (showLines) {
        const lineNumX = padding + (lineNumDigits + 1) * charWidth
        svgParts.push(
          `<text x="${Math.round(lineNumX)}" y="${lineY}" class="line-num">${idx + 1}</text>`
        )
      }

      // Line Content Spans
      const codeStartX = padding + gutterWidth
      let currentX = codeStartX

      svgParts.push(`<text x="${Math.round(codeStartX)}" y="${lineY}">`)
      for (const span of lineSpans) {
        const escaped = escapeXml(span.text)
        const fontStyle = span.italic ? ' font-style="italic"' : ''
        svgParts.push(`<tspan fill="${span.color}"${fontStyle}>${escaped}</tspan>`)
        currentX += span.text.length * charWidth
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

  private static getColorForType(type: string | undefined, colors: typeof THEME_COLORS['dark']): string {
    if (!type) return colors.defaultText

    switch (type) {
      case 'keyword':
      case 'boolean':
        return colors.keyword
      case 'string':
      case 'template-string':
      case 'char':
        return colors.string
      case 'function':
        return colors.function
      case 'comment':
      case 'prolog':
      case 'doctype':
      case 'cdata':
        return colors.comment
      case 'number':
        return colors.number
      case 'operator':
      case 'regex':
      case 'variable':
        return colors.operator
      case 'punctuation':
        return colors.punctuation
      case 'class-name':
        return colors.className
      default:
        return colors.defaultText
    }
  }
}
