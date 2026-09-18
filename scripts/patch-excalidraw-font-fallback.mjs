import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

// CanvasTube ships Excalidraw's font files in src/renderer/public/fonts. The
// upstream package adds esm.sh as a second FontFace source even when a local
// asset path is provided. Electron's strict offline CSP rejects that source
// and produces one warning for every font subset. Retain the CDN fallback only
// for consumers that have not configured EXCALIDRAW_ASSET_PATH.
const patches = [
  {
    file: 'node_modules/@excalidraw/excalidraw/dist/dev/chunk-4FTI6OG3.js',
    before: '    urls.push(new URL(assetUrl, _ExcalidrawFontFace.ASSETS_FALLBACK_URL));\n    return urls;',
    after:
      '    if (urls.length === 0) {\n      urls.push(new URL(assetUrl, _ExcalidrawFontFace.ASSETS_FALLBACK_URL));\n    }\n    return urls;'
  },
  {
    file: 'node_modules/@excalidraw/excalidraw/dist/prod/chunk-K2UTITRG.js',
    before: 'return r.push(new URL(n,jn.ASSETS_FALLBACK_URL)),r',
    after: 'return r.length===0&&r.push(new URL(n,jn.ASSETS_FALLBACK_URL)),r'
  }
]

for (const patch of patches) {
  const file = resolve(patch.file)
  if (!existsSync(file)) continue

  const content = await readFile(file, 'utf8')
  if (content.includes(patch.after)) continue
  if (!content.includes(patch.before)) {
    throw new Error(`Excalidraw font patch no longer matches ${patch.file}`)
  }

  await writeFile(file, content.replace(patch.before, patch.after))
}
