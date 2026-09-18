# Canvas-Tube PDF Browser-Parity & Feature Gap Analysis

> **Scope:** repository implementation review<br>
> **Reviewed:** 18 September 2026<br>
> **Baseline:** current Canvas-Tube source tree (`pdfjs-dist` 6.3.289)

## Executive summary

Canvas-Tube is a local Electron canvas workspace, not yet a full PDF editor or a conventional document viewer. Its current PDF workflow is raster-first:

1. The user imports a local PDF through Electron.
2. The renderer loads it with the bundled, local PDF.js worker and decoders.
3. `DocumentSlideDock` shows on-demand thumbnails and places selected or all pages on the Excalidraw canvas as PNG images.
4. Those placed pages, their metadata, and the source PDF are persisted with the project.

This makes Canvas-Tube strong at arranging PDF pages spatially, annotating around them with canvas tools, camera tours, and OBS-assisted recording. It does **not** currently preserve a live PDF page model after placement: inserted pages are independent raster image objects. Consequently, page editing, selectable PDF text, AcroForms, native annotations, PDF export, OCR, and assistive document features remain gaps.

## Verified current capabilities

| Capability | Status | Evidence / behavior |
|---|---|---|
| Local PDF import | Implemented | Electron file picker accepts `.pdf`; source bytes are stored as a project asset. |
| PDF parsing and rendering | Implemented | PDF.js loads base64 document bytes using bundled worker code and local WASM decoder assets. |
| Page thumbnails | Implemented | The dock renders a 12-page window around the selected page to limit memory use. |
| Insert one page | Implemented | A selected page is rendered to PNG and placed at the canvas viewport centre. |
| Insert all pages | Implemented | Pages can be laid out horizontally or vertically, progressively and in batches. |
| Drag a page to canvas | Implemented | Dock thumbnails expose `application/json` page metadata for the canvas drop handler. |
| Page placement controls | Implemented | Newly inserted pages can be movable or locked; placed pages from the active document can be unlocked together. |
| Multiple source PDFs per project | Implemented | The manifest holds a document list and their PDF assets. The UI operates on one active document at a time. |
| Persistence | Implemented | Project save/open preserves PDF bytes, document entries, canvas PNG assets, and `pdf-slide` provenance metadata. |
| Canvas annotation and layout | Implemented | Excalidraw tools can add freehand strokes, text, shapes, arrows, and images around or above rasterized pages. |
| Canvas export | Implemented | The canvas can export PNG or SVG for all, selected, viewport, or custom-area content. This is not PDF export. |
| Presentation support | Implemented | Camera bookmarks/tours and an OBS WebSocket integration support presentation and recording workflows. |

## Parity matrix

“Canvas alternative” means the user can approximate an outcome on the canvas; it must not be confused with editing or preserving the original PDF.

| Browser-PDF capability | Current status | Notes / next step |
|---|---|---|
| View, zoom, and navigate pages | Partial | Pages are rendered by PDF.js and selected from the dock; navigation is page selection plus infinite-canvas pan/zoom, rather than a text-aware continuous document viewer. |
| Thumbnails | Implemented | On-demand thumbnail rendering is available in `DocumentSlideDock`. |
| Drag pages into a workspace | Implemented | Pages can be placed singly, by drag-and-drop, or as horizontal/vertical groups. |
| Reorder pages in the PDF | Missing | Thumbnail order is source-document order; canvas arrangement does not rewrite the PDF page tree. |
| Merge PDFs | Missing | Multiple PDFs can coexist in a project but cannot be combined into one PDF. |
| Duplicate, delete, cut, copy, or split PDF pages | Missing | These actions can be approximated for canvas objects, but the source document is unchanged. |
| Export original PDF | Missing as an explicit command | Original bytes are retained in the project, but there is no dedicated “export original PDF” UX. |
| Export annotated PDF | Missing | Canvas exports are PNG/SVG only. There is no PDF composition pipeline. |
| Rotate a PDF page | Canvas alternative only | A placed image object may be transformed on the canvas; source-page rotation and PDF export are absent. |
| Native PDF annotations/comments | Missing | Canvas marks are not PDF annotations and are not indexed in a comments panel. |
| Hide/show annotations or highlights | Missing | There is no annotation layer manager or global toggle. |
| Text selection, copy, find, or outline | Missing | The renderer uses page rasterization; it does not expose PDF.js text layers, search, or document outlines. |
| Accessible document structure and image alt text | Missing | No PDF structure-tree or page-image accessibility workflow is exposed. |
| Fill AcroForms | Missing | PDF.js is used for display/rendering only; form interaction and saving are not wired. Canvas text/shapes can visually overlay a form. |
| OCR for scanned PDFs | Missing | No OCR dependency or extraction worker is present. PDF.js rendering does support local scanned/JBIG2 documents when their decoder assets are available. |
| Read aloud | Missing | No speech-synthesis integration exists. |
| Translation, summary, or PDF Q&A | Missing | No translation, LLM, retrieval, or embeddings subsystem exists. |
| Signature capture or certificate validation | Missing | A signature image can be placed on the canvas, but there is no signature workflow, PDF signing, or CMS/PKCS#7 validation. |
| Password-protected/encrypted PDFs | Unspecified / untested | PDF.js may request a password at load time, but Canvas-Tube provides no password prompt, validation, or user-facing encrypted-file handling. |
| Microsoft Purview/IRM-protected PDFs | Out of scope | These require proprietary identity/DRM support and conflict with the local-first baseline. Provide clear detection/error messaging if this becomes a user need. |

## Important implementation boundaries

- `PdfService` renders pages and thumbnails to `<canvas>` and converts them to PNG data URLs. It does not call PDF.js text extraction, form APIs, outline APIs, or save APIs.
- `DocumentSlideDock` emits `pdf-slide` metadata (`docId`, `pageNumber`) on normal Excalidraw image objects. That metadata supports management of placed assets; it is not a bidirectional page model.
- `pdf-lib`, `tesseract.js`, speech APIs, translation libraries, and local/remote AI dependencies are not installed.
- The project manifest can retain several PDFs, while app restore currently selects the first saved document when reopening a project. A document picker/switcher is needed before describing multi-document navigation as complete.

## Recommended roadmap

### P0 — Make current PDF behavior explicit and robust

1. Add an active-document selector for projects with more than one imported PDF.
2. Add safe password/error handling for load failures, encrypted PDFs, unsupported documents, and missing source assets.
3. Add targeted tests for thumbnail/page rendering, insertion provenance, all-page layout, and project reopen behavior.
4. Offer an explicit “Reveal/export original PDF” command, preserving the imported bytes without mutation.

### P1 — True page-level document operations

Adopt a PDF-writing library such as `pdf-lib` behind a document-operation service. Model page order separately from canvas objects, then implement merge, reorder, duplicate, delete, split, and selected-page export. Keep original bytes immutable until the user explicitly saves a derived PDF.

### P2 — Annotated-PDF export

Create an export pipeline that maps canvas objects to a source document/page only when their `pdf-slide` metadata and geometry allow it. Rasterize or translate eligible annotations onto the correct PDF pages, document fidelity limitations, and provide a flattened output option. This is the prerequisite for calling canvas markup “PDF annotation” in user-facing material.

### P3 — Reading and accessibility

Expose PDF.js text content and outlines for selectable text, copy, find, and keyboard navigation. Add an OCR worker only for pages with no usable text layer; keep language packs and their download/privacy policy explicit. Build alt-text and semantic-tag support as an export concern rather than relying on arbitrary canvas metadata.

### P4 — Optional assistance features

Read aloud can use OS voices via `speechSynthesis` once text extraction exists. Translation, summarization, and Q&A should be opt-in and clearly divided between offline models and user-configured network providers. These are enhancements, not prerequisites for core browser-viewer parity.

## Acceptance criteria for future parity claims

Only mark a capability as implemented when it has a user-facing workflow, persistence behavior, error handling, and automated coverage appropriate to its risk. In particular:

- “PDF editing” requires a saved PDF whose page structure/content changes, not merely a rearranged canvas.
- “Annotated PDF export” requires marks embedded or flattened into an exported PDF, not PNG/SVG canvas export.
- “OCR/searchable PDF” requires selectable/searchable text for scanned pages.
- “Multi-PDF support” requires choosing and operating on each imported document, not just retaining several assets in a project.

Until those criteria are met, Canvas-Tube should be described as a **local PDF-to-infinite-canvas import and presentation workspace**.
