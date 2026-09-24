import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { Point } from '@core/canvas/canvas-adapter'
import {
  CONNECTOR_ANCHORS,
  anchorNormal,
  anchorScenePoint,
  canInitiateConnection,
  chooseTargetAnchor,
  connectorMetadata,
  isConnectableElement,
  orthogonalPreviewPoints,
  pointInExpandedScreenBounds,
  type ConnectableElement,
  type ConnectionAnchor
} from '@core/canvas/connectors'
import { ExcalidrawCanvasAdapter } from './ExcalidrawCanvasAdapter'

interface QuickConnectOverlayProps {
  adapter: ExcalidrawCanvasAdapter
  container: HTMLElement | null
}

type DragState =
  | {
      kind: 'new'
      sourceElementId: string
      sourceAnchor: ConnectionAnchor
      clientPoint: Point
    }
  | {
      kind: 'reconnect'
      connectorId: string
      endpoint: 'source' | 'target'
      sourceElementId: string
      sourceAnchor: ConnectionAnchor
      targetElementId: string
      targetAnchor: ConnectionAnchor
      clientPoint: Point
    }

const HANDLE_SIZE = 16
const HIT_RADIUS = 22
const HANDLE_OFFSET = 25

const oppositeAnchor = (anchor: ConnectionAnchor): ConnectionAnchor => {
  switch (anchor) {
    case 'top':
      return 'bottom'
    case 'right':
      return 'left'
    case 'bottom':
      return 'top'
    case 'left':
      return 'right'
  }
}

const pointsAttribute = (points: Point[]): string => points.map((point) => `${point.x},${point.y}`).join(' ')

export const QuickConnectOverlay: React.FC<QuickConnectOverlayProps> = ({ adapter, container }) => {
  const [, setRevision] = useState(0)
  const [drag, setDrag] = useState<DragState | null>(null)

  useEffect(() => adapter.subscribeToScene(() => setRevision((revision) => revision + 1)), [adapter])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrag(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const elements = adapter.getCurrentElements() as readonly (ConnectableElement & Record<string, any>)[]
  const elementsById = useMemo(() => new Map(elements.map((element) => [element.id, element])), [elements])
  const selection = adapter.getSelection()
  const selectedElement = selection.length === 1 ? elementsById.get(selection[0]) : undefined
  const selectedConnector = selectedElement ? connectorMetadata(selectedElement.customData?.canvastubeConnector) : null
  const selectedSource = canInitiateConnection(selectedElement) ? selectedElement : null
  const rect = container?.getBoundingClientRect()

  const toOverlay = useCallback(
    (point: Point): Point => ({ x: point.x - (rect?.left || 0), y: point.y - (rect?.top || 0) }),
    [rect?.left, rect?.top]
  )
  const toScreen = useCallback((point: Point) => adapter.sceneToScreen(point), [adapter])
  const toScene = useCallback((point: Point) => adapter.screenToScene(point.x, point.y), [adapter])

  const getCandidate = useCallback(
    (clientPoint: Point, excludedIds: Set<string>, sourcePoint: Point) => {
      const candidates = elements.filter(
        (element) =>
          !excludedIds.has(element.id) &&
          isConnectableElement(element) &&
          pointInExpandedScreenBounds(clientPoint, element, toScreen, HIT_RADIUS)
      )
      const target = candidates[candidates.length - 1]
      if (!target) return null
      return {
        element: target,
        anchor: chooseTargetAnchor(clientPoint, sourcePoint, target, toScreen, HIT_RADIUS)
      }
    },
    [elements, toScreen]
  )

  /**
   * Commits only when the user has deliberately reached another connectable
   * element. Returning false leaves the arrow attached to the cursor instead
   * of silently throwing the interaction away.
   */
  const commitDrag = useCallback(
    (activeDrag: DragState, clientPoint: Point): boolean => {
      if (activeDrag.kind === 'new') {
        const source = elementsById.get(activeDrag.sourceElementId)
        if (!source) return false
        const candidate = getCandidate(clientPoint, new Set([source.id]), anchorScenePoint(source, activeDrag.sourceAnchor))
        return Boolean(candidate && adapter.createQuickConnector(source.id, activeDrag.sourceAnchor, candidate.element.id, candidate.anchor))
      }

      const fixedElementId = activeDrag.endpoint === 'source' ? activeDrag.targetElementId : activeDrag.sourceElementId
      const fixedElement = elementsById.get(fixedElementId)
      if (!fixedElement) return false
      const fixedAnchor = activeDrag.endpoint === 'source' ? activeDrag.targetAnchor : activeDrag.sourceAnchor
      const candidate = getCandidate(clientPoint, new Set([fixedElementId]), anchorScenePoint(fixedElement, fixedAnchor))
      return Boolean(candidate && adapter.reconnectQuickConnector(activeDrag.connectorId, activeDrag.endpoint, candidate.element.id, candidate.anchor))
    },
    [adapter, elementsById, getCandidate]
  )

  // A connection begins with a click or press on a handle. Once it begins,
  // listen at window level because the SVG intentionally has pointer-events
  // disabled outside its controls, while placement owns the pointer.
  useEffect(() => {
    if (!drag) return

    const onPointerMove = (event: PointerEvent) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      setDrag((activeDrag) =>
        activeDrag ? { ...activeDrag, clientPoint: { x: event.clientX, y: event.clientY } } : null
      )
    }
    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      const clientPoint = { x: event.clientX, y: event.clientY }
      if (commitDrag(drag, clientPoint)) {
        setDrag(null)
      } else {
        // A second click on empty canvas explicitly cancels placement. Escape
        // remains available for cancelling without clicking.
        setDrag(null)
      }
    }

    window.addEventListener('pointermove', onPointerMove, true)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('pointermove', onPointerMove, true)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [commitDrag, drag])

  const beginNew = (event: React.PointerEvent<SVGElement>, source: ConnectableElement, anchor: ConnectionAnchor) => {
    event.preventDefault()
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ kind: 'new', sourceElementId: source.id, sourceAnchor: anchor, clientPoint: { x: event.clientX, y: event.clientY } })
  }

  const beginReconnect = (
    event: React.PointerEvent<SVGElement>,
    metadata: NonNullable<typeof selectedConnector>,
    endpoint: 'source' | 'target'
  ) => {
    event.preventDefault()
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({
      kind: 'reconnect',
      connectorId: selectedElement!.id,
      endpoint,
      sourceElementId: metadata.sourceElementId,
      sourceAnchor: metadata.sourceAnchor,
      targetElementId: metadata.targetElementId,
      targetAnchor: metadata.targetAnchor,
      clientPoint: { x: event.clientX, y: event.clientY }
    })
  }

  const updateDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return
    event.preventDefault()
    event.stopPropagation()
    setDrag({ ...drag, clientPoint: { x: event.clientX, y: event.clientY } })
  }

  const finishDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return
    event.preventDefault()
    event.stopPropagation()
    const clientPoint = { x: event.clientX, y: event.clientY }
    if (commitDrag(drag, clientPoint)) {
      setDrag(null)
      return
    }

    // Releasing away from a target enters click-to-connect mode. The arrow
    // remains visible and follows the cursor until its endpoint reaches a
    // target and the user clicks, rather than disappearing on a missed drop.
    setDrag({ ...drag, clientPoint })
  }

  const preview = useMemo(() => {
    if (!drag) return null
    if (drag.kind === 'new') {
      const source = elementsById.get(drag.sourceElementId)
      if (!source) return null
      const sourcePoint = anchorScenePoint(source, drag.sourceAnchor)
      const candidate = getCandidate(drag.clientPoint, new Set([source.id]), sourcePoint)
      const targetPoint = candidate ? anchorScenePoint(candidate.element, candidate.anchor) : toScene(drag.clientPoint)
      const targetAnchor = candidate?.anchor || oppositeAnchor(drag.sourceAnchor)
      return { sourcePoint, sourceAnchor: drag.sourceAnchor, targetPoint, targetAnchor, candidate }
    }

    const source = elementsById.get(drag.sourceElementId)
    const target = elementsById.get(drag.targetElementId)
    if (!source || !target) return null
    const pointerScene = toScene(drag.clientPoint)
    if (drag.endpoint === 'target') {
      const sourcePoint = anchorScenePoint(source, drag.sourceAnchor)
      const candidate = getCandidate(drag.clientPoint, new Set([source.id]), sourcePoint)
      return {
        sourcePoint,
        sourceAnchor: drag.sourceAnchor,
        targetPoint: candidate ? anchorScenePoint(candidate.element, candidate.anchor) : pointerScene,
        targetAnchor: candidate?.anchor || oppositeAnchor(drag.sourceAnchor),
        candidate
      }
    }
    const targetPoint = anchorScenePoint(target, drag.targetAnchor)
    const candidate = getCandidate(drag.clientPoint, new Set([target.id]), targetPoint)
    return {
      sourcePoint: candidate ? anchorScenePoint(candidate.element, candidate.anchor) : pointerScene,
      sourceAnchor: candidate?.anchor || oppositeAnchor(drag.targetAnchor),
      targetPoint,
      targetAnchor: drag.targetAnchor,
      candidate
    }
  }, [drag, elementsById, getCandidate, toScene])

  if (!rect) return null

  const sourceHandles = selectedSource && !drag ? CONNECTOR_ANCHORS : []
  const previewScreenPoints = preview
    ? orthogonalPreviewPoints(preview.sourcePoint, preview.sourceAnchor, preview.targetPoint, preview.targetAnchor).map((point) =>
        toOverlay(toScreen(point))
      )
    : []

  return (
    <svg
      data-quick-connect-overlay="true"
      width={rect.width}
      height={rect.height}
      viewBox={`0 0 ${rect.width} ${rect.height}`}
      style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none', overflow: 'visible' }}
      onPointerMove={updateDrag}
      onPointerUp={finishDrag}
      onPointerCancel={() => setDrag(null)}
    >
      <defs>
        <marker id="quick-connect-preview-arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M 0 0 L 8 4 L 0 8 z" fill="#4da3ff" />
        </marker>
      </defs>
      {preview && (
        <>
          <polyline points={pointsAttribute(previewScreenPoints)} fill="none" stroke="#4da3ff" strokeWidth="2" markerEnd="url(#quick-connect-preview-arrowhead)" />
          {preview.candidate && (() => {
            const target = preview.candidate.element
            const a = toOverlay(toScreen({ x: target.x, y: target.y }))
            const b = toOverlay(toScreen({ x: target.x + target.width, y: target.y + target.height }))
            return <rect x={Math.min(a.x, b.x) - HIT_RADIUS} y={Math.min(a.y, b.y) - HIT_RADIUS} width={Math.abs(b.x - a.x) + HIT_RADIUS * 2} height={Math.abs(b.y - a.y) + HIT_RADIUS * 2} fill="#4da3ff" fillOpacity="0.08" stroke="#4da3ff" strokeWidth="1.5" strokeDasharray="4 3" />
          })()}
          {preview.candidate && CONNECTOR_ANCHORS.map((anchor) => {
            const point = toOverlay(toScreen(anchorScenePoint(preview.candidate!.element, anchor)))
            return <circle key={anchor} cx={point.x} cy={point.y} r="5" fill={anchor === preview.candidate!.anchor ? '#4da3ff' : '#121212'} stroke="#4da3ff" strokeWidth="2" />
          })}
        </>
      )}
      {selectedSource && sourceHandles.map((anchor) => {
        const side = toOverlay(toScreen(anchorScenePoint(selectedSource, anchor)))
        const normal = anchorNormal(anchor)
        const point = { x: side.x + normal.x * HANDLE_OFFSET, y: side.y + normal.y * HANDLE_OFFSET }
        return <g key={anchor} data-quick-connect="true" style={{ pointerEvents: 'all', cursor: 'crosshair' }} onPointerDown={(event) => beginNew(event, selectedSource, anchor)}>
          <circle cx={point.x} cy={point.y} r={HIT_RADIUS} fill="transparent" />
          <circle cx={point.x} cy={point.y} r={HANDLE_SIZE / 2} fill="#2563eb" stroke="#bfdbfe" strokeWidth="1.5" />
          <path d={`M ${point.x - normal.x * 4 - normal.y * 3} ${point.y - normal.y * 4 + normal.x * 3} L ${point.x + normal.x * 5} ${point.y + normal.y * 5} L ${point.x - normal.x * 4 + normal.y * 3} ${point.y - normal.y * 4 - normal.x * 3}`} fill="none" stroke="white" strokeWidth="1.5" pointerEvents="none" />
        </g>
      })}
      {selectedConnector && !drag && (['source', 'target'] as const).map((endpoint) => {
        const element = elementsById.get(endpoint === 'source' ? selectedConnector.sourceElementId : selectedConnector.targetElementId)
        const anchor = endpoint === 'source' ? selectedConnector.sourceAnchor : selectedConnector.targetAnchor
        if (!element) return null
        const point = toOverlay(toScreen(anchorScenePoint(element, anchor)))
        return <g key={endpoint} data-quick-connect="true" style={{ pointerEvents: 'all', cursor: 'crosshair' }} onPointerDown={(event) => beginReconnect(event, selectedConnector, endpoint)}>
          <circle cx={point.x} cy={point.y} r={HIT_RADIUS} fill="transparent" />
          <circle cx={point.x} cy={point.y} r="7" fill="#2563eb" stroke="#dbeafe" strokeWidth="2" />
        </g>
      })}
    </svg>
  )
}
