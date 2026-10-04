# CanvasTube testing assessment

Assessment date: 2026-10-04. The roadmap adds renderer, Electron boundary and desktop
smoke coverage to the original 108-test Node foundation. This document distinguishes
local verification, platform CI evidence, and manual hardware release evidence.

## Commands and suite boundaries

| Command | Purpose |
| --- | --- |
| `npm test` | Node core/services plus renderer Vitest projects, without coverage |
| `npm run test:renderer` | React/application and real canvas adapter tests in jsdom |
| `npm run test:coverage` | Combined V8 all-source coverage; text, HTML, LCOV and JSON summary |
| `npm run typecheck` | Production code, all test/support files and Playwright configuration |
| `npm run lint` | Source, tests and scripts; generated reports and local references ignored |
| `npm run build` | Compile Electron main, preload and renderer |
| `npm run test:e2e` | Compiled app smoke tests, after build, using Playwright Electron launch |
| `npm run test:e2e:packaged -- --grep launch` | Launch the unpacked platform executable after packaging |
| `npm run benchmark` | Algorithm timings and explicitly labeled memory/compositor simulations |
| `npm run benchmark:renderer` | Advisory actual Electron renderer timings and heap samples |

Vitest uses separate Node and jsdom projects with coverage configured at the root.
All `src/**/*.ts` and `src/**/*.tsx` remain included, including untested entry points.
E2E tests run only in Playwright. References-project is ignored by Git and excluded
from testing/linting; references were consulted for architecture only. No reference
source or tldraw dependency is added. The project configuration follows the
[Vitest 3 projects documentation](https://v3.vitest.dev/guide/projects); the desktop
harness uses [Playwright Electron support](https://playwright.dev/docs/api/class-electron).

Renderer tests use the real App, toolbar, settings, bookmarks, export and document UI.
A stateful canvas double isolates application orchestration; PDF rendering and the
large icon catalogue are substituted where necessary. Separate adapter tests use the
real adapter against an imperative API double. Browser shortcuts use jsdom input
with an explicit test-only trust wrapper; native keyboard input is exercised by Electron.
Node tests never install renderer DOM shims. New support files are typechecked.

## Production fixes covered by regression checks

- Desktop operation rejections and unsuccessful saves produce feedback and preserve
  the existing project; toast timers are cleared on unmount.
- IPC registration is injected and checks the active web contents and main frame
  for every channel before privileged work. Save/export/clipboard inputs are checked.
  Save As approves a directory only after success; open approves only after success.
- Export modal stacking keeps its buttons above the PDF dock and presenter bar.
- Atomic writes clean temporary files after write/rename failure and wait for all
  concurrent destination writes to settle before returning.
- OBS rejects early close/cancellation, clears handshake/request/reconnect timers and
  detaches old socket callbacks. PDF cleanup handles rejected promises and attempts
  task destruction even when cleanup fails.
- Adapter destruction releases listeners, subscribers, keyboard targets and pending scene.

The project manifest/scene/asset writes remain **individual atomic writes, not a single
transaction**. A scene rename failure may follow a successful manifest write; tests
explicitly document that outcome. There is no new persistence format or rollback promise.

## Automated desktop evidence

Each Electron test gets isolated user data and project directories. Native dialogs
are stubbed from the main process, with no production test bridge. Tests verify bridge
availability, drawing, save/restart/reopen, original PNG/PDF imports, source bytes on
disk, and decoded PNG/SVG output. Reopen saves compare scene records rather than
relying on screenshots. Renderer exceptions and crashes fail checks. Temporary files
and processes are cleaned; failures retain screenshots, traces and process logs.
The fixtures are original small generated images/documents, not copied reference assets.

Both build workflows run typecheck, combined coverage and lint, then compiled-app
smoke tests before packaging and unpacked executable launch tests after packaging.
Fedora runs in its existing Fedora 41 container as a non-root user under Xvfb/X11 with
Electron libraries installed. Windows runs natively. Package artifact names remain
unchanged. Coverage and desktop diagnostics upload with always-run steps for 14 days.
Generated results are ignored by Git. Installer automation and visual baselines remain
outside this roadmap.

## Performance and release evidence

Machine-speed assertions were removed from ordinary algorithm unit tests in favor of
count and spatial-query correctness. `benchmark-results/algorithms.json` and `.md`
record five-run medians, deterministic input and hardware/runtime metadata. Synthetic
memory and compositor outputs are explicitly simulations.

`benchmark-results/renderer.json` and `.md` measure the actual running Electron renderer
at 1,000, 5,000 and 10,000 deterministic seed-42 elements, with one warmup and three
measured runs. UI load includes IPC/filesystem and two animation frames; PNG export
uses the viewport and includes native save plus feedback. RAF frame intervals are
sampled during wheel input. CDP heap samples follow ten real create/delete/import/reset
cycles. Samples without forced GC do not establish the absence of leaks. These timings
are advisory, run only on main pushes/manual dispatch in a separate workflow, and are
retained for 14 days. They are not PR performance gates.

[Fedora release QA](INPUT-TESTING.md) requires separate actual GNOME and KDE Wayland
records using the [evidence template](release-qa/TEMPLATE.md), packaged AppImage,
pressure, eraser/barrel controls, palm rejection, shortcuts, zoom/pan, clipboard/export,
persistence, PDF annotation, offline fonts/assets and a sustained drawing session.
No hardware results have been recorded here. Release QA is incomplete until those
records are supplied; Xvfb and simulated compositor tests cannot substitute.
Windows manual QA is deferred; Windows automation remains required.

## Coverage minimums and remaining acceptance

`coverage-minimums.json` records the gate status explicitly. Minimums must be the lower
Fedora/Windows result for each of statements, branches, functions and lines, rounded
down, after both platforms pass the same revision. While that evidence is pending,
minimums are null and no guessed gate is activated. The root config uses numeric
minimums once reviewed measurements are committed.

Download each platform's `coverage/coverage-summary.json`, then run:

```bash
node scripts/propose-coverage-minimums.mjs fedora-summary.json windows-summary.json
```

The script prints a proposal and never changes or lowers gates. Review both successful
platform runs and explicitly commit the four numbers. Raise minimums after verified
improvements; do not lower them automatically or exclude modules. An excessive
threshold can be checked without editing version-controlled minimums:

```bash
npm run test:coverage -- --coverage.thresholds.statements=100
```

This command must exit nonzero while the ordinary suite passes. Platform CI runs and
hardware records are external acceptance checks; local success alone does not satisfy
the roadmap's two-platform coverage or Fedora hardware requirements.
