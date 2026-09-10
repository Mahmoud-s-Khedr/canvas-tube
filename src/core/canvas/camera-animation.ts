import { CameraState } from './canvas-adapter'

/**
 * Cubic ease-in-out easing function.
 * Smoothly accelerates from zero velocity and decelerates to zero velocity.
 */
export function easeInOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t))
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2
}

/**
 * Linear interpolation between two numbers.
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

/**
 * Smoothly interpolates between two camera states using cubic easing.
 */
export function interpolateCamera(
  start: CameraState,
  target: CameraState,
  normalizedProgress: number
): CameraState {
  const progress = easeInOutCubic(normalizedProgress)
  return {
    x: lerp(start.x, target.x, progress),
    y: lerp(start.y, target.y, progress),
    zoom: lerp(start.zoom, target.zoom, progress)
  }
}
