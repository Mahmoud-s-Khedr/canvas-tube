# Hardware Tablet & Stylus Testing Guide (Linux Wayland & Windows)

This guide details the hardware verification, driver setup, and manual testing procedures for **CanvasTube** running on **Fedora Linux (Wayland)** and **Windows 10 & 11** with drawing tablets (XP-Pen Deco 01 V3, Wacom, Huion).

---

## 1. Hardware & System Profiles

### Linux Profile
- **Primary Target OS**: Fedora Linux 40 / 41+ (Workstation / GNOME or KDE Spin)
- **Display Server Protocol**: Wayland (`XDG_SESSION_TYPE=wayland`)
- **Input Subsystem**: `libinput` kernel driver
- **Target Tablet**: XP-Pen Deco 01 V3 (USB Digitizer, 8192 pressure levels, ±60° tilt)
- **Application Engine**: Electron 34 / Chromium 132 / React 18 / Excalidraw

### Windows Profile
- **Target OS**: Windows 10 (Build 19041+) and Windows 11 (22H2 / 23H2 / 24H2)
- **Input Subsystem**: Windows Ink / DirectManipulation / WM_POINTER
- **Target Tablets**: XP-Pen, Wacom Intuos/One, Huion Inspiroy, Microsoft Surface Pen

---

## 2. Linux Driver & System Verification

### Step 1: Verify USB Connection

Open a terminal on your Fedora workstation and confirm the tablet is detected by the USB subsystem:

```bash
lsusb | grep -i "xp-pen\|ugee\|tablet"
```

*Expected output*: A device identifier from Hanvon/Ugee/XP-Pen (e.g., `Bus 001 Device 004: ID 28bd:0905 XP-Pen Deco 01 V3`).

### Step 2: Verify `libinput` Tablet Recognition

Inspect `libinput` to confirm Linux recognizes the device as a digitizer tablet rather than a standard mouse:

```bash
# List all recognized input devices
libinput list-devices | grep -A 10 -i "deco\|tablet\|stylus"
```

Look for:
- **Capabilities**: `tablet-pad` and `tablet-tool`
- **Pressure Levels**: Up to `8192`
- **Tilt**: Supported on X and Y axes

### Step 3: Test Hardware Event Stream (`evtest`)

If you experience issues, verify raw kernel events using `evtest`:

```bash
sudo dnf install -y evtest
sudo evtest
```

Select the XP-Pen Stylus event device and draw on the active area. You should observe continuous `ABS_PRESSURE`, `ABS_TILT_X`, and `ABS_TILT_Y` values updating.

---

## 3. Wayland Electron Configuration

CanvasTube automatically detects Wayland sessions and configures Chromium's Ozone platform flags in `src/main/index.ts`:

- `--enable-features=UseOzonePlatform`
- `--ozone-platform=wayland`
- `--enable-pointer-lock-options`

To manually force native Wayland mode when launching development builds:

```bash
ELECTRON_OZONE_PLATFORM_HINT=wayland npm run dev
```

---

## 4. Windows 10 & 11 Driver & Setup Guide

### Step 1: Windows Ink Configuration
1. Open **Windows Settings** → **Bluetooth & devices** → **Pen & Windows Ink**.
2. Ensure **Windows Ink** is active.
3. Open your tablet vendor driver (e.g. XP-Pen Pentablet / Wacom Tablet Properties) and verify **Windows Ink** checkbox is **checked**.
   *(CanvasTube uses Chromium's native DirectManipulation pipeline, which expects Windows Ink pointer events for sub-pixel accuracy and high-resolution pressure).*

### Step 2: Running CanvasTube on Windows
- For standalone testing without installation, download or build the portable executable `CanvasTube <version>.exe`.
- Run `CanvasTube.exe`. No driver reboot or administrator permissions required.

---

## 5. Live Stylus & Pointer Inspector Walkthrough

CanvasTube includes a built-in developer **Stylus & Pointer Inspector** specifically engineered to diagnose tablet driver behavior across Wayland and Windows.

### Opening the Inspector

- Click the **"Stylus Inspector"** button in the top toolbar, OR
- Press **`Ctrl + Shift + I`**

### What to Verify

```
┌─────────────────────────────────────────────────────────┐
│ [Activity] Stylus & Pointer Inspector               [X] │
├─────────────────────────────────────────────────────────┤
│ [Tablet] PEN           [XP-PEN / STYLUS DETECTED]       │
├─────────────────────────────────────────────────────────┤
│ Client (X, Y): 842, 412     │ Canvas (X, Y): 120, -85   │
│ Tilt (X / Y):  14° / -22°   │ Buttons / ID:  btn:1 (id:3)│
├─────────────────────────────────────────────────────────┤
│ Stylus Pressure: 0.642 (64%)                            │
│ [████████████████████░░░░░░░░░░░░░░]                    │
├─────────────────────────────────────────────────────────┤
│ Host: linux (x64) • Wayland                             │
│ (or Host: win32 (x64) • Windows (PointerEvents))        │
│ Electron: v34.5.8 • Chrome: v132.0.6834.196            │
├─────────────────────────────────────────────────────────┤
│ Recent Pointer Trail: [||||||||]                        │
└─────────────────────────────────────────────────────────┘
```

1. **Device Mode Badge**:
   - Touch with Mouse ➔ Displays `MOUSE` in gray.
   - Touch with XP-Pen Stylus ➔ Immediately switches to **`PEN / XP-PEN DETECTED`** with a green badge.
   - Touch with Finger (touchscreens) ➔ Displays `TOUCH` in amber.

2. **Pressure Gauge**:
   - Light hover/touch ➔ Pressure displays low values (`0.01` to `0.20`).
   - Firm press ➔ Gauge smoothly climbs through green into red (`0.75` to `1.00`).
   - Confirm pressure transitions smoothly without stepped quantization (8192 levels supported).

3. **Tilt Coordinates**:
   - Tilt stylus forward/backward ➔ `tiltY` moves between `-60°` and `+60°`.
   - Tilt stylus left/right ➔ `tiltX` moves between `-60°` and `+60°`.

4. **Stylus Buttons**:
   - Default tip touch: `buttons: 1`
   - Barrel lower button click: `buttons: 2`
   - Barrel upper button click: `buttons: 4`

5. **Host Environment Indicator**:
   - On Linux Wayland: `Host: linux (x64) • Wayland`
   - On Windows: `Host: win32 (x64) • Windows (PointerEvents / DirectManipulation)`

---

## 6. Linux Wayland Desktop Calibration & Multi-Monitor Setup

On multi-monitor Wayland setups (e.g. laptop screen + 4K external display), Fedora GNOME or KDE may map the tablet across all monitors by default, skewing aspect ratios.

### GNOME Wayland Configuration

1. Open **Fedora Settings** ➔ **Drawing Tablet**.
2. Under **Tablet**, set **Display Mapping** to your primary recording monitor (e.g., `4K Display`).
3. Set **Tracking Mode** to **Absolute**.
4. Adjust the **Pressure Curve** slider to match your physical hand pressure preference.

### KDE Plasma Wayland Configuration

1. Open **System Settings** ➔ **Input Devices** ➔ **Drawing Tablet**.
2. Select your XP-Pen Deco 01 V3 and map to the specific screen output.

---

## 7. Manual QA Checklist for Release Testing

Before publishing a release, complete this verification checklist:

| Test Case | Steps | Expected Result | Linux Wayland | Windows 10/11 |
|---|---|---|---|---|
| **TC-01: Stylus Detection** | Hover and touch stylus to canvas | Inspector badge shows `PEN / XP-PEN DETECTED` | [ ] | [ ] |
| **TC-02: Pressure Response** | Draw freehand line with varying hand pressure | Stroke width smoothly reflects pressure variations | [ ] | [ ] |
| **TC-03: Palm Rejection** | Rest palm on tablet while drawing with stylus | Hand contact produces no stray lines or gestures | [ ] | [ ] |
| **TC-04: Recording Mode Hotkey** | Press `F10` or `Ctrl + Shift + R` | Toolbars and sidebars collapse; recording tag appears | [ ] | [ ] |
| **TC-05: Exit Recording Mode** | Press `Esc` or click Exit badge | Standard application UI and toolbars re-appear | [ ] | [ ] |
| **TC-06: Architecture Stencils** | Search "Database" and click/drag icon | Stencil SVG appears centered in canvas viewport | [ ] | [ ] |
| **TC-07: Project Save & Re-open** | Draw diagram, save project, reload app, open folder | Elements, assets, and positions reload accurately | [ ] | [ ] |
| **TC-08: Offline Font Rendering** | Disconnect network, launch app | Hand-drawn fonts render crisp without remote CDN fetches | [ ] | [ ] |
| **TC-09: Portable Launch (Win)** | Double-click `CanvasTube <ver>.exe` | App boots cleanly without administrator elevation | N/A | [ ] |
