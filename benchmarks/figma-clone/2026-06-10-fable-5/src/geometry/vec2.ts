export interface Vec2 {
  x: number;
  y: number;
}

export function vec(x: number, y: number): Vec2 {
  return { x, y };
}

export function addV(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subV(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scaleV(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, y: a.y * s };
}

export function dotV(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function lenV(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}

export function distV(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normV(a: Vec2): Vec2 {
  const l = lenV(a);
  return l === 0 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}

export function lerpV(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Rotate a vector by `rad` radians around the origin. */
export function rotV(a: Vec2, rad: number): Vec2 {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
}
