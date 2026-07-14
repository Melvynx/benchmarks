export interface Vec2 {
  x: number;
  y: number;
}

export const vec = (x: number, y: number): Vec2 => ({ x, y });

export const vZero = (): Vec2 => ({ x: 0, y: 0 });

export const vAdd = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const vSub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const vScale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const vMul = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x * b.x, y: a.y * b.y });
export const vDot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const vLen = (a: Vec2): number => Math.hypot(a.x, a.y);
export const vLenSq = (a: Vec2): number => a.x * a.x + a.y * a.y;
export const vDist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

export const vNorm = (a: Vec2): Vec2 => {
  const l = vLen(a);
  if (l < 1e-10) return { x: 0, y: 0 };
  return { x: a.x / l, y: a.y / l };
};

export const vPerp = (a: Vec2): Vec2 => ({ x: -a.y, y: a.x });

export const vRotate = (a: Vec2, rad: number): Vec2 => {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
};

export const vRotateAround = (a: Vec2, origin: Vec2, rad: number): Vec2 => {
  const dx = a.x - origin.x;
  const dy = a.y - origin.y;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: origin.x + dx * c - dy * s, y: origin.y + dx * s + dy * c };
};

export const vLerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

export const vAngle = (a: Vec2): number => Math.atan2(a.y, a.x);

export const vEquals = (a: Vec2, b: Vec2, eps = 1e-6): boolean =>
  Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;

export const DEG = 180 / Math.PI;
export const RAD = Math.PI / 180;
