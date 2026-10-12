export type Camera = {
  yaw: number
  scale: number
  tilt: number
  cx: number
  cy: number
  radius: number
}

export const TILT = 0.6

export function makeCamera(width: number, height: number, radius: number, yaw: number): Camera {
  const scale = (Math.min(width, height) * 0.86) / (2 * radius)
  return {
    yaw,
    scale,
    tilt: TILT,
    cx: width / 2,
    cy: height * 0.54,
    radius,
  }
}

export function project(x: number, y: number, z: number, cam: Camera) {
  const c = Math.cos(cam.yaw)
  const s = Math.sin(cam.yaw)
  const xr = x * c - y * s
  const yr = x * s + y * c
  return {
    sx: cam.cx + xr * cam.scale,
    sy: cam.cy + yr * cam.tilt * cam.scale - z * cam.scale,
    depth: yr,
  }
}
