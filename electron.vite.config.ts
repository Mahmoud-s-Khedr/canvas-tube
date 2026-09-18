import { resolve } from 'path'
import { createReadStream } from 'node:fs'
import { cp, mkdir } from 'node:fs/promises'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

// PDF.js dynamically imports this fallback when WebAssembly cannot be loaded.
// Electron's file:// renderer cannot fetch the WASM binary, so package the fallback
// at the exact un-hashed filename that PDF.js requests. Serving it in development
// keeps scanned/JBIG2 PDFs working in both dev and packaged builds.
const pdfjsJbig2Fallback = () => {
  const source = resolve('node_modules/pdfjs-dist/wasm/jbig2_nowasm_fallback.js')
  const publicPath = '/wasm/jbig2_nowasm_fallback.js'

  return {
    name: 'canvastube-pdfjs-jbig2-fallback',
    configureServer(server: any) {
      server.middlewares.use((request: any, response: any, next: () => void) => {
        if (request.url?.split('?')[0] !== publicPath) return next()
        response.setHeader('Content-Type', 'text/javascript')
        createReadStream(source).pipe(response)
      })
    },
    async writeBundle() {
      const destinationDir = resolve('out/renderer/wasm')
      await mkdir(destinationDir, { recursive: true })
      await cp(source, resolve(destinationDir, 'jbig2_nowasm_fallback.js'))
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@core': resolve('src/core')
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@core': resolve('src/core')
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: resolve('src/renderer'),
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@core': resolve('src/core')
      }
    },
    plugins: [react(), pdfjsJbig2Fallback()],
    define: {
      'process.env.IS_PREACT': JSON.stringify('false')
    }
  }
})
