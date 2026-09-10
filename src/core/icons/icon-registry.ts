import { loadAllIcons } from './icon-loader'

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
    this.icons.set(icon.id, icon)
  }

  public get(id: string): IconDefinition | undefined {
    return this.icons.get(id)
  }

  public getAll(): IconDefinition[] {
    return Array.from(this.icons.values())
  }

  public search(query: string, providerFilter?: IconProvider | 'all'): IconDefinition[] {
    const q = query.trim().toLowerCase()
    return this.getAll().filter((icon) => {
      if (providerFilter && providerFilter !== 'all' && icon.provider !== providerFilter) {
        return false
      }
      if (!q) return true

      return (
        icon.name.toLowerCase().includes(q) ||
        icon.category.toLowerCase().includes(q) ||
        icon.tags.some((tag) => tag.toLowerCase().includes(q))
      )
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
    const encoded = encodeURIComponent(svgString)
      .replace(/'/g, '%27')
      .replace(/"/g, '%22')
    return `data:image/svg+xml;charset=utf-8,${encoded}`
  }
}
