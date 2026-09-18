import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import {
  ProjectManifest,
  DocumentEntry,
  createDefaultManifest
} from '@core/project/project-manifest'
import { CanvasPointerSnapshot, Bounds } from '@core/canvas/canvas-adapter'
import {
  createBookmark,
  updateBookmarkCamera,
  renameBookmark,
  updateBookmarkObsScene,
  deleteBookmark,
  reorderBookmarks,
  getNextBookmarkIndex,
  getPreviousBookmarkIndex
} from '@core/bookmarks/bookmark-manager'
import {
  ChapterMarker,
  addChapterMarker,
  formatTimestamp
} from '@core/recording/chapter-generator'
import { obsClient, ObsConnectionStatus } from '@core/obs/obs-client'
import { ObsScene } from '@core/obs/obs-types'
import { ChaptersModal } from './components/recording/ChaptersModal'
import { ObsModal } from './components/recording/ObsModal'
import { SystemInfo } from '@core/desktop/desktop-api'
import { ExcalidrawCanvasAdapter } from './components/canvas/ExcalidrawCanvasAdapter'
import { CanvasView } from './components/canvas/CanvasView'
import { TopToolbar } from './components/toolbar/TopToolbar'
import { IconSidebar } from './components/sidebar/IconSidebar'
import { InputInspector } from './components/inspector/InputInspector'
import { DocumentSlideDock } from './components/documents/DocumentSlideDock'
import { CodeSnippetModal } from './components/code/CodeSnippetModal'
import { BookmarksDrawer } from './components/bookmarks/BookmarksDrawer'
import { PresenterTourBar } from './components/bookmarks/PresenterTourBar'
import { ExportModal } from './components/export/ExportModal'
import { MarqueeSelector } from './components/export/MarqueeSelector'
import { PdfService } from './services/pdf-service'
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import type { CanvasToolType } from '@core/canvas/canvas-adapter'
import { ShortcutSettingsModal } from './components/shortcuts/ShortcutSettingsModal'
import {
  createShortcutRegistry,
  formatBinding,
  getActiveBinding,
  loadShortcutPreferences,
  saveShortcutPreferences,
  type ShortcutBinding,
  type ShortcutPreferences
} from './shortcuts/shortcut-registry'
import { useShortcutDispatcher } from './shortcuts/use-shortcut-dispatcher'

export const App: React.FC = () => {
  const adapter = useMemo(() => new ExcalidrawCanvasAdapter(), [])
  const canvasToolSetter = useRef<((tool: CanvasToolType) => void) | null>(null)
  const [manifest, setManifest] = useState<ProjectManifest>(() =>
    createDefaultManifest('System Design Explanation')
  )
  const [projectDir, setProjectDir] = useState<string | null>(null)
  const [assetData, setAssetData] = useState<Record<string, string>>({})
  const [isRecordingMode, setIsRecordingMode] = useState(false)
  const [isInspectorOpen, setIsInspectorOpen] = useState(false)
  const [isShortcutSettingsOpen, setIsShortcutSettingsOpen] = useState(false)
  const [shortcutPreferences, setShortcutPreferences] = useState<ShortcutPreferences>(loadShortcutPreferences)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("canvastube_sidebar_width")
      if (saved) {
        const parsed = parseInt(saved, 10)
        if (!isNaN(parsed) && parsed >= 200 && parsed <= 800) {
          return parsed
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
    return 280
  })
  const [isResizingSidebar, setIsResizingSidebar] = useState(false)

  const handleSidebarWidthChange = useCallback((newWidth: number) => {
    setSidebarWidth(newWidth)
    try {
      localStorage.setItem("canvastube_sidebar_width", String(newWidth))
    } catch {
      // Ignore localStorage write errors
    }
  }, [])
  const [pointerSnapshot, setPointerSnapshot] = useState<CanvasPointerSnapshot | null>(null)
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)

  // Bookmarks & Scene Tour state
  const [isBookmarksDrawerOpen, setIsBookmarksDrawerOpen] = useState(false)
  const [activeBookmarkIndex, setActiveBookmarkIndex] = useState<number | null>(null)

  // Document (PDF) state
  const [activeDocument, setActiveDocument] = useState<DocumentEntry | null>(null)
  const [activePdfDoc, setActivePdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [isDocumentDockOpen, setIsDocumentDockOpen] = useState(false)

  // Code Snippet Modal state
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false)

  // Production Export Pipeline state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false)
  const [customExportBounds, setCustomExportBounds] = useState<Bounds | null>(null)

  // YouTube Chapters & Recording Session state
  const [chapters, setChapters] = useState<ChapterMarker[]>([
    { id: 'chap_intro', title: 'Introduction & Architecture Overview', timestampSeconds: 0 }
  ])
  const [isChaptersModalOpen, setIsChaptersModalOpen] = useState(false)
  const [isRecordingSession, setIsRecordingSession] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)

  // OBS Studio WebSocket state
  const [isObsModalOpen, setIsObsModalOpen] = useState(false)
  const [obsStatus, setObsStatus] = useState<ObsConnectionStatus>(obsClient.getStatus())
  const [obsScenes, setObsScenes] = useState<ObsScene[]>(obsClient.getScenes())
  const [autoSwitchObsScene, setAutoSwitchObsScene] = useState(true)

  // Chroma-key Background state
  const [chromaMode, setChromaMode] = useState<'dark' | 'light' | 'green' | 'blue' | 'magenta'>('dark')

  // Notification Toast state
  const [toast, setToast] = useState<{
    id: number
    message: string
    type: 'info' | 'success' | 'warning'
  } | null>(null)

  const showToast = useCallback(
    (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
      const id = Date.now()
      setToast({ id, message, type })
      setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current))
      }, 3500)
    },
    []
  )

  useEffect(() => {
    document.title = `${manifest.title} — CanvasTube`
  }, [manifest.title])

  // Recording session elapsed timer
  useEffect(() => {
    let interval: any
    if (isRecordingSession) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecordingSession])

  // OBS WebSocket event listeners
  useEffect(() => {
    const unsubStatus = obsClient.onStatusChange((newStatus) => {
      setObsStatus(newStatus)
    })
    const unsubScene = obsClient.onSceneChange((_, scenes) => {
      setObsScenes(scenes)
    })
    const unsubRecord = obsClient.onRecordStateChange((state) => {
      setIsRecordingSession(state.outputActive)
    })
    return () => {
      unsubStatus()
      unsubScene()
      unsubRecord()
    }
  }, [])

  // Listen to pointer events from adapter only when inspector is open to avoid 60-120fps re-render churn during drawing
  useEffect(() => {
    if (!isInspectorOpen) {
      adapter.setPointerListener(undefined)
      return
    }
    adapter.setPointerListener((snapshot) => {
      setPointerSnapshot(snapshot)
    })
    return () => {
      adapter.setPointerListener(undefined)
    }
  }, [adapter, isInspectorOpen])

  // Fetch host system information (Wayland, Electron version, etc.)
  useEffect(() => {
    if (window.desktopApi?.getSystemInfo) {
      window.desktopApi.getSystemInfo().then((info) => {
        setSystemInfo(info)
        console.log('[App] System info:', info)
      })
    }
  }, [])

  // File / Project handlers
  const handleNewProject = useCallback(() => {
    PdfService.clearCache()
    const fresh = createDefaultManifest('New Architecture Canvas')
    setManifest(fresh)
    setProjectDir(null)
    setAssetData({})
    setActiveDocument(null)
    setActivePdfDoc(null)
    setIsDocumentDockOpen(false)
    setIsBookmarksDrawerOpen(false)
    setActiveBookmarkIndex(null)
    setCustomExportBounds(null)
    adapter.deserialize({ elements: [], appState: {} })
  }, [adapter])

  const handleOpenProject = useCallback(async () => {
    if (!window.desktopApi?.openProject) return
    const result = await window.desktopApi.openProject()
    if (result) {
      PdfService.clearCache()
      setProjectDir(result.projectDir)
      setManifest(result.bundle.manifest)
      setAssetData(result.assetData)
      adapter.deserialize(result.bundle.sceneData)
      setActiveBookmarkIndex(null)
      setCustomExportBounds(null)

      // Restore PDF document if present in opened project
      if (result.bundle.manifest.documents.length > 0) {
        const firstDoc = result.bundle.manifest.documents[0]
        const asset = result.bundle.manifest.assets[firstDoc.assetId]
        if (asset && window.desktopApi.readDocumentFile) {
          try {
            const base64 = result.assetData[firstDoc.assetId] || await window.desktopApi.readDocumentFile(result.projectDir, asset.relativePath)
            if (base64) {
              const pdfDoc = await PdfService.loadPdfFromBase64(base64, firstDoc.id)
              setActivePdfDoc(pdfDoc)
              setActiveDocument(firstDoc)
              setIsDocumentDockOpen(true)
            }
          } catch (err) {
            console.error('[App] Failed to reload project document:', err)
          }
        }
      } else {
        setActiveDocument(null)
        setActivePdfDoc(null)
        setIsDocumentDockOpen(false)
      }
    }
  }, [adapter])

  const handleRenameProject = useCallback(
    (title: string) => {
      const trimmedTitle = title.trim()
      if (!trimmedTitle) {
        showToast('Canvas title cannot be empty.', 'warning')
        return
      }

      setManifest((previous) => ({ ...previous, title: trimmedTitle }))
      showToast(`Canvas renamed to "${trimmedTitle}"`, 'success')
    },
    [showToast]
  )

  const handleSaveProject = useCallback(async () => {
    if (!window.desktopApi?.saveProject) return
    const sceneData = adapter.serialize()

    if (!projectDir) {
      // Save As if not saved yet
      const saveAsResult = await window.desktopApi.saveProjectAs(manifest.title, {
        manifest,
        sceneData
      }, assetData)
      if (saveAsResult?.success && saveAsResult.path) {
        setProjectDir(saveAsResult.path)
        showToast('Project saved successfully!', 'success')
      }
      return
    }

    const saveResult = await window.desktopApi.saveProject(projectDir, {
      manifest,
      sceneData
    }, assetData)
    if (!saveResult.success) {
      showToast(`Save failed: ${saveResult.error || 'Unknown error'}`, 'warning')
    } else {
      showToast('Project saved successfully!', 'success')
    }
  }, [adapter, assetData, manifest, projectDir, showToast])

  const handleSaveProjectAs = useCallback(async () => {
    if (!window.desktopApi?.saveProjectAs) return
    const sceneData = adapter.serialize()
    const saveAsResult = await window.desktopApi.saveProjectAs(manifest.title, {
      manifest,
      sceneData
    }, assetData)
    if (saveAsResult?.success && saveAsResult.path) {
      setProjectDir(saveAsResult.path)
      showToast('Project saved as new file!', 'success')
    }
  }, [adapter, assetData, manifest, showToast])

  // Quick clipboard copy action (Ctrl+Shift+C)
  const handleQuickClipboardCopy = useCallback(async () => {
    try {
      const selectionCount = adapter.getElementsCount('selection')
      const totalCount = adapter.getElementsCount('all')
      if (totalCount === 0) {
        showToast('Canvas is empty. Nothing to copy.', 'warning')
        return
      }

      const scope = selectionCount > 0 ? 'selection' : 'viewport'
      const result = await adapter.exportCanvas({
        format: 'png',
        scope,
        resolutionPreset: '2x',
        backgroundMode: 'dark',
        padding: 16
      })

      let copiedSuccessfully = false
      if (window.desktopApi?.copyImageToClipboard && result.dataUrl) {
        copiedSuccessfully = await window.desktopApi.copyImageToClipboard(result.dataUrl)
      }

      if (navigator.clipboard && result.blob) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': result.blob })])
          copiedSuccessfully = true
        } catch {
          // Handled via native IPC
        }
      }

      if (copiedSuccessfully) {
        const desc = selectionCount > 0 ? `${selectionCount} selected element(s)` : 'active canvas'
        showToast(`Copied ${desc} to clipboard as PNG (${result.width}×${result.height}px)!`, 'success')
      } else {
        showToast('Failed to copy diagram to clipboard', 'warning')
      }
    } catch (err) {
      console.error('[handleQuickClipboardCopy] Error:', err)
      showToast(`Copy failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'warning')
    }
  }, [adapter, showToast])

  // Bookmark handlers
  const handleAddBookmark = useCallback(
    (name?: string) => {
      const camera = adapter.getCamera()
      const count = manifest.presentation.cameraBookmarks.length
      const newBookmark = createBookmark(camera, name, undefined, count)

      setManifest((prev) => ({
        ...prev,
        presentation: {
          ...prev.presentation,
          cameraBookmarks: [...prev.presentation.cameraBookmarks, newBookmark]
        }
      }))
      setActiveBookmarkIndex(count)
      showToast(`Bookmark "${newBookmark.name}" created`, 'success')
    },
    [adapter, manifest.presentation.cameraBookmarks.length, showToast]
  )

  const handleJumpToBookmark = useCallback(
    (index: number) => {
      const bookmarks = manifest.presentation.cameraBookmarks
      if (index < 0 || index >= bookmarks.length) return
      const bm = bookmarks[index]
      setActiveBookmarkIndex(index)
      adapter.animateCameraTo({ x: bm.x, y: bm.y, zoom: bm.zoom }, 600)

      // Auto-switch OBS Scene if bound
      if (autoSwitchObsScene && bm.obsSceneName && obsStatus === 'connected') {
        obsClient.setCurrentProgramScene(bm.obsSceneName).catch(console.error)
      }
    },
    [adapter, autoSwitchObsScene, manifest.presentation.cameraBookmarks, obsStatus]
  )

  const handleNextBookmark = useCallback(() => {
    const bookmarks = manifest.presentation.cameraBookmarks
    if (bookmarks.length === 0) return
    const nextIndex = getNextBookmarkIndex(activeBookmarkIndex, bookmarks.length)
    if (nextIndex >= 0) {
      handleJumpToBookmark(nextIndex)
    }
  }, [activeBookmarkIndex, manifest.presentation.cameraBookmarks, handleJumpToBookmark])

  const handlePreviousBookmark = useCallback(() => {
    const bookmarks = manifest.presentation.cameraBookmarks
    if (bookmarks.length === 0) return
    const prevIndex = getPreviousBookmarkIndex(activeBookmarkIndex, bookmarks.length)
    if (prevIndex >= 0) {
      handleJumpToBookmark(prevIndex)
    }
  }, [activeBookmarkIndex, manifest.presentation.cameraBookmarks, handleJumpToBookmark])

  const handleUpdateBookmarkCamera = useCallback(
    (id: string) => {
      const camera = adapter.getCamera()
      setManifest((prev) => ({
        ...prev,
        presentation: {
          ...prev.presentation,
          cameraBookmarks: updateBookmarkCamera(prev.presentation.cameraBookmarks, id, camera)
        }
      }))
      showToast('Updated bookmark viewpoint to current camera', 'info')
    },
    [adapter, showToast]
  )

  const handleRenameBookmark = useCallback((id: string, name: string) => {
    setManifest((prev) => ({
      ...prev,
      presentation: {
        ...prev.presentation,
        cameraBookmarks: renameBookmark(prev.presentation.cameraBookmarks, id, name)
      }
    }))
  }, [])

  const handleDeleteBookmark = useCallback(
    (id: string) => {
      setManifest((prev) => ({
        ...prev,
        presentation: {
          ...prev.presentation,
          cameraBookmarks: deleteBookmark(prev.presentation.cameraBookmarks, id)
        }
      }))
      setActiveBookmarkIndex((prev) => {
        if (prev === null) return null
        const nextTotal = manifest.presentation.cameraBookmarks.length - 1
        if (nextTotal <= 0) return null
        return Math.min(prev, nextTotal - 1)
      })
    },
    [manifest.presentation.cameraBookmarks.length]
  )

  const handleReorderBookmarks = useCallback((fromIndex: number, toIndex: number) => {
    setManifest((prev) => ({
      ...prev,
      presentation: {
        ...prev.presentation,
        cameraBookmarks: reorderBookmarks(prev.presentation.cameraBookmarks, fromIndex, toIndex)
      }
    }))
    setActiveBookmarkIndex((prevIndex) => {
      if (prevIndex === fromIndex) return toIndex
      return prevIndex
    })
  }, [])

  const handleToggleRecordingSession = useCallback(async () => {
    if (obsStatus === 'connected') {
      try {
        const active = await obsClient.toggleRecord()
        setIsRecordingSession(active)
        showToast(active ? 'OBS recording started' : 'OBS recording stopped', 'info')
        if (active && recordingSeconds === 0) {
          setRecordingSeconds(0)
        }
        return
      } catch {
        // Fallback to local session timer
      }
    }

    setIsRecordingSession((prev) => {
      const next = !prev
      if (next) {
        showToast('Recording session started', 'info')
      } else {
        showToast('Recording session paused/stopped', 'info')
      }
      return next
    })
  }, [obsStatus, recordingSeconds, showToast])

  const handleAddChapterMarker = useCallback(() => {
    const currentBookmark =
      activeBookmarkIndex !== null && manifest.presentation.cameraBookmarks[activeBookmarkIndex]
        ? manifest.presentation.cameraBookmarks[activeBookmarkIndex]
        : null

    const defaultTitle = currentBookmark ? currentBookmark.name : `Chapter ${chapters.length + 1}`
    const updated = addChapterMarker(
      chapters,
      defaultTitle,
      recordingSeconds,
      currentBookmark?.id
    )
    setChapters(updated)
    showToast(`Chapter stamped: "${defaultTitle}" at ${formatTimestamp(recordingSeconds)}`, 'success')
  }, [activeBookmarkIndex, chapters, manifest.presentation.cameraBookmarks, recordingSeconds, showToast])

  const handleSelectChroma = useCallback((mode: string) => {
    const validModes: Record<string, string> = {
      dark: '#121212',
      light: '#ffffff',
      green: '#00ff00',
      blue: '#0000ff',
      magenta: '#ff00ff'
    }
    const color = validModes[mode] || '#121212'
    setChromaMode(mode as any)
    adapter.setBackgroundColor(color)
    showToast(`Canvas background set to ${mode}`, 'info')
  }, [adapter, showToast])

  const handleCycleChroma = useCallback(() => {
    const modes: ('dark' | 'light' | 'green' | 'blue' | 'magenta')[] = [
      'dark',
      'light',
      'green',
      'blue',
      'magenta'
    ]
    const nextIdx = (modes.indexOf(chromaMode) + 1) % modes.length
    handleSelectChroma(modes[nextIdx])
  }, [chromaMode, handleSelectChroma])

  const handleUpdateBookmarkObsScene = useCallback((id: string, sceneName?: string) => {
    setManifest((prev) => ({
      ...prev,
      presentation: {
        ...prev.presentation,
        cameraBookmarks: updateBookmarkObsScene(prev.presentation.cameraBookmarks, id, sceneName)
      }
    }))
  }, [])

  const handleImportImage = useCallback(async () => {
    if (!window.desktopApi?.importAsset) return
    const result = await window.desktopApi.importAsset()
    if (!result) return

    const { asset, dataUrl } = result

    // Update manifest assets
    setManifest((prev) => ({
      ...prev,
      assets: {
        ...prev.assets,
        [asset.id]: asset
      }
    }))

    // Add file to adapter
    const fileId = `file_${asset.hash.substring(0, 12)}`
    adapter.addFile({
      id: fileId,
      mimeType: asset.mimeType,
      dataURL: dataUrl,
      created: Date.now()
    })

    // Place at camera center
    const sceneCenter = adapter.getViewportCenter()

    adapter.addObject({
      type: 'image',
      x: sceneCenter.x - 150,
      y: sceneCenter.y - 150,
      width: 300,
      height: 300,
      fileId
    })
    showToast('Image inserted onto canvas', 'success')
    setAssetData((previous) => ({
      ...previous,
      [asset.id]: dataUrl.split(',')[1] || dataUrl
    }))
  }, [adapter, showToast])

  // PDF import handler
  const handleImportPdf = useCallback(async () => {
    if (!window.desktopApi?.importPdf) return
    const result = await window.desktopApi.importPdf()
    if (!result) return

    try {
      const pdfDoc = await PdfService.loadPdfFromBase64(result.pdfBase64, result.document.id)
      const updatedDoc: DocumentEntry = {
        ...result.document,
        pageCount: pdfDoc.numPages
      }

      setManifest((prev) => ({
        ...prev,
        documents: [...prev.documents, updatedDoc],
        assets: {
          ...prev.assets,
          [result.asset.id]: result.asset
        }
      }))
      setAssetData((previous) => ({ ...previous, [result.asset.id]: result.pdfBase64 }))

      setActiveDocument(updatedDoc)
      setActivePdfDoc(pdfDoc)
      setIsDocumentDockOpen(true)
      showToast(`Loaded "${updatedDoc.filename}" (${pdfDoc.numPages} slides)`, 'success')
    } catch (err) {
      console.error('[App] Failed to load imported PDF:', err)
      showToast(
        `Failed to parse and load PDF document: ${err instanceof Error ? err.message : 'Unknown error'}`,
        'warning'
      )
    }
  }, [showToast])

  // Drag-and-drop handler for dropped PDF slide pages
  const handleDropPdfPage = useCallback(
    async (pageNumber: number, sceneX: number, sceneY: number) => {
      if (!activePdfDoc || !adapter) return

      try {
        const rendered = await PdfService.renderPage(activePdfDoc, pageNumber, 2.0)
        const targetWidth = 800
        const targetHeight = Math.round(targetWidth / rendered.aspectRatio)

        const fileId = `pdf_page_${activeDocument?.id || 'doc'}_p${pageNumber}_${Date.now()}`

        adapter.addFile({
          id: fileId,
          mimeType: 'image/png',
          dataURL: rendered.dataUrl,
          created: Date.now()
        })

        adapter.addObject({
          type: 'image',
          x: Math.round(sceneX - targetWidth / 2),
          y: Math.round(sceneY - targetHeight / 2),
          width: targetWidth,
          height: targetHeight,
          fileId,
          // Pages are regular canvas objects by default, so a dropped page can be
          // selected, moved, resized, or locked using the document dock.
          locked: false,
          customData: {
            type: 'pdf-slide',
            docId: activeDocument?.id,
            pageNumber
          }
        })
        showToast(`Slide ${pageNumber} placed onto canvas`, 'success')
      } catch (err) {
        console.error('[App] Failed placing dropped slide page:', err)
      }
    },
    [activePdfDoc, activeDocument, adapter, showToast]
  )

  const handleToggleDevTools = useCallback(() => {
    window.desktopApi?.toggleDevTools()
  }, [])

  const dismissActivePanel = useCallback(() => {
    if (isShortcutSettingsOpen) {
      setIsShortcutSettingsOpen(false)
      return true
    }
    else if (isMarqueeSelecting) {
      setIsMarqueeSelecting(false)
      setIsExportModalOpen(true)
      return true
    } else if (isChaptersModalOpen) {
      setIsChaptersModalOpen(false)
      return true
    } else if (isObsModalOpen) {
      setIsObsModalOpen(false)
      return true
    } else if (isExportModalOpen) {
      setIsExportModalOpen(false)
      return true
    } else if (isCodeModalOpen) {
      setIsCodeModalOpen(false)
      return true
    } else if (isBookmarksDrawerOpen) {
      setIsBookmarksDrawerOpen(false)
      return true
    } else if (isRecordingMode) {
      setIsRecordingMode(false)
      return true
    }
    return false
  }, [isBookmarksDrawerOpen, isChaptersModalOpen, isCodeModalOpen, isExportModalOpen, isMarqueeSelecting, isObsModalOpen, isRecordingMode, isShortcutSettingsOpen])

  const shortcutRegistry = useMemo(() => createShortcutRegistry({
    newProject: handleNewProject,
    openProject: handleOpenProject,
    saveProject: handleSaveProject,
    saveProjectAs: handleSaveProjectAs,
    exportProject: () => setIsExportModalOpen(true),
    quickCopy: handleQuickClipboardCopy,
    setTool: (tool) => canvasToolSetter.current?.(tool) ?? adapter.setTool(tool),
    importImage: handleImportImage,
    undo: () => adapter.undo(),
    redo: () => adapter.redo(),
    zoomIn: () => { const camera = adapter.getCamera(); adapter.setCamera({ ...camera, zoom: Math.min(4, camera.zoom * 1.2) }) },
    zoomOut: () => { const camera = adapter.getCamera(); adapter.setCamera({ ...camera, zoom: Math.max(0.1, camera.zoom / 1.2) }) },
    resetView: () => adapter.resetView(),
    toggleSidebar: () => setIsSidebarOpen((current) => !current),
    toggleDocumentDock: () => setIsDocumentDockOpen((current) => !current),
    toggleBookmarks: () => setIsBookmarksDrawerOpen((current) => !current),
    addBookmark: () => handleAddBookmark(),
    jumpToBookmark: handleJumpToBookmark,
    nextBookmark: handleNextBookmark,
    previousBookmark: handlePreviousBookmark,
    toggleRecordingMode: () => setIsRecordingMode((current) => !current),
    addChapter: handleAddChapterMarker,
    toggleInspector: () => setIsInspectorOpen((current) => !current),
    dismiss: dismissActivePanel
  }), [adapter, dismissActivePanel, handleAddBookmark, handleAddChapterMarker, handleImportImage, handleJumpToBookmark, handleNewProject, handleNextBookmark, handleOpenProject, handlePreviousBookmark, handleQuickClipboardCopy, handleSaveProject, handleSaveProjectAs])

  useShortcutDispatcher(shortcutRegistry, shortcutPreferences)

  const setShortcutBinding = useCallback((id: string, binding: ShortcutBinding | null) => {
    setShortcutPreferences((current) => {
      const next = { ...current, overrides: { ...current.overrides, [id]: binding } }
      saveShortcutPreferences(next)
      return next
    })
  }, [])
  const restoreShortcutDefault = useCallback((id: string) => {
    setShortcutPreferences((current) => {
      const overrides = { ...current.overrides }
      delete overrides[id]
      const next = { ...current, overrides }
      saveShortcutPreferences(next)
      return next
    })
  }, [])
  const restoreAllShortcutDefaults = useCallback(() => {
    const next: ShortcutPreferences = { version: 1, overrides: {} }
    setShortcutPreferences(next)
    saveShortcutPreferences(next)
  }, [])
  const shortcutLabel = useCallback((id: string): string | undefined => {
    const command = shortcutRegistry.find((entry) => entry.id === id)
    const binding = command && getActiveBinding(command, shortcutPreferences.overrides)
    return binding ? formatBinding(binding) : undefined
  }, [shortcutPreferences.overrides, shortcutRegistry])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#121212',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Top Application Toolbar */}
      <TopToolbar
        projectTitle={manifest.title}
        projectDir={projectDir}
        isRecordingMode={isRecordingMode}
        isInspectorOpen={isInspectorOpen}
        hasDocument={Boolean(activeDocument)}
        isDocumentDockOpen={isDocumentDockOpen}
        bookmarksCount={manifest.presentation.cameraBookmarks.length}
        isBookmarksOpen={isBookmarksDrawerOpen}
        onToggleRecordingMode={() => setIsRecordingMode((prev) => !prev)}
        onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
        onToggleDocumentDock={() => setIsDocumentDockOpen((prev) => !prev)}
        onToggleBookmarks={() => setIsBookmarksDrawerOpen((prev) => !prev)}
        onAddBookmark={() => handleAddBookmark()}
        onNewProject={handleNewProject}
        onOpenProject={handleOpenProject}
        onRenameProject={handleRenameProject}
        onSaveProject={handleSaveProject}
        onSaveProjectAs={handleSaveProjectAs}
        onOpenExport={() => setIsExportModalOpen(true)}
        onToggleDevTools={handleToggleDevTools}
        onOpenShortcutSettings={() => setIsShortcutSettingsOpen(true)}
        shortcutLabel={shortcutLabel}
        onOpenChapters={() => setIsChaptersModalOpen(true)}
        chaptersCount={chapters.length}
        onOpenObs={() => setIsObsModalOpen(true)}
        obsStatus={obsStatus}
        chromaMode={chromaMode}
        onSelectChroma={handleSelectChroma}
      />

      {/* Architecture Icon Library Sidebar (hidden in recording mode) */}
      {!isRecordingMode && (
        <IconSidebar
          adapter={adapter}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((prev) => !prev)}
          width={sidebarWidth}
          onWidthChange={handleSidebarWidthChange}
          onResizeStart={() => setIsResizingSidebar(true)}
          onResizeEnd={() => setIsResizingSidebar(false)}
        />
      )}

      {/* Main Excalidraw Infinite Canvas */}
      <CanvasView
        adapter={adapter}
        isRecordingMode={isRecordingMode}
        isSidebarOpen={isSidebarOpen}
        sidebarWidth={sidebarWidth}
        isResizingSidebar={isResizingSidebar}
        onDropPdfPage={handleDropPdfPage}
        onImportPdf={handleImportPdf}
        onImportImage={handleImportImage}
        onOpenCodeSnippetModal={() => setIsCodeModalOpen(true)}
        onRegisterToolSetter={(setter) => { canvasToolSetter.current = setter }}
        shortcutLabel={shortcutLabel}
      />

      <ShortcutSettingsModal
        isOpen={isShortcutSettingsOpen}
        commands={shortcutRegistry}
        preferences={shortcutPreferences}
        onClose={() => setIsShortcutSettingsOpen(false)}
        onSetBinding={setShortcutBinding}
        onRestoreDefault={restoreShortcutDefault}
        onRestoreAllDefaults={restoreAllShortcutDefaults}
      />

      {/* Slide-Strip Dock for Loaded PDF Documents (hidden in recording mode) */}
      {!isRecordingMode && (
        <DocumentSlideDock
          documentEntry={activeDocument}
          pdfDoc={activePdfDoc}
          adapter={adapter}
          isOpen={isDocumentDockOpen}
          onClose={() => setIsDocumentDockOpen(false)}
        />
      )}

      {/* Camera Bookmarks & Scene Tour Drawer */}
      <BookmarksDrawer
        isOpen={isBookmarksDrawerOpen && !isRecordingMode}
        bookmarks={manifest.presentation.cameraBookmarks}
        activeBookmarkIndex={activeBookmarkIndex}
        onClose={() => setIsBookmarksDrawerOpen(false)}
        onAddBookmark={() => handleAddBookmark()}
        onJumpToBookmark={handleJumpToBookmark}
        onNextBookmark={handleNextBookmark}
        onPreviousBookmark={handlePreviousBookmark}
        onUpdateBookmarkCamera={handleUpdateBookmarkCamera}
        onRenameBookmark={handleRenameBookmark}
        onDeleteBookmark={handleDeleteBookmark}
        onReorderBookmarks={handleReorderBookmarks}
        obsScenes={obsScenes.map((s) => s.sceneName)}
        onUpdateBookmarkObsScene={handleUpdateBookmarkObsScene}
      />

      {/* Presenter Tour Bar (floating HUD at bottom) */}
      <PresenterTourBar
        bookmarks={manifest.presentation.cameraBookmarks}
        activeBookmarkIndex={activeBookmarkIndex}
        isRecordingMode={isRecordingMode}
        onJumpToBookmark={handleJumpToBookmark}
        onNextBookmark={handleNextBookmark}
        onPreviousBookmark={handlePreviousBookmark}
        onToggleDrawer={() => setIsBookmarksDrawerOpen((prev) => !prev)}
        recordingState={{
          isRecording: isRecordingSession,
          seconds: recordingSeconds,
          chaptersCount: chapters.length
        }}
        onToggleRecording={handleToggleRecordingSession}
        onAddChapterMarker={handleAddChapterMarker}
        onOpenChapters={() => setIsChaptersModalOpen(true)}
        obsStatus={obsStatus}
        onOpenObs={() => setIsObsModalOpen(true)}
        chromaMode={chromaMode}
        onCycleChroma={handleCycleChroma}
      />

      {/* YouTube Video Chapters Modal */}
      <ChaptersModal
        isOpen={isChaptersModalOpen}
        projectTitle={manifest.title}
        chapters={chapters}
        currentRecordingSeconds={recordingSeconds}
        onClose={() => setIsChaptersModalOpen(false)}
        onUpdateChapters={setChapters}
        onToast={showToast}
      />

      {/* OBS Studio WebSocket Modal */}
      <ObsModal
        isOpen={isObsModalOpen}
        onClose={() => setIsObsModalOpen(false)}
        autoSwitchScene={autoSwitchObsScene}
        onToggleAutoSwitchScene={setAutoSwitchObsScene}
        onToast={showToast}
      />

      {/* Syntax-Highlighted Code Snippet Modal */}
      <CodeSnippetModal
        adapter={adapter}
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />

      {/* Production Export Pipeline Modal */}
      <ExportModal
        isOpen={isExportModalOpen && !isMarqueeSelecting}
        adapter={adapter}
        projectTitle={manifest.title}
        customBounds={customExportBounds}
        onClose={() => setIsExportModalOpen(false)}
        onStartMarquee={() => {
          setIsExportModalOpen(false)
          setIsMarqueeSelecting(true)
        }}
        onToast={showToast}
      />

      {/* Interactive Marquee Region Selector */}
      {isMarqueeSelecting && (
        <MarqueeSelector
          adapter={adapter}
          onSelectBounds={(bounds) => {
            setCustomExportBounds(bounds)
            setIsMarqueeSelecting(false)
            setIsExportModalOpen(true)
            showToast(`Bounded area captured: ${bounds.width}×${bounds.height}px`, 'info')
          }}
          onCancel={() => {
            setIsMarqueeSelecting(false)
            setIsExportModalOpen(true)
          }}
        />
      )}

      {/* Developer Input / Stylus Inspector */}
      <InputInspector
        snapshot={pointerSnapshot}
        systemInfo={systemInfo}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
      />

      {/* Global Notification Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#18181b',
            border: `1px solid ${
              toast.type === 'success' ? '#22c55e' : toast.type === 'warning' ? '#f59e0b' : '#3b82f6'
            }`,
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
            zIndex: 9999,
            pointerEvents: 'none',
            animation: 'fadeInUp 0.2s ease-out'
          }}
        >
          {toast.type === 'success' && <CheckCircle2 size={16} color="#22c55e" />}
          {toast.type === 'warning' && <AlertTriangle size={16} color="#f59e0b" />}
          {toast.type === 'info' && <Info size={16} color="#60a5fa" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}
