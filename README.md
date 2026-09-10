# CanvasTube

Offline desktop infinite-canvas workspace optimized for technical explanations and video recording on Linux (Fedora Wayland) and Windows 10 & 11 with drawing tablets (such as XP-Pen Deco 01 V3).

![CanvasTube Hero](docs/hero-concept.png)

---

## ✨ Features

- 🖊️ **Hardware Digitizer Precision**: Native pointer events capturing stylus pressure (8192 levels), tilt, twist, and sub-pixel stylus coordinates across Linux Wayland and Windows (DirectManipulation / WM_POINTER).
- 📐 **Decoupled Infinite Canvas**: Extensible canvas abstraction layer backed by Excalidraw, supporting hand-drawn strokes, geometric shapes, and technical diagrams.
- 🎬 **Clean Recording Mode (`F10`)**: Instantly collapse all application chrome into an ultra-clean canvas with a floating pill widget for OBS Studio window capture.
- 📦 **Offline Content-Addressed Bundles**: Self-contained project directory format with manifest v1 metadata, scene graphs, and SHA-256 deduplicated image assets.
- 🏛️ **130+ Official Architecture Stencils**: Built-in official vector catalog featuring AWS, Google Cloud (GCP), Microsoft Azure, Kubernetes (`kubernetes/community`), and generic system design components. Drag and drop directly onto the canvas.
- 🔍 **Live Hardware Stylus Inspector**: Real-time diagnostic panel displaying pen pressure bars, tilt angles, coordinates, and tablet hardware detection.
- 🔒 **Deterministic & Fully Offline**: Zero cloud dependencies, self-hosted web fonts, context-isolated Electron sandbox, and zero telemetry.
- 💻 **Multi-Platform Support**: First-class support for Fedora Linux (AppImage & unpacked binary) and Windows 10 & 11 (Portable `.exe` & NSIS installer).

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v20 or later (v22 LTS recommended)
- **npm**: v10 or later
- **Operating Systems Supported**:
  - **Linux**: Fedora 40/41/Rawhide (GNOME/KDE Wayland or X11), Ubuntu, Debian, Arch
  - **Windows**: Windows 10 and Windows 11 (x64)

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

# Synchronize official cloud & Kubernetes stencils
npm run sync:stencils

# Compile production bundles
npm run build

# --- Linux Packaging ---
# Package unpacked Linux debug binary
npm run build:linux:debug

# Package portable standalone AppImage for Linux
npm run build:linux:appimage

# --- Windows Packaging ---
# Package standalone portable executable for Windows 10 & 11 (single-file .exe)
npm run build:win:portable

# Package unpacked Windows debug directory
npm run build:win:debug

# Package Windows NSIS setup installer
npm run build:win:nsis

# Package all Windows targets
npm run build:win:all
```

---

## 🏗️ Continuous Integration (CI)

CanvasTube maintains automated multi-platform GitHub Actions workflows:

| Workflow | Platform / Runner | Targets Built |
|---|---|---|
| **[Build Fedora (Debug)](.github/workflows/build-fedora-debug.yml)** | Official `fedora:41` container on `ubuntu-latest` | `canvastube-fedora-debug-x64.tar.gz`, `*.AppImage`, `*.rpm` |
| **[Build Windows](.github/workflows/build-windows.yml)** | Native `windows-latest` (Windows 11 / Server 2022) | Portable `CanvasTube <version>.exe`, `CanvasTube Setup <version>.exe` |

Both pipelines enforce type-checking (`tsc`), automated unit tests (`vitest`), and linting (`eslint`) before packaging binaries.

---

## 🏛️ Built-in Stencil Ecosystem

CanvasTube bundles 133+ vector stencils organized under `assets/icons/`:

| Provider | Origin & Source | Count | Highlights |
|---|---|---|---|
| **AWS** | [Official AWS Architecture Icons](https://aws.amazon.com/architecture/icons/) | **33** | EC2, Lambda, S3, RDS, DynamoDB, Aurora, SQS, SNS, EventBridge, CloudFront, VPC, Bedrock, SageMaker |
| **GCP** | [Official Google Cloud Icons](https://cloud.google.com/icons) | **34** | Compute Engine, GKE, Cloud Run, GCS, Cloud SQL, Spanner, BigQuery, Vertex AI, Pub/Sub, Armor |
| **Azure** | [Official Azure Architecture Icons](https://learn.microsoft.com/en-us/azure/architecture/icons/) | **30** | VMs, Functions, App Services, AKS, Blob Storage, Cosmos DB, SQL DB, Redis, Event Hubs, Azure OpenAI |
| **Kubernetes** | [Official `kubernetes/community` Icons](https://github.com/kubernetes/community/tree/master/icons) | **23** | Pod, Deployment, Service, Ingress, ConfigMap, Secret, StatefulSet, DaemonSet, PV/PVC, Node, Control Plane |
| **Generic** | Standard System Design Primitives | **13** | Server, Database, Cache, Queue, Load Balancer, Firewall, CDN, Client, User, Storage, Microservice |

All stencils support **live keyword search** (e.g. searching "kafka" finds Event Hubs & Queue; searching "postgres" finds Cloud SQL, RDS, and Azure PostgreSQL) and **drag-and-drop** directly to the infinite canvas.

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
- [Tablet & Stylus Testing Guide (Linux Wayland & Windows)](docs/INPUT-TESTING.md)
- [Architecture Stencils Guide](assets/icons/README.md)

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
