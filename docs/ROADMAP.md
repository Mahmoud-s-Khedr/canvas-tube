# CanvasTube Product & Engineering Roadmap

This document outlines the phased development roadmap for **CanvasTube**, transforming the core technical explanation canvas into a world-class production workspace for technical video creators and educators on Linux and Windows.

---

## 🧭 Milestone Summary

```
Phase 0 ────► Phase 1 ────► Phase 2 ────► Phase 3 ────► Phase 4
Setup &       Infinite      Architecture  Document &    Video Recording
Foundation    Canvas &      Stencils &    PDF Workflow  & Production Export
              Stylus        Bookmarks                   
[COMPLETED]   [COMPLETED]   [COMPLETED]   [COMPLETED]   [COMPLETED]
```

---

## Phase 0: Foundation & Abstraction (Completed)

- [x] Repository initialization with Electron 34, React 18, Vite 6, and TypeScript 5.
- [x] Electron sandboxed architecture with secure context isolation and typed IPC bridge.
- [x] Abstract `CanvasAdapter` interface isolating UI and features from specific rendering engines.
- [x] Human-readable folder project format (`project.json`, `scene.json`, `assets/`, `documents/`, `cache/`).
- [x] `ProjectManifest` schema (v1) with validation and serialization round-trip tests.
- [x] Content-addressed SHA-256 asset registry with automatic deduplication.
- [x] 100% offline self-hosted font packaging for `@excalidraw/excalidraw`.

---

## Phase 1: Infinite Canvas & Hardware Input Slice (Completed)

- [x] `ExcalidrawCanvasAdapter` implementing core shape creation, camera manipulation, selection, and serialization.
- [x] Real-time **Stylus & Pointer Inspector** capturing `pointerType` (pen, mouse, touch), continuous `pressure` (0.0–1.0), `tiltX`, `tiltY`, and buttons.
- [x] Hardware verification support for Fedora Linux Wayland and XP-Pen Deco 01 V3 digitizers.
- [x] Initial Architecture Icon Library with generic cloud, compute, database, queue, and Kubernetes stencils.
- [x] Clean Recording Mode (`F10` / `Ctrl+Shift+R`) for distraction-free video recording.
- [x] Desktop application shell with New, Open, Save, Save As, and Image Asset Import actions.

---

## Phase 2: Technical Explanation Tooling & Stencil Ecosystem (Completed)

### 1. Expanded Architecture Icon Packs (Completed)
- [x] **Official AWS Architecture Icons** (33 vector stencils: EC2, Lambda, S3, RDS, DynamoDB, Aurora, SQS, SNS, EventBridge, CloudFront, VPC, Bedrock, SageMaker, etc.).
- [x] **Official Google Cloud (GCP) Icons** (34 vector stencils: Compute Engine, GKE, Cloud Run, GCS, Cloud SQL, Spanner, BigQuery, Vertex AI, Pub/Sub, Cloud Armor, etc.).
- [x] **Official Microsoft Azure Service Icons** (30 vector stencils: Virtual Machines, Functions, App Services, AKS, Blob Storage, Cosmos DB, SQL DB, Redis, Event Hubs, Azure OpenAI, etc.).
- [x] **Official Kubernetes Icons** (23 vector stencils directly from `kubernetes/community`: Pod, Deployment, Service, Ingress, ConfigMap, Secret, StatefulSet, DaemonSet, PV/PVC, Node, Control Plane, etc.).
- [x] **Generic Architecture Primitives** (13 vector stencils: Server, Database, Cache, Queue, Load Balancer, Firewall, CDN, Client, User, Storage, Microservice).
- [x] **Live Keyword Tag Search** (fuzzy search across service names, categories, and technology tags).
- [x] **Drag-and-Drop to Canvas** (HTML5 drag-and-drop projecting directly onto infinite canvas scene coordinates).
- [x] Automated upstream sync script (`scripts/sync-official-icons.mjs` / `npm run sync:stencils`).

### 2. Multi-Platform Packaging & Continuous Integration (Completed)
- [x] **Linux Distribution Pipeline**: Fedora 41 containerized CI workflow building AppImage, debug archives, and optional RPM packages.
- [x] **Windows 10 & 11 Pipeline**: Native GitHub Actions CI workflow on `windows-latest` generating Portable `.exe` and NSIS setup installer.
- [x] **Windows Pointer Events Integration**: Diagnostic recognition of Windows DirectManipulation / WM_POINTER events in the Stylus Inspector.
- [x] Multi-resolution Windows application icon (`build/icon.ico`).

### 3. Camera Bookmarks & Scene Tour (Completed)
- [x] **Saved Camera Viewpoints**: `CameraBookmark` data model (`id`, `name`, `x`, `y`, `zoom`, `description`, `createdAt`, `obsSceneName`) stored in `manifest.presentation.cameraBookmarks`.
- [x] **Smooth Easing Engine**: Cubic ease-in-out interpolation (`camera-animation.ts`) smoothly translating camera coordinates and zoom.
- [x] **Interaction Interruption**: Canvas pointer and stylus touches immediately yield control back to the user by stopping in-flight transitions.
- [x] **Bookmarks Drawer**: Slide-out panel for renaming, deleting, reordering, updating camera coordinates, OBS scene binding, and quick jumping.
- [x] **Floating Presenter Tour Bar**: Bottom HUD displaying step progression chips, direct jump picker popover, recording timer & chapter markers, and previous/next controls during lectures and Clean Recording Mode (`F10`).
- [x] **Keyboard Navigation**: `Ctrl+B` to capture current view, `PageDown`/`PageUp` to step forward and backward, `Alt+[1-9]` for direct jumps, `Alt+C` for instant chapter stamping.

---

## Phase 3: Technical Document & PDF Annotation Integration (Completed)

### 1. Offline PDF Engine (Completed)
- [x] PDF document import into project `documents/` bundle directory with SHA-256 verification.
- [x] Offline rendering of PDF pages using bundled `pdfjs-dist` worker (`src/renderer/public/pdf.worker.min.mjs`).
- [x] Multi-page slide-strip dock (`DocumentSlideDock`) for browsing, thumbnail previews, and one-click slide insertion.

### 2. Canvas-Pinned Document Slides (Completed)
- [x] Pinned PDF slides onto the infinite canvas as auto-locked reference frames (`locked: true`).
- [x] Drag-and-drop slide pages from dock directly to canvas coordinates.
- [x] Freehand stylus and vector diagram annotation layered over PDF pages without raster downscaling.

### 3. Syntax-Highlighted Code Cards (Completed)
- [x] Vector SVG code card generator (`CodeCardGenerator`) supporting TypeScript, Python, Go, Rust, Java, C++, SQL, Bash, JSON, and YAML.
- [x] macOS-style window controls, title tabs, and line numbers gutter.
- [x] Interactive code insertion modal (`CodeSnippetModal`) with live preview and theme integration.

---

## Phase 4: Recording, Streaming & Production Integration (Completed)

### 1. OBS Studio Integration (Completed)
- [x] **WebSocket v5 Protocol Engine**: Native, event-driven `ObsWebSocketClient` supporting RPC requests, server-initiated Hello handshake, double SHA-256 base64 auth challenge hashing, and auto-reconnection.
- [x] **Bookmark Scene Binding**: Ability to bind any camera viewpoint to an OBS program scene (e.g. "Speaker + Diagram", "Full Diagram 4K", "Code Cam") with automated switching upon navigation.
- [x] **OBS Studio Control Modal**: Dialog (`ObsModal.tsx`) providing connection configuration, live status badge, instant scene switcher, remote recording start/stop/toggle, and auto-switch preferences.
- [x] **Chroma-Key Background Mode**: Zero-latency backdrop selector (Dark `#121212`, Light `#ffffff`, Chroma Green `#00ff00`, Chroma Blue `#0000ff`, Chroma Magenta `#ff00ff`) enabling instant OBS Color Key filter setup.

### 2. Production Export Pipeline (Completed)
- [x] **High-Resolution PNG Rasterizer**: Render active canvas or selected elements at 1x, 2x, 3x, 4x, 4K UHD (3840px), and 8K FUHD (7680px) with background transparency and theme options.
- [x] **Standalone Vector SVG Export**: Export canvas scenes to valid, self-contained SVG files with embedded web fonts and base64 assets.
- [x] **Bounded Area Export**: Interactive Marquee tool overlay (`MarqueeSelector.tsx`) to drag and export an exact bounded region with real-time dimensions badge.
- [x] **Quick Clipboard Copy**: Global keyboard shortcut (`Ctrl+Shift+C`) to copy selected elements or viewport straight to system clipboard as high-res PNG via native Electron clipboard IPC (Wayland, X11, and Windows).
- [x] **Export UI Modal**: Modern dialog (`ExportModal.tsx`) with live thumbnail rendering, format/scope/resolution toggles, and atomic file saving.

### 3. Video Cut-Points & YouTube Chapters (Completed)
- [x] **Automated Chapter Generator**: Pure functions (`chapter-generator.ts`) enforcing YouTube's strict chapter specification (first chapter at `00:00`, minimum 3 chapters, 10s gap, `MM:SS` / `HH:MM:SS` timestamps).
- [x] **Interactive Chapters Manager**: `ChaptersModal.tsx` displaying real-time YouTube validation status, dynamic chapter CRUD, and one-click copy to clipboard or native `chapters.txt` file export.
- [x] **Live Session Recording & Stamping**: Real-time timer HUD in `PresenterTourBar` with quick `+ Chapter` button and `Alt+C` hotkey to log timestamps synced to lecture progression.

---

## Phase 5: Connectors & Advanced Diagramming (Next)

### 1. Smart Orthogonal Connectors
- [ ] Smart orthogonal routing around architecture boxes (wire routers).
- [ ] Bidirectional and labeled data-flow arrows with protocol tags (e.g. `gRPC`, `HTTPS`, `Kafka Topic`).
- [ ] Magnetic snap-to-anchor points on architecture stencils.

---

## 🚫 Explicit Non-Goals (Scope Discipline)

To maintain focus and privacy:
- **No Cloud Synchronization**: CanvasTube will not provide hosted cloud sync or servers.
- **No Multi-Tenant Collaboration / Live Multiplayer**: Focus is on single-creator technical presentations.
- **No Telemetry / Usage Tracking**: Complete privacy for enterprise and proprietary codebase diagrams.
- **No Accounts or Subscriptions**: Pure open-source desktop software.
