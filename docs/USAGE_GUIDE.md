# CanvasTube Usage Guide

CanvasTube is an offline desktop workspace for drawing technical explanations, assembling architecture diagrams, and recording a guided presentation. Projects are saved locally as folders, so you can keep the canvas, imported files, and presentation bookmarks together.

## Start a canvas

Launch CanvasTube, then choose one of the following from the top toolbar:

- **New** starts an empty, unsaved canvas.
- **Open** opens an existing CanvasTube project folder. Select the folder that contains `project.json`.
- **Save** saves the current canvas. The first save opens **Save As** and creates a project folder with a `.canvasproject` suffix. Use the arrow next to Save to explicitly choose **Save As...** and make a separate copy.

Click the canvas title in the toolbar to rename the project. Save after renaming to persist the new title.

> CanvasTube does not upload projects to a service. Keep the entire project folder when moving, backing up, or sharing a project.

## Draw and build a diagram

Use the built-in canvas toolbar to select, draw freehand ink, add shapes, arrows, lines, text, or erase. The following defaults are useful while working:

| Action | Default shortcut |
| --- | --- |
| Select / rectangle / diamond / ellipse | `V` / `R` / `D` / `O` |
| Arrow / line / ink / text / eraser / laser | `A` / `L` / `P` / `T` / `E` / `K` |
| Pan | Hold `Space` |
| Undo / redo | `Ctrl+Z` / `Ctrl+Y` (or `Ctrl+Shift+Z`) |
| Zoom in / out / reset view | `+` / `-` / `Ctrl+0` |
| Select all / duplicate / delete | `Ctrl+A` / `Ctrl+D` / `Delete` |

The **Architecture Library** on the left contains cloud, Kubernetes, database, and technology stencils. Search by a service or technology name, optionally filter by provider, then drag a stencil to the canvas or click it to place it at the current view center. Drag its right edge to resize the library; double-click that edge to restore its default width. Use `Ctrl+Shift+B` to hide or reveal it.

To connect components, select the arrow tool and draw between them. The canvas also offers its normal selection handles for moving and resizing objects.

## Add reference material

The final buttons in the canvas toolbar import external material:

- **PDF / Slides** (document icon): choose a PDF. CanvasTube opens the slide strip at the bottom of the window.
- **Image** (image icon, or `Ctrl+Shift+I`): choose a PNG, JPG, JPEG, SVG, WebP, or GIF. The image is placed in the current canvas view.
- **Code card** (terminal icon): paste source, select its language, filename, theme, line-number preference, and font size, then select **Place on Canvas**. The result is a vector code-card image that you can move and resize on the canvas.

### Work with PDF slides

After importing a PDF, click a thumbnail to select a page, drag a thumbnail onto the canvas, or use **Insert Page** to place it at the view center. **All (Horizontal)** and **All (Vertical)** add every page in a layout suited to a walkthrough. The lock control determines whether newly inserted pages are locked; lock reference slides before inking over them, and use **Unlock Pages** to make all pages from the active document movable again.

Use **Slide Dock** in the top toolbar, or `Ctrl+Shift+G`, to reopen or hide the dock. If a project contains more than one PDF, choose the desired document from the dock’s document selector.

## Organize a presentation tour

A bookmark stores the current camera position and zoom. Move to an area of the diagram and select **+** beside **Tour**, or press `Ctrl+B`, to capture it.

Open **Tour** (`Ctrl+Shift+M`) to rename a bookmark, reorder it, overwrite its saved position, or remove it. During a presentation, CanvasTube animates between saved viewpoints:

| Action | Default shortcut |
| --- | --- |
| Next / previous bookmark | `Page Down` / `Page Up` |
| Next / previous bookmark (alternate) | `Alt+Right` / `Alt+Left` |
| Jump to bookmark 1–9 | `Alt+1` through `Alt+9` |

The floating presenter bar provides the same controls. It remains available in recording mode. If OBS is connected, a bookmark can also be associated with an OBS scene in the Tour drawer.

## Record with OBS

CanvasTube does not encode video itself; use OBS Studio to capture its application window.

1. In OBS, add CanvasTube as a Window Capture source.
2. In CanvasTube, select **Recording Mode** or press `F10` (`Ctrl+Shift+R` also works). The application chrome is hidden, leaving the canvas and a small exit control.
3. Use the background menu in the top toolbar before recording to select dark, light, green, blue, or magenta. The latter three are useful as chroma-key backgrounds.
4. Use the tour controls to move through the explanation. Press `Esc` or select **Exit** to leave recording mode.

### Optional OBS WebSocket control

Select **OBS**, then connect to your OBS WebSocket server. OBS 28+ normally uses `ws://localhost:4455`. In OBS, open **Tools → WebSocket Server Settings**, enable the server, and enter the same password in CanvasTube if authentication is enabled. Once connected, the dialog can switch program scenes and start or stop OBS recording; scene changes can be assigned to bookmarks.

## Create YouTube chapters

Select **Chapters** to manage a timestamped list. While an OBS-backed recording session is active, `Alt+C` adds a chapter at the current elapsed time; it uses the active bookmark name when available. In the dialog you can edit timestamps and titles, copy the generated chapter text, or save it as a `.txt` file. Timestamps accept `MM:SS` or `HH:MM:SS`.

## Export a diagram

Select **Export** or press `Ctrl+Shift+E`. Choose:

- **Format:** PNG or SVG.
- **Scope:** all elements, current selection, current viewport, or a custom marquee region.
- **Resolution and background:** select a resolution preset and light, dark, or transparent output as appropriate.

Use the marquee option to draw a custom export area on the canvas, then return to the export dialog. You can save the result to a file or copy a PNG to the system clipboard. `Ctrl+Shift+C` is a quick PNG copy: it prefers the current selection and otherwise copies the full canvas.

## Stylus and shortcut settings

Select **Stylus Inspector** or press `Ctrl+Shift+I` to inspect live pointer position, pressure, tilt, and device information. Pen input uses the current canvas tool, and compatible pen eraser contacts temporarily switch to the eraser.

Select the gear button in the top toolbar to change CanvasTube shortcuts. The shortcut dialog shows all editable bindings, can clear a binding, restore an individual default, or restore all defaults. Canvas-native shortcuts such as `Delete`, `Space`, and the number-row tool aliases remain fixed.

## Project contents and backup

A saved project is a directory bundle:

```text
My explanation.canvasproject/
├── project.json   # project title, assets, documents, bookmarks
├── scene.json     # canvas elements and camera state
├── assets/        # imported images
├── documents/     # imported PDFs
└── cache/         # generated local cache data
```

Back up or share the whole directory, not only `project.json` or `scene.json`; imported images and PDFs are stored alongside the project. If CanvasTube reports that an imported file is missing or fails an integrity check, restore that project folder from a complete backup.

## Troubleshooting

- **A project will not open:** select the project directory itself—the folder containing `project.json`—rather than an individual JSON file.
- **A slide or image is absent after reopening:** confirm the full project folder, including `assets/` and `documents/`, was copied or restored.
- **A keyboard shortcut does not fire:** finish editing text or close the active input first; shortcuts intentionally do not override text entry. Check the shortcut settings gear for a customized binding.
- **OBS does not connect:** confirm OBS’s WebSocket server is enabled, the host/port are correct, and the password matches. The default port is `4455`.
- **Need diagnostic detail:** use the `</>` button in the top toolbar to open Electron Developer Tools.
