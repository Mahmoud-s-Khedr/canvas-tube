# CanvasTube Master Project Plan & Progress Tracker

> **CanvasTube**: An offline desktop infinite-canvas workspace optimized for explaining software engineering, system design, cloud computing, and technical documents while recording YouTube videos on Fedora Linux / Wayland with drawing tablets.

---

## 📌 Project Overview & Principles

- **Primary Development Platform**: Fedora Linux, Wayland compositor, libinput, XP-Pen Deco 01 V3 drawing tablet.
- **Secondary Target Platforms**: macOS, Windows 11 (in subsequent releases).
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
| **Phase 2** | **Technical Stencils & Camera Bookmarks** | `[/]` In Progress | Sprint 2 | 25% |
| **Phase 3** | **PDF Annotation & Technical Documents** | `[ ]` Planned | Sprint 3 | 0% |
| **Phase 4** | **Recording, OBS Studio & Production Export** | `[ ]` Planned | Sprint 4 | 0% |
| **Phase 5** | **Packaging, Hardening & CI Pipeline** | `[/]` In Progress | Sprint 5 | 20% |

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
  - [x] Configure `window.EXCALIDRAW_ASSET_PATH = '/fonts/'` to guarantee zero internet dependency.

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
  - [x] Implement [`TopToolbar`](file:///home/mk/Projects/CV_projects/canvas-tube/src/renderer/src/components/toolbar/TopToolbar.tsx) with New, Open, Save, Save As, and DevTools controls.
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
*Goal: Rich architecture stencil packs, camera bookmarks for video scene navigation, and smart connector lines.*

- [/] **Expanded Architecture Stencil Packs**
  - [x] Stencil search and category filtering architecture.
  - [ ] AWS 2024 architecture icon set (Compute, Storage, Database, Network, Security, Messaging).
  - [ ] GCP (Google Cloud Platform) official architecture icons.
  - [ ] Microsoft Azure enterprise stencils.
  - [ ] Kubernetes full resource set (Deployment, ReplicaSet, StatefulSet, Ingress, ConfigMap, Secret).
  - [ ] Drag-and-drop stencils directly from sidebar onto exact canvas drop coordinates.
  - [ ] Custom user stencil import (drag SVG folder to add custom icon pack).
- [ ] **Camera Bookmarks & Presenter Tour Mode**
  - [ ] Camera Bookmark data model (`id`, `title`, `bounds`, `zoom`, `orderIndex`).
  - [ ] "Add Camera Bookmark" button in toolbar / shortcut (`Ctrl+B`).
  - [ ] Slide-out Bookmarks Drawer showing visual thumbnail previews of saved viewpoints.
  - [ ] Smooth animated camera panning transitions between bookmarks (`PageDown` / `PageUp`, `Alt + [1-9]`).
  - [ ] Presenter timeline bar indicating current step in a video explanation.
- [ ] **Smart Orthogonal Connectors & Labels**
  - [ ] Orthogonal connector routing algorithm (avoiding node intersection).
  - [ ] Labeled arrow connectors with protocol tags (`HTTPS`, `gRPC`, `WebSocket`, `Kafka Topic`).
  - [ ] Magnetic snap-to-anchor points on architecture stencils.

---

### Phase 3: Technical Document & PDF Annotation Integration
*Goal: Pinned PDF presentation slides and research papers with layered handwritten stylus annotations.*

- [ ] **Offline PDF Processing Engine**
  - [ ] Integrate `pdfjs-dist` in an offline worker process (no external telemetry).
  - [ ] PDF import handler storing original document in `documents/<hash>.pdf`.
  - [ ] Render PDF pages to crisp multi-resolution vector/canvas layers.
- [ ] **Canvas-Pinned Slide Deck Mode**
  - [ ] Slide-strip navigation dock (dockable left or bottom).
  - [ ] Pin single pages or continuous horizontal slide deck onto infinite canvas.
  - [ ] Locked background frames preventing accidental drag while drawing.
- [ ] **Handwritten Annotation Layering**
  - [ ] Separate annotation layer over PDF bounds.
  - [ ] High-contrast highlighter tool with adjustable opacity.
  - [ ] Export annotated PDF preserving both source document and handwritten vector ink.
- [ ] **Code Snippet Embedding**
  - [ ] Syntax-highlighted code block shape (using Shiki / offline Monaco).
  - [ ] Callout badges and line-pointer anchors for code walkthroughs.

---

### Phase 4: Recording, OBS Studio & Production Workflows
*Goal: Seamless integration with OBS Studio screen recording and high-resolution export for YouTube video editing.*

- [ ] **OBS Studio Synchronization**
  - [ ] Local WebSocket / IPC server for OBS Studio plugin integration.
  - [ ] Trigger OBS scene switches automatically when jumping between Camera Bookmarks.
  - [ ] Green-screen / transparent background mode for overlaying drawings over camera feeds.
- [ ] **Production Export Pipelines**
  - [ ] 4K / 8K ultra-high-resolution PNG rasterizer.
  - [ ] Vector SVG export with embedded fonts and embedded images.
  - [ ] Bounded region export (select rectangle and export image).
  - [ ] "Copy to Clipboard as PNG" shortcut (`Ctrl+Shift+C`).
- [ ] **YouTube Video Chapter Generation**
  - [ ] Session timer tracking time spent per Camera Bookmark during recording.
  - [ ] One-click export of `chapters.txt` formatted for YouTube video descriptions (e.g. `00:00 - Introduction`, `03:45 - Cache Invalidation`).

---

### Phase 5: Packaging, Hardening & CI Pipeline
*Goal: Production packages for Fedora Linux, automated testing pipelines, and macOS / Windows installers.*

- [/] **Linux Packaging & CI**
  - [x] Configure `electron-builder` configuration for Linux targets (`electron-builder.yml`).
  - [x] Add `npm run build:linux:debug` script for unpacked Linux binary generation.
  - [x] Implement GitHub Actions CI workflow ([`.github/workflows/build-fedora-debug.yml`](file:///home/mk/Projects/CV_projects/canvas-tube/.github/workflows/build-fedora-debug.yml)) running inside official `fedora:41` container to build and test the debug distribution.
  - [ ] Flatpak manifest with Wayland permissions and local file access.
  - [ ] Fedora RPM package release automation.
  - [ ] AppImage standalone executable.
- [ ] **Windows & macOS Support**
  - [ ] Windows 11 `.msi` / `.exe` installer with Windows Ink / Pointer API testing.
  - [ ] macOS `.dmg` with Apple Silicon (arm64) and Intel (x64) universal builds.
- [ ] **Performance Profiling & Large Canvas Optimization**
  - [ ] Virtualized rendering benchmark for scenes with >5,000 elements.
  - [ ] Memory leak audit during continuous 2-hour drawing sessions.
  - [ ] Automated regression testing on Wayland compositors (GNOME Mutter, KDE KWin, Hyprland).

---

## 📅 Sprint Schedule & Milestones

```
Sprint 1 (Weeks 1-2): Phase 0 & Phase 1 Vertical Slice ─────► [COMPLETED]
Sprint 2 (Weeks 3-4): Phase 2 Architecture Stencils & Camera Tour
Sprint 3 (Weeks 5-6): Phase 3 PDF Annotation & Document Engine
Sprint 4 (Weeks 7-8): Phase 4 OBS Integration & Production Exports
Sprint 5 (Weeks 9-10): Phase 5 Packaging (Flatpak/RPM/DMG) & Polish
```

---

## 🔍 Risk Register & Mitigation Strategy

| Risk ID | Description | Impact | Likelihood | Mitigation Strategy |
|---|---|---|---|---|
| **RSK-01** | Wayland compositor differences (GNOME Mutter vs. KDE KWin vs. Hyprland) | Medium | Medium | Automated Ozone platform flags; developer `InputInspector` for instant telemetry; fallback XWayland switch. |
| **RSK-02** | Excalidraw upstream dependency breakage or API shifts | High | Low | Canvas operations strictly isolated behind `CanvasAdapter`; pin exact minor version in `package.json`. |
| **RSK-03** | High memory usage when loading multi-page PDF documents | High | Medium | Lazy page rendering in background worker; cache only active viewport pages at high resolution. |
| **RSK-04** | License contamination from external references (Rnote GPL, tldraw proprietary) | Critical | Low | Strict clean-room architectural reference policy; no foreign source code introduced; automated license scans. |
| **RSK-05** | Offline font failure on clean Linux systems without internet | High | Low | Vendored font files directly inside `src/renderer/public/fonts/`; tested without network interface. |

---

## 🧪 QA & Verification Gates

Before tagging any version release, all 5 QA gates must pass:

1. **Gate 1 (Compilation)**: `npm run typecheck` produces 0 errors across main, preload, and renderer targets.
2. **Gate 2 (Automated Tests)**: `npm run test` passes all unit tests for manifest validation, asset hashing, and registries.
3. **Gate 3 (Code Quality)**: `npm run lint` passes with 0 warnings and 0 errors.
4. **Gate 4 (Build Verification)**: `npm run build` generates all bundles in `out/`, and `npm run build:linux:debug` generates Linux debug binaries in `dist/linux-unpacked`.
5. **Gate 5 (Hardware QA)**: Complete the 8-point manual checklist in [`docs/INPUT-TESTING.md`](file:///home/mk/Projects/CV_projects/canvas-tube/docs/INPUT-TESTING.md) using the XP-Pen Deco 01 V3 on Fedora Wayland.
