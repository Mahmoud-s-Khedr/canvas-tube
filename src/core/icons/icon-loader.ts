/// <reference types="vite/client" />

import type { IconDefinition, IconProvider } from './icon-registry'
import { KNOWN_STENCILS } from './icon-metadata'
import { isSafeIconSvg } from './icon-safety'

export function loadSvgIcons(): Record<string, string> {
  return import.meta.glob('../../../assets/icons/**/*.svg', {
    query: '?raw',
    import: 'default',
    eager: true
  })
}

export function loadAllIcons(): IconDefinition[] {
  const modules = loadSvgIcons()
  const definitions: IconDefinition[] = []

  for (const [filePath, svgContent] of Object.entries(modules)) {
    if (!isSafeIconSvg(svgContent as string)) {
      throw new Error(`Unsafe icon SVG bundled from ${filePath}`)
    }
    const parts = filePath.replace(/\\/g, '/').split('/')
    const iconsIdx = parts.lastIndexOf('icons')
    if (iconsIdx === -1) continue

    const relParts = parts.slice(iconsIdx + 1)
    if (relParts.length < 2) continue

    const providerRaw = relParts[0].toLowerCase()
    const provider: IconProvider =
      providerRaw === 'aws' ||
      providerRaw === 'gcp' ||
      providerRaw === 'azure' ||
      providerRaw === 'kubernetes'
        ? providerRaw
        : 'generic'

    const filename = relParts[relParts.length - 1]
    const basename = filename.replace(/\.svg$/i, '')
    const key = `${providerRaw}/${basename}`

    const known = KNOWN_STENCILS[key]
    const fallbackCategory = relParts.length > 2 ? relParts[1] : 'general'

    const name =
      known?.name ||
      basename
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')

    const category = known?.category || fallbackCategory
    const tags = known?.tags || [
      provider,
      category,
      ...basename.split('-').filter((t) => t.length > 1)
    ]

    const idPrefix =
      provider === 'generic'
        ? 'gen'
        : provider === 'kubernetes'
          ? 'k8s'
          : provider

    const id = `${idPrefix}-${basename}`
    if (definitions.some((icon) => icon.id === id)) {
      throw new Error(`Duplicate icon id: ${id}`)
    }

    definitions.push({
      id,
      name,
      provider,
      category,
      tags,
      svgContent: (svgContent as string).trim()
    })
  }

  return definitions
}
