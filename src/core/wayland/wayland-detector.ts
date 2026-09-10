export interface WaylandCompositorProfile {
  name: string
  detected: boolean
  serverSideDecorations: boolean
  tabletV2Supported: boolean
  fractionalScalingSupported: boolean
  clipboardProtocol: 'wl_data_device' | 'wlr-data-control' | 'x11-selection'
  recommendedOzoneFlags: string[]
}

export function isWaylandEnv(env: Record<string, string | undefined> = process.env): boolean {
  return env.XDG_SESSION_TYPE === 'wayland' || Boolean(env.WAYLAND_DISPLAY)
}

export function detectCompositor(env: Record<string, string | undefined> = process.env): WaylandCompositorProfile {
  const isWayland = isWaylandEnv(env)
  const currentDesktop = (env.XDG_CURRENT_DESKTOP || '').toLowerCase()
  const gdmSession = (env.GDMSESSION || '').toLowerCase()

  if (Boolean(env.HYPRLAND_INSTANCE_SIGNATURE) || currentDesktop.includes('hyprland')) {
    return {
      name: 'Hyprland',
      detected: true,
      serverSideDecorations: false,
      tabletV2Supported: true,
      fractionalScalingSupported: true,
      clipboardProtocol: 'wlr-data-control',
      recommendedOzoneFlags: [
        '--ozone-platform-hint=auto',
        '--enable-features=UseOzonePlatform,WaylandWindowDecorations',
        '--enable-pointer-lock-options'
      ]
    }
  }

  if (currentDesktop.includes('gnome') || gdmSession.includes('gnome')) {
    return {
      name: 'GNOME Mutter',
      detected: isWayland,
      serverSideDecorations: false,
      tabletV2Supported: true,
      fractionalScalingSupported: true,
      clipboardProtocol: 'wl_data_device',
      recommendedOzoneFlags: [
        '--ozone-platform-hint=auto',
        '--enable-features=UseOzonePlatform,WaylandWindowDecorations',
        '--enable-pointer-lock-options'
      ]
    }
  }

  if (currentDesktop.includes('kde') || currentDesktop.includes('plasma')) {
    return {
      name: 'KDE KWin',
      detected: isWayland,
      serverSideDecorations: true,
      tabletV2Supported: true,
      fractionalScalingSupported: true,
      clipboardProtocol: 'wl_data_device',
      recommendedOzoneFlags: [
        '--ozone-platform-hint=auto',
        '--enable-features=UseOzonePlatform,WaylandWindowDecorations',
        '--enable-pointer-lock-options'
      ]
    }
  }

  if (Boolean(env.SWAYSOCK) || currentDesktop.includes('sway')) {
    return {
      name: 'Sway',
      detected: isWayland,
      serverSideDecorations: false,
      tabletV2Supported: true,
      fractionalScalingSupported: true,
      clipboardProtocol: 'wlr-data-control',
      recommendedOzoneFlags: [
        '--ozone-platform-hint=auto',
        '--enable-features=UseOzonePlatform,WaylandWindowDecorations',
        '--enable-pointer-lock-options'
      ]
    }
  }

  if (isWayland) {
    return {
      name: 'Generic Wayland',
      detected: true,
      serverSideDecorations: false,
      tabletV2Supported: true,
      fractionalScalingSupported: false,
      clipboardProtocol: 'wl_data_device',
      recommendedOzoneFlags: [
        '--ozone-platform-hint=auto',
        '--enable-features=UseOzonePlatform,WaylandWindowDecorations',
        '--enable-pointer-lock-options'
      ]
    }
  }

  return {
    name: 'X11 / Other',
    detected: false,
    serverSideDecorations: true,
    tabletV2Supported: false,
    fractionalScalingSupported: false,
    clipboardProtocol: 'x11-selection',
    recommendedOzoneFlags: []
  }
}
