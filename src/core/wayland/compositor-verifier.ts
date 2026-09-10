import { detectCompositor, WaylandCompositorProfile } from './wayland-detector'

export interface CompositorTestResult {
  compositor: string
  environment: Record<string, string>
  profile: WaylandCompositorProfile
  ozoneFlagsValid: boolean
  tabletV2Active: boolean
  clipboardCompliant: boolean
  windowDecorationMode: 'csd' | 'ssd'
  passed: boolean
  notes: string[]
}

export function verifyCompositorEnvironment(
  env: Record<string, string>
): CompositorTestResult {
  const profile = detectCompositor(env)
  const notes: string[] = []

  // 1. Verify Ozone Flags
  const requiredFlags = [
    '--ozone-platform-hint=auto',
    '--enable-features=UseOzonePlatform,WaylandWindowDecorations',
    '--enable-pointer-lock-options'
  ]
  const ozoneFlagsValid = profile.detected
    ? requiredFlags.every((flag) => profile.recommendedOzoneFlags.includes(flag))
    : profile.recommendedOzoneFlags.length === 0

  if (!ozoneFlagsValid) {
    notes.push('Missing recommended Ozone platform command line switches')
  }

  // 2. Verify Tablet-v2 protocol support for stylus pressure/tilt
  const tabletV2Active = profile.detected ? profile.tabletV2Supported : false
  if (profile.detected && !tabletV2Active) {
    notes.push('Tablet-v2 protocol unavailable; stylus input will lack pressure/tilt fidelity')
  }

  // 3. Verify Clipboard protocol compliance
  let clipboardCompliant = false
  if (profile.name === 'Hyprland' || profile.name === 'Sway') {
    clipboardCompliant = profile.clipboardProtocol === 'wlr-data-control'
  } else if (profile.name === 'GNOME Mutter' || profile.name === 'KDE KWin' || profile.name === 'Generic Wayland') {
    clipboardCompliant = profile.clipboardProtocol === 'wl_data_device'
  } else {
    clipboardCompliant = profile.clipboardProtocol === 'x11-selection'
  }

  if (!clipboardCompliant) {
    notes.push(`Unexpected clipboard protocol ${profile.clipboardProtocol} for ${profile.name}`)
  }

  // 4. Window Decoration Mode
  const windowDecorationMode: 'csd' | 'ssd' = profile.serverSideDecorations ? 'ssd' : 'csd'
  if (profile.name === 'GNOME Mutter' && profile.serverSideDecorations) {
    notes.push('GNOME Mutter does not implement SSD via org_kde_kwin_server_decoration_manager')
  }

  const passed = ozoneFlagsValid && tabletV2Active === profile.detected && clipboardCompliant

  return {
    compositor: profile.name,
    environment: env,
    profile,
    ozoneFlagsValid,
    tabletV2Active,
    clipboardCompliant,
    windowDecorationMode,
    passed,
    notes
  }
}

export function runCompositorRegressionSuite(): {
  results: CompositorTestResult[]
  allPassed: boolean
} {
  const environments: Array<{ name: string; env: Record<string, string> }> = [
    {
      name: 'GNOME Mutter (Wayland)',
      env: {
        XDG_SESSION_TYPE: 'wayland',
        XDG_CURRENT_DESKTOP: 'GNOME',
        GDMSESSION: 'gnome',
        WAYLAND_DISPLAY: 'wayland-0'
      }
    },
    {
      name: 'KDE KWin (Wayland Plasma)',
      env: {
        XDG_SESSION_TYPE: 'wayland',
        XDG_CURRENT_DESKTOP: 'KDE',
        WAYLAND_DISPLAY: 'wayland-0'
      }
    },
    {
      name: 'Hyprland (Wayland Tiling)',
      env: {
        XDG_SESSION_TYPE: 'wayland',
        XDG_CURRENT_DESKTOP: 'Hyprland',
        HYPRLAND_INSTANCE_SIGNATURE: 'abc123xyz_hypr',
        WAYLAND_DISPLAY: 'wayland-1'
      }
    },
    {
      name: 'Sway (wlroots)',
      env: {
        XDG_SESSION_TYPE: 'wayland',
        XDG_CURRENT_DESKTOP: 'sway',
        SWAYSOCK: '/run/user/1000/sway-ipc.sock',
        WAYLAND_DISPLAY: 'wayland-0'
      }
    },
    {
      name: 'Legacy X11 Session',
      env: {
        XDG_SESSION_TYPE: 'x11',
        DISPLAY: ':0'
      }
    }
  ]

  const results = environments.map((e) => verifyCompositorEnvironment(e.env))
  const allPassed = results.every((r) => r.passed)

  return { results, allPassed }
}
