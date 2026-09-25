/// <reference types="vite/client" />

import iconCatalog from '../../../assets/icons/catalog.json'
import type { IconDefinition, IconProvider } from './icon-registry'
import { KNOWN_STENCILS } from './icon-metadata'
import { isSafeIconSvg } from './icon-safety'

interface CatalogEntry {
  file: string
  id?: string
  name: string
  provider: string
  category: string
  tags: string[]
}

const GENERATED_CATALOG = new Map<string, CatalogEntry>(
  (iconCatalog.icons as CatalogEntry[]).map((icon) => [icon.file, icon])
)

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
    // A provider can legitimately have the same icon name in multiple
    // categories (for example, a service icon and a resource icon). Include
    // its category in the runtime ID so every catalog entry stays selectable.
    const key = `${providerRaw}/${basename}`
    const generated = GENERATED_CATALOG.get(relParts.join('/'))

    const known = KNOWN_STENCILS[key]
    const fallbackCategory = relParts.length > 2 ? relParts[1] : 'general'

    const name =
      generated?.name ||
      known?.name ||
      basename
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')

    const category = generated?.category || known?.category || fallbackCategory
    const tags = [...new Set([
      ...(generated?.tags ?? []),
      ...(known?.tags ?? []),
      provider,
      category,
      ...basename.split('-').filter((term) => term.length > 1)
    ])]

    const idPrefix =
      provider === 'generic'
        ? 'gen'
        : provider === 'kubernetes'
          ? 'k8s'
          : provider

    const pathKey = relParts.slice(1, -1).join('-') || category
    // Generated packs may use a flat asset folder while retaining service
    // metadata in the catalog. Prefer its explicit ID so file reorganizations
    // never alter IDs stored in existing canvas documents.
    const id = generated?.id || `${idPrefix}-${pathKey}-${basename}`
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
