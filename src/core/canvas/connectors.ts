import type { Point } from './canvas-adapter'

/** The four semantic connection sites supported by Quick Connect. */
export type ConnectionAnchor = 'top' | 'right' | 'bottom' | 'left'

export interface ConnectableElement {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  angle?: number
  locked?: boolean
  isDeleted?: boolean
}

export interface CanvasTubeConnectorMetadata {
  sourceElementId: string
  sourceAnchor: ConnectionAnchor
  targetElementId: string
  targetAnchor: ConnectionAnchor
  routingType: 'orthogonal'
}

export const QUICK_CONNECT_METADATA_KEY = 'canvastubeConnector'
export const CONNECTOR_ANCHORS: readonly ConnectionAnchor[] = ['top', 'right', 'bottom', 'left']

export const anchorFixedPoint = (anchor: ConnectionAnchor): [number, number] => {
  switch (anchor) {
    case 'top':
      return [0.5, 0]
    case 'right':
      return [1, 0.5]
    case 'bottom':
      return [0.5, 1]
    case 'left':
      return [0, 0.5]
  }
}

export const anchorNormal = (anchor: ConnectionAnchor): Point => {
  switch (anchor) {
    case 'top':
      return { x: 0, y: -1 }
    case 'right':
      return { x: 1, y: 0 }
    case 'bottom':
      return { x: 0, y: 1 }
    case 'left':
      return { x: -1, y: 0 }
  }
}

export const isConnectableElement = (element: ConnectableElement | null | undefined): element is ConnectableElement =>
  Boolean(
    element &&
      !element.isDeleted &&
      ['rectangle', 'diamond', 'ellipse', 'image'].includes(element.type) &&
      Number.isFinite(element.width) &&
      Number.isFinite(element.height)
  )

export const canInitiateConnection = (element: ConnectableElement | null | undefined): boolean =>
  Boolean(isConnectableElement(element) && !element.locked)

/**
 * Returns a side's scene coordinate. Rotation is included so the screen
 * overlay tracks what the user sees; Excalidraw owns the persisted endpoint
 * recalculation through the matching fixed point binding.
 */
export const anchorScenePoint = (element: ConnectableElement, anchor: ConnectionAnchor): Point => {
  const [rx, ry] = anchorFixedPoint(anchor)
  const point = { x: element.x + element.width * rx, y: element.y + element.height * ry }
  const angle = element.angle || 0
  if (!angle) return point

  const center = { x: element.x + element.width / 2, y: element.y + element.height / 2 }
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = point.x - center.x
  const dy = point.y - center.y
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos }
}

export const pointInExpandedScreenBounds = (
  point: Point,
  element: ConnectableElement,
  sceneToScreen: (point: Point) => Point,
  paddingPx = 22
): boolean => {
  const topLeft = sceneToScreen({ x: element.x, y: element.y })
  const bottomRight = sceneToScreen({ x: element.x + element.width, y: element.y + element.height })
  const minX = Math.min(topLeft.x, bottomRight.x) - paddingPx
  const maxX = Math.max(topLeft.x, bottomRight.x) + paddingPx
  const minY = Math.min(topLeft.y, bottomRight.y) - paddingPx
  const maxY = Math.max(topLeft.y, bottomRight.y) + paddingPx
  return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
}

export const hitAnchor = (
  point: Point,
  element: ConnectableElement,
  sceneToScreen: (point: Point) => Point,
  radiusPx = 22
): ConnectionAnchor | null => {
  for (const anchor of CONNECTOR_ANCHORS) {
    const anchorPoint = sceneToScreen(anchorScenePoint(element, anchor))
    if (Math.hypot(point.x - anchorPoint.x, point.y - anchorPoint.y) <= radiusPx) return anchor
  }
  return null
}

/** Picks the target edge that faces the source point. */
export const targetAnchorFacing = (sourcePoint: Point, target: ConnectableElement): ConnectionAnchor => {
  const center = { x: target.x + target.width / 2, y: target.y + target.height / 2 }
  const dx = sourcePoint.x - center.x
  const dy = sourcePoint.y - center.y
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left'
  return dy >= 0 ? 'bottom' : 'top'
}

export const chooseTargetAnchor = (
  screenPoint: Point,
  sourcePoint: Point,
  target: ConnectableElement,
  sceneToScreen: (point: Point) => Point,
  radiusPx = 22
): ConnectionAnchor => hitAnchor(screenPoint, target, sceneToScreen, radiusPx) || targetAnchorFacing(sourcePoint, target)

/** A compact, deterministic orthogonal route for the transient SVG preview. */
export const orthogonalPreviewPoints = (
  source: Point,
  sourceAnchor: ConnectionAnchor,
  target: Point,
  targetAnchor: ConnectionAnchor,
  offset = 18
): Point[] => {
  const sourceNormal = anchorNormal(sourceAnchor)
  const targetNormal = anchorNormal(targetAnchor)
  const start = { x: source.x + sourceNormal.x * offset, y: source.y + sourceNormal.y * offset }
  const end = { x: target.x + targetNormal.x * offset, y: target.y + targetNormal.y * offset }
  const middle =
    Math.abs(sourceNormal.x) === 1
      ? { x: (start.x + end.x) / 2, y: start.y }
      : { x: start.x, y: (start.y + end.y) / 2 }
  const corner =
    Math.abs(sourceNormal.x) === 1
      ? { x: middle.x, y: end.y }
      : { x: end.x, y: middle.y }
  return [source, start, middle, corner, end, target]
}

export const connectorMetadata = (value: unknown): CanvasTubeConnectorMetadata | null => {
  if (!value || typeof value !== 'object') return null
  const data = value as Partial<CanvasTubeConnectorMetadata>
  if (
    typeof data.sourceElementId !== 'string' ||
    typeof data.targetElementId !== 'string' ||
    !CONNECTOR_ANCHORS.includes(data.sourceAnchor as ConnectionAnchor) ||
    !CONNECTOR_ANCHORS.includes(data.targetAnchor as ConnectionAnchor) ||
    data.routingType !== 'orthogonal'
  ) {
    return null
  }
  return data as CanvasTubeConnectorMetadata
}
