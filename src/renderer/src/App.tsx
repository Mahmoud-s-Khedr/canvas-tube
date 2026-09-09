import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ProjectManifest,
  createDefaultManifest
} from '@core/project/project-manifest'
import { CanvasPointerSnapshot } from '@core/canvas/canvas-adapter'
import { SystemInfo } from '@core/desktop/desktop-api'
import { ExcalidrawCanvasAdapter } from './components/canvas/ExcalidrawCanvasAdapter'
import { CanvasView } from './components/canvas/CanvasView'
import { TopToolbar } from './components/toolbar/TopToolbar'
import { IconSidebar } from './components/sidebar/IconSidebar'
import { InputInspector } from './components/inspector/InputInspector'

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
    adapter.deserialize({ elements: [], appState: {} })
  }, [adapter])

  const handleOpenProject = useCallback(async () => {
    if (!window.desktopApi?.openProject) return
    const result = await window.desktopApi.openProject()
    if (result) {
      setProjectDir(result.projectDir)
      setManifest(result.bundle.manifest)
      adapter.deserialize(result.bundle.sceneData)
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

  const handleToggleDevTools = useCallback(() => {
    window.desktopApi?.toggleDevTools()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (e.shiftKey) {
          handleSaveProjectAs()
        } else {
          handleSaveProject()
        }
      }
      // Ctrl+O: Open
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        handleOpenProject()
      }
      // Ctrl+N: New
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        handleNewProject()
      }
      // Ctrl+Shift+R or F10: Toggle Recording Mode
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r') || e.key === 'F10') {
        e.preventDefault()
        setIsRecordingMode((prev) => !prev)
      }
      // Escape: Exit recording mode if active
      if (e.key === 'Escape' && isRecordingMode) {
        setIsRecordingMode(false)
      }
      // Ctrl+Shift+I: Toggle Stylus Inspector
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault()
        setIsInspectorOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    handleSaveProject,
    handleSaveProjectAs,
    handleOpenProject,
    handleNewProject,
    isRecordingMode
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
        onToggleRecordingMode={() => setIsRecordingMode((prev) => !prev)}
        onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
        onNewProject={handleNewProject}
        onOpenProject={handleOpenProject}
        onSaveProject={handleSaveProject}
        onSaveProjectAs={handleSaveProjectAs}
        onImportImage={handleImportImage}
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
