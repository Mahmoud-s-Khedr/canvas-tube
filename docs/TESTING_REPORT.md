# CanvasTube Testing Report

**Assessment date:** 2026-10-04

## Executive summary

CanvasTube has a healthy, fast unit-test baseline. The current suite passed in
this assessment, as did the TypeScript and lint checks:

- `npm test`: 15 test files and 108 tests passed in about 10 seconds.
- `npm run typecheck`: passed.
- `npm run lint`: passed.

The suite is strongest around pure core logic. Its principal limitation is
scope: it runs in Vitest's Node environment and therefore does not exercise
the renderer UI, Electron lifecycle, preload bridge, or end-to-end user
workflows. There is also no installed coverage provider, coverage report, or
coverage gate.

## Current testing state

### Automated checks

The default test command is `vitest run`. The test configuration deliberately
excludes `References-project/`, dependencies, and build output. The test
environment is `node`.

The repository's Linux and Windows GitHub Actions workflows run, in order:

1. dependency installation;
2. type checking;
3. unit tests;
4. linting; and
5. application build and packaging.

This is a good baseline quality gate: tests, types, and lint must pass before
artifacts are built. The workflows do not launch or interact with a built
Electron application.

### Covered areas

The 108 tests cover important domain and utility behaviour, including:

- project manifests, serialization, asset deduplication, icon search and SVG
  handling;
- filesystem-backed project asset persistence and checksum validation;
- PDF manifest integration and PDF service loading;
- bookmarks and camera interpolation;
- shortcut bindings and dispatch rules;
- canvas connector geometry, stylus/pointer helpers, and Wayland detection;
- recording chapter creation and validation;
- export dimension calculations;
- OBS authentication and disconnected client state; and
- synthetic benchmark and drawing-session-memory simulations.

The filesystem test for `ProjectService` is especially useful because it
exercises real temporary directories rather than only mocks.

### Important gaps

The application contains 49 TypeScript/TSX source modules and roughly 14,500
lines of source. There are 15 renderer components, but no component tests;
there are likewise no direct tests of the Electron main-process entry point or
preload entry point.

The most consequential untested implementation surfaces include:

- `src/renderer/src/App.tsx`;
- `src/renderer/src/components/canvas/ExcalidrawCanvasAdapter.ts`;
- the canvas, export, document, toolbar, sidebar, recording, and modal UI
  components;
- `src/main/index.ts`, which registers privileged IPC handlers; and
- `src/preload/index.ts`, which exposes the renderer's desktop API.

There are no browser-like component tests, Electron E2E tests, accessibility
tests, visual regression tests, or packaged-application smoke tests.

## Coverage and test quality observations

### Coverage is not measured

Vitest coverage cannot currently run because the required V8 coverage provider
is absent (`@vitest/coverage-v8`). As a result, code coverage is unknown and
cannot be used to identify weakly tested critical paths or prevent regressions.

Test/source line counts are not a substitute for coverage: the suite has about
1,735 test lines versus about 14,561 source lines, but that ratio does not say
which branches or workflows are protected.

### Integration and error paths need more depth

`ProjectService` has two tests: a successful PDF-asset round trip and a
checksum mismatch. It should also cover corrupt JSON, missing scene files,
missing or checksum-mismatched assets on open, invalid Base64, invalid relative
paths, failed writes/renames, and partial-save recovery.

The OBS tests currently verify authentication determinism and disconnected
state. They do not verify the WebSocket handshake, request/response matching,
event processing, reconnects, timeouts, or connection failure handling.

The synthetic benchmark and memory audit are useful algorithm-level regression
checks, but they do not render an Excalidraw canvas or establish a browser heap
profile. Fixed timing assertions can also be noisy on heterogeneous CI agents.

### Test output should be quieter

Expected negative-path tests currently emit a project-save error to stderr, and
the PDF suite emits a Node warning about using the legacy PDF build. Addressing
those would make unexpected failures more visible in local and CI output.

### Manual hardware testing exists but is not release evidence

`docs/INPUT-TESTING.md` provides a useful Linux Wayland and Windows tablet QA
checklist. It should become a release artifact with application version, OS,
device/driver, tester, date, and recorded pass/fail result for every case.

## Recommended improvement plan

### Priority 1: make coverage visible

1. Add `@vitest/coverage-v8` as a development dependency.
2. Add a `test:coverage` script and configure text, HTML, and LCOV reports.
3. Upload LCOV/HTML coverage as a CI artifact.
4. Record the first coverage baseline; introduce realistic per-file or global
   thresholds and raise them gradually rather than selecting an arbitrary high
   target.

### Priority 2: test critical renderer workflows

Add React Testing Library, `@testing-library/user-event`, and a DOM test
environment such as jsdom. Test user-visible behaviour rather than internal
implementation details:

- create and edit a canvas;
- save, Save As, and reopen a project;
- import image and PDF assets;
- export and copy output;
- invoke keyboard shortcuts and recording mode; and
- show useful UI recovery when desktop API calls fail or are cancelled.

Mock the desktop API at this layer while retaining a smaller number of real
Electron integration tests below it.

### Priority 3: protect the Electron boundary

Refactor IPC handler registration enough to inject mocked Electron services,
then add contract tests for:

- trusted versus untrusted renderer requests;
- approved-project-directory checks;
- invalid project/save arguments and invalid manifests;
- dialog cancellation and filesystem errors;
- export and clipboard failures; and
- the exact preload method-to-channel mapping.

These checks are high value because they cover the boundary between untrusted
renderer input and filesystem or clipboard access.

### Priority 4: add a small Electron E2E suite

Use an Electron-capable E2E framework to launch the built application and test
the shortest high-value paths on Linux and Windows:

1. application launch and initial window;
2. create a drawing and save it;
3. reopen and verify persistence;
4. import an image or PDF; and
5. export a file and verify its contents.

Run the Linux case under a virtual display and retain Windows execution on the
native runner. A few reliable smoke tests are more valuable initially than a
large brittle E2E suite.

### Priority 5: deepen core negative-path coverage

Expand `ProjectService`, PDF, OBS, shortcut, and icon tests to include malformed
and adversarial inputs, cancelled operations, interrupted writes, disconnects,
and boundary values. Add regression tests whenever production bugs are fixed.

### Priority 6: separate performance from unit gating

Keep deterministic geometry and serialization assertions in unit tests. Run
renderer performance and memory benchmarks in a separately named benchmark job
with recorded measurements and a controlled baseline, rather than treating
machine-dependent frame-rate timing as a standard unit-test assertion.

### Priority 7: formalize release QA

Complete and retain the tablet/platform checklist for each release. Include
Linux Wayland compositor, Windows version, tablet model/driver, and application
version. Link any failure to an issue and automated regression test where
possible.

## Proposed quality gates

After the above work is in place, a pull request should require:

- type checking, linting, unit tests, and coverage reporting;
- component tests for changed renderer workflows;
- IPC contract tests for changed privileged APIs;
- Electron smoke tests for release candidates and platform-specific changes;
- a benchmark report for performance-sensitive changes; and
- a completed manual hardware QA record before release publication.

## Conclusion

The project has a solid unit-test foundation and functioning CI quality gates.
The next investment should shift from adding more pure-function tests to
testing the real product boundaries: renderer behaviour, Electron IPC security,
filesystem persistence failures, and a small number of full desktop workflows.
