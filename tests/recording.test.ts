import { describe, it, expect } from 'vitest'
import {
  formatTimestamp,
  parseTimestamp,
  validateYouTubeChapters,
  generateYouTubeDescription,
  addChapterMarker,
  updateChapterMarker,
  deleteChapterMarker,
  parseChaptersFromText,
  ChapterMarker
} from '../src/core/recording/chapter-generator'

describe('YouTube Chapter Generator', () => {
  describe('formatTimestamp', () => {
    it('formats seconds to MM:SS correctly', () => {
      expect(formatTimestamp(0)).toBe('00:00')
      expect(formatTimestamp(9)).toBe('00:09')
      expect(formatTimestamp(65)).toBe('01:05')
      expect(formatTimestamp(599)).toBe('09:59')
      expect(formatTimestamp(3599)).toBe('59:59')
    })

    it('formats hours correctly when elapsed >= 3600 or forced', () => {
      expect(formatTimestamp(3600)).toBe('01:00:00')
      expect(formatTimestamp(3665)).toBe('01:01:05')
      expect(formatTimestamp(7325)).toBe('02:02:05')
      expect(formatTimestamp(45, true)).toBe('00:00:45')
    })

    it('handles negative or float seconds safely', () => {
      expect(formatTimestamp(-10)).toBe('00:00')
      expect(formatTimestamp(65.8)).toBe('01:05')
    })
  })

  describe('parseTimestamp', () => {
    it('parses MM:SS accurately', () => {
      expect(parseTimestamp('00:00')).toBe(0)
      expect(parseTimestamp('01:30')).toBe(90)
      expect(parseTimestamp('10:15')).toBe(615)
    })

    it('parses HH:MM:SS accurately', () => {
      expect(parseTimestamp('01:00:00')).toBe(3600)
      expect(parseTimestamp('1:02:03')).toBe(3723)
    })

    it('returns null on invalid formats', () => {
      expect(parseTimestamp('invalid')).toBeNull()
      expect(parseTimestamp('01:65')).toBeNull() // invalid seconds
      expect(parseTimestamp('65:00')).toBeNull() // invalid minutes
      expect(parseTimestamp('1:2:3:4')).toBeNull()
    })
  })

  describe('validateYouTubeChapters', () => {
    it('passes for valid YouTube chapter lists', () => {
      const validChapters: ChapterMarker[] = [
        { id: '1', title: 'Intro', timestampSeconds: 0 },
        { id: '2', title: 'Architecture', timestampSeconds: 45 },
        { id: '3', title: 'Conclusion', timestampSeconds: 120 }
      ]

      const result = validateYouTubeChapters(validChapters)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('fails if first chapter does not start at 00:00', () => {
      const chapters: ChapterMarker[] = [
        { id: '1', title: 'Intro', timestampSeconds: 15 },
        { id: '2', title: 'Architecture', timestampSeconds: 45 },
        { id: '3', title: 'Conclusion', timestampSeconds: 120 }
      ]

      const result = validateYouTubeChapters(chapters)
      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('First chapter must start at 00:00'))).toBe(true)
    })

    it('fails if fewer than 3 chapters are present', () => {
      const chapters: ChapterMarker[] = [
        { id: '1', title: 'Intro', timestampSeconds: 0 },
        { id: '2', title: 'Architecture', timestampSeconds: 45 }
      ]

      const result = validateYouTubeChapters(chapters)
      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('at least 3 chapters'))).toBe(true)
    })

    it('fails if distance between chapters is less than 10 seconds', () => {
      const chapters: ChapterMarker[] = [
        { id: '1', title: 'Intro', timestampSeconds: 0 },
        { id: '2', title: 'Architecture', timestampSeconds: 5 },
        { id: '3', title: 'Conclusion', timestampSeconds: 120 }
      ]

      const result = validateYouTubeChapters(chapters)
      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('Minimum chapter length is 10s'))).toBe(true)
    })
  })

  describe('generateYouTubeDescription', () => {
    it('outputs clean YouTube format text', () => {
      const chapters: ChapterMarker[] = [
        { id: '1', title: 'Introduction & Setup', timestampSeconds: 0 },
        { id: '2', title: 'Microservices & Ingress', timestampSeconds: 75 },
        { id: '3', title: 'Cache Layer', timestampSeconds: 210 }
      ]

      const text = generateYouTubeDescription(chapters)
      expect(text).toBe(
        '00:00 Introduction & Setup\n' +
        '01:15 Microservices & Ingress\n' +
        '03:30 Cache Layer'
      )
    })

    it('includes header when requested', () => {
      const chapters: ChapterMarker[] = [
        { id: '1', title: 'Intro', timestampSeconds: 0 },
        { id: '2', title: 'Main', timestampSeconds: 60 },
        { id: '3', title: 'Outro', timestampSeconds: 120 }
      ]

      const text = generateYouTubeDescription(chapters, {
        projectTitle: 'Distributed Systems 101',
        includeHeader: true
      })
      expect(text).toContain('📌 Distributed Systems 101')
      expect(text).toContain('00:00 Intro')
    })
  })

  describe('chapter list operations', () => {
    it('adds and auto-sorts chapter markers', () => {
      let chapters: ChapterMarker[] = []
      chapters = addChapterMarker(chapters, 'Third', 120)
      chapters = addChapterMarker(chapters, 'First', 0)
      chapters = addChapterMarker(chapters, 'Second', 45)

      expect(chapters).toHaveLength(3)
      expect(chapters[0].title).toBe('First')
      expect(chapters[0].timestampSeconds).toBe(0)
      expect(chapters[1].title).toBe('Second')
      expect(chapters[2].title).toBe('Third')
    })

    it('updates and re-sorts chapter markers', () => {
      let chapters: ChapterMarker[] = [
        { id: 'c1', title: 'Intro', timestampSeconds: 0 },
        { id: 'c2', title: 'Middle', timestampSeconds: 50 },
        { id: 'c3', title: 'End', timestampSeconds: 100 }
      ]

      chapters = updateChapterMarker(chapters, 'c2', { timestampSeconds: 150 })
      expect(chapters[2].id).toBe('c2')
      expect(chapters[2].timestampSeconds).toBe(150)
    })

    it('deletes chapter markers', () => {
      const chapters: ChapterMarker[] = [
        { id: 'c1', title: 'Intro', timestampSeconds: 0 },
        { id: 'c2', title: 'Delete Me', timestampSeconds: 50 }
      ]

      const result = deleteChapterMarker(chapters, 'c2')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('c1')
    })

    it('parses chapters from raw text input', () => {
      const rawText = `
        00:00 - Introduction to the Course
        01:25 Architecture Deep Dive
        04:50 | Database Sharding
        1:10:05 Q&A Session
      `

      const parsed = parseChaptersFromText(rawText)
      expect(parsed).toHaveLength(4)
      expect(parsed[0].timestampSeconds).toBe(0)
      expect(parsed[0].title).toBe('Introduction to the Course')
      expect(parsed[1].timestampSeconds).toBe(85)
      expect(parsed[1].title).toBe('Architecture Deep Dive')
      expect(parsed[2].timestampSeconds).toBe(290)
      expect(parsed[2].title).toBe('Database Sharding')
      expect(parsed[3].timestampSeconds).toBe(4205)
      expect(parsed[3].title).toBe('Q&A Session')
    })
  })
})
