/**
 * The garden is drawn as a raised dish seen from a low angle. World space is a
 * flat disc (x, y) with a height axis z; the camera spins around the middle and
 * squashes the far side, which is enough to read as depth without any 3D stack.
 */
export type Camera = {
  yaw: number
  /** 0 = straight down, 1 = edge on. */
  tilt: number
  scale: number
  cx: number
  cy: number
}

export type Projected = {
  sx: number
  sy: number
  /** Depth key for the painter's-algorithm sort. Bigger = nearer the viewer. */
  depth: number
}

export function makeCamera(): Camera {
  return { yaw: 0.5, tilt: 0.54, scale: 1, cx: 0, cy: 0 }
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

/** Screen point back onto the dish plane, for click-to-inspect. */
export function unproject(cam: Camera, sx: number, sy: number): { x: number; y: number } {
  const rx = (sx - cam.cx) / cam.scale
  const ry = (sy - cam.cy) / (cam.scale * cam.tilt)
  const cos = Math.cos(-cam.yaw)
  const sin = Math.sin(-cam.yaw)
  return { x: rx * cos - ry * sin, y: rx * sin + ry * cos }
}
