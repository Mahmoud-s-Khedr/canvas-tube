import type { CanvasAdapter, Point } from '../canvas/canvas-adapter'
import { IconDefinition, IconRegistry } from './icon-registry'

/** Adds a bundled icon without duplicating its SVG file in the scene. */
export function placeIcon(adapter: CanvasAdapter, icon: IconDefinition, center: Point): void {
  const fileId = IconRegistry.getFileId(icon.id)
  const dataURL = IconRegistry.svgToDataUrl(icon.svgContent)
  const size = IconRegistry.getDisplaySize(icon.svgContent)

  adapter.addFile({
    id: fileId,
    mimeType: 'image/svg+xml',
    dataURL,
    created: 0
  })

  adapter.addObject({
    type: 'image',
    x: Math.round(center.x - size.width / 2),
    y: Math.round(center.y - size.height / 2),
    width: size.width,
    height: size.height,
    fileId,
    customData: {
      iconId: icon.id,
      name: icon.name,
      provider: icon.provider
    }
  })
}
