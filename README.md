# CanvasTube

Offline desktop infinite-canvas workspace optimized for technical explanations and video recording on Fedora Linux with drawing tablets (XP-Pen Deco 01 V3).

![CanvasTube Hero](docs/hero-concept.png)

---

## ✨ Features

- 🖊️ **Hardware Digitizer Precision**: Native Linux pointer events capturing stylus pressure (8192 levels), tilt, twist, and sub-pixel stylus coordinates.
- 📐 **Decoupled Infinite Canvas**: Extensible canvas abstraction layer backed by Excalidraw, supporting hand-drawn strokes, geometric shapes, and technical diagrams.
- 🎬 **Clean Recording Mode (`F10`)**: Instantly collapse all application chrome into an ultra-clean canvas with a floating pill widget for OBS Studio window capture.
- 📦 **Offline Content-Addressed Bundles**: Self-contained project directory format with manifest v1 metadata, scene graphs, and SHA-256 deduplicated image assets.
- 🏛️ **Architecture Stencils**: Built-in vector catalog featuring cloud, database, server, queue, and Kubernetes primitives.
- 🔍 **Live Hardware Stylus Inspector**: Real-time diagnostic panel displaying pen pressure bars, tilt angles, coordinates, and tablet hardware detection.
- 🔒 **Deterministic & Fully Offline**: Zero cloud dependencies, self-hosted web fonts, context-isolated Electron sandbox, and zero telemetry.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v20 or later
- **npm**: v10 or later
- **Operating System**: Linux (Fedora 40/41/Rawhide recommended with GNOME Wayland)

### Installation

```bash
git clone https://github.com/Mahmoud-s-Khedr/canvas-tube.git
cd canvas-tube
npm install
```

### Development & Scripts

```bash
# Launch application in Electron development mode with HMR
npm run dev

# Run TypeScript typechecks
npm run typecheck

# Run unit tests (vitest)
npm run test

# Run ESLint validation
npm run lint

# Compile production bundles
npm run build

# Package unpacked Linux debug binary
npm run build:linux:debug

# Package portable standalone AppImage for Linux
npm run build:linux:appimage
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| **`F10`** or **`Ctrl + Shift + R`** | **Toggle Clean Recording Mode** (Hides chrome for OBS capture) |
| **`Esc`** | Exit Recording Mode |
| **`Ctrl + S`** | Save Project |
| **`Ctrl + Shift + S`** | Save Project As... |
| **`Ctrl + O`** | Open Project Folder |
| **`Ctrl + N`** | New Project |
| **`Ctrl + Shift + I`** | Toggle Stylus & Pointer Inspector |
| **`Ctrl + Z`** / **`Ctrl + Y`** | Undo / Redo Canvas Strokes |

---

## 📁 Project Directory Bundle Structure

CanvasTube projects are saved as directory bundles:

```text
MyArchitectureExplanation/
├── project.json      # Versioned manifest (title, created, assets, camera bookmarks)
├── scene.json        # Canvas element hierarchy and viewport coordinates
├── assets/           # Content-addressed media files (named by sha256 hash)
├── documents/        # PDF documents or slides for annotation
└── cache/            # Generated thumbnails and rendered vector caches
```

---

## 🛡️ Security Architecture

CanvasTube follows Electron security best practices:
- **Sandbox Enabled**: All renderer processes run inside Chromium's security sandbox (`sandbox: true`).
- **Node Integration Disabled**: `nodeIntegration: false`. The renderer cannot directly execute Node APIs.
- **Context Isolation**: `contextIsolation: true`. Renderer code only accesses strictly typed IPC bridges exposed through `window.desktopApi`.
- **Strict Content Security Policy (CSP)**: Disallows external scripts and enforces offline execution.

---

## 📚 Documentation

- [System Architecture](docs/ARCHITECTURE.md)
- [Product Roadmap](docs/ROADMAP.md)
- [Implementation & Sprint Plan](docs/plan.md)
- [Reference Implementations & Licenses](docs/REFERENCES.md)
- [Linux Wayland & XP-Pen Tablet Testing Guide](docs/INPUT-TESTING.md)

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
