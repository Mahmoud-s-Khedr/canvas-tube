export type IconProvider = 'generic' | 'aws' | 'gcp' | 'azure' | 'kubernetes'

export interface IconDefinition {
  id: string
  name: string
  provider: IconProvider
  category: string
  tags: string[]
  svgContent: string
}

export const INITIAL_ICON_DEFINITIONS: IconDefinition[] = [
  {
    id: 'gen-server',
    name: 'Server Node',
    provider: 'generic',
    category: 'compute',
    tags: ['server', 'compute', 'vm', 'host', 'instance', 'cpu'],
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="8" y="10" width="48" height="18" rx="3" fill="#dbeafe"/>
      <rect x="8" y="36" width="48" height="18" rx="3" fill="#dbeafe"/>
      <line x1="16" y1="19" x2="20" y2="19"/>
      <line x1="16" y1="45" x2="20" y2="45"/>
      <circle cx="48" cy="19" r="2" fill="#2563eb"/>
      <circle cx="48" cy="45" r="2" fill="#2563eb"/>
    </svg>`
  },
  {
    id: 'gen-database',
    name: 'Database',
    provider: 'generic',
    category: 'database',
    tags: ['database', 'storage', 'sql', 'nosql', 'rdbms', 'data'],
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="32" cy="16" rx="22" ry="7" fill="#d1fae5"/>
      <path d="M10 16v16c0 3.87 9.85 7 22 7s22-3.13 22-7V16" fill="#d1fae5"/>
      <path d="M10 32v16c0 3.87 9.85 7 22 7s22-3.13 22-7V32" fill="#d1fae5"/>
    </svg>`
  },
  {
    id: 'gen-queue',
    name: 'Message Queue',
    provider: 'generic',
    category: 'messaging',
    tags: ['queue', 'kafka', 'rabbitmq', 'sqs', 'buffer', 'pubsub', 'messages'],
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="6" y="18" width="52" height="28" rx="5" fill="#fef3c7"/>
      <line x1="18" y1="18" x2="18" y2="46"/>
      <line x1="30" y1="18" x2="30" y2="46"/>
      <line x1="42" y1="18" x2="42" y2="46"/>
      <path d="M48 32h8m-3-4 4 4-4 4"/>
    </svg>`
  },
  {
    id: 'gen-cloud',
    name: 'Cloud Network',
    provider: 'generic',
    category: 'networking',
    tags: ['cloud', 'vpc', 'network', 'internet', 'cluster'],
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 46h29a13 13 0 0 0 3.6-25.5A17 17 0 0 0 18 24.3 11 11 0 0 0 18 46z" fill="#e0f2fe"/>
    </svg>`
  },
  {
    id: 'gen-client',
    name: 'Web Client / Browser',
    provider: 'generic',
    category: 'clients',
    tags: ['client', 'browser', 'frontend', 'ui', 'desktop', 'web'],
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#6b7280" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="8" y="12" width="48" height="40" rx="4" fill="#f3f4f6"/>
      <line x1="8" y1="22" x2="56" y2="22"/>
      <circle cx="14" cy="17" r="1.5" fill="#ef4444" stroke="none"/>
      <circle cx="20" cy="17" r="1.5" fill="#eab308" stroke="none"/>
      <circle cx="26" cy="17" r="1.5" fill="#22c55e" stroke="none"/>
    </svg>`
  },
  {
    id: 'gen-user',
    name: 'User / Actor',
    provider: 'generic',
    category: 'clients',
    tags: ['user', 'actor', 'person', 'client', 'customer'],
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="32" cy="20" r="11" fill="#e0e7ff"/>
      <path d="M14 52c0-9.94 8.06-18 18-18s18 8.06 18 18" fill="#e0e7ff"/>
    </svg>`
  },
  {
    id: 'gen-k8s-pod',
    name: 'Kubernetes Pod',
    provider: 'kubernetes',
    category: 'compute',
    tags: ['kubernetes', 'k8s', 'pod', 'container', 'docker'],
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#326ce5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M32 8l20 12v24L32 56 12 44V20L32 8z" fill="#eef2ff"/>
      <circle cx="32" cy="32" r="7" fill="#326ce5"/>
      <line x1="32" y1="8" x2="32" y2="25"/>
      <line x1="52" y1="44" x2="38" y2="36"/>
      <line x1="12" y1="44" x2="26" y2="36"/>
    </svg>`
  },
  {
    id: 'gen-storage-bucket',
    name: 'Object Storage Bucket',
    provider: 'generic',
    category: 'storage',
    tags: ['storage', 's3', 'bucket', 'blob', 'gcs', 'files'],
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 18l5 34a4 4 0 0 0 4 3h22a4 4 0 0 0 4-3l5-34" fill="#ede9fe"/>
      <ellipse cx="32" cy="18" rx="20" ry="7" fill="#ddd6fe"/>
      <line x1="32" y1="28" x2="32" y2="44"/>
      <line x1="24" y1="36" x2="40" y2="36"/>
    </svg>`
  },
  {
    id: 'gen-load-balancer',
    name: 'Load Balancer',
    provider: 'generic',
    category: 'networking',
    tags: ['load balancer', 'alb', 'nlb', 'proxy', 'traffic', 'routing'],
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="10" y="24" width="44" height="16" rx="3" fill="#ccfbf1"/>
      <circle cx="18" cy="32" r="2.5" fill="#0d9488"/>
      <circle cx="32" cy="32" r="2.5" fill="#0d9488"/>
      <circle cx="46" cy="32" r="2.5" fill="#0d9488"/>
      <path d="M32 10v14M18 40v14M46 40v14"/>
    </svg>`
  },
  {
    id: 'gen-gateway',
    name: 'API Gateway / Firewall',
    provider: 'generic',
    category: 'networking',
    tags: ['gateway', 'api', 'firewall', 'security', 'ingress', 'waf'],
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M32 8l20 8v16c0 13.5-8.5 24-20 28C20.5 56 12 45.5 12 32V16l20-8z" fill="#fee2e2"/>
      <line x1="32" y1="24" x2="32" y2="42"/>
      <line x1="24" y1="33" x2="40" y2="33"/>
    </svg>`
  }
]

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
