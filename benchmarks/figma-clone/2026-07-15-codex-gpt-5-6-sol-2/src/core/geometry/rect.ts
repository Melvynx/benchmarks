import type { Vec2 } from './vec2';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Axis-aligned bounds in any coordinate space. */
export interface AABB {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export function normalizeRect(rect: Rect): Rect {
  const x = rect.width < 0 ? rect.x + rect.width : rect.x;
  const y = rect.height < 0 ? rect.y + rect.height : rect.y;
  return { x, y, width: Math.abs(rect.width), height: Math.abs(rect.height) };
}

export function rectFromPoints(start: Vec2, end: Vec2): Rect {
  return normalizeRect({ x: start.x, y: start.y, width: end.x - start.x, height: end.y - start.y });
}

export function rectCenter(rect: Rect): Vec2 {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

export function rectCorners(rect: Rect): readonly [Vec2, Vec2, Vec2, Vec2] {
  const normalized = normalizeRect(rect);
  const right = normalized.x + normalized.width;
  const bottom = normalized.y + normalized.height;
  return [
    { x: normalized.x, y: normalized.y },
    { x: right, y: normalized.y },
    { x: right, y: bottom },
    { x: normalized.x, y: bottom },
  ];
}

export function insetRect(rect: Rect, amountX: number, amountY = amountX): Rect {
  return {
    x: rect.x + amountX,
    y: rect.y + amountY,
    width: Math.max(0, rect.width - amountX * 2),
    height: Math.max(0, rect.height - amountY * 2),
  };
}

export function expandRect(rect: Rect, amountX: number, amountY = amountX): Rect {
  return insetRect(rect, -amountX, -amountY);
}

export function rectContainsPoint(rect: Rect, point: Vec2, tolerance = 0): boolean {
  const normalized = normalizeRect(rect);
  return (
    point.x >= normalized.x - tolerance &&
    point.x <= normalized.x + normalized.width + tolerance &&
    point.y >= normalized.y - tolerance &&
    point.y <= normalized.y + normalized.height + tolerance
  );
}

export function rectsIntersect(left: Rect, right: Rect): boolean {
  return aabbsIntersect(rectToAabb(left), rectToAabb(right));
}

export function rectToAabb(rect: Rect): AABB {
  const normalized = normalizeRect(rect);
  return {
    minX: normalized.x,
    minY: normalized.y,
    maxX: normalized.x + normalized.width,
    maxY: normalized.y + normalized.height,
  };
}

export function aabbToRect(bounds: AABB): Rect {
  return {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  };
}

export function aabbFromPoints(points: readonly Vec2[]): AABB {
  const first = points[0];
  if (first === undefined) throw new RangeError('Cannot create bounds from an empty point set');

  let minX = first.x;
  let minY = first.y;
  let maxX = first.x;
  let maxY = first.y;

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    if (point === undefined) continue;
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, minY, maxX, maxY };
}

export function aabbCenter(bounds: AABB): Vec2 {
  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
}

export function expandAabb(bounds: AABB, amount: number): AABB {
  return {
    minX: bounds.minX - amount,
    minY: bounds.minY - amount,
    maxX: bounds.maxX + amount,
    maxY: bounds.maxY + amount,
  };
}

export function unionAabb(left: AABB, right: AABB): AABB {
  return {
    minX: Math.min(left.minX, right.minX),
    minY: Math.min(left.minY, right.minY),
    maxX: Math.max(left.maxX, right.maxX),
    maxY: Math.max(left.maxY, right.maxY),
  };
}

export function intersectAabb(left: AABB, right: AABB): AABB | null {
  const minX = Math.max(left.minX, right.minX);
  const minY = Math.max(left.minY, right.minY);
  const maxX = Math.min(left.maxX, right.maxX);
  const maxY = Math.min(left.maxY, right.maxY);
  return minX <= maxX && minY <= maxY ? { minX, minY, maxX, maxY } : null;
}

export function aabbContainsPoint(bounds: AABB, point: Vec2, tolerance = 0): boolean {
  return (
    point.x >= bounds.minX - tolerance &&
    point.x <= bounds.maxX + tolerance &&
    point.y >= bounds.minY - tolerance &&
    point.y <= bounds.maxY + tolerance
  );
}

export function aabbsIntersect(left: AABB, right: AABB): boolean {
  return !(
    left.maxX < right.minX ||
    left.minX > right.maxX ||
    left.maxY < right.minY ||
    left.minY > right.maxY
  );
}

export function aabbContainsAabb(container: AABB, candidate: AABB): boolean {
  return (
    candidate.minX >= container.minX &&
    candidate.maxX <= container.maxX &&
    candidate.minY >= container.minY &&
    candidate.maxY <= container.maxY
  );
}
