# CanvasTube

Offline desktop infinite-canvas workspace optimized for technical explanations and video recording on Fedora Linux with drawing tablets (XP-Pen Deco 01 V3).

![CanvasTube Hero](docs/hero-concept.png)

---

## ✨ Features

- 🖊️ **Hardware Digitizer Precision**: Native Linux pointer events capturing stylus pressure (8192 levels), tilt, twist, and sub-pixel stylus coordinates.
- 📐 **Decoupled Infinite Canvas**: Extensible canvas abstraction layer backed by Excalidraw, supporting hand-drawn strokes, geometric shapes, and technical diagrams.
- 🎬 **Clean Recording Mode (`F10`)**: Instantly collapse all application chrome into an ultra-clean canvas with a floating pill widget for OBS Studio window capture.
- 📦 **Offline Content-Addressed Bundles**: Self-contained project directory format with manifest v1 metadata, scene graphs, and SHA-256 deduplicated image assets.
- 🏛️ **130+ Official Architecture Stencils**: Built-in official vector catalog featuring AWS, Google Cloud (GCP), Microsoft Azure, Kubernetes (`kubernetes/community`), and generic system design components. Drag and drop directly onto the canvas.
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

# Synchronize official cloud & Kubernetes stencils
npm run sync:stencils

# Compile production bundles
npm run build

# Package unpacked Linux debug binary
npm run build:linux:debug

# Package portable standalone AppImage for Linux
npm run build:linux:appimage
```

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
- [Linux Wayland & XP-Pen Tablet Testing Guide](docs/INPUT-TESTING.md)
- [Architecture Stencils Guide](assets/icons/README.md)

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
