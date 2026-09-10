import { describe, it, expect } from 'vitest'
import {
  easeInOutCubic,
  interpolateCamera,
  lerp
} from '../src/core/canvas/camera-animation'
import {
  createBookmark,
  updateBookmarkCamera,
  renameBookmark,
  deleteBookmark,
  reorderBookmarks,
  getNextBookmarkIndex,
  getPreviousBookmarkIndex
} from '../src/core/bookmarks/bookmark-manager'
import {
  createDefaultManifest,
  serializeProjectBundle,
  deserializeProjectBundle,
  validateProjectManifest
} from '../src/core/project/project-manifest'

describe('Camera Easing & Animation Math', () => {
  it('computes exact values for easeInOutCubic at key control points', () => {
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(0.5)).toBe(0.5)
    expect(easeInOutCubic(1)).toBe(1)
  })

  it('clamps values outside [0, 1] range', () => {
    expect(easeInOutCubic(-0.5)).toBe(0)
    expect(easeInOutCubic(1.5)).toBe(1)
  })

  it('is strictly monotonic and symmetric', () => {
    let prev = -1
    for (let t = 0; t <= 1; t += 0.05) {
      const val = easeInOutCubic(t)
      expect(val).toBeGreaterThanOrEqual(prev)
      prev = val

      // Symmetry check: f(1 - t) === 1 - f(t)
      const symmetricVal = easeInOutCubic(1 - t)
      expect(Math.abs(val + symmetricVal - 1)).toBeLessThan(1e-6)
    }
  })

  it('linearly interpolates numbers via lerp', () => {
    expect(lerp(0, 100, 0)).toBe(0)
    expect(lerp(0, 100, 0.25)).toBe(25)
    expect(lerp(0, 100, 1)).toBe(100)
    expect(lerp(10, 20, 0.5)).toBe(15)
  })

  it('interpolates camera position and zoom', () => {
    const start = { x: 100, y: 200, zoom: 1 }
    const target = { x: 500, y: 600, zoom: 2 }

    const atStart = interpolateCamera(start, target, 0)
    expect(atStart.x).toBe(100)
    expect(atStart.y).toBe(200)
    expect(atStart.zoom).toBe(1)

    const atMid = interpolateCamera(start, target, 0.5)
    expect(atMid.x).toBe(300)
    expect(atMid.y).toBe(400)
    expect(atMid.zoom).toBe(1.5)

    const atEnd = interpolateCamera(start, target, 1)
    expect(atEnd.x).toBe(500)
    expect(atEnd.y).toBe(600)
    expect(atEnd.zoom).toBe(2)
  })
})

describe('Camera Bookmark Management', () => {
  const mockCamera = { x: 150.4, y: -250.7, zoom: 1.2555 }

  it('creates a bookmark with rounded values and auto name', () => {
    const bm = createBookmark(mockCamera, undefined, 'Overview of cluster', 0)
    expect(bm.id).toMatch(/^bm_/)
    expect(bm.name).toBe('Bookmark 1')
    expect(bm.x).toBe(150)
    expect(bm.y).toBe(-251)
    expect(bm.zoom).toBe(1.256)
    expect(bm.description).toBe('Overview of cluster')
    expect(bm.createdAt).toBeDefined()
  })

  it('creates a bookmark with custom title', () => {
    const bm = createBookmark(mockCamera, 'Ingress Controller', undefined, 2)
    expect(bm.name).toBe('Ingress Controller')
  })

  it('updates bookmark camera coordinates', () => {
    const bm1 = createBookmark({ x: 0, y: 0, zoom: 1 }, 'Step 1', undefined, 0)
    const bm2 = createBookmark({ x: 10, y: 10, zoom: 1 }, 'Step 2', undefined, 1)
    const list = [bm1, bm2]

    const updated = updateBookmarkCamera(list, bm1.id, { x: 99.2, y: 88.8, zoom: 2.5 })
    expect(updated[0].x).toBe(99)
    expect(updated[0].y).toBe(89)
    expect(updated[0].zoom).toBe(2.5)
    expect(updated[1].x).toBe(10) // unaffected
  })

  it('renames a bookmark', () => {
    const bm1 = createBookmark({ x: 0, y: 0, zoom: 1 }, 'Old Name', undefined, 0)
    const updated = renameBookmark([bm1], bm1.id, 'New Name', 'Updated description')
    expect(updated[0].name).toBe('New Name')
    expect(updated[0].description).toBe('Updated description')
  })

  it('deletes a bookmark by id', () => {
    const bm1 = createBookmark({ x: 0, y: 0, zoom: 1 }, 'Step 1', undefined, 0)
    const bm2 = createBookmark({ x: 10, y: 10, zoom: 1 }, 'Step 2', undefined, 1)
    const list = [bm1, bm2]

    const remaining = deleteBookmark(list, bm1.id)
    expect(remaining.length).toBe(1)
    expect(remaining[0].id).toBe(bm2.id)
  })

  it('reorders bookmarks smoothly with edge case handling', () => {
    const bm1 = createBookmark({ x: 0, y: 0, zoom: 1 }, '1', undefined, 0)
    const bm2 = createBookmark({ x: 10, y: 10, zoom: 1 }, '2', undefined, 1)
    const bm3 = createBookmark({ x: 20, y: 20, zoom: 1 }, '3', undefined, 2)
    const list = [bm1, bm2, bm3]

    // Move first to end: 1, 2, 3 -> 2, 3, 1
    const movedToEnd = reorderBookmarks(list, 0, 2)
    expect(movedToEnd.map((b) => b.name)).toEqual(['2', '3', '1'])

    // Move last to middle: 2, 3, 1 -> 2, 1, 3
    const movedToMid = reorderBookmarks(movedToEnd, 2, 1)
    expect(movedToMid.map((b) => b.name)).toEqual(['2', '1', '3'])

    // Out of bounds checks
    expect(reorderBookmarks(list, -1, 2)).toEqual(list)
    expect(reorderBookmarks(list, 0, 99)).toEqual(list)
    expect(reorderBookmarks(list, 1, 1)).toEqual(list)
  })

  it('computes next and previous indices in tour navigation', () => {
    expect(getNextBookmarkIndex(null, 0)).toBe(-1)
    expect(getNextBookmarkIndex(null, 3)).toBe(0)
    expect(getNextBookmarkIndex(0, 3)).toBe(1)
    expect(getNextBookmarkIndex(1, 3)).toBe(2)
    expect(getNextBookmarkIndex(2, 3)).toBe(2) // clamped at last index

    expect(getPreviousBookmarkIndex(null, 0)).toBe(-1)
    expect(getPreviousBookmarkIndex(null, 3)).toBe(0)
    expect(getPreviousBookmarkIndex(2, 3)).toBe(1)
    expect(getPreviousBookmarkIndex(1, 3)).toBe(0)
    expect(getPreviousBookmarkIndex(0, 3)).toBe(0) // clamped at 0
  })
})

describe('Bookmark Persistence in Project Manifest', () => {
  it('persists bookmarks across serialization round-trip', () => {
    const manifest = createDefaultManifest('Tour Project')
    const bm1 = createBookmark({ x: 100, y: 200, zoom: 1.5 }, 'Architecture Diagram', undefined, 0)
    const bm2 = createBookmark({ x: 800, y: 400, zoom: 2.0 }, 'Database Shards', undefined, 1)
    manifest.presentation.cameraBookmarks = [bm1, bm2]

    const bundle = { manifest, sceneData: { elements: [], appState: {} } }
    const { projectJson, sceneJson } = serializeProjectBundle(bundle)

    expect(projectJson).toContain('Architecture Diagram')
    expect(projectJson).toContain('Database Shards')

    const deserialized = deserializeProjectBundle(projectJson, sceneJson)
    expect(deserialized.success).toBe(true)
    expect(deserialized.bundle?.manifest.presentation.cameraBookmarks.length).toBe(2)
    expect(deserialized.bundle?.manifest.presentation.cameraBookmarks[0].name).toBe('Architecture Diagram')
    expect(deserialized.bundle?.manifest.presentation.cameraBookmarks[1].zoom).toBe(2.0)
  })

  it('validates manifests and backfills empty cameraBookmarks array if missing', () => {
    const raw = {
      formatVersion: 1,
      projectId: 'proj_test',
      title: 'Older Project Without Presentation Key',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      canvas: { adapter: 'excalidraw', version: 1 },
      documents: [],
      assets: {}
    }

    const validation = validateProjectManifest(raw)
    expect(validation.valid).toBe(true)
    expect(validation.manifest?.presentation).toBeDefined()
    expect(validation.manifest?.presentation.cameraBookmarks).toEqual([])
  })
})
