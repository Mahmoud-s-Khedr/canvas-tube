import { CameraState } from '../canvas/canvas-adapter'
import { CameraBookmark } from '../project/project-manifest'

/**
 * Creates a new camera bookmark capturing the specified camera state.
 */
export function createBookmark(
  camera: CameraState,
  name?: string,
  description?: string,
  index = 0,
  obsSceneName?: string
): CameraBookmark {
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const defaultName = name && name.trim().length > 0 ? name.trim() : `Bookmark ${index + 1}`

  return {
    id: `bm_${Date.now()}_${randomSuffix}`,
    name: defaultName,
    x: Math.round(camera.x),
    y: Math.round(camera.y),
    zoom: Math.round(camera.zoom * 1000) / 1000,
    createdAt: new Date().toISOString(),
    ...(description !== undefined && { description }),
    ...(obsSceneName && obsSceneName.trim().length > 0 && { obsSceneName: obsSceneName.trim() })
  }
}

/**
 * Updates the camera coordinates and zoom of an existing bookmark.
 */
export function updateBookmarkCamera(
  bookmarks: CameraBookmark[],
  id: string,
  camera: CameraState
): CameraBookmark[] {
  return bookmarks.map((bm) => {
    if (bm.id !== id) return bm
    return {
      ...bm,
      x: Math.round(camera.x),
      y: Math.round(camera.y),
      zoom: Math.round(camera.zoom * 1000) / 1000
    }
  })
}

/**
 * Renames a bookmark and optionally updates its description.
 */
export function renameBookmark(
  bookmarks: CameraBookmark[],
  id: string,
  name: string,
  description?: string
): CameraBookmark[] {
  return bookmarks.map((bm) => {
    if (bm.id !== id) return bm
    return {
      ...bm,
      name: name.trim() || bm.name,
      ...(description !== undefined && { description })
    }
  })
}

/**
 * Updates the OBS scene name associated with a bookmark.
 */
export function updateBookmarkObsScene(
  bookmarks: CameraBookmark[],
  id: string,
  obsSceneName?: string
): CameraBookmark[] {
  return bookmarks.map((bm) => {
    if (bm.id !== id) return bm
    const updated = { ...bm }
    if (obsSceneName && obsSceneName.trim().length > 0) {
      updated.obsSceneName = obsSceneName.trim()
    } else {
      delete updated.obsSceneName
    }
    return updated
  })
}

/**
 * Deletes a bookmark by its unique ID.
 */
export function deleteBookmark(bookmarks: CameraBookmark[], id: string): CameraBookmark[] {
  return bookmarks.filter((bm) => bm.id !== id)
}

/**
 * Reorders bookmarks by moving an item from fromIndex to toIndex.
 */
export function reorderBookmarks(
  bookmarks: CameraBookmark[],
  fromIndex: number,
  toIndex: number
): CameraBookmark[] {
  if (
    fromIndex < 0 ||
    fromIndex >= bookmarks.length ||
    toIndex < 0 ||
    toIndex >= bookmarks.length ||
    fromIndex === toIndex
  ) {
    return [...bookmarks]
  }

  const result = [...bookmarks]
  const [moved] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, moved)
  return result
}

/**
 * Computes the next bookmark index in a sequential tour.
 */
export function getNextBookmarkIndex(currentIndex: number | null, totalCount: number): number {
  if (totalCount <= 0) return -1
  if (currentIndex === null || currentIndex < 0) return 0
  return Math.min(totalCount - 1, currentIndex + 1)
}

/**
 * Computes the previous bookmark index in a sequential tour.
 */
export function getPreviousBookmarkIndex(currentIndex: number | null, totalCount: number): number {
  if (totalCount <= 0) return -1
  if (currentIndex === null || currentIndex <= 0) return 0
  return Math.min(totalCount - 1, currentIndex - 1)
}
