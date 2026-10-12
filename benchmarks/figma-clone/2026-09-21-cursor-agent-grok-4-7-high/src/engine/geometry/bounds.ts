import { apply, type Matrix, type Vec } from "./matrix";

export type AABB = { x: number; y: number; width: number; height: number };

export function emptyAabb(): AABB {
  return { x: 0, y: 0, width: 0, height: 0 };
}

export function aabbFromPoints(points: Vec[]): AABB {
  if (points.length === 0) return emptyAabb();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function corners(m: Matrix, width: number, height: number): Vec[] {
  return [apply(m, 0, 0), apply(m, width, 0), apply(m, width, height), apply(m, 0, height)];
}

export function aabbOfBox(m: Matrix, width: number, height: number): AABB {
  return aabbFromPoints(corners(m, width, height));
}

export function intersects(a: AABB, b: AABB): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function containsRect(outer: AABB, inner: AABB): boolean {
  return (
    inner.x >= outer.x - 0.01 &&
    inner.y >= outer.y - 0.01 &&
    inner.x + inner.width <= outer.x + outer.width + 0.01 &&
    inner.y + inner.height <= outer.y + outer.height + 0.01
  );
}

export function containsPoint(box: AABB, p: Vec): boolean {
  return p.x >= box.x && p.y >= box.y && p.x <= box.x + box.width && p.y <= box.y + box.height;
}

export function unionAabb(boxes: AABB[]): AABB {
  if (boxes.length === 0) return emptyAabb();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function inflate(box: AABB, margin: number): AABB {
  return {
    x: box.x - margin,
    y: box.y - margin,
    width: box.width + margin * 2,
    height: box.height + margin * 2,
  };
}

export function pointInPolygon(point: Vec, polygon: Vec[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    if (!pi || !pj) continue;
    const intersect =
      pi.y > point.y !== pj.y > point.y &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y + 0.0000001) + pi.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function distToSegment(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-8) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
