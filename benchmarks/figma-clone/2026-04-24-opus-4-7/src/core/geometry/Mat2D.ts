import type { Vec2 } from './Vec2';

/**
 * 2x3 affine transform:
 *   [ a  c  tx ]
 *   [ b  d  ty ]
 *   [ 0  0  1  ]
 *
 * Applied as: [x', y'] = [a*x + c*y + tx, b*x + d*y + ty]
 */
export interface Mat2D {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

export const matIdentity = (): Mat2D => ({ a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 });

export const matTranslate = (tx: number, ty: number): Mat2D => ({
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  tx,
  ty,
});

export const matScale = (sx: number, sy: number = sx): Mat2D => ({
  a: sx,
  b: 0,
  c: 0,
  d: sy,
  tx: 0,
  ty: 0,
});

export const matRotate = (rad: number): Mat2D => {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { a: c, b: s, c: -s, d: c, tx: 0, ty: 0 };
};

/** m = m1 * m2 (apply m2 first, then m1). */
export const matMul = (m1: Mat2D, m2: Mat2D): Mat2D => ({
  a: m1.a * m2.a + m1.c * m2.b,
  b: m1.b * m2.a + m1.d * m2.b,
  c: m1.a * m2.c + m1.c * m2.d,
  d: m1.b * m2.c + m1.d * m2.d,
  tx: m1.a * m2.tx + m1.c * m2.ty + m1.tx,
  ty: m1.b * m2.tx + m1.d * m2.ty + m1.ty,
});

export const matApply = (m: Mat2D, p: Vec2): Vec2 => ({
  x: m.a * p.x + m.c * p.y + m.tx,
  y: m.b * p.x + m.d * p.y + m.ty,
});

export const matApplyDir = (m: Mat2D, v: Vec2): Vec2 => ({
  x: m.a * v.x + m.c * v.y,
  y: m.b * v.x + m.d * v.y,
});

export const matInvert = (m: Mat2D): Mat2D => {
  const det = m.a * m.d - m.b * m.c;
  if (Math.abs(det) < 1e-12) {
    return matIdentity();
  }
  const inv = 1 / det;
  return {
    a: m.d * inv,
    b: -m.b * inv,
    c: -m.c * inv,
    d: m.a * inv,
    tx: (m.c * m.ty - m.d * m.tx) * inv,
    ty: (m.b * m.tx - m.a * m.ty) * inv,
  };
};

export const matClone = (m: Mat2D): Mat2D => ({ ...m });

/** Builds a transform at `origin` with rotation + scale: T(origin) * R * S * T(-origin). */
export const matComposeTRS = (
  translation: Vec2,
  rotation: number,
  scale: Vec2,
  pivot: Vec2 = { x: 0, y: 0 },
): Mat2D => {
  // T(translation) * R * S * T(-pivot)
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const sx = scale.x;
  const sy = scale.y;
  // M = T * R * S
  const rs: Mat2D = {
    a: cos * sx,
    b: sin * sx,
    c: -sin * sy,
    d: cos * sy,
    tx: translation.x,
    ty: translation.y,
  };
  // apply T(-pivot) on the right: new.tx = rs.a*-pivot.x + rs.c*-pivot.y + rs.tx
  return matMul(rs, matTranslate(-pivot.x, -pivot.y));
};

export const matDecomposeScale = (m: Mat2D): Vec2 => ({
  x: Math.hypot(m.a, m.b),
  y: Math.hypot(m.c, m.d),
});

export const matGetRotation = (m: Mat2D): number => Math.atan2(m.b, m.a);

export const matApplyToCtx = (ctx: CanvasRenderingContext2D, m: Mat2D): void => {
  ctx.transform(m.a, m.b, m.c, m.d, m.tx, m.ty);
};

export const matSetToCtx = (ctx: CanvasRenderingContext2D, m: Mat2D): void => {
  ctx.setTransform(m.a, m.b, m.c, m.d, m.tx, m.ty);
};
