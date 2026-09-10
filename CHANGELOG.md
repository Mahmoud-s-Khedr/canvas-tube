# Changelog

All notable changes to the CanvasTube project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Excalidraw Native Toolbar Docking**: Docked **PDF / Slides** and **Code Card** action buttons directly into Excalidraw's floating horizontal tool dock using `createPortal` and a `MutationObserver` on `.App-toolbar .Stack_horizontal`.
- **Custom Dock Styling (`.canvastube-dock-btn`)**: Added CSS styles matching Excalidraw's native button dimensions, border radius, hover states, and active tactile scale feedback.
- **Save & Save As Split-Button**: Replaced separate buttons with a unified split-button featuring direct `Save` (`Ctrl+S`) and a dropdown menu with `Save` and `Save As...` (`Ctrl+Shift+S`), complete with click-outside auto-dismissal.
- **Tour & Bookmark Segmented Control**: Consolidated the "Bookmark View" and "Tour" controls into an inline segmented component with drawer toggle, badge count, and quick-add `+` trigger (`Ctrl+B`).
- **Technical Documentation**: Added [`docs/CANVAS-TOOLBAR-DOCKING.md`](docs/CANVAS-TOOLBAR-DOCKING.md) detailing UI ergonomics, docking architecture, and testing matrices.

### Changed
- **Header Simplification**: Relocated PDF and Code Snippet triggers from [`TopToolbar`](src/renderer/src/components/toolbar/TopToolbar.tsx) to [`CanvasView`](src/renderer/src/components/canvas/CanvasView.tsx).
- **Disabled Excalidraw Native Image Tool**: Configured `UIOptions.tools.image: false` to enforce CanvasTube's content-addressed asset store and SHA-256 deduplication.

### Removed
- **`Ctrl+E` Hotkey Collision**: Removed the `Ctrl+E` export listener from [`App.tsx`](src/renderer/src/App.tsx) to prevent conflict with Excalidraw's single-key eraser shortcut (`E`).
- **Suppressed Default Excalidraw Library Trigger**: Applied CSS rule hiding `.excalidraw .sidebar-trigger.default-sidebar-trigger` to unify all stencils under CanvasTube's left Architecture Library.
