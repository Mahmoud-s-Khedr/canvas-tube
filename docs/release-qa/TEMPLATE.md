# Fedora release QA evidence

Status: **INCOMPLETE** — replace every pending field with actual hardware evidence.
Create separate records for GNOME Wayland and KDE Wayland for the same package.
Xvfb/X11 automation does not satisfy these checks. Windows manual release QA is deferred.

| Package and test identity | Recorded value |
| --- | --- |
| CanvasTube version | PENDING |
| Git commit (full SHA) | PENDING |
| AppImage filename | PENDING |
| Package SHA-256 (`sha256sum <AppImage>`) | PENDING |
| Fedora version and kernel | PENDING |
| Compositor and version; confirm Wayland | PENDING |
| Tablet model, firmware, connection | PENDING |
| Driver name/version and tablet mapping | PENDING |
| Display resolution/scaling and monitors | PENDING |
| Tester | PENDING |
| Date/time and time zone | PENDING |
| Drawing session start/end and duration | PENDING |

Use PASS, FAIL, UNSUPPORTED or INCOMPLETE per check. Each PASS needs a recording,
screenshot, saved project, exported file, or specific observed result with timestamp.
Every FAIL or UNSUPPORTED needs an issue link and a clear description of the limitation.
Do not infer support from inspector values alone. An unsupported capability is a
recorded limitation, not a pass. Missing evidence leaves the release incomplete.

| Check | Procedure and expected observation | Result | Evidence and issue link |
| --- | --- | --- | --- |
| AppImage launch | Launch the packaged AppImage as a normal user; usable canvas, no crashes | INCOMPLETE | PENDING |
| Stylus pressure | Draw light-to-firm strokes; record inspector pressure and visible width response | INCOMPLETE | PENDING |
| Eraser | Exercise physical eraser and toolbar eraser; record tool transitions and actual deletion | INCOMPLETE | PENDING |
| Barrel controls | Exercise each supported button; verify temporary tool and restoration on release | INCOMPLETE | PENDING |
| Palm rejection | Rest palm while drawing; no stray strokes or unintended gestures; note if hardware lacks touch | INCOMPLETE | PENDING |
| Keyboard shortcuts | Save, Save As, undo/redo, bookmark, recording mode, Escape; suppress shortcuts in title/code inputs | INCOMPLETE | PENDING |
| Zoom and pan | Wheel/touchpad/stylus workflows and monitor scaling; camera remains aligned | INCOMPLETE | PENDING |
| Clipboard | Copy selected/current canvas PNG and paste into another native application; inspect pixels | INCOMPLETE | PENDING |
| Export | PNG/SVG with selection and viewport; inspect decoded files in another application | INCOMPLETE | PENDING |
| Project persistence | Save, close, reopen; compare shapes, camera, bookmarks, source assets and PDF documents | INCOMPLETE | PENDING |
| PDF annotation | Import multi-page PDF, place a page, annotate, save/reopen; source and annotations persist | INCOMPLETE | PENDING |
| Offline assets/fonts | Disable network, launch AppImage, draw text/stencils and import/export; verify local assets | INCOMPLETE | PENDING |
| Sustained drawing | Draw/erase/pan/import/save continuously for at least 60 minutes; record responsiveness, crashes and observed memory | INCOMPLETE | PENDING |

Release decision: **INCOMPLETE**. Link both compositor records and all outstanding
issues here. Resolve failures or document an explicit release decision for unsupported
capabilities before declaring QA complete. Do not pre-fill results from automated tests.
