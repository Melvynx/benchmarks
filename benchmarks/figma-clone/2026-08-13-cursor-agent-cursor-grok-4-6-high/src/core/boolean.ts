import { pointInPolygon } from "./geometry";
import type { Vec2 } from "./types";

function inside(p: Vec2, a: Vec2, b: Vec2): boolean {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) <= 0;
}

function intersection(s: Vec2, e: Vec2, a: Vec2, b: Vec2): Vec2 {
  const dc = { x: s.x - e.x, y: s.y - e.y };
  const dp = { x: a.x - b.x, y: a.y - b.y };
  const n1 = s.x * e.y - s.y * e.x;
  const n2 = a.x * b.y - a.y * b.x;
  const denom = dc.x * dp.y - dc.y * dp.x;
  if (Math.abs(denom) < 1e-12) return { x: e.x, y: e.y };
  return {
    x: (n1 * dp.x - n2 * dc.x) / denom,
    y: (n1 * dp.y - n2 * dc.y) / denom,
  };
}

/** Sutherland–Hodgman. Clip polygon is assumed convex and CCW. */
export function clipPolygon(subject: Vec2[], clip: Vec2[]): Vec2[] {
  if (subject.length < 3 || clip.length < 3) return [];
  let output = subject;
  for (let i = 0; i < clip.length; i++) {
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    if (!a || !b) continue;
    const input = output;
    output = [];
    if (input.length === 0) break;
    let prev = input[input.length - 1];
    if (!prev) continue;
    for (const cur of input) {
      if (!cur) continue;
      const curIn = inside(cur, a, b);
      const prevIn = inside(prev, a, b);
      if (curIn) {
        if (!prevIn) output.push(intersection(prev, cur, a, b));
        output.push(cur);
      } else if (prevIn) {
        output.push(intersection(prev, cur, a, b));
      }
      prev = cur;
    }
  }
  return output;
}

function ensureCCW(poly: Vec2[]): Vec2[] {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if (!a || !b) continue;
    area += a.x * b.y - b.x * a.y;
  }
  return area < 0 ? [...poly].reverse() : poly;
}

export type BooleanOp = "union" | "subtract" | "intersect" | "exclude";

/**
 * Convex-polygon boolean. Rectangles, ellipses (sampled), and regular polygons
 * are convex after conversion. Concave paths are best-effort via intersection.
 */
export function booleanPolygons(a: Vec2[], b: Vec2[], op: BooleanOp): Vec2[][] {
  const A = ensureCCW(a);
  const B = ensureCCW(b);
  const I = clipPolygon(A, B);
  if (op === "intersect") return I.length >= 3 ? [I] : [];
  if (op === "union") {
    if (I.length < 3) return [A, B];
    if (A.every((p) => pointInPolygon(p, B))) return [B];
    if (B.every((p) => pointInPolygon(p, A))) return [A];
    return [convexHull([...A, ...B])];
  }
  if (op === "subtract") {
    if (I.length < 3) return [A];
    if (A.every((p) => pointInPolygon(p, B))) return [];
    return subtractConvex(A, B);
  }
  const ab = booleanPolygons(A, B, "subtract");
  const ba = booleanPolygons(B, A, "subtract");
  return [...ab, ...ba];
}

function subtractConvex(a: Vec2[], b: Vec2[]): Vec2[][] {
  const result: Vec2[] = [];
  for (const p of a) {
    if (!pointInPolygon(p, b)) result.push(p);
  }
  for (const p of b) {
    if (pointInPolygon(p, a)) result.push(p);
  }
  const hullish = uniquePoints(result);
  if (hullish.length >= 3) return [orderAroundCentroid(hullish)];
  return [a];
}

function uniquePoints(pts: Vec2[]): Vec2[] {
  const out: Vec2[] = [];
  for (const p of pts) {
    if (!out.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 0.05)) out.push(p);
  }
  return out;
}

function orderAroundCentroid(pts: Vec2[]): Vec2[] {
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return [...pts].sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx));
}

function convexHull(pts: Vec2[]): Vec2[] {
  const p = uniquePoints(pts).sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  if (p.length <= 2) return p;
  const cross = (o: Vec2, a: Vec2, b: Vec2) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Vec2[] = [];
  for (const pt of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, pt) <= 0) lower.pop();
    lower.push(pt);
  }
  const upper: Vec2[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const pt = p[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, pt) <= 0) upper.pop();
    upper.push(pt);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

export function polygonAABB(pts: Vec2[]): { x: number; y: number; width: number; height: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}
