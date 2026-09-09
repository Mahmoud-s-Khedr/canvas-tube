import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles/app.css'

// Configure local offline font assets for Excalidraw
window.EXCALIDRAW_ASSET_PATH = '/fonts/'

const rootElement = document.getElementById('root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
