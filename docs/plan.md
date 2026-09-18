# CanvasTube Master Project Plan & Progress Tracker

> **CanvasTube**: An offline desktop infinite-canvas workspace optimized for explaining software engineering, system design, cloud computing, and technical documents while recording YouTube videos on Linux / Wayland and Windows 10/11 with drawing tablets.

---

## 📌 Project Overview & Principles

- **Primary Development Platforms**:
  - Fedora Linux, Wayland compositor, libinput, XP-Pen Deco 01 V3 drawing tablet.
  - Windows 10 & Windows 11 (x64) with Windows Ink / DirectManipulation.
- **Secondary Target Platforms**: macOS (Apple Silicon / Intel).
- **Core Design Rule**: 100% offline, local-first. No backend servers, no cloud storage, no telemetry, no accounts, no authentication.
- **Storage Strategy**: Local directory bundles (`project.json`, `scene.json`, `assets/`, `documents/`, `cache/`) with SHA-256 content-addressed deduplicated assets.
- **Canvas Decoupling**: Pure `@core` layer; canvas operations abstracted behind [`CanvasAdapter`](file:///home/mk/Projects/CV_projects/canvas-tube/src/core/canvas/canvas-adapter.ts) so features never depend directly on Excalidraw internals.

---

## 🚦 Status Legend

- `[x]` **Completed**: Implemented, verified, and tested.
- `[/]` **In Progress**: Currently active in development.
- `[ ]` **Planned**: Scheduled for upcoming sprints.
- `[!]` **Blocked / Needs Design**: Awaiting upstream resolution or architectural specification.

---

## 📊 Master Progress Dashboard

| Phase | Milestone Name | Status | Target Completion | Progress |
|---|---|---|---|---|
| **Phase 0** | **Foundation, Toolchain & Core Abstractions** | `[x]` Completed | Sprint 1 | 100% |
| **Phase 1** | **Infinite Canvas & Stylus Input Slice** | `[x]` Completed | Sprint 1 | 100% |
| **Phase 2** | **Technical Stencils & Camera Bookmarks** | `[x]` Completed | Sprint 2 & 3 | 100% |
| **Phase 3** | **PDF Annotation & Code Snippets** | `[x]` Completed | Sprint 4 | 100% |
| **Phase 4** | **Recording, OBS Studio & Production Export** | `[x]` Completed | Sprint 5 | 100% |
| **Phase 5** | **Packaging, Hardening & Multi-Platform CI** | `[/]` In Progress | Sprint 2/5 | 85% |

---

## 📝 Phase-by-Phase Work Breakdown Structure (WBS)

### Phase 0: Foundation, Toolchain & Core Abstractions
*Goal: Initialize repository, configure multi-target build pipeline, establish security boundaries, and define core data models.*

- [x] **Repository & Build Environment Setup**
  - [x] Initialize Git repository and `.gitignore`.
  - [x] Configure Electron 34, React 18, Vite 6, and TypeScript 5.
  - [x] Configure `electron.vite.config.ts` for main, preload, and renderer targets.
  - [x] Set up Vitest test runner and TypeScript configuration files (`tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`).
  - [x] Configure ESLint flat config with TypeScript rules.
- [x] **Security Architecture**
  - [x] Enforce `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`.
  - [x] Establish typed preload IPC bridge ([`DesktopApi`](file:///home/mk/Projects/CV_projects/canvas-tube/src/core/desktop/desktop-api.ts)).
  - [x] Add Content Security Policy disallowing external CDN scripts.
- [x] **Core Domain Layer (`src/core/`)**
  - [x] Define [`ProjectManifest`](file:///home/mk/Projects/CV_projects/canvas-tube/src/core/project/project-manifest.ts) schema (version 1) with JSON validators.
  - [x] Implement [`AssetRegistry`](file:///home/mk/Projects/CV_projects/canvas-tube/src/core/assets/asset-registry.ts) with SHA-256 content-addressing and deduplication.
  - [x] Define [`CanvasAdapter`](file:///home/mk/Projects/CV_projects/canvas-tube/src/core/canvas/canvas-adapter.ts) interface and pointer event snapshot models.
  - [x] Define initial [`IconRegistry`](file:///home/mk/Projects/CV_projects/canvas-tube/src/core/icons/icon-registry.ts) catalog structure and SVG parser.
- [x] **Offline Asset Vendoring**
  - [x] Self-host all Excalidraw web fonts (`Excalifont`, `Virgil`, `Assistant`, `CascadiaCode`, `ComicShanns`, `Xiaolai`) in `src/renderer/public/fonts/`.
  - [x] Resolve `window.EXCALIDRAW_ASSET_PATH` from the renderer document so packaged builds use the bundled fonts without an internet dependency.

---

### Phase 1: Infinite Canvas & Hardware Stylus / Wayland Input Slice
*Goal: Working desktop application with infinite canvas, drawing tablet pressure inspection, technical icon insertion, and video recording mode.*

- [x] **Excalidraw Adapter Integration**
  - [x] Implement [`ExcalidrawCanvasAdapter`](file:///home/mk/Projects/CV_projects/canvas-tube/src/renderer/src/components/canvas/ExcalidrawCanvasAdapter.ts) fulfilling `CanvasAdapter`.
  - [x] Implement shape generation (`rectangle`, `diamond`, `ellipse`, `arrow`, `text`, `image`) using Excalidraw skeleton transforms.
  - [x] Implement scene serialization, deserialization, camera coordinate normalization, and undo/redo dispatch.
- [x] **Linux Wayland & Hardware Tablet Input Layer**
  - [x] Configure Electron Ozone platform flags for Wayland in [`src/main/index.ts`](file:///home/mk/Projects/CV_projects/canvas-tube/src/main/index.ts).
  - [x] Implement [`InputInspector`](file:///home/mk/Projects/CV_projects/canvas-tube/src/renderer/src/components/inspector/InputInspector.tsx) component.
  - [x] Detect and display live `pointerType` (`pen`, `mouse`, `touch`), continuous `pressure` (0.0 to 1.0), `tiltX`, `tiltY`, `twist`, `buttons`, and canvas coordinates.
  - [x] Add green badge detection specifically for XP-Pen / stylus input devices.
- [x] **Desktop Application Shell & Toolbars**
  - [x] Implement [`TopToolbar`](file:///home/mk/Projects/CV_projects/canvas-tube/src/renderer/src/components/toolbar/TopToolbar.tsx) with New, Open, Save, Save As, DevTools, PDF and Code snippet controls.
  - [x] Implement Image Asset Import with native dialog and SHA-256 hashing.
  - [x] Implement Clean Recording Mode toggle (`F10` / `Ctrl+Shift+R`) collapsing chrome for OBS capture.
  - [x] Implement collapsible [`IconSidebar`](file:///home/mk/Projects/CV_projects/canvas-tube/src/renderer/src/components/sidebar/IconSidebar.tsx) with live search and provider categories.
  - [x] Bundle 10 core vector architecture stencils (Server, DB, Queue, Cloud, Client, Storage, LB, Gateway, K8s Pod).
- [x] **Verification & Documentation**
  - [x] Unit tests passing (manifest, serialization roundtrip, asset deduplication, icon search).
  - [x] Typecheck and build pipelines clean.
  - [x] Write [`README.md`](file:///home/mk/Projects/CV_projects/canvas-tube/README.md), [`docs/ARCHITECTURE.md`](file:///home/mk/Projects/CV_projects/canvas-tube/docs/ARCHITECTURE.md), [`docs/ROADMAP.md`](file:///home/mk/Projects/CV_projects/canvas-tube/docs/ROADMAP.md), [`docs/REFERENCES.md`](file:///home/mk/Projects/CV_projects/canvas-tube/docs/REFERENCES.md), and [`docs/INPUT-TESTING.md`](file:///home/mk/Projects/CV_projects/canvas-tube/docs/INPUT-TESTING.md).

---

### Phase 2: Technical Explanation Tooling & Stencil Ecosystem
*Goal: Rich architecture stencil packs, camera bookmarks for video scene navigation, and smooth presenter tour transitions.*

- [x] **Expanded Architecture Stencil Packs & Official Cloud Icon Ecosystem**
  - [x] Stencil search and category filtering architecture with keyword tagging.
  - [x] Official AWS Architecture Icons (33 vectors: EC2, Lambda, S3, RDS, DynamoDB, Aurora, SQS, SNS, EventBridge, Step Functions, CloudFront, API Gateway, Route 53, VPC, SageMaker, Bedrock, etc.).
  - [x] Official Google Cloud (GCP) Icons (34 vectors: 2025 Core + Service catalog: Compute Engine, GKE, Cloud Run, Cloud Functions, GCS, BigQuery, Cloud SQL, Spanner, AlloyDB, Vertex AI, Pub/Sub, Cloud Armor, etc.).
  - [x] Official Microsoft Azure Public Service Icons (30 vectors: Virtual Machines, Functions, App Services, AKS, Container Instances, Blob Storage, Cosmos DB, SQL DB, PostgreSQL, Redis, VNet, Event Hubs, Azure OpenAI, etc.).
  - [x] Official Kubernetes CNCF / community resource set (23 vectors: Pod, Deployment, Service, Ingress, ConfigMap, Secret, StatefulSet, DaemonSet, Job, CronJob, PV, PVC, StorageClass, Namespace, NetworkPolicy, HPA, CRD, ServiceAccount, Role, ClusterRole, Node, Control Plane, etcd).
  - [x] Generic architecture components (13 vectors: Server, Database, Cache, Queue, Load Balancer, Firewall, CDN, Mobile Client, Web Browser, User, Storage, Cloud, Microservice).
  - [x] HTML5 drag-and-drop stencils directly from sidebar onto exact canvas drop scene coordinates.
  - [x] Dedicated `assets/icons/` directory with automated discovery via `import.meta.glob` and `npm run sync:stencils`.
- [x] **Camera Bookmarks & Presenter Tour Mode**
  - [x] Camera Bookmark data model ([`CameraBookmark`](file:///home/mk/Projects/CV_projects/canvas-tube/src/core/project/project-manifest.ts): `id`, `name`, `x`, `y`, `zoom`, `description`, `createdAt`, `obsSceneName`).
  - [x] Domain bookmark manager ([`bookmark-manager.ts`](file:///home/mk/Projects/CV_projects/canvas-tube/src/core/bookmarks/bookmark-manager.ts)) with pure CRUD, reordering, OBS scene binding, and tour index steppers.
  - [x] Cubic ease-in-out interpolation engine ([`camera-animation.ts`](file:///home/mk/Projects/CV_projects/canvas-tube/src/core/canvas/camera-animation.ts)).
  - [x] CanvasAdapter animation contract (`animateCameraTo`, `stopCameraAnimation`) and interaction cancellation.
  - [x] Top toolbar controls ("Bookmark View" `Ctrl+B` and "Tour" drawer toggle with count badge).
  - [x] Slide-out Bookmarks Drawer ([`BookmarksDrawer.tsx`](file:///home/mk/Projects/CV_projects/canvas-tube/src/renderer/src/components/bookmarks/BookmarksDrawer.tsx)) with cards, editable titles, zoom metadata, OBS scene picker, jump, update camera, reorder, and delete actions.
  - [x] Floating Presenter Tour Bar HUD ([`PresenterTourBar.tsx`](file:///home/mk/Projects/CV_projects/canvas-tube/src/renderer/src/components/bookmarks/PresenterTourBar.tsx)) accessible during lectures and Clean Recording Mode (`F10`).
  - [x] Global keyboard navigation (`Ctrl+B`, `PageDown`/`PageUp`, `Alt+1..9`, `Alt+C`).

---

### Phase 3: Technical Document & PDF Annotation Integration
*Goal: Pinned PDF presentation slides and research papers with layered handwritten stylus annotations.*

- [x] **Offline PDF Processing Engine**
  - [x] Integrate `pdfjs-dist` in an offline worker process (no external telemetry, zero CDN requests, bundled worker in `src/renderer/public/pdf.worker.min.mjs`).
  - [x] PDF document import action placing files into `documents/` bundle subdirectory with SHA-256 integrity hashing.
  - [x] Multi-page slide-strip dock ([`DocumentSlideDock`](file:///home/mk/Projects/CV_projects/canvas-tube/src/renderer/src/components/documents/DocumentSlideDock.tsx)) for browsing, selecting, and jumping across presentation slides.
- [x] **Canvas-Pinned Slides & Freehand Inking**
  - [x] Pinning PDF slides or research papers onto the infinite canvas as auto-locked reference frames (`locked: true`).
  - [x] Drag-and-drop slide pages directly from slide dock onto exact canvas scene coordinates.
  - [x] Freehand stylus vector annotation layered directly over PDF pages without raster degradation.
  - [x] Bulk insertion actions (horizontal flow and vertical sequence layout).
- [x] **Code Snippet Embedding**
  - [x] Syntax-highlighted code card generator ([`CodeCardGenerator`](file:///home/mk/Projects/CV_projects/canvas-tube/src/core/code/code-card-generator.ts)) supporting TypeScript, Python, Go, Rust, Java, C/C++, SQL, Bash, JSON, YAML, Dockerfile.
  - [x] Modern IDE window chrome (macOS window controls, filename header, line numbers gutter, VS Code Dark+ theme).
  - [x] Live vector card preview modal ([`CodeSnippetModal`](file:///home/mk/Projects/CV_projects/canvas-tube/src/renderer/src/components/code/CodeSnippetModal.tsx)) & placement onto canvas for code walkthroughs.

---

### Phase 4: Recording, OBS Studio & Production Workflows (Completed)
*Goal: Seamless integration with OBS Studio screen recording, camera-synced scene switching, YouTube chapters, and high-resolution production export.*

- [x] **OBS Studio Synchronization (Phase 4.1 - Completed)**
  - [x] Built-in WebSocket v5 protocol client ([`obs-client.ts`](file:///home/mk/Projects/CV_projects/canvas-tube/src/core/obs/obs-client.ts)) with double SHA-256 base64 auth computation, RPC calls, and auto-reconnection.
  - [x] Binding camera bookmarks to specific OBS Program scenes with automatic scene switching upon navigation.
  - [x] OBS connection and remote control modal ([`ObsModal.tsx`](file:///home/mk/Projects/CV_projects/canvas-tube/src/renderer/src/components/recording/ObsModal.tsx)) with one-click scene switching and start/stop recording.
  - [x] Chroma-Key & Background Mode selector (Dark `#121212`, Light `#ffffff`, Chroma Green `#00ff00`, Chroma Blue `#0000ff`, Chroma Magenta `#ff00ff`) for clean video capture and transparent layering.
- [x] **Production Export Pipeline (Phase 4.2 - Completed)**
  - [x] Core export domain layer ([`export-types.ts`](file:///home/mk/Projects/CV_projects/canvas-tube/src/core/export/export-types.ts)) with aspect-ratio preserving dimensions calculation (`calculateExportDimensions`).
  - [x] High-resolution PNG rasterizer rendering canvas elements at 1x, 2x, 3x, 4x, 4K UHD (3840px), and 8K FUHD (7680px) with Dark, Light, and Transparent background modes.
  - [x] Standalone vector SVG export with embedded fonts, CSS styling, and base64 assets.
  - [x] Bounded area export via interactive Marquee selection tool ([`MarqueeSelector.tsx`](file:///home/mk/Projects/CV_projects/canvas-tube/src/renderer/src/components/export/MarqueeSelector.tsx)) with live pixel dimension badges and virtual frame clipping.
  - [x] Quick Clipboard Copy hotkey (`Ctrl+Shift+C`) instantly exporting active selection or viewport to OS clipboard as PNG via native Electron clipboard IPC across Linux Wayland, X11, and Windows.
  - [x] Export Modal UI ([`ExportModal.tsx`](file:///home/mk/Projects/CV_projects/canvas-tube/src/renderer/src/components/export/ExportModal.tsx)) with real-time thumbnail preview, scope selection (All / Selection / Viewport / Bounded Region), output specifications, and atomic file saving.
- [x] **YouTube Video Chapter Generation (Phase 4.3 - Completed)**
  - [x] Pure YouTube chapter generator ([`chapter-generator.ts`](file:///home/mk/Projects/CV_projects/canvas-tube/src/core/recording/chapter-generator.ts)) with timestamp formatting (`formatTimestamp`, `parseTimestamp`), YouTube validation (00:00 start rule, >=3 chapters, >=10s interval), and description text formatting.
  - [x] Interactive YouTube Chapters Modal ([`ChaptersModal.tsx`](file:///home/mk/Projects/CV_projects/canvas-tube/src/renderer/src/components/recording/ChaptersModal.tsx)) with live validation indicator, CRUD editing, copy to clipboard, and native `chapters.txt` file saving.
  - [x] Live recording session timer and one-touch `+ Chapter` stamp (`Alt+C`) integrated into [`PresenterTourBar.tsx`](file:///home/mk/Projects/CV_projects/canvas-tube/src/renderer/src/components/bookmarks/PresenterTourBar.tsx) and [`TopToolbar.tsx`](file:///home/mk/Projects/CV_projects/canvas-tube/src/renderer/src/components/toolbar/TopToolbar.tsx).

---

### Phase 5: Packaging, Hardening & CI Pipeline
*Goal: Production packages for Fedora Linux and Windows 10/11, automated testing pipelines, and multi-platform CI.*

- [x] **Linux Packaging & CI**
  - [x] Configure `electron-builder` configuration for Linux targets (`electron-builder.yml`).
  - [x] Add `npm run build:linux:debug` script for unpacked Linux binary generation.
  - [x] Implement GitHub Actions CI workflow ([`.github/workflows/build-fedora-debug.yml`](file:///home/mk/Projects/CV_projects/canvas-tube/.github/workflows/build-fedora-debug.yml)) running inside official `fedora:41` container to build and test the debug distribution.
  - [x] AppImage standalone executable (`npm run build:linux:appimage`).
  - [x] Automated AppImage generation and upload in CI workflow (`canvastube-fedora-appimage` artifact).
  - [x] Optional RPM packaging step via `build_rpm` workflow dispatch input.
  - [x] CanvasTube brand desktop icons in `build/icons/`.
- [x] **Windows 10 & 11 Support**
  - [x] Configure `win` and `nsis` sections in `electron-builder.yml`.
  - [x] Generate Windows multi-resolution icon `build/icon.ico`.
  - [x] Portable standalone executable (`npm run build:win:portable` producing `CanvasTube <ver>.exe`).
  - [x] NSIS Setup installer configuration (`npm run build:win:nsis`).
  - [x] Dedicated GitHub Actions CI workflow ([`.github/workflows/build-windows.yml`](file:///home/mk/Projects/CV_projects/canvas-tube/.github/workflows/build-windows.yml)) on `windows-latest`.
  - [x] Update `InputInspector` host detection for Windows PointerEvents / DirectManipulation.
- [ ] **macOS Support**
  - [ ] macOS `.dmg` with Apple Silicon (arm64) and Intel (x64) universal builds.
- [x] **Performance Profiling & Large Canvas Optimization**
  - [x] Virtualized rendering benchmark for scenes with >5,000 elements (frustum culling, SpatialGrid index querying in <15ms, batch insertion).
  - [x] Memory leak audit during continuous 2-hour drawing sessions (root re-render throttle, PDF page/worker eviction, unreferenced file pruning).
  - [x] Automated regression testing on Wayland compositors (GNOME Mutter, KDE KWin, Hyprland) with Ozone platform switch injection and tablet-v2 validation.
