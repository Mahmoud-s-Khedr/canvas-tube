import React, { useState, useEffect, useMemo, useCallback } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import {
  ProjectManifest,
  DocumentEntry,
  createDefaultManifest
} from '@core/project/project-manifest'
import { CanvasPointerSnapshot } from '@core/canvas/canvas-adapter'
import {
  createBookmark,
  updateBookmarkCamera,
  renameBookmark,
  deleteBookmark,
  reorderBookmarks,
  getNextBookmarkIndex,
  getPreviousBookmarkIndex
} from '@core/bookmarks/bookmark-manager'
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
import { PdfService } from './services/pdf-service'

export const App: React.FC = () => {
  const adapter = useMemo(() => new ExcalidrawCanvasAdapter(), [])
  const [manifest, setManifest] = useState<ProjectManifest>(() =>
    createDefaultManifest('System Design Explanation')
  )
  const [projectDir, setProjectDir] = useState<string | null>(null)
  const [isRecordingMode, setIsRecordingMode] = useState(false)
  const [isInspectorOpen, setIsInspectorOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
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

  // Listen to pointer events from adapter
  useEffect(() => {
    adapter.setPointerListener((snapshot) => {
      setPointerSnapshot(snapshot)
    })
    return () => {
      adapter.setPointerListener(undefined)
    }
  }, [adapter])

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
    const fresh = createDefaultManifest('New Architecture Canvas')
    setManifest(fresh)
    setProjectDir(null)
    setActiveDocument(null)
    setActivePdfDoc(null)
    setIsDocumentDockOpen(false)
    setIsBookmarksDrawerOpen(false)
    setActiveBookmarkIndex(null)
    adapter.deserialize({ elements: [], appState: {} })
  }, [adapter])

  const handleOpenProject = useCallback(async () => {
    if (!window.desktopApi?.openProject) return
    const result = await window.desktopApi.openProject()
    if (result) {
      setProjectDir(result.projectDir)
      setManifest(result.bundle.manifest)
      adapter.deserialize(result.bundle.sceneData)
      setActiveBookmarkIndex(null)

      // Restore PDF document if present in opened project
      if (result.bundle.manifest.documents.length > 0) {
        const firstDoc = result.bundle.manifest.documents[0]
        const asset = result.bundle.manifest.assets[firstDoc.assetId]
        if (asset && window.desktopApi.readDocumentFile) {
          try {
            const base64 = await window.desktopApi.readDocumentFile(result.projectDir, asset.relativePath)
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

  const handleSaveProject = useCallback(async () => {
    if (!window.desktopApi?.saveProject) return
    const sceneData = adapter.serialize()

    if (!projectDir) {
      // Save As if not saved yet
      const saveAsResult = await window.desktopApi.saveProjectAs(manifest.title, {
        manifest,
        sceneData
      })
      if (saveAsResult?.success && saveAsResult.path) {
        setProjectDir(saveAsResult.path)
      }
      return
    }

    const saveResult = await window.desktopApi.saveProject(projectDir, {
      manifest,
      sceneData
    })
    if (!saveResult.success) {
      alert(`Save failed: ${saveResult.error || 'Unknown error'}`)
    }
  }, [adapter, manifest, projectDir])

  const handleSaveProjectAs = useCallback(async () => {
    if (!window.desktopApi?.saveProjectAs) return
    const sceneData = adapter.serialize()
    const saveAsResult = await window.desktopApi.saveProjectAs(manifest.title, {
      manifest,
      sceneData
    })
    if (saveAsResult?.success && saveAsResult.path) {
      setProjectDir(saveAsResult.path)
    }
  }, [adapter, manifest])

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
    },
    [adapter, manifest.presentation.cameraBookmarks.length]
  )

  const handleJumpToBookmark = useCallback(
    (index: number) => {
      const bookmarks = manifest.presentation.cameraBookmarks
      if (index < 0 || index >= bookmarks.length) return
      const bm = bookmarks[index]
      setActiveBookmarkIndex(index)
      adapter.animateCameraTo({ x: bm.x, y: bm.y, zoom: bm.zoom }, 600)
    },
    [adapter, manifest.presentation.cameraBookmarks]
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
    },
    [adapter]
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
    const camera = adapter.getCamera()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const sceneCenterX = -camera.x / camera.zoom + viewportWidth / (2 * camera.zoom)
    const sceneCenterY = -camera.y / camera.zoom + viewportHeight / (2 * camera.zoom)

    adapter.addObject({
      type: 'image',
      x: sceneCenterX - 150,
      y: sceneCenterY - 150,
      width: 300,
      height: 300,
      fileId
    })
  }, [adapter])

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

      setActiveDocument(updatedDoc)
      setActivePdfDoc(pdfDoc)
      setIsDocumentDockOpen(true)
    } catch (err) {
      console.error('[App] Failed to load imported PDF:', err)
      alert(`Failed to parse and load PDF document: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }, [])

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
          locked: true,
          customData: {
            type: 'pdf-slide',
            docId: activeDocument?.id,
            pageNumber
          }
        })
      } catch (err) {
        console.error('[App] Failed placing dropped slide page:', err)
      }
    },
    [activePdfDoc, activeDocument, adapter]
  )

  const handleToggleDevTools = useCallback(() => {
    window.desktopApi?.toggleDevTools()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)

      // Ctrl+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (e.shiftKey) {
          handleSaveProjectAs()
        } else {
          handleSaveProject()
        }
        return
      }

      // Ctrl+O: Open
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        handleOpenProject()
        return
      }

      // Ctrl+N: New
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        handleNewProject()
        return
      }

      // Ctrl+B / Cmd+B: Save current viewpoint as bookmark
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && !e.shiftKey) {
        e.preventDefault()
        handleAddBookmark()
        return
      }

      // Ctrl+Shift+R or F10: Toggle Recording Mode
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r') ||
        e.key === 'F10'
      ) {
        e.preventDefault()
        setIsRecordingMode((prev) => !prev)
        return
      }

      // Escape: Exit recording mode or close active drawers/modals
      if (e.key === 'Escape') {
        if (isCodeModalOpen) {
          setIsCodeModalOpen(false)
        } else if (isBookmarksDrawerOpen) {
          setIsBookmarksDrawerOpen(false)
        } else if (isRecordingMode) {
          setIsRecordingMode(false)
        }
        return
      }

      // Ctrl+Shift+I: Toggle Stylus Inspector
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault()
        setIsInspectorOpen((prev) => !prev)
        return
      }

      // Hotkeys below should not be intercepted if typing in input/textarea
      if (isInput) return

      // PageDown or Alt+ArrowRight: Next bookmark in tour
      if (e.key === 'PageDown' || (e.altKey && e.key === 'ArrowRight')) {
        e.preventDefault()
        handleNextBookmark()
        return
      }

      // PageUp or Alt+ArrowLeft: Previous bookmark in tour
      if (e.key === 'PageUp' || (e.altKey && e.key === 'ArrowLeft')) {
        e.preventDefault()
        handlePreviousBookmark()
        return
      }

      // Alt+1 through Alt+9: Instant jump to bookmark index 1 through 9
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const num = parseInt(e.key, 10)
        if (!isNaN(num) && num >= 1 && num <= 9) {
          e.preventDefault()
          handleJumpToBookmark(num - 1)
          return
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    handleSaveProject,
    handleSaveProjectAs,
    handleOpenProject,
    handleNewProject,
    handleAddBookmark,
    handleJumpToBookmark,
    handleNextBookmark,
    handlePreviousBookmark,
    isRecordingMode,
    isCodeModalOpen,
    isBookmarksDrawerOpen
  ])

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
        onSaveProject={handleSaveProject}
        onSaveProjectAs={handleSaveProjectAs}
        onImportImage={handleImportImage}
        onImportPdf={handleImportPdf}
        onOpenCodeSnippetModal={() => setIsCodeModalOpen(true)}
        onToggleDevTools={handleToggleDevTools}
      />

      {/* Architecture Icon Library Sidebar (hidden in recording mode) */}
      {!isRecordingMode && (
        <IconSidebar
          adapter={adapter}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((prev) => !prev)}
        />
      )}

      {/* Main Excalidraw Infinite Canvas */}
      <CanvasView
        adapter={adapter}
        isRecordingMode={isRecordingMode}
        isSidebarOpen={isSidebarOpen}
        onDropPdfPage={handleDropPdfPage}
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
      />

      {/* Syntax-Highlighted Code Snippet Modal */}
      <CodeSnippetModal
        adapter={adapter}
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />

      {/* Developer Input / Stylus Inspector */}
      <InputInspector
        snapshot={pointerSnapshot}
        systemInfo={systemInfo}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
      />
    </div>
  )
}
