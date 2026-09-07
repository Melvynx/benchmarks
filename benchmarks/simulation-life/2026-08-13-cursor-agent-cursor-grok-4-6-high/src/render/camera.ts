/**
 * Raised dish seen from a low angle. World space is a flat disc (x, y) with
 * height z. The camera spins around the middle and squashes the far side.
 */
export type Camera = {
  yaw: number
  tilt: number
  scale: number
  cx: number
  cy: number
}

export type Projected = {
  sx: number
  sy: number
  depth: number
}

export function makeCamera(): Camera {
  return { yaw: 0.55, tilt: 0.52, scale: 1, cx: 0, cy: 0 }
}

export function project(cam: Camera, x: number, y: number, z = 0): Projected {
  const cos = Math.cos(cam.yaw)
  const sin = Math.sin(cam.yaw)
  const rx = x * cos - y * sin
  const ry = x * sin + y * cos
  return {
    sx: cam.cx + rx * cam.scale,
    sy: cam.cy + ry * cam.scale * cam.tilt - z * cam.scale,
    depth: ry,
  }
}

export function unproject(cam: Camera, sx: number, sy: number): { x: number; y: number } {
  const rx = (sx - cam.cx) / cam.scale
  const ry = (sy - cam.cy) / (cam.scale * cam.tilt)
  const cos = Math.cos(-cam.yaw)
  const sin = Math.sin(-cam.yaw)
  return { x: rx * cos - ry * sin, y: rx * sin + ry * cos }
}
