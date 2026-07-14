import type { Vec2 } from './vec2';

/**
 * 2D affine matrix in column-major convention (same layout as CanvasRenderingContext2D):
 *
 *   | a c e |     x' = a*x + c*y + e
 *   | b d f |     y' = b*x + d*y + f
 */
export interface Mat2d {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export const IDENTITY: Mat2d = Object.freeze({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });

export function mat(a: number, b: number, c: number, d: number, e: number, f: number): Mat2d {
  return { a, b, c, d, e, f };
}

/** Compose: result applies `B` first, then `A` (i.e. A ∘ B). */
export function mul(A: Mat2d, B: Mat2d): Mat2d {
  return {
    a: A.a * B.a + A.c * B.b,
    b: A.b * B.a + A.d * B.b,
    c: A.a * B.c + A.c * B.d,
    d: A.b * B.c + A.d * B.d,
    e: A.a * B.e + A.c * B.f + A.e,
    f: A.b * B.e + A.d * B.f + A.f,
  };
}

export function translation(tx: number, ty: number): Mat2d {
  return { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
}

export function rotationM(rad: number): Mat2d {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { a: c, b: s, c: -s, d: c, e: 0, f: 0 };
}

export function scaling(sx: number, sy: number): Mat2d {
  return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
}

export function invertM(m: Mat2d): Mat2d {
  const det = m.a * m.d - m.b * m.c;
  if (det === 0) return { ...IDENTITY };
  const inv = 1 / det;
  return {
    a: m.d * inv,
    b: -m.b * inv,
    c: -m.c * inv,
    d: m.a * inv,
    e: (m.c * m.f - m.d * m.e) * inv,
    f: (m.b * m.e - m.a * m.f) * inv,
  };
}

export function applyM(m: Mat2d, p: Vec2): Vec2 {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

export function applyMxy(m: Mat2d, x: number, y: number): Vec2 {
  return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
}

/** Apply only the linear part (rotation/scale), ignoring translation. */
export function applyMVector(m: Mat2d, p: Vec2): Vec2 {
  return { x: m.a * p.x + m.c * p.y, y: m.b * p.x + m.d * p.y };
}

/** Rotation angle (radians) of a TR matrix. Valid because our node matrices never skew. */
export function rotationOf(m: Mat2d): number {
  return Math.atan2(m.b, m.a);
}

/**
 * Local transform for a node: rotate `rotDeg` degrees around the center of
 * its (x, y, w, h) box. Maps the node's untransformed space [0..w]x[0..h]
 * into its parent's space.
 */
export function nodeLocalMatrix(x: number, y: number, w: number, h: number, rotDeg: number): Mat2d {
  if (rotDeg === 0) return translation(x, y);
  const rad = (rotDeg * Math.PI) / 180;
  const cx = w / 2;
  const cy = h / 2;
  // T(x+cx, y+cy) · R(rad) · T(-cx, -cy)
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return {
    a: c,
    b: s,
    c: -s,
    d: c,
    e: x + cx - c * cx + s * cy,
    f: y + cy - s * cx - c * cy,
  };
}

/**
 * Given a desired world/parent-space matrix (pure translation+rotation) and a
 * node size, recover the (x, y, rotationDeg) that produce it under
 * `nodeLocalMatrix`. Used for reparenting and group normalization.
 */
export function decomposeToNode(m: Mat2d, w: number, h: number): { x: number; y: number; rotation: number } {
  const rad = rotationOf(m);
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const cx = w / 2;
  const cy = h / 2;
  // From nodeLocalMatrix: e = x + cx - c*cx + s*cy ; f = y + cy - s*cx - c*cy
  const x = m.e - cx + c * cx - s * cy;
  const y = m.f - cy + s * cx + c * cy;
  let rotation = (rad * 180) / Math.PI;
  // Normalize to (-180, 180] and clean float noise.
  rotation = Math.round(rotation * 100) / 100;
  if (rotation <= -180) rotation += 360;
  if (rotation > 180) rotation -= 360;
  return { x, y, rotation };
}

export function toCssMatrix(m: Mat2d): string {
  return `matrix(${m.a}, ${m.b}, ${m.c}, ${m.d}, ${m.e}, ${m.f})`;
}
