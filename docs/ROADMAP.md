# CanvasTube Product & Engineering Roadmap

This document outlines the phased development roadmap for **CanvasTube**, transforming the core technical explanation canvas into a world-class production workspace for technical video creators and educators.

---

## 🧭 Milestone Summary

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4
Setup &     Infinite    Architecture Document &   Video Recording
Foundation  Canvas &    Stencils &   PDF Workflow Production
            Stylus      Bookmarks                 Export
[COMPLETED] [COMPLETED] [PLANNED]    [PLANNED]    [PLANNED]
```

---

## Phase 0: Foundation & Abstraction (Completed)

- [x] Repository initialization with Electron 34, React 18, Vite 6, and TypeScript 5.
- [x] Electron sandboxed architecture with secure context isolation and typed IPC bridge.
- [x] Abstract `CanvasAdapter` interface isolating UI and features from specific rendering engines.
- [x] Human-readable folder project format (`project.json`, `scene.json`, `assets/`, `cache/`).
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

## Phase 2: Technical Explanation Tooling & Stencil Ecosystem (Next Milestone)

### 1. Expanded Architecture Icon Packs
- Comprehensive AWS icon library (Compute, Storage, Networking, Database, Security, Analytics).
- Official GCP architecture shapes and Google Cloud icons.
- Official Azure enterprise stencils.
- Kubernetes primitives (Pods, Deployments, Services, Ingress, StatefulSets, ConfigMaps).
- Draw.io stencil SVG parser/importer for custom stencil packs.

### 2. Camera Bookmarks & Scene Tour
- Saved camera viewpoints (`CameraBookmark`: name, bounds, zoom, description).
- Visual timeline/drawer to jump smoothly between technical diagram sections while speaking.
- Keyboard navigation (`PageDown`/`PageUp` or `Alt + [1-9]`) to pan the camera between architecture components.

### 3. Connector & Arrow Enhancements
- Smart orthogonal routing around architecture boxes (drawing inspiration from Draw.io / wire routers).
- Bidirectional and labeled data-flow arrows with protocol tags (e.g. `gRPC`, `HTTPS`, `Kafka Topic`).

---

## Phase 3: Technical Document & PDF Annotation Integration

### 1. Offline PDF Engine
- PDF document import into `documents/` folder.
- Background rasterization of PDF pages (via `pdfjs-dist` in an offline worker).
- Multi-page slide-strip navigation dock.

### 2. Canvas-Pinned Document Pages
- Pinning PDF slides or research papers onto the infinite canvas as locked reference frames.
- Freehand stylus annotation layered over PDF pages without distorting source document resolution.

### 3. Code Snippet Embedding
- Syntax-highlighted code cards (monaco or shiki-rendered vector blocks).
- Line highlighting and stylus callout pointers.

---

## Phase 4: Recording, Streaming & Production Integration

### 1. OBS Studio Integration
- Local WebSocket bridge or hotkey hook allowing OBS to synchronize scene switching with CanvasTube camera bookmarks.
- Virtual green-screen or transparent canvas background toggle.

### 2. Canvas Export Pipeline
- High-resolution SVG / 4K PNG export bounded to active scene or selected frame.
- Clipboard copy directly formatted for social media and documentation sharing.

### 3. Video Cut-Points & Chapters
- Automated timestamp marker export (`chapters.txt`) corresponding to camera bookmark transitions during recording sessions for YouTube description upload.

---

## 🚫 Explicit Non-Goals (Scope Discipline)

To maintain focus and privacy:
- **No Cloud Synchronization**: CanvasTube will not provide hosted cloud sync or servers.
- **No Multi-Tenant Collaboration / Live Multiplayer**: Focus is on single-creator technical presentations.
- **No Telemetry / Usage Tracking**: Complete privacy for enterprise and proprietary codebase diagrams.
- **No Accounts or Subscriptions**: Pure open-source desktop software.
