# CanvasTube

> **An offline desktop infinite-canvas workspace optimized for explaining software engineering, system design, cloud computing, and technical architectures while recording YouTube videos.**

CanvasTube is a local-first desktop application designed for technical creators, educators, and software architects. Built primarily on **Fedora Linux / Wayland** with first-class support for drawing tablets (such as the XP-Pen Deco 01 V3), CanvasTube provides a distraction-free infinite workspace for visual technical communication.

---

## 🌟 Vision & Key Capabilities

- **Zero Cloud / Local-First**: No accounts, no backend servers, no logins, no telemetry. Everything lives in transparent file-system project directories on your local drive.
- **Offline Self-Hosted**: 100% functional without an internet connection. Fonts and assets are bundled locally with zero CDN dependencies.
- **Canvas Abstraction Layer**: Built on top of an application-owned `CanvasAdapter` interface, currently powered by `@excalidraw/excalidraw` (MIT), allowing future backend swappability without rewriting application features.
- **Clean Recording Mode (`F10` / `Ctrl+Shift+R`)**: Strips away toolbars, sidebars, chrome, and UI clutter, leaving a pristine canvas view optimized for OBS Studio, pipewire screen recording, and 4K screen capture.
- **Hardware Stylus & Pointer Inspector**: Live diagnostic panel tracking real-time pointer events (`pointerType`, `pressure`, `tiltX`, `tiltY`, coordinates, buttons) ensuring tablet pressure sensitivity behaves correctly under Linux Wayland.
- **Architecture Icon Library**: Ready-to-use vector stencils for cloud systems, servers, databases, queues, and Kubernetes pods with live search and drag/click insertion.
- **Human-Readable Project Bundles**: Projects are saved as directories (`project.json`, `scene.json`, `assets/`, `documents/`, `cache/`) with versioned manifests and SHA-256 deduplicated assets.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Linux / Wayland**: Fedora 40/41+ (or Ubuntu 22.04+, Arch Linux)
- **Drawing Tablet**: XP-Pen Deco 01 V3, Wacom, Huion, or any standard libinput-compatible digitizer

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/canvas-tube.git
cd canvas-tube

# Install dependencies
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

# Compile and package production bundles
npm run build
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

## 📁 Project File Structure

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
- [Reference Implementations & Licenses](docs/REFERENCES.md)
- [Linux Wayland & XP-Pen Tablet Testing Guide](docs/INPUT-TESTING.md)

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
