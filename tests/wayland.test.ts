import { describe, it, expect } from 'vitest'
import {
  detectCompositor,
  isWaylandEnv
} from '../src/core/wayland/wayland-detector'
import {
  verifyCompositorEnvironment,
  runCompositorRegressionSuite
} from '../src/core/wayland/compositor-verifier'

describe('Wayland Compositor Detection & Ozone Flag Automation', () => {
  it('verifies individual compositor environment via verifyCompositorEnvironment', () => {
    const singleResult = verifyCompositorEnvironment({
      XDG_SESSION_TYPE: 'wayland',
      XDG_CURRENT_DESKTOP: 'GNOME',
      WAYLAND_DISPLAY: 'wayland-0'
    })
    expect(singleResult.passed).toBe(true)
    expect(singleResult.compositor).toBe('GNOME Mutter')
  })

  it('detects GNOME Mutter on Wayland sessions', () => {
    const env = {
      XDG_SESSION_TYPE: 'wayland',
      XDG_CURRENT_DESKTOP: 'GNOME',
      WAYLAND_DISPLAY: 'wayland-0'
    }

    expect(isWaylandEnv(env)).toBe(true)
    const profile = detectCompositor(env)

    expect(profile.name).toBe('GNOME Mutter')
    expect(profile.detected).toBe(true)
    expect(profile.serverSideDecorations).toBe(false)
    expect(profile.tabletV2Supported).toBe(true)
    expect(profile.clipboardProtocol).toBe('wl_data_device')
    expect(profile.recommendedOzoneFlags).toContain('--ozone-platform-hint=auto')
    expect(profile.recommendedOzoneFlags).toContain(
      '--enable-features=UseOzonePlatform,WaylandWindowDecorations'
    )
  })

  it('detects KDE KWin with Server Side Decorations (SSD)', () => {
    const env = {
      XDG_SESSION_TYPE: 'wayland',
      XDG_CURRENT_DESKTOP: 'KDE',
      WAYLAND_DISPLAY: 'wayland-0'
    }

    const profile = detectCompositor(env)
    expect(profile.name).toBe('KDE KWin')
    expect(profile.detected).toBe(true)
    expect(profile.serverSideDecorations).toBe(true)
    expect(profile.tabletV2Supported).toBe(true)
    expect(profile.clipboardProtocol).toBe('wl_data_device')
  })

  it('detects Hyprland tiling compositor via signature or desktop identifier', () => {
    const envBySig = {
      XDG_SESSION_TYPE: 'wayland',
      HYPRLAND_INSTANCE_SIGNATURE: 'hypr_live_instance_9876',
      WAYLAND_DISPLAY: 'wayland-1'
    }

    const profile = detectCompositor(envBySig)
    expect(profile.name).toBe('Hyprland')
    expect(profile.detected).toBe(true)
    expect(profile.serverSideDecorations).toBe(false)
    expect(profile.clipboardProtocol).toBe('wlr-data-control')
    expect(profile.recommendedOzoneFlags).toContain('--enable-pointer-lock-options')

    const envByName = {
      XDG_SESSION_TYPE: 'wayland',
      XDG_CURRENT_DESKTOP: 'Hyprland'
    }
    expect(detectCompositor(envByName).name).toBe('Hyprland')
  })

  it('falls back gracefully to X11 when session is not Wayland', () => {
    const env = {
      XDG_SESSION_TYPE: 'x11',
      DISPLAY: ':0'
    }

    expect(isWaylandEnv(env)).toBe(false)
    const profile = detectCompositor(env)
    expect(profile.name).toBe('X11 / Other')
    expect(profile.detected).toBe(false)
    expect(profile.tabletV2Supported).toBe(false)
    expect(profile.recommendedOzoneFlags.length).toBe(0)
  })

  it('runs full compositor regression verification across GNOME, KDE, and Hyprland', () => {
    const { results, allPassed } = runCompositorRegressionSuite()

    expect(results.length).toBe(5)
    expect(allPassed).toBe(true)

    const mutter = results.find((r) => r.compositor === 'GNOME Mutter')
    expect(mutter).toBeDefined()
    expect(mutter?.ozoneFlagsValid).toBe(true)
    expect(mutter?.tabletV2Active).toBe(true)
    expect(mutter?.passed).toBe(true)

    const kwin = results.find((r) => r.compositor === 'KDE KWin')
    expect(kwin).toBeDefined()
    expect(kwin?.windowDecorationMode).toBe('ssd')
    expect(kwin?.passed).toBe(true)

    const hyprland = results.find((r) => r.compositor === 'Hyprland')
    expect(hyprland).toBeDefined()
    expect(hyprland?.profile.clipboardProtocol).toBe('wlr-data-control')
    expect(hyprland?.passed).toBe(true)
  })
})
