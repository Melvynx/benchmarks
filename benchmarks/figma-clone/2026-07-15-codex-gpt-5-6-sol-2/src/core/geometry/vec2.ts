/** A point or vector in a two-dimensional Cartesian coordinate space. */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export const GEOMETRY_EPSILON = 1e-9;
export const ZERO_VEC2: Vec2 = Object.freeze({ x: 0, y: 0 });

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function addVec2(left: Vec2, right: Vec2): Vec2 {
  return { x: left.x + right.x, y: left.y + right.y };
}

export function subtractVec2(left: Vec2, right: Vec2): Vec2 {
  return { x: left.x - right.x, y: left.y - right.y };
}

export function scaleVec2(vector: Vec2, scalar: number): Vec2 {
  return { x: vector.x * scalar, y: vector.y * scalar };
}

export function multiplyVec2(left: Vec2, right: Vec2): Vec2 {
  return { x: left.x * right.x, y: left.y * right.y };
}

export function dotVec2(left: Vec2, right: Vec2): number {
  return left.x * right.x + left.y * right.y;
}

export function crossVec2(left: Vec2, right: Vec2): number {
  return left.x * right.y - left.y * right.x;
}

export function lengthSquaredVec2(vector: Vec2): number {
  return dotVec2(vector, vector);
}

export function lengthVec2(vector: Vec2): number {
  return Math.hypot(vector.x, vector.y);
}

export function distanceSquaredVec2(left: Vec2, right: Vec2): number {
  return lengthSquaredVec2(subtractVec2(left, right));
}

export function distanceVec2(left: Vec2, right: Vec2): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

export function normalizeVec2(vector: Vec2, fallback: Vec2 = ZERO_VEC2): Vec2 {
  const length = lengthVec2(vector);
  if (length <= GEOMETRY_EPSILON) return fallback;
  return scaleVec2(vector, 1 / length);
}

export function perpendicularVec2(vector: Vec2): Vec2 {
  return { x: -vector.y, y: vector.x };
}

export function midpointVec2(left: Vec2, right: Vec2): Vec2 {
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
}

export function lerpVec2(start: Vec2, end: Vec2, amount: number): Vec2 {
  return {
    x: start.x + (end.x - start.x) * amount,
    y: start.y + (end.y - start.y) * amount,
  };
}

export function rotateVec2(vector: Vec2, radians: number): Vec2 {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: vector.x * cosine - vector.y * sine,
    y: vector.x * sine + vector.y * cosine,
  };
}

export function angleVec2(vector: Vec2): number {
  return Math.atan2(vector.y, vector.x);
}

export function almostEqual(left: number, right: number, epsilon = GEOMETRY_EPSILON): boolean {
  return Math.abs(left - right) <= epsilon;
}

export function vec2AlmostEqual(left: Vec2, right: Vec2, epsilon = GEOMETRY_EPSILON): boolean {
  return almostEqual(left.x, right.x, epsilon) && almostEqual(left.y, right.y, epsilon);
}

export function isFiniteVec2(vector: Vec2): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y);
}
