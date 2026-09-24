import { loadAllIcons } from './icon-loader'
import { isSafeIconSvg } from './icon-safety'

export type IconProvider = 'generic' | 'aws' | 'gcp' | 'azure' | 'kubernetes'

export interface IconDefinition {
  id: string
  name: string
  provider: IconProvider
  category: string
  tags: string[]
  svgContent: string
}

export const INITIAL_ICON_DEFINITIONS: IconDefinition[] = loadAllIcons()

export class IconRegistry {
  private icons = new Map<string, IconDefinition>()

  constructor(initialList: IconDefinition[] = INITIAL_ICON_DEFINITIONS) {
    for (const icon of initialList) {
      this.icons.set(icon.id, icon)
    }
  }

  public register(icon: IconDefinition): void {
    if (!isSafeIconSvg(icon.svgContent)) {
      throw new Error(`Refusing unsafe SVG icon: ${icon.id}`)
    }
    this.icons.set(icon.id, icon)
  }

  public get(id: string): IconDefinition | undefined {
    return this.icons.get(id)
  }

  public getAll(): IconDefinition[] {
    return Array.from(this.icons.values())
  }

  public search(
    query: string,
    providerFilter?: IconProvider | 'all',
    categoryFilter?: string | 'all'
  ): IconDefinition[] {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return this.getAll().filter((icon) => {
      if (providerFilter && providerFilter !== 'all' && icon.provider !== providerFilter) {
        return false
      }
      if (categoryFilter && categoryFilter !== 'all' && icon.category !== categoryFilter) {
        return false
      }
      if (terms.length === 0) return true

      const haystack = [icon.id, icon.name, icon.category, ...icon.tags]
        .join(' ')
        .toLowerCase()
      return terms.every((term) => haystack.includes(term))
    })
  }

  public getProviders(): IconProvider[] {
    const set = new Set<IconProvider>()
    for (const icon of this.icons.values()) {
      set.add(icon.provider)
    }
    return Array.from(set)
  }

  public getCategories(): string[] {
    const set = new Set<string>()
    for (const icon of this.icons.values()) {
      set.add(icon.category)
    }
    return Array.from(set)
  }

  public static svgToDataUrl(svgString: string): string {
    if (!isSafeIconSvg(svgString)) {
      throw new Error('Refusing unsafe SVG content')
    }
    // An SVG with only a viewBox has no intrinsic viewport size. Browsers then
    // report a 300x150 natural image size, which makes Excalidraw use the
    // wrong source rectangle while resizing the image. Give every bundled
    // icon an explicit viewport derived from its viewBox before it becomes an
    // Excalidraw file.
    const normalizedSvg = IconRegistry.ensureIntrinsicDimensions(svgString)
    // Excalidraw normalizes SVG files by Base64-decoding the data after the
    // comma. A percent-encoded data URL renders in a browser but makes that
    // normalization throw InvalidCharacterError when an icon is dropped.
    const bytes = new TextEncoder().encode(normalizedSvg)
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return `data:image/svg+xml;base64,${btoa(binary)}`
  }

  /** Normalizes a previously stored SVG data URL without touching other file types. */
  public static normalizeSvgDataUrl(dataUrl: string): string {
    const commaIndex = dataUrl.indexOf(',')
    const header = dataUrl.slice(0, commaIndex).toLowerCase()
    if (commaIndex === -1 || !header.startsWith('data:image/svg+xml') || header.includes(';base64')) {
      return dataUrl
    }

    try {
      return IconRegistry.svgToDataUrl(decodeURIComponent(dataUrl.slice(commaIndex + 1)))
    } catch {
      // Existing projects may contain a malformed or legacy SVG. Preserve it
      // rather than making a project impossible to open.
      return dataUrl
    }
  }

  public static getFileId(iconId: string): string {
    return `builtin-icon-${iconId}`
  }

  public static getDisplaySize(svgContent: string, maxSize = 64): { width: number; height: number } {
    const viewBox = IconRegistry.getViewBox(svgContent)
    const width = viewBox?.width ?? Number.NaN
    const height = viewBox?.height ?? Number.NaN
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return { width: maxSize, height: maxSize }
    }
    const scale = maxSize / Math.max(width, height)
    return { width: Math.round(width * scale), height: Math.round(height * scale) }
  }

  private static ensureIntrinsicDimensions(svgString: string): string {
    const rootTag = svgString.match(/^\s*<svg\b[^>]*>/i)?.[0]
    const viewBox = IconRegistry.getViewBox(svgString)
    if (!rootTag || !viewBox) return svgString

    const hasWidth = /\bwidth\s*=/i.test(rootTag)
    const hasHeight = /\bheight\s*=/i.test(rootTag)
    if (hasWidth && hasHeight) return svgString

    const dimensions = [
      hasWidth ? '' : ` width="${viewBox.width}"`,
      hasHeight ? '' : ` height="${viewBox.height}"`
    ].join('')

    return svgString.replace(rootTag, `${rootTag.slice(0, -1)}${dimensions}>`)
  }

  private static getViewBox(svgContent: string): { width: number; height: number } | null {
    const viewBox = svgContent.match(
      /\bviewBox\s*=\s*["']\s*[-+\d.]+[\s,]+[-+\d.]+[\s,]+([-+\d.]+)[\s,]+([-+\d.]+)\s*["']/i
    )
    const width = Number(viewBox?.[1])
    const height = Number(viewBox?.[2])
    return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
      ? { width, height }
      : null
  }
}
