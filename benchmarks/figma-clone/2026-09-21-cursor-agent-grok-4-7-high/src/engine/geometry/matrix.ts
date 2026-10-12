export type Vec = { x: number; y: number };

export type Matrix = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

export const IDENTITY: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

export function translate(x: number, y: number): Matrix {
  return { a: 1, b: 0, c: 0, d: 1, e: x, f: y };
}

export function rotate(rad: number): Matrix {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

export function mul(m1: Matrix, m2: Matrix): Matrix {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

export function apply(m: Matrix, x: number, y: number): Vec {
  return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
}

export function invert(m: Matrix): Matrix | null {
  const det = m.a * m.d - m.b * m.c;
  if (Math.abs(det) < 1e-12) return null;
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

export type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

export function localMatrix(g: Box): Matrix {
  const rad = (g.rotation * Math.PI) / 180;
  const cx = g.x + g.width / 2;
  const cy = g.y + g.height / 2;
  return mul(mul(translate(cx, cy), rotate(rad)), translate(-g.width / 2, -g.height / 2));
}

export function decompose(m: Matrix, width: number, height: number): { x: number; y: number; rotation: number } {
  const rotation = (Math.atan2(m.b, m.a) * 180) / Math.PI;
  const center = apply(m, width / 2, height / 2);
  return { x: center.x - width / 2, y: center.y - height / 2, rotation };
}

export function worldVectorToParent(parentWorld: Matrix, dx: number, dy: number): Vec {
  const inv = invert(parentWorld) ?? IDENTITY;
  const p0 = apply(inv, 0, 0);
  const p1 = apply(inv, dx, dy);
  return { x: p1.x - p0.x, y: p1.y - p0.y };
}
