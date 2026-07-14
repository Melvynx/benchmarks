export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Normalize an angle in degrees to (-180, 180]. */
export function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/** Snap an angle to the nearest multiple of `step` degrees. */
export function snapAngle(deg: number, step: number): number {
  return Math.round(deg / step) * step;
}

/** Round for display: max 2 decimals, no trailing zeros artifacts. */
export function roundTo(v: number, decimals = 2): number {
  const k = 10 ** decimals;
  return Math.round(v * k) / k;
}

/**
 * Pick a "nice" step (1/2/5 × 10^n) so that `step * scale` lands within
 * [minPixels, ∞). Used by rulers and the adaptive grid.
 */
export function niceStep(scale: number, minPixels: number): number {
  const raw = minPixels / scale;
  const power = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 5, 10]) {
    if (power * m >= raw) return power * m;
  }
  return power * 10;
}
