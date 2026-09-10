# CanvasTube System Architecture Specification

> **Version**: 0.3.0  
> **Status**: Approved & Implemented (Multi-Platform: Linux Wayland & Windows 10/11)  
> **Primary Target OS**: Fedora Linux (x86_64 / aarch64), Wayland Compositor (GNOME / KDE)  
> **Secondary Target OS**: Windows 10 & Windows 11 (x64)  
> **Digitizer Target**: XP-Pen Deco 01 V3 (8192 Pressure Levels, Tilt, Sub-pixel Coordinates), Wacom, and Windows Ink digitizers

---

## 1. High-Level Architecture Overview

CanvasTube is engineered around four core decoupled subsystems:
1. **Desktop Host Process (Electron Main)**: Native window lifecycle, Linux Wayland display server configuration, Windows DirectManipulation pointer integration, and atomic local-filesystem I/O.
2. **Preload Security Bridge**: Secure, context-isolated bridge establishing a strongly-typed IPC interface (`DesktopApi`) without exposing Node.js runtime primitives to the DOM.
3. **Core Domain Layer (`@core`)**: Pure TypeScript models for project manifest management, SHA-256 content-addressed asset deduplication, vector stencil registry, and abstract canvas contracts.
4. **Presentation & Canvas Shell (React Renderer)**: Decoupled UI housing the top controls, hardware stylus inspector, collapsible architecture stencil drawer, and canvas adapter.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Renderer Process (DOM)                          │
│                                                                        │
│   ┌────────────────┐ ┌───────────────────┐ ┌───────────────────────┐   │
│   │   TopToolbar   │ │    IconSidebar    │ │     InputInspector    │   │
│   └───────┬────────┘ └─────────┬─────────┘ └───────────┬───────────┘   │
│           │                   │                       │               │
│           ▼                   ▼                       ▼               │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │              CanvasView & CanvasAdapter Interface              │   │
│   │             (e.g., ExcalidrawCanvasAdapter.ts)                 │   │
│   └────────────────────────────┬───────────────────────────────────┘   │
│                                │                                       │
│   ┌────────────────────────────▼───────────────────────────────────┐   │
│   │                 Pure Domain Services (@core)                   │   │
│   │   ProjectService  │  AssetRegistry  │  IconRegistry / Loader   │   │
│   └────────────────────────────┬───────────────────────────────────┘   │
└────────────────────────────────┼───────────────────────────────────────┘
                                 │ Typed IPC (window.desktopApi)
┌────────────────────────────────▼───────────────────────────────────────┐
│                      Preload Security Boundary                         │
│            contextIsolation: true  │  sandbox: true                    │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │ Electron IPC Channels
┌────────────────────────────────▼───────────────────────────────────────┐
│                     Main Process (Node.js/Electron)                    │
│                                                                        │
│   - Linux: Wayland Ozone Platform Flags & libinput Stylus Calibration  │
│   - Windows: DirectManipulation & WM_POINTER Hardware Events          │
│   - Native Folder Dialogs (Open, Save As)                              │
│   - Atomic Local Bundle Persistence (project.json, scene.json)         │
│   - Asset SHA-256 Ingestion & Content-Addressed Store                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Process Boundaries & Security Model

The Chromium sandbox is strictly enforced. The renderer process has **zero access** to `child_process`, raw Node `fs`, `net`, or native OS handles.

### Typed Desktop Bridge (`DesktopApi`)

All interaction with the underlying operating system passes through the `DesktopApi` interface:

- `openProject(): Promise<OpenProjectResult | null>`: Shows native directory picker and parses `project.json` and `scene.json`.
- `saveProject(projectDir, bundle): Promise<SaveProjectResult>`: Performs atomic write of `project.json` and `scene.json`.
- `saveProjectAs(title, bundle): Promise<SaveProjectResult | null>`: Prompts for directory destination and persists bundle.
- `importAsset(): Promise<ImportAssetResult | null>`: Reads media files, computes SHA-256 hash, and provides base64 data URLs.
- `getSystemInfo(): Promise<SystemInfo>`: Detects host OS, CPU arch, Wayland session status, and runtime versions.
- `toggleDevTools(): Promise<void>`: Toggles Chromium developer console.

---

## 3. Canvas Engine Abstraction Layer

Direct dependence on canvas libraries creates tight coupling and vendor lock-in. CanvasTube wraps canvas operations behind the `CanvasAdapter` interface:

```typescript
export interface CanvasAdapter {
  readonly name: string
  addObject(shape: CanvasShapeInput): ObjectId
  removeObject(id: ObjectId): void
  getSelection(): ObjectId[]
  clearSelection(): void
  getCamera(): CameraState
  setCamera(camera: CameraState): void
  zoomTo(bounds: Bounds): void
  resetView(): void
  getTool(): CanvasToolType
  setTool(tool: CanvasToolType): void
  undo(): void
  redo(): void
  serialize(): unknown
  deserialize(scene: unknown): void
  addFile(file: { id: string; mimeType: string; dataURL: string; created: number }): void
  clientToScene(clientPoint: Point): Point
  setPointerListener(listener?: (snapshot: CanvasPointerSnapshot) => void): void
  setChangeListener(listener?: (sceneData: unknown) => void): void
}
```

### ExcalidrawCanvasAdapter Implementation

- **Element Construction**: Translates generic shape inputs (`rectangle`, `diamond`, `ellipse`, `arrow`, `line`, `text`, `image`) into Excalidraw skeleton formats via Excalidraw's `convertToExcalidrawElements` utility.
- **Coordinate Space Conversion**: Normalizes client mouse/stylus coordinates into infinite canvas scene space using viewport camera offsets (`scrollX`, `scrollY`) and zoom factors (`clientToScene`).
- **Offline Fonts**: Sets `window.EXCALIDRAW_ASSET_PATH = '/fonts/'` and bundles offline TTF/WOFF2 font assets locally, preventing remote network requests to third-party CDNs.

---

## 4. Storage Architecture & Project Manifest

CanvasTube avoids monolithic opaque binaries and database servers. Projects are stored as transparent directory bundles:

```text
ProjectDirectory/
├── project.json      # Top-level manifest
├── scene.json        # Canvas element graph and camera coordinates
├── assets/           # Content-addressed media store (<sha256>.<ext>)
├── documents/        # PDF documents or slide decks
└── cache/            # Generated thumbnail previews and rasterizations
```

### Manifest Schema (`formatVersion: 1`)

```json
{
  "formatVersion": 1,
  "projectId": "proj_1741573200_k3x9a1",
  "title": "Distributed Systems Architecture",
  "createdAt": "2026-03-10T02:20:00.000Z",
  "updatedAt": "2026-03-10T02:25:00.000Z",
  "appVersion": "0.1.0",
  "canvas": {
    "adapter": "excalidraw",
    "theme": "dark",
    "grid": false
  },
  "documents": [],
  "assets": {
    "ast_1741573210_m8n2": {
      "id": "ast_1741573210_m8n2",
      "type": "image",
      "originalFilename": "db-cluster.png",
      "mimeType": "image/png",
      "hash": "b5a79...f01",
      "relativePath": "assets/b5a79...f01.png",
      "sizeBytes": 48210,
      "createdAt": "2026-03-10T02:20:10.000Z"
    }
  },
  "bookmarks": []
}
```

### Asset Deduplication Strategy

- When an asset is imported, `ProjectService` generates a SHA-256 hash from its raw binary buffer.
- Files are saved with the filename pattern `<hash>.<ext>`.
- If an identical image is imported multiple times into a project, `AssetRegistry.register()` identifies the matching hash and returns the existing asset ID, eliminating duplicate disk usage.

---

## 5. Input Pipeline & Drawing Tablet Integration

Hardware drawing tablets on Linux and Windows emit `W3C PointerEvents`. The application captures and inspects:

1. **Pointer Type**: Differentiates between `'mouse'`, `'pen'` (drawing stylus), and `'touch'`.
2. **Pressure Sensitivity**: Normalized float from `0.0` (hover/no contact) to `1.0` (maximum pressure).
3. **Stylus Tilt**: `tiltX` and `tiltY` angles (degrees between -90 and +90).
4. **Twist & Buttons**: Stylus barrel buttons and eraser tip detection.
5. **Platform Driver Channels**:
   - **Linux**: `libinput` kernel driver via Wayland tablet protocol.
   - **Windows**: Windows Ink / DirectManipulation translating hardware digitizers directly to Chromium `WM_POINTER` events.

The `InputInspector` component intercepts pointer events on the container capture phase before canvas tools handle strokes, allowing creators to verify tablet calibration and pressure responsiveness in real time.

---

## 6. Video Recording Optimization Mode

For YouTube presentations and technical screencasts:
- **Clean Recording Mode (`F10` / `Ctrl+Shift+R`)** activates an immersive presentation view.
- Collapses the architecture stencil sidebar.
- Collapses top application chrome and controls.
- Enables Excalidraw's Zen Mode (`zenModeEnabled={true}`), hiding canvas property panels and navigation chrome.
- Displays a minimal floating recording indicator with hotkey exit hint.

---

## 7. Architecture Stencil & Icon Asset Pipeline

CanvasTube bundles 133+ vector architecture stencils directly into the offline application binary without network calls:

### Directory Structure & Bundling
- SVGs are stored locally under [`assets/icons/`](../assets/icons/) partitioned by provider (`aws/`, `gcp/`, `azure/`, `kubernetes/`, `generic/`).
- [`src/core/icons/icon-loader.ts`](../src/core/icons/icon-loader.ts) uses Vite's compile-time globbing:
  ```typescript
  import.meta.glob('../../../assets/icons/**/*.svg', { query: '?raw', import: 'default', eager: true })
  ```
  This embeds all SVGs as inlined strings in the renderer distribution bundle.

### Metadata & Search Engine
- [`src/core/icons/icon-metadata.ts`](../src/core/icons/icon-metadata.ts) maps icon IDs to human-readable names, categories, and keyword synonym tags.
- [`IconRegistry`](../src/core/icons/icon-registry.ts) indexes stencils by category and provider, matching against multi-term search queries across titles, categories, and tags.

### Drag-and-Drop to Canvas Coordinates
- When a user drags an icon from [`IconSidebar`](../src/renderer/src/components/sidebar/IconSidebar.tsx) and drops it on [`CanvasView`](../src/renderer/src/components/canvas/CanvasView.tsx):
  1. The client cursor coordinates `(e.clientX, e.clientY)` are converted to infinite-canvas scene coordinates via `adapter.clientToScene({ x, y })`.
  2. The SVG data is registered with `adapter.addFile({ id, mimeType: 'image/svg+xml', dataURL })`.
  3. An `image` element is added at the exact drop coordinate centered under the cursor via `adapter.addObject()`.

---

## 8. Multi-Platform Packaging & Continuous Integration

CanvasTube provides cross-platform packaging with automated quality verification:

### Build Artifacts
- **Linux**: Standalone `.AppImage`, unpacked debug directory, and native Fedora `.rpm`.
- **Windows**: Portable single-file executable (`CanvasTube <version>.exe`), NSIS installer (`CanvasTube Setup <version>.exe`), and unpacked debug directory.

### GitHub Actions CI Architecture
- **Fedora 41 Container Job** ([`.github/workflows/build-fedora-debug.yml`](../.github/workflows/build-fedora-debug.yml)): Runs in an official Fedora 41 container to validate dependencies against Fedora glibc, building Linux AppImage, debug archives, and RPMs.
- **Windows 10/11 Job** ([`.github/workflows/build-windows.yml`](../.github/workflows/build-windows.yml)): Runs on GitHub's native `windows-latest` runner (Windows 11 / Server 2022) to build native Windows Portable executables and NSIS installers.
