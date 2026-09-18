# Drawing Tablet Input Architecture Report

## Scope and verification

This report documents CanvasTube's tablet-input architecture and the completed Phase 1 diagnostic instrumentation. It does not propose driver, HID, OpenTabletDriver daemon, or device-ID integration.

The repository was inspected with `@excalidraw/excalidraw` 0.18.1 installed. After Phase 1, `npm test` passed all 101 tests, `npm run typecheck` passed, and `git diff --check` passed.

## 1. Keyboard shortcuts and commands

CanvasTube already has an appropriately small command abstraction in `src/renderer/src/shortcuts/shortcut-registry.ts`: each command has a semantic ID, label, category, default binding, optional aliases, remappability, and an `execute()` callback.

`src/renderer/src/shortcuts/use-shortcut-dispatcher.ts` installs one capture-phase `window` `keydown` listener. It ignores repeat events, respects text-editing targets, matches editable bindings, prevents propagation, and calls the command. Commands marked native are intentionally not handled and continue to Excalidraw.

This already supports the desired express-key path:

```text
OpenTabletDriver express key
  -> normal operating-system keyboard event
  -> Electron/Chromium KeyboardEvent
  -> CanvasTube shortcut registry
  -> semantic action
  -> CanvasAdapter
  -> Excalidraw
```

There is no OpenTabletDriver, Linux, XP-Pen, HID, or driver-specific application integration. None is required for tablet express keys.

The existing registry is sufficient for that job. A larger command framework should not be introduced merely for tablet support.

## 2. Relevant shortcut inventory

The following is the complete tablet-relevant shortcut inventory in the current registry. CanvasTube commands are application-defined and remappable. Native Excalidraw entries are displayed by CanvasTube, but not intercepted or remappable there.

| Command | Existing shortcut | Kind | Suitable for OTD | Caveat |
| --- | --- | --- | --- | --- |
| Undo | Ctrl+Z | CanvasTube | Yes | The adapter forwards the action to Excalidraw. |
| Redo | Ctrl+Y; Ctrl+Shift+Z alias | CanvasTube | Yes | Prefer Ctrl+Y on Fedora. |
| Select | V | CanvasTube | Yes | |
| Ink / freedraw | P | CanvasTube | Yes | |
| Eraser | E | CanvasTube | Yes | |
| Pan | Space, held | Native Excalidraw | Yes | No current H shortcut; configure press-and-hold, not a tap. |
| Zoom in | Shift++; `=` alias | CanvasTube | Yes | Bind `=` in OTD. |
| Zoom out | - | CanvasTube | Yes | |
| Reset view | Ctrl+0 | CanvasTube | Yes | Less useful than direct zoom. |
| Laser pointer | K | CanvasTube | Yes | |
| Rectangle / diamond / ellipse | R / D / O | CanvasTube | Yes | Optional alternative tool keys. |
| Arrow / line / text | A / L / T | CanvasTube | Yes | Optional alternative tool keys. |
| Image import | Ctrl+Shift+I | CanvasTube | No | Conflicts with Inspector below. |
| Stylus inspector | Ctrl+Shift+I | CanvasTube | No | Currently shadowed by Image import. |
| Delete | Delete / Backspace | Native Excalidraw | Usually no | |
| Number-row tools | 1–0 | Native Excalidraw | Yes | 1 is Select through 0 is Eraser. |
| Select all / duplicate | Ctrl+A / Ctrl+D | Native Excalidraw | Yes | |

Other registered CanvasTube shortcuts are project and presentation controls: Ctrl+N/O/S, Ctrl+Shift+S/E/C, Ctrl+Shift+B/G/M, Ctrl+B, Alt+1–9, PageUp/PageDown, Alt+Arrow keys, F10, Alt+C, and Escape.

### Existing shortcut issue

`tool.image` and `presentation.inspector` both use Ctrl+Shift+I. The registry selects the first matching editable command, which means the Inspector shortcut is unreachable. Resolve this collision before documenting a stable full shortcut map; do not add a tablet-only chord to work around it.

## 3. Excalidraw tool selection and API boundary

`src/renderer/src/components/canvas/ExcalidrawCanvasAdapter.ts` is the Excalidraw integration boundary.

- `getTool()` reads `api.getAppState().activeTool.type`.
- `setTool()` calls Excalidraw's public `api.setActiveTool()` API.
- The adapter maps CanvasTube tool names to Excalidraw names.
- Undo and redo are the exception: Excalidraw exposes no equivalent public imperative undo/redo API here, so the adapter dispatches a synthetic Ctrl+Z/Y key event to the Excalidraw container.

The adapter's `CanvasToolType` covers selection, freedraw, shapes, text, eraser, and laser. It does not include `hand`. Excalidraw 0.18.1 supports `hand` through the public `setActiveTool()` API, so temporary pan requires only a small addition to the CanvasTube tool union and adapter mapping; it does not require an Excalidraw fork.

## 4. Pointer and pen event flow

`src/renderer/src/components/canvas/CanvasView.tsx` wraps Excalidraw. It observes `pointerdown`, `pointermove`, `pointerup`, and `pointercancel` in React capture phase, then lets the original browser event continue to Excalidraw.

```text
native PointerEvent
  -> CanvasView capture handler
  -> adapter.recordPointerEvent(event, eventType)
  -> optional InputInspector snapshot
  -> untouched original event reaches Excalidraw
```

`CanvasView` passes `pointerdown`, `pointermove`, `pointerup`, and `pointercancel` explicitly to `recordPointerEvent()`. `ExcalidrawCanvasAdapter.recordPointerEvent()` creates one diagnostic snapshot for each received browser event, using the native event's values. It does not replay, transform, or forward coalesced samples to Excalidraw; it records their count only. An empty coalesced-event array is reported as a count of one, because the browser event itself was received.

The Inspector subscription and resulting React updates are active only while its panel is open, avoiding normal drawing-time render churn.

## 5. Pressure, tilt, and current diagnostics

The adapter snapshots:

- event type (`pointerdown`, `pointermove`, `pointerup`, or `pointercancel`)
- `pointerType`
- changed `button` and current `buttons` bitmask
- pressure
- `tiltX`, `tiltY`, and twist
- client and scene coordinates
- pointer ID, primary status, and timestamp
- coalesced-event count

Excalidraw receives the untouched browser pointer event. Its freedraw implementation reads native pressure at down/move/up and stores pressure samples on freehand elements. It treats a constant `pressure === 0.5` as simulated pressure.

CanvasTube currently observes tilt only for inspection; no application or installed Excalidraw code uses `tiltX` or `tiltY` to modify drawing behavior.

The opt-in Input Inspector retains its live metrics and pressure display. It also displays a newest-first `Recent pen events` log containing the latest 16 pen events, with event type, pointer type, pointer ID, button, buttons, pressure, tilt X/Y, timestamp, and coalesced-event count. Its `PEN / STYLUS` identity is intentionally generic: Pointer Events can identify a pen, but not its vendor or model.

## 6. Existing stylus behavior and issues

There is a preliminary momentary eraser implementation in `src/core/canvas/stylus-controls.ts` and `CanvasView.tsx`. It should not be extended as-is.

Problems found:

1. It defaults to treating masks `2` and `4` as an eraser without measuring actual device behavior.
2. `buttons = 4` is the standard middle-button bit, not a portable second pen-barrel-button identity. The Pointer Events standard assigns the conventional pen barrel button to `button = 2` / `buttons = 2`; a second physical switch is driver-dependent.
3. It only reacts to `pointerdown`, not to button-state changes observable during `pointermove`.
4. It cannot distinguish a temporary eraser from temporary hand/pan.
5. It has no recovery on `window.blur`, hidden document, lost pointer capture, outside-canvas release, or component unmount.
6. It can restore a stale tool after the user intentionally chooses a new tool while a temporary action is active.
7. It duplicates Excalidraw's own physical eraser-end handling (`button = 5`, `buttons = 32`), which already has momentary restoration logic.
8. Stylus preferences persist locally, but their UI was removed; consequently, the current default barrel-button behavior is not user-configurable in the application UI.

The current `CanvasAdapterEvents` declaration is also unused, while pointer diagnostics are exposed only through concrete `ExcalidrawCanvasAdapter` methods. This is a small abstraction leak worth correcting only if it is needed by the momentary controller.

## 7. Recommended architecture

### Tablet express keys

Continue using OTD to emit existing normal keyboard bindings. The application needs no tablet-specific logic for this category.

The shortcut registry remains the single semantic route for CanvasTube bindings. Native Excalidraw keys such as held Space continue through to Excalidraw. Toolbar actions and shortcut actions already converge at the `CanvasAdapter` for canvas operations.

### Pen barrel buttons

Add a small pure `MomentaryToolController`, separate from keyboard shortcuts and hardware drivers. It receives standard pen input and emits semantic temporary tools.

```ts
type PenInput = {
  kind: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel'
  pointerType: string
  pointerId: number
  button: number
  buttons: number
  pressure: number
  tiltX: number
  tiltY: number
  x: number
  y: number
  timestamp: number
}
```

The controller should use calibrated, configurable matching rules rather than inferred device/vendor identities or assumed button masks. Its only actions should be semantic tools: `eraser` and `hand`.

### Controller behavior

1. Capture the baseline tool when the first configured barrel action becomes active.
2. Maintain temporary actions in activation order. If eraser is held and hand is then held, hand is active; releasing hand restores eraser; releasing eraser restores the original baseline.
3. Determine held state from the `buttons` bitmask and changes between samples, not equality against one hardcoded `button` value.
4. On `pointercancel`, global matching `pointerup`, `window.blur`, visibility loss, lost pointer capture, or unmount, clear temporary state and restore the baseline.
5. If the user selects a different tool through Excalidraw's toolbar, a shortcut, or other UI while temporary state is active, user intent wins: clear temporary state without restoring the stale baseline.
6. Do not intercept a physical eraser-end unless diagnostics demonstrate that Excalidraw's native behavior is insufficient.
7. Never synthesize mouse input or alter pressure samples.

This works with XP-Pen, Huion, Wacom, Windows Ink, macOS drivers, mouse, touch, and generic pens because it relies only on standard browser PointerEvents.

## 8. Development diagnostics

Phase 1 implemented the existing opt-in `InputInspector` rather than adding a new route, always-on logger, or production feature.

The event list is one row per received browser event, newest first:

```text
event type | pointerType | pointerId | button | buttons |
pressure | tiltX | tiltY | timestamp | coalesced count
```

`CanvasPointerSnapshot` now includes `eventType`, `button`, and `coalescedEventCount`; `CanvasView` passes the event kind to `recordPointerEvent()`. The construction helper in `src/core/canvas/pointer-diagnostics.ts` is covered by `tests/pointer-diagnostics.test.ts`, including all four event types, present and absent `getCoalescedEvents()`, and an empty coalesced-event result.

This keeps diagnostics out of normal production behavior while allowing real Fedora/Wayland/OpenTabletDriver measurements before a button profile is chosen.

## 9. Proposed eight-key Deco layout

The Deco 01 V3 has eight customizable express keys. This proposal assumes K1–K8 follow the driver’s physical order; verify the visible OTD labels before assigning them.

| Key | OTD binding | Canvas action | Reason |
| --- | --- | --- | --- |
| K1 | Ctrl+Z | Undo | Highest-frequency correction; easiest position. |
| K2 | Ctrl+Y | Redo | Natural undo/redo pair. |
| K3 | P | Ink | Primary drawing tool. |
| K4 | E | Eraser | Primary correction tool, paired with Ink. |
| K5 | V | Select | Quick return to object manipulation. |
| K6 | Space, held | Pan | Existing native momentary pan; configure key-down/key-up. |
| K7 | = | Zoom in | Secondary navigation. |
| K8 | - | Zoom out | Paired with zoom in; least frequent. |

Color and stroke-width controls are intentionally excluded: CanvasTube has no existing direct semantic commands/shortcuts for them. Laser and shape keys are good user-remappable alternatives, but are less generally valuable than correction, drawing, selection, pan, and zoom.

## 10. Proposed pen defaults after calibration

- Lower/forward barrel button: temporary eraser.
- Upper/rear barrel button: temporary hand/pan.

Both bindings should start unbound in application policy. After diagnostics record the actual signatures on Fedora/Wayland/Electron, map the measured values. Do not assume they are `2` and `4`.

The Pointer Events specification documents `button` as the changed button and `buttons` as the current bitmask. It also explains that chorded buttons may be reported through `pointermove` rather than overlapping `pointerdown`/`pointerup` events. See [Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/).

## 11. Remaining implementation scope

Phase 1 is complete and modified:

- `src/core/canvas/canvas-adapter.ts`: extended diagnostic snapshot metadata.
- `src/core/canvas/pointer-diagnostics.ts`: added pure snapshot construction and coalesced-event counting.
- `src/renderer/src/components/canvas/CanvasView.tsx`: passes capture-handler event types to the adapter.
- `src/renderer/src/components/canvas/ExcalidrawCanvasAdapter.ts`: records one native-event snapshot per browser event.
- `src/renderer/src/components/inspector/InputInspector.tsx`: added the generic pen identity and recent pen-event log.
- `tests/pointer-diagnostics.test.ts`: verifies diagnostic construction.

Future phases may modify:

- `src/core/canvas/canvas-adapter.ts`: add `hand`.
- `src/core/canvas/stylus-controls.ts`: remove the premature “both barrels erase” policy and retain palm-rejection policy.
- New `src/core/canvas/momentary-tool-controller.ts`: pure temporary-tool state machine.
- `src/renderer/src/components/canvas/CanvasView.tsx`: route capture and recovery lifecycle events to the controller.
- `src/renderer/src/components/canvas/ExcalidrawCanvasAdapter.ts`: record event metadata; map `hand`; expose active-tool observation necessary to honor a user-selected replacement tool.
- `src/renderer/src/components/inspector/InputInspector.tsx`: show event log and generic pen identity.
- `tests/stylus-controls.test.ts` plus a new momentary-tool-controller test file.
- `docs/INPUT-TESTING.md` and `README.md`: remove assumed barrel values, document measured values, and list recommended OTD bindings.

The current shortcut registry should only be changed to resolve its existing Ctrl+Shift+I conflict if that is approved. No tablet-only shortcut should be introduced.

## 12. Minimal commit sequence

### Phase 1: Instrument and verify pen events — implemented

The Inspector now records actual pen-event sequences, removes the hardcoded vendor identity, and exposes unverified button claims for measurement. Perform the Fedora/Wayland/Electron measurements before selecting any barrel-button mapping.

### Phase 2: Reuse existing shortcuts for express keys

Configure K1–K8 externally in OTD. No tablet-specific application code is required.

### Phase 3: Refine the command boundary only if required

Keep the existing shortcut registry. Add active-tool observation only if necessary for the momentary state controller. Resolve the existing duplicate binding.

### Phase 4: Implement temporary eraser and pan

Add the pure state controller, `hand` adapter mapping, measured barrel bindings, and loss-of-input recovery.

### Phase 5: Add tests and edge-case handling

Cover hover, press/release ordering, stacked barrel buttons, manual tool selection during hold, pointer cancellation, blur, visibility loss, release outside canvas, repeated events, mouse, touch, and pen eraser-end behavior.

### Phase 6: Document OTD configuration

Document the verified express-key layout and adaptive pen-button setup. Do not include OTD daemon integration in this repository.
