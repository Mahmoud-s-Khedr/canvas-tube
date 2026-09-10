export interface CameraBookmark {
  id: string
  name: string
  x: number
  y: number
  zoom: number
  createdAt: string
  description?: string
  obsSceneName?: string
}

export interface DocumentEntry {
  id: string
  assetId: string
  filename: string
  pageCount: number
  type: 'pdf' | 'image'
}

export interface AssetEntry {
  id: string
  type: 'image' | 'svg' | 'pdf' | 'other'
  originalFilename: string
  mimeType: string
  hash: string
  relativePath: string
  sizeBytes: number
  createdAt: string
}

export interface ProjectManifest {
  formatVersion: 1
  projectId: string
  title: string
  createdAt: string
  updatedAt: string
  canvas: {
    adapter: 'excalidraw'
    version: number
  }
  documents: DocumentEntry[]
  assets: Record<string, AssetEntry>
  presentation: {
    cameraBookmarks: CameraBookmark[]
    activeRecordingPreset?: string
  }
}

export interface CanvasProjectBundle {
  manifest: ProjectManifest
  sceneData: unknown
}

export function createDefaultManifest(title = 'Untitled Project'): ProjectManifest {
  const now = new Date().toISOString()
  const randomId = Math.random().toString(36).substring(2, 11)
  return {
    formatVersion: 1,
    projectId: `proj_${Date.now()}_${randomId}`,
    title,
    createdAt: now,
    updatedAt: now,
    canvas: {
      adapter: 'excalidraw',
      version: 1
    },
    documents: [],
    assets: {},
    presentation: {
      cameraBookmarks: []
    }
  }
}

export function validateProjectManifest(data: unknown): {
  valid: boolean
  error?: string
  manifest?: ProjectManifest
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Project manifest must be a non-null object' }
  }

  const candidate = data as Record<string, unknown>

  if (candidate.formatVersion !== 1) {
    return {
      valid: false,
      error: `Unsupported format version: ${String(candidate.formatVersion)}. Supported version is 1.`
    }
  }

  if (typeof candidate.projectId !== 'string' || !candidate.projectId) {
    return { valid: false, error: 'Missing or invalid projectId' }
  }

  if (typeof candidate.title !== 'string') {
    return { valid: false, error: 'Missing or invalid title' }
  }

  if (!candidate.canvas || typeof candidate.canvas !== 'object') {
    return { valid: false, error: 'Missing canvas configuration in manifest' }
  }

  if (!Array.isArray(candidate.documents)) {
    return { valid: false, error: 'Manifest documents must be an array' }
  }

  if (!candidate.assets || typeof candidate.assets !== 'object') {
    return { valid: false, error: 'Manifest assets must be an object' }
  }

  if (!candidate.presentation || typeof candidate.presentation !== 'object') {
    candidate.presentation = { cameraBookmarks: [] }
  } else {
    const pres = candidate.presentation as Record<string, unknown>
    if (!Array.isArray(pres.cameraBookmarks)) {
      pres.cameraBookmarks = []
    }
  }

  return {
    valid: true,
    manifest: candidate as unknown as ProjectManifest
  }
}

export function serializeProjectBundle(bundle: CanvasProjectBundle): {
  projectJson: string
  sceneJson: string
} {
  const updatedManifest: ProjectManifest = {
    ...bundle.manifest,
    updatedAt: new Date().toISOString()
  }

  return {
    projectJson: JSON.stringify(updatedManifest, null, 2),
    sceneJson: JSON.stringify(bundle.sceneData ?? { elements: [], appState: {} }, null, 2)
  }
}

export function deserializeProjectBundle(
  projectJson: string,
  sceneJson: string
): {
  success: boolean
  error?: string
  bundle?: CanvasProjectBundle
} {
  try {
    const rawManifest = JSON.parse(projectJson)
    const validation = validateProjectManifest(rawManifest)
    if (!validation.valid || !validation.manifest) {
      return { success: false, error: validation.error || 'Invalid project manifest' }
    }

    const sceneData = sceneJson ? JSON.parse(sceneJson) : { elements: [], appState: {} }

    return {
      success: true,
      bundle: {
        manifest: validation.manifest,
        sceneData
      }
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'JSON parsing error during project deserialize'
    }
  }
}
