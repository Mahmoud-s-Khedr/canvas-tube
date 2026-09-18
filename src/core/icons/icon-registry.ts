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
    const encoded = encodeURIComponent(svgString)
      .replace(/'/g, '%27')
      .replace(/"/g, '%22')
    return `data:image/svg+xml;charset=utf-8,${encoded}`
  }

  public static getFileId(iconId: string): string {
    return `builtin-icon-${iconId}`
  }

  public static getDisplaySize(svgContent: string, maxSize = 64): { width: number; height: number } {
    const viewBox = svgContent.match(/\bviewBox\s*=\s*["']\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/i)
    const width = Number(viewBox?.[3])
    const height = Number(viewBox?.[4])
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return { width: maxSize, height: maxSize }
    }
    const scale = maxSize / Math.max(width, height)
    return { width: Math.round(width * scale), height: Math.round(height * scale) }
  }
}
