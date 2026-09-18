# Architectural References & License Analysis

CanvasTube draws architectural inspiration from several outstanding open-source and commercial drawing tools. This document provides an analysis of what each reference teaches, why specific tools were selected or avoided as runtime dependencies, and the strict licensing boundaries observed.

---

## 1. Reference Summary Table

| Tool / Resource | License / Terms | Role in CanvasTube | Key Lessons & Inspirations |
|---|---|---|---|
| **Excalidraw** | **MIT** | **Core Canvas Engine (via Adapter)** | Infinite canvas, hand-drawn vector aesthetics, simple JSON schema, offline-friendly |
| **draw.io / diagrams.net** | **Apache-2.0** | **Architectural Reference (Stencils & Routing)** | Stencil taxonomy (AWS, GCP, K8s), connector routing, offline desktop packaging |
| **Kubernetes Community** | **Apache-2.0 / CC-BY-4.0** | **Official Stencils Source** | Canonical Kubernetes resource and component icons (`kubernetes/community/icons`) |
| **AWS Architecture Icons** | **AWS Asset Terms** | **Official Cloud Stencils** | Official cloud architectural service shapes (non-commercial & commercial diagramming) |
| **Google Cloud Icons** | **CC-BY-4.0** | **Official Cloud Stencils** | Official 2025 Core & Cloud Product icons |
| **Azure Architecture Icons** | **Microsoft Terms** | **Official Cloud Stencils** | Official Microsoft public cloud service shapes |
| **Rnote** | **GPL-3.0-or-later** | **Architectural Reference (Stylus & Wayland)** | Separation of document engine from GTK UI, libinput stylus pressure handling, PDF layer separation |
| **tldraw** | **Proprietary (tldraw SDK)** | **Architectural Reference (State & Geometry)** | Shape definition contracts, camera transforms, selection math. *DO NOT use SDK as dependency due to restrictive commercial license.* |
| **Xournal++ / Okular** | **GPL-2.0+** | **Functional Reference (PDF Annotations)** | Infinite vs. paged layout considerations, stylus pen/highlighter switching |

---

## 2. Deep Dive: Excalidraw

- **Repository**: [excalidraw/excalidraw](https://github.com/excalidraw/excalidraw)
- **License**: MIT License. Completely permissive for open-source and commercial desktop bundling.
- **Role in CanvasTube**: Selected as the foundational canvas engine for Phase 1.
- **Why It Works Well**:
  - Extremely popular among software engineers for technical system diagrams.
  - Built on standard HTML5 canvas with roughjs for clean hand-drawn rendering.
  - Native dark mode support.
  - Clean imperative API (`updateScene`, `getSceneElements`, `scrollToContent`).
- **Isolation Strategy**:
  - Excalidraw is encapsulated behind `CanvasAdapter` (`ExcalidrawCanvasAdapter.ts`).
  - No deep Excalidraw types leak into high-level features like the architecture stencil sidebar or project manifest service.
  - Offline assets: `@excalidraw/excalidraw` tries by default to fetch fonts from `esm.run`. In CanvasTube, all font assets are bundled locally in `src/renderer/public/fonts/` and `window.EXCALIDRAW_ASSET_PATH` is resolved from the renderer document, ensuring 100% offline reliability.

---

## 3. Deep Dive: Architecture Stencil Ecosystem & Cloud Licensing

CanvasTube bundles 133+ vector stencils cleanly categorized by cloud vendor and domain:

### Kubernetes Official Icons
- **Source**: [`kubernetes/community/icons`](https://github.com/kubernetes/community/tree/master/icons)
- **License**: Dual-licensed under **Apache-2.0** or **Creative Commons Attribution 4.0 International (CC-BY-4.0)**.
- **Usage**: Cleaned vector SVGs without embedded text, normalized to 64x64 viewports for high-DPI scaling.

### Google Cloud (GCP) Icons
- **Source**: [Google Cloud Architecture Icons](https://cloud.google.com/icons)
- **License**: **Creative Commons Attribution 4.0 International (CC-BY-4.0)**.
- **Usage**: Bundles official 2025 Core Product Icons and catalog service marks.

### AWS Architecture Icons
- **Source**: [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/)
- **Terms**: Permitted for creating architectural diagrams and technical presentations.
- **Usage**: Bundles official 64px service icons cleaned of proprietary metadata headers.

### Microsoft Azure Architecture Icons
- **Source**: [Azure Architecture Center Icons](https://learn.microsoft.com/en-us/azure/architecture/icons/)
- **Terms**: Permitted by Microsoft for building architecture diagrams and technical documentation.

---

## 4. Deep Dive: Rnote

- **Repository**: [flxzt/rnote](https://github.com/flxzt/rnote)
- **License**: GPL-3.0-or-later.
- **Role in CanvasTube**: **Architectural & hardware reference only**. CanvasTube contains no Rnote source code.
- **Key Lessons for CanvasTube**:
  - **Engine / UI Separation**: Rnote strictly isolates `rnote-engine` (pure Rust vector math and scene graph) from `rnote-ui` (GTK4 frontend). CanvasTube mirrors this by isolating `@core` (pure TypeScript data models, manifest serialization, icon registry) from the Electron/React UI shell.
  - **Wayland & libinput Stylus Integration**: Rnote excels on Linux drawing tablets (XP-Pen, Wacom) on GNOME/KDE Wayland sessions. It demonstrates optimal handling of pressure curves, stylus hover detection, and smoothing algorithms.
  - **PDF Annotation Model**: Rnote renders PDF pages as distinct background layers, avoiding rasterization artifacts during zooming.

---

## 5. Deep Dive: tldraw

- **Repository**: [tldraw/tldraw](https://github.com/tldraw/tldraw)
- **License**: Proprietary tldraw SDK license (tldraw source is source-available but restricts commercial use and requires commercial licensing for production apps).
- **CRITICAL COMPLIANCE NOTICE**:
  - **tldraw is strictly an architectural conceptual reference.**
  - **DO NOT install or import `@tldraw/tldraw` into CanvasTube dependencies.**
- **Key Architectural Lessons**:
  - Explicit camera model: Zoom, pan, and coordinate normalization between viewport pixels and canvas units.
  - Unified shape record model: How individual shape types define their own bounding boxes, hit testing, and serialization schemas.

---

## 6. PDF Annotation References: Xournal++ & Okular

- **Xournal++**: Best-in-class Linux stylus tool for academic PDF paper markup.
- **Lessons for CanvasTube Phase 3**:
  - Technical YouTube explanations frequently involve walking through a paper (e.g., Google Spanner, DynamoDB, Raft paper) or AWS architecture whitepaper.
  - An infinite canvas that can embed multi-page PDF documents side-by-side with architectural sketches provides a unique workflow unavailable in either pure whiteboard tools or pure PDF readers.
