import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles/app.css'

// Resolve from the renderer document so this works for both the dev server and
// the packaged `file://` application. An origin-root path (`/fonts/`) would
// otherwise point at the filesystem root when packaged.
window.EXCALIDRAW_ASSET_PATH = new URL('./fonts/', window.location.href).toString()

const rootElement = document.getElementById('root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
