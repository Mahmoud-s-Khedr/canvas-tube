import { describe, expect, it } from 'vitest'
import {
  anchorFixedPoint,
  anchorScenePoint,
  canInitiateConnection,
  chooseTargetAnchor,
  hitAnchor,
  isConnectableElement,
  orthogonalPreviewPoints,
  pointInExpandedScreenBounds,
  targetAnchorFacing,
  type ConnectableElement
} from '../src/core/canvas/connectors'

const source: ConnectableElement = {
  id: 'source',
  type: 'rectangle',
  x: 0,
  y: 0,
  width: 100,
  height: 60
}

const target: ConnectableElement = {
  id: 'target',
  type: 'image',
  x: 200,
  y: 20,
  width: 80,
  height: 80,
  locked: true
}

const identity = (point: { x: number; y: number }) => point

describe('Quick Connect geometry', () => {
  it('maps semantic anchors to Excalidraw fixed points', () => {
    expect(anchorFixedPoint('top')).toEqual([0.5, 0])
    expect(anchorFixedPoint('right')).toEqual([1, 0.5])
    expect(anchorFixedPoint('bottom')).toEqual([0.5, 1])
    expect(anchorFixedPoint('left')).toEqual([0, 0.5])
  })

  it('allows only unlocked supported source elements to initiate', () => {
    expect(isConnectableElement(source)).toBe(true)
    expect(canInitiateConnection(source)).toBe(true)
    expect(canInitiateConnection(target)).toBe(false)
    expect(isConnectableElement({ ...source, type: 'text' })).toBe(false)
  })

  it('uses expanded screen bounds for a destination and gives explicit anchors precedence', () => {
    expect(pointInExpandedScreenBounds({ x: 182, y: 10 }, target, identity, 22)).toBe(true)
    expect(pointInExpandedScreenBounds({ x: 170, y: 10 }, target, identity, 22)).toBe(false)
    expect(hitAnchor({ x: 200, y: 60 }, target, identity, 8)).toBe('left')
    expect(chooseTargetAnchor({ x: 200, y: 60 }, anchorScenePoint(source, 'right'), target, identity, 8)).toBe('left')
  })

  it('automatically selects the side facing the source when no target anchor is hit', () => {
    expect(targetAnchorFacing({ x: 50, y: 30 }, target)).toBe('left')
    expect(targetAnchorFacing({ x: 400, y: 60 }, target)).toBe('right')
    expect(targetAnchorFacing({ x: 240, y: -80 }, target)).toBe('top')
    expect(targetAnchorFacing({ x: 240, y: 220 }, target)).toBe('bottom')
  })

  it('derives overlay anchor positions from the element rotation', () => {
    const rotated = { ...source, angle: Math.PI / 2 }
    const right = anchorScenePoint(rotated, 'right')
    expect(right.x).toBeCloseTo(50)
    expect(right.y).toBeCloseTo(80)
  })

  it('builds an orthogonal preview with horizontal and vertical segments', () => {
    const points = orthogonalPreviewPoints({ x: 100, y: 30 }, 'right', { x: 200, y: 60 }, 'left')
    expect(points[0]).toEqual({ x: 100, y: 30 })
    expect(points[points.length - 1]).toEqual({ x: 200, y: 60 })
    for (let index = 1; index < points.length; index += 1) {
      expect(points[index].x === points[index - 1].x || points[index].y === points[index - 1].y).toBe(true)
    }
  })
})
