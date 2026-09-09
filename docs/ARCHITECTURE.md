# CanvasTube Architecture Specification

## 1. Overview and Core Philosophy

CanvasTube is engineered as an **offline desktop technical explanation workspace**. Its primary architectural goal is to decouple application business logic, project storage, technical asset libraries, and hardware input handling from any specific canvas rendering engine.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Application Shell                              │
│   ┌────────────────────────┐  ┌───────────────────┐  ┌──────────────────┐   │
│   │       TopToolbar       │  │    IconSidebar    │  │  InputInspector  │   │
│   │ (Save, Record, Import) │  │  (System Stencils)│  │ (Stylus / Wayland│   │
│   └───────────┬────────────┘  └─────────┬─────────┘  └────────┬─────────┘   │
│               │                         │                     │             │
│               └────────────────┬────────┴─────────────────────┘             │
│                                ▼                                            │
│                     ┌──────────────────────┐                                │
│                     │    CanvasAdapter     │                                │
│                     │   (Core Interface)   │                                │
│                     └──────────┬───────────┘                                │
│                                ▼                                            │
│                 ┌─────────────────────────────┐                             │
│                 │   ExcalidrawCanvasAdapter   │                             │
│                 └──────────────┬──────────────┘                             │
│                                ▼                                            │
│                 ┌─────────────────────────────┐                             │
│                 │   @excalidraw/excalidraw    │                             │
│                 │      (React Component)      │                             │
│                 └─────────────────────────────┘                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                 Secure Preload Bridge (`window.desktopApi`)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                             Electron Main Process                           │
│   ┌───────────────────────────┐         ┌───────────────────────────────┐   │
│   │      ProjectService       │         │       WindowManager           │   │
│   │ (Atomic write, sha256 hash│         │ (Wayland flags, sandboxing,   │   │
│   │  manifest v1 validation)  │         │  native dialogs)              │   │
│   └───────────────────────────┘         └───────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Process Separation & Security Boundary

CanvasTube adheres strictly to Electron security guidelines:

| Setting | Value | Rationale |
|---|---|---|
| `contextIsolation` | `true` | Prevents renderer scripts from accessing Electron/Node prototypes |
| `nodeIntegration` | `false` | Disables Node.js runtime inside the browser window |
| `sandbox` | `true` | Enforces Chromium renderer OS sandboxing |
| `webSecurity` | `true` | Enforces standard Same-Origin Policy and CSP |

### Preload Bridge Contract (`DesktopApi`)

The renderer interacts with the operating system through a typed API defined in `src/core/desktop/desktop-api.ts`:

- `openProject(): Promise<OpenProjectResult | null>`: Invokes native directory picker and deserializes project files.
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
  setPointerListener(listener?: (snapshot: CanvasPointerSnapshot) => void): void
  setChangeListener(listener?: (sceneData: unknown) => void): void
}
```

### ExcalidrawCanvasAdapter Implementation

- **Element Construction**: Translates generic shape inputs (`rectangle`, `diamond`, `ellipse`, `arrow`, `line`, `text`, `image`) into Excalidraw skeleton formats via Excalidraw's `convertToExcalidrawElements` utility.
- **Coordinate Space Conversion**: Normalizes client mouse/stylus coordinates into infinite canvas scene space using viewport camera offsets (`scrollX`, `scrollY`) and zoom factors.
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

Hardware drawing tablets on Linux Wayland emit `W3C PointerEvents`. The application captures and inspects:

1. **Pointer Type**: Differentiates between `'mouse'`, `'pen'` (drawing stylus), and `'touch'`.
2. **Pressure Sensitivity**: Normalized float from `0.0` (hover/no contact) to `1.0` (maximum pressure).
3. **Stylus Tilt**: `tiltX` and `tiltY` angles (degrees between -90 and +90).
4. **Twist & Buttons**: Stylus barrel buttons and eraser tip detection.

The `InputInspector` component intercepts pointer events on the container capture phase before canvas tools handle strokes, allowing creators to verify tablet calibration and pressure responsiveness in real time.

---

## 6. Video Recording Optimization Mode

For YouTube presentations and technical screencasts:
- **Clean Recording Mode (`F10` / `Ctrl+Shift+R`)** activates an immersive presentation view.
- Collapses the architecture stencil sidebar.
- Collapses top application chrome and controls.
- Enables Excalidraw's Zen Mode (`zenModeEnabled={true}`), hiding canvas property panels and navigation chrome.
- Displays a minimal floating recording indicator with hotkey exit hint.
