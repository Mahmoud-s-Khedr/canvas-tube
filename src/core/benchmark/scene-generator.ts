import { CanvasShapeInput, Point } from '../canvas/canvas-adapter'

export interface BenchmarkElement {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  points?: Point[]
  text?: string
  strokeColor?: string
  backgroundColor?: string
  isDeleted?: boolean
}

export interface BenchmarkScene {
  elementCount: number
  elements: BenchmarkElement[]
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number }
  clustersCount: number
}

export interface SceneGeneratorOptions {
  clusters?: number
  spreadRadius?: number
  includeStrokes?: boolean
}

/**
 * Generates realistic synthetic multi-tier system architecture scenes with
 * thousands of services, databases, queues, arrows, labels, and stylus annotations.
 */
export function generateBenchmarkScene(
  count: number,
  options: SceneGeneratorOptions = {}
): BenchmarkScene {
  const clusters = options.clusters ?? Math.max(1, Math.floor(count / 250))
  const spreadRadius = options.spreadRadius ?? 6000
  const includeStrokes = options.includeStrokes ?? true

  const elements: BenchmarkElement[] = []
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  const clusterCenters: Point[] = []
  for (let c = 0; c < clusters; c++) {
    const angle = (c / clusters) * 2 * Math.PI
    const dist = (spreadRadius * 0.4) + Math.sin(c) * (spreadRadius * 0.3)
    clusterCenters.push({
      x: Math.round(Math.cos(angle) * dist),
      y: Math.round(Math.sin(angle) * dist)
    })
  }

  const serviceNames = [
    'AuthGateway', 'UserSvc', 'PaymentProxy', 'OrderEngine', 'InventoryDB',
    'NotificationHub', 'AnalyticsStream', 'CacheCluster', 'EventBus', 'BlobStore'
  ]

  const shapeTypes = ['rectangle', 'diamond', 'ellipse', 'arrow', 'text', 'freedraw']

  for (let i = 0; i < count; i++) {
    const cluster = clusterCenters[i % clusters]
    const offsetX = (Math.sin(i * 1.7) * 900) + ((i % 17) * 30)
    const offsetY = (Math.cos(i * 2.3) * 750) + ((i % 13) * 25)

    const x = Math.round(cluster.x + offsetX)
    const y = Math.round(cluster.y + offsetY)

    const type = shapeTypes[i % shapeTypes.length]
    let width = 120
    let height = 60
    let points: Point[] | undefined
    let text: string | undefined

    if (type === 'diamond') {
      width = 80
      height = 80
    } else if (type === 'ellipse') {
      width = 90
      height = 90
    } else if (type === 'arrow') {
      width = 160
      height = 40
    } else if (type === 'text') {
      width = 140
      height = 30
      text = `${serviceNames[i % serviceNames.length]}-${i}`
    } else if (type === 'freedraw' && includeStrokes) {
      width = 200
      height = 80
      points = [
        { x: 0, y: 0 },
        { x: 40, y: 25 },
        { x: 90, y: 15 },
        { x: 150, y: 45 },
        { x: 200, y: 70 }
      ]
    }

    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + width)
    maxY = Math.max(maxY, y + height)

    elements.push({
      id: `bench_el_${i}`,
      type,
      x,
      y,
      width,
      height,
      points,
      text,
      strokeColor: i % 2 === 0 ? '#38bdf8' : '#34d399',
      backgroundColor: i % 3 === 0 ? '#1e293b' : 'transparent'
    })
  }

  return {
    elementCount: elements.length,
    elements,
    boundingBox: { minX, minY, maxX, maxY },
    clustersCount: clusters
  }
}

/**
 * Converts synthetic benchmark elements into CanvasShapeInput items
 * suitable for batch insertion via adapter.addObjects.
 */
export function convertToShapeInputs(elements: BenchmarkElement[]): CanvasShapeInput[] {
  return elements.map((el) => ({
    type: (el.type === 'freedraw' ? 'rectangle' : el.type) as any,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    strokeColor: el.strokeColor,
    backgroundColor: el.backgroundColor,
    text: el.text
  }))
}
