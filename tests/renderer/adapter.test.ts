import { describe, expect, it, vi } from 'vitest'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

vi.mock('../../src/core/icons/icon-loader', () => ({ loadAllIcons: () => [] }))

vi.mock('@excalidraw/excalidraw', () => ({
  convertToExcalidrawElements: (elements: unknown[]) => elements,
  viewportCoordsToSceneCoords: ({ clientX, clientY }: any, state: any) => ({
    x: (clientX - state.offsetLeft) / state.zoom.value - state.scrollX,
    y: (clientY - state.offsetTop) / state.zoom.value - state.scrollY
  }),
  getCommonBounds: (elements: any[]) => [Math.min(...elements.map(e => e.x)), Math.min(...elements.map(e => e.y)), Math.max(...elements.map(e => e.x + e.width)), Math.max(...elements.map(e => e.y + e.height))],
  exportToCanvas: vi.fn(), exportToSvg: vi.fn()
}))
import { exportToCanvas, exportToSvg } from '@excalidraw/excalidraw'
import { ExcalidrawCanvasAdapter } from '../../src/renderer/src/components/canvas/ExcalidrawCanvasAdapter'

function harness() {
  let elements: any[] = []
  let state: any = { scrollX: 10, scrollY: 20, zoom: { value: 2 }, offsetLeft: 50, offsetTop: 60, width: 800, height: 600, selectedElementIds: {}, activeTool: { type: 'selection' } }
  let files: Record<string, any> = {}
  let listener: (...args: any[]) => void = () => {}
  const unsubscribe = vi.fn()
  const api = {
    onChange: vi.fn((callback: typeof listener) => { listener = callback; return unsubscribe }),
    updateScene: vi.fn((scene: any) => { elements = scene.elements ?? elements; state = { ...state, ...scene.appState } }),
    getSceneElements: () => elements, getSceneElementsIncludingDeleted: () => elements,
    getAppState: () => state, getFiles: () => files,
    addFiles: vi.fn((incoming: any[]) => { files = { ...files, ...Object.fromEntries(incoming.map(f => [f.id, f])) } }),
    setActiveTool: vi.fn()
  }
  const adapter = new ExcalidrawCanvasAdapter()
  return { adapter, api, unsubscribe, attach: () => adapter.setApi(api as unknown as ExcalidrawImperativeAPI), emit: () => listener(elements, state, files) }
}

describe('real canvas adapter', () => {
  it('restores pending elements, files and camera on attachment and serializes only persistent state', () => {
    const h = harness()
    const scene = { elements: [{ id: 'image', type: 'image', customData: { iconId: 'icon' }, status: 'pending' }], appState: { scrollX: 100, zoom: { value: 1 } }, files: { img: { id: 'img', dataURL: 'data:image/png;base64,YQ==' } } }
    h.adapter.deserialize(scene); expect(h.adapter.serialize()).toEqual(scene)
    h.attach()
    expect(h.api.addFiles).toHaveBeenCalledOnce()
    expect(h.adapter.serialize()).toMatchObject({ elements: [{ status: 'saved' }], appState: { scrollX: 100 }, files: scene.files })
    expect((h.adapter.serialize() as any).appState.selectedElementIds).toBeUndefined()
  })

  it('inserts, selects, locks, removes and converts between viewport and scene coordinates', () => {
    const h = harness(); h.attach()
    const id = h.adapter.addObject({ type: 'rectangle', x: 0, y: 0, width: 100, height: 80, customData: { doc: 'a' } })
    h.api.updateScene({ appState: { selectedElementIds: { [id]: true, missing: false } } })
    expect(h.adapter.getSelection()).toEqual([id]); expect(h.adapter.getElementsCount('selection')).toBe(1)
    expect(h.adapter.setObjectsLockedByCustomData({ doc: 'a' }, true)).toBe(1)
    expect(h.adapter.setObjectsLockedByCustomData({ doc: 'b' }, true)).toBe(0)
    const screen = h.adapter.sceneToScreen({ x: 30, y: 40 })
    expect(screen).toEqual({ x: 130, y: 180 })
    expect(h.adapter.screenToScene(screen.x, screen.y)).toEqual({ x: 30, y: 40 })
    h.adapter.clearSelection(); expect(h.adapter.getSelection()).toEqual([])
    h.adapter.removeObject(id); expect(h.adapter.getElementsCount()).toBe(0)
  })

  it('creates native bindings and removes stale connectors after endpoint deletion', () => {
    const h = harness(); h.attach()
    const [a, b] = h.adapter.addObjects([{ type: 'rectangle', x: 0, y: 0, width: 100, height: 80 }, { type: 'rectangle', x: 300, y: 0, width: 100, height: 80 }])
    const connector = h.adapter.createQuickConnector(a, 'right', b, 'left')
    expect(connector).toBeTruthy()
    expect(h.api.getSceneElements().find(e => e.id === a).boundElements).toContainEqual({ id: connector, type: 'arrow' })
    const c = h.adapter.addObject({ type: 'rectangle', x: 600, y: 0, width: 100, height: 80 })
    expect(h.adapter.reconnectQuickConnector(connector!, 'target', a, 'left')).toBe(false)
    expect(h.adapter.reconnectQuickConnector(connector!, 'target', c, 'left')).toBe(true)
    expect(h.api.getSceneElements().find(e => e.id === b).boundElements).toEqual([])
    expect(h.api.getSceneElements().find(e => e.id === c).boundElements).toContainEqual({ id: connector, type: 'arrow' })
    h.adapter.removeObject(c); h.emit()
    expect(h.api.getSceneElements().find(e => e.id === connector).isDeleted).toBe(true)
  })

  it('exports real PNG/SVG adapter results and reports invalid selections', async () => {
    const h = harness(); h.attach()
    h.adapter.addObject({ type: 'rectangle', x: 0, y: 0, width: 100, height: 80 })
    vi.mocked(exportToCanvas).mockResolvedValue({ width: 264, height: 224, toDataURL: () => 'data:image/png;base64,YQ==', toBlob: (callback: (blob: Blob) => void) => callback(new Blob(['png'])) } as unknown as HTMLCanvasElement)
    const config = { format: 'png', scope: 'all', resolutionPreset: '2x', backgroundMode: 'dark', padding: 16 } as const
    expect(await h.adapter.exportCanvas(config)).toMatchObject({ format: 'png', width: 264, height: 224, blob: expect.any(Blob) })
    expect(exportToCanvas).toHaveBeenCalledWith(expect.objectContaining({ exportPadding: 16, getDimensions: expect.any(Function) }))
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('width', '132'); svg.setAttribute('height', '112')
    vi.mocked(exportToSvg).mockResolvedValue(svg)
    expect(await h.adapter.exportCanvas({ ...config, format: 'svg' })).toMatchObject({ svgString: expect.stringContaining('xmlns='), width: 132 })
    await expect(h.adapter.exportCanvas({ ...config, scope: 'selection' })).rejects.toThrow('No elements')
    h.adapter.destroy(); await expect(h.adapter.exportCanvas(config)).rejects.toThrow('not ready')
  })

  it('cancels animation, unsubscribes listeners on replacement and disposes on destroy', async () => {
    const h = harness(); h.attach()
    const sceneListener = vi.fn(); const change = vi.fn()
    const dispose = h.adapter.subscribeToScene(sceneListener); h.adapter.setChangeListener(change)
    h.emit(); expect(sceneListener).toHaveBeenCalledOnce(); expect(change).toHaveBeenCalledOnce()
    dispose(); h.emit(); expect(sceneListener).toHaveBeenCalledOnce()
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 7)); const cancel = vi.fn(); vi.stubGlobal('cancelAnimationFrame', cancel)
    const animation = h.adapter.animateCameraTo({ x: 1, y: 2, zoom: 1 })
    h.adapter.stopCameraAnimation(); await animation; expect(cancel).toHaveBeenCalledWith(7)
    h.attach(); expect(h.unsubscribe).toHaveBeenCalledOnce()
    h.adapter.destroy(); expect(h.unsubscribe).toHaveBeenCalledTimes(2)
    expect(h.adapter.getCurrentElements()).toEqual([])
  })
})
