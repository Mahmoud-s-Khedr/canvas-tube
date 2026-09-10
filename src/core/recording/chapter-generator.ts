/**
 * Core YouTube Chapter Generator & Recording Session Tracker
 *
 * Adheres strictly to YouTube description chapter guidelines:
 * 1. The first chapter must begin at timestamp 00:00 (or 0:00).
 * 2. There must be at least 3 chapters in ascending order.
 * 3. The minimum length for video chapters is 10 seconds between markers.
 */

export interface ChapterMarker {
  id: string
  title: string
  timestampSeconds: number
  bookmarkId?: string
}

export interface ChapterValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Formats a duration in seconds into a YouTube timestamp string.
 * Example:
 *   0 -> "00:00"
 *   75 -> "01:15"
 *   3675 -> "01:01:15"
 */
export function formatTimestamp(seconds: number, forceHours = false): string {
  const safeSec = Math.max(0, Math.floor(seconds))
  const hrs = Math.floor(safeSec / 3600)
  const mins = Math.floor((safeSec % 3600) / 60)
  const secs = safeSec % 60

  const pad = (n: number): string => n.toString().padStart(2, '0')

  if (hrs > 0 || forceHours) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`
  }
  return `${pad(mins)}:${pad(secs)}`
}

/**
 * Parses a timestamp string (e.g. "01:15" or "1:05:30") into total seconds.
 * Returns null if the format is invalid.
 */
export function parseTimestamp(str: string): number | null {
  const trimmed = str.trim()
  const parts = trimmed.split(':')
  if (parts.length < 2 || parts.length > 3) return null

  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null
  }

  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10)
    const secs = parseInt(parts[1], 10)
    if (mins >= 60 || secs >= 60) return null
    return mins * 60 + secs
  }

  const hrs = parseInt(parts[0], 10)
  const mins = parseInt(parts[1], 10)
  const secs = parseInt(parts[2], 10)
  if (mins >= 60 || secs >= 60) return null
  return hrs * 3600 + mins * 60 + secs
}

/**
 * Validates a list of chapter markers against official YouTube guidelines.
 */
export function validateYouTubeChapters(chapters: ChapterMarker[]): ChapterValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!chapters || chapters.length === 0) {
    errors.push('No chapters provided.')
    return { isValid: false, errors, warnings }
  }

  // Sort ascending
  const sorted = [...chapters].sort((a, b) => a.timestampSeconds - b.timestampSeconds)

  // Rule 1: First timestamp must start at 00:00
  if (sorted[0].timestampSeconds !== 0) {
    errors.push(`First chapter must start at 00:00 (currently ${formatTimestamp(sorted[0].timestampSeconds)}).`)
  }

  // Rule 2: Minimum of 3 chapters
  if (sorted.length < 3) {
    errors.push(`YouTube requires at least 3 chapters (currently ${sorted.length}).`)
  }

  // Rule 3: Minimum 10 seconds between chapters
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    const gap = curr.timestampSeconds - prev.timestampSeconds

    if (gap < 10) {
      errors.push(
        `Chapter "${curr.title}" (${formatTimestamp(curr.timestampSeconds)}) is only ${gap}s after "${prev.title}" (${formatTimestamp(prev.timestampSeconds)}). Minimum chapter length is 10s.`
      )
    }
  }

  // Check for blank titles
  for (const ch of sorted) {
    if (!ch.title.trim()) {
      warnings.push(`Chapter at ${formatTimestamp(ch.timestampSeconds)} has an empty title.`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Generates formatted text for YouTube video descriptions.
 */
export function generateYouTubeDescription(
  chapters: ChapterMarker[],
  options?: { projectTitle?: string; includeHeader?: boolean }
): string {
  if (chapters.length === 0) return ''

  const sorted = [...chapters].sort((a, b) => a.timestampSeconds - b.timestampSeconds)
  const maxSeconds = sorted[sorted.length - 1].timestampSeconds
  const useHours = maxSeconds >= 3600

  const lines: string[] = []

  if (options?.includeHeader) {
    const title = options.projectTitle || 'Video Chapters'
    lines.push(`📌 ${title}`)
    lines.push('----------------------------------------')
  }

  for (const ch of sorted) {
    const timeStr = formatTimestamp(ch.timestampSeconds, useHours)
    const cleanTitle = ch.title.trim() || 'Untitled Chapter'
    lines.push(`${timeStr} ${cleanTitle}`)
  }

  return lines.join('\n')
}

/**
 * Adds a chapter marker, keeping the list sorted and deduplicated by timestamp.
 */
export function addChapterMarker(
  chapters: ChapterMarker[],
  title: string,
  timestampSeconds: number,
  bookmarkId?: string
): ChapterMarker[] {
  const safeSec = Math.max(0, Math.floor(timestampSeconds))
  const cleanTitle = title.trim() || `Chapter ${chapters.length + 1}`

  const newMarker: ChapterMarker = {
    id: `chap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: cleanTitle,
    timestampSeconds: safeSec,
    ...(bookmarkId ? { bookmarkId } : {})
  }

  const updated = [...chapters, newMarker]
  return updated.sort((a, b) => a.timestampSeconds - b.timestampSeconds)
}

/**
 * Updates an existing chapter's title or timestamp.
 */
export function updateChapterMarker(
  chapters: ChapterMarker[],
  id: string,
  updates: Partial<Pick<ChapterMarker, 'title' | 'timestampSeconds'>>
): ChapterMarker[] {
  return chapters
    .map((ch) => {
      if (ch.id !== id) return ch
      return {
        ...ch,
        title: updates.title !== undefined ? updates.title.trim() : ch.title,
        timestampSeconds:
          updates.timestampSeconds !== undefined
            ? Math.max(0, Math.floor(updates.timestampSeconds))
            : ch.timestampSeconds
      }
    })
    .sort((a, b) => a.timestampSeconds - b.timestampSeconds)
}

/**
 * Removes a chapter marker by ID.
 */
export function deleteChapterMarker(chapters: ChapterMarker[], id: string): ChapterMarker[] {
  return chapters.filter((ch) => ch.id !== id)
}

/**
 * Parses raw text lines (e.g. from clipboard) into ChapterMarkers.
 * Example lines:
 *   00:00 - Introduction to the Course
 *   01:25 Architecture Deep Dive
 *   04:50 | Database Sharding
 *   1:10:05 Q&A Session
 */
export function parseChaptersFromText(text: string): ChapterMarker[] {
  const lines = text.split(/\r?\n/)
  const results: ChapterMarker[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Regex matching timestamp at start: (HH:MM:SS or MM:SS) followed by separator/title
    const match = trimmed.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:[-–—|:]\s*)?(.*)$/)
    if (match) {
      const timeStr = match[1]
      const rawTitle = match[2].trim()
      const seconds = parseTimestamp(timeStr)

      if (seconds !== null) {
        results.push({
          id: `chap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: rawTitle || `Chapter ${results.length + 1}`,
          timestampSeconds: seconds
        })
      }
    }
  }

  return results.sort((a, b) => a.timestampSeconds - b.timestampSeconds)
}
