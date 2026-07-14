import type { Vec2 } from './Vec2';
import { vSub, vLen, vDot } from './Vec2';
import type { Rect } from './Rect';

/** Point in axis-aligned rect (inclusive). */
export const pointInRect = (p: Vec2, r: Rect): boolean =>
  p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;

/** Point in ellipse inscribed in AABB. */
export const pointInEllipse = (p: Vec2, r: Rect): boolean => {
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  const rx = r.width / 2;
  const ry = r.height / 2;
  if (rx <= 0 || ry <= 0) return false;
  const dx = (p.x - cx) / rx;
  const dy = (p.y - cy) / ry;
  return dx * dx + dy * dy <= 1;
};

/** Distance from point p to line segment (a, b). */
export const distPointToSegment = (p: Vec2, a: Vec2, b: Vec2): number => {
  const ab = vSub(b, a);
  const ap = vSub(p, a);
  const abLenSq = ab.x * ab.x + ab.y * ab.y;
  if (abLenSq < 1e-12) return vLen(ap);
  let t = vDot(ap, ab) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  const closest = { x: a.x + ab.x * t, y: a.y + ab.y * t };
  return vLen(vSub(p, closest));
};

/** Point within tolerance of a polyline. */
export const pointNearPolyline = (p: Vec2, pts: Vec2[], tolerance: number): boolean => {
  for (let i = 0; i < pts.length - 1; i++) {
    if (distPointToSegment(p, pts[i]!, pts[i + 1]!) <= tolerance) return true;
  }
  return false;
};

/** Ray cast point-in-polygon. */
export const pointInPolygon = (p: Vec2, polygon: Vec2[]): boolean => {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = polygon[i]!;
    const pj = polygon[j]!;
    const intersect =
      pi.y > p.y !== pj.y > p.y &&
      p.x < ((pj.x - pi.x) * (p.y - pi.y)) / (pj.y - pi.y) + pi.x;
    if (intersect) inside = !inside;
  }
  return inside;
};

/** Segment intersects rect. */
export const segmentIntersectsRect = (a: Vec2, b: Vec2, r: Rect): boolean => {
  if (pointInRect(a, r) || pointInRect(b, r)) return true;
  const tl = { x: r.x, y: r.y };
  const tr = { x: r.x + r.width, y: r.y };
  const br = { x: r.x + r.width, y: r.y + r.height };
  const bl = { x: r.x, y: r.y + r.height };
  return (
    segmentsIntersect(a, b, tl, tr) ||
    segmentsIntersect(a, b, tr, br) ||
    segmentsIntersect(a, b, br, bl) ||
    segmentsIntersect(a, b, bl, tl)
  );
};

const segmentsIntersect = (a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean => {
  const d1 = cross(vSub(b, a), vSub(c, a));
  const d2 = cross(vSub(b, a), vSub(d, a));
  const d3 = cross(vSub(d, c), vSub(a, c));
  const d4 = cross(vSub(d, c), vSub(b, c));
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false;
};

const cross = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x;
