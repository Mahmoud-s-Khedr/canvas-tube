const MAX_SVG_BYTES = 256 * 1024

// SVG is rendered both inline in the library and as an Excalidraw image. Keep
// the bundled-library trust boundary explicit: an icon must be self-contained
// vector markup with no active or remotely loaded content.
const DISALLOWED_SVG_CONTENT =
  /<(?:script|foreignObject|iframe|object|embed|audio|video|animate|set)\b|\bon[a-z]+\s*=|(?:href|xlink:href)\s*=\s*["']\s*(?:https?:|data:|javascript:|\/\/|file:)/i

export function isSafeIconSvg(svg: string): boolean {
  const trimmed = svg.trim()
  return (
    trimmed.length > 0 &&
    trimmed.length <= MAX_SVG_BYTES &&
    /^<svg\b[^>]*>/i.test(trimmed) &&
    /<\/svg>$/i.test(trimmed) &&
    !DISALLOWED_SVG_CONTENT.test(trimmed)
  )
}
