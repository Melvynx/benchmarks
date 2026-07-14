import type { Vec2 } from './Vec2';
import { matApply, type Mat2D } from './Mat2D';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const rect = (x: number, y: number, width: number, height: number): Rect => ({
  x,
  y,
  width,
  height,
});

export const rectFromPoints = (a: Vec2, b: Vec2): Rect => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const width = Math.abs(a.x - b.x);
  const height = Math.abs(a.y - b.y);
  return { x, y, width, height };
};

export const rectCenter = (r: Rect): Vec2 => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

export const rectContainsPoint = (r: Rect, p: Vec2): boolean =>
  p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;

export const rectIntersects = (a: Rect, b: Rect): boolean =>
  !(a.x + a.width < b.x || a.x > b.x + b.width || a.y + a.height < b.y || a.y > b.y + b.height);

export const rectContainsRect = (outer: Rect, inner: Rect): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

export const rectUnion = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.width, b.x + b.width);
  const bottom = Math.max(a.y + a.height, b.y + b.height);
  return { x, y, width: right - x, height: bottom - y };
};

export const rectUnionMany = (rects: Rect[]): Rect | null => {
  if (rects.length === 0) return null;
  const first = rects[0]!;
  let minX = first.x;
  let minY = first.y;
  let maxX = first.x + first.width;
  let maxY = first.y + first.height;
  for (let i = 1; i < rects.length; i++) {
    const r = rects[i]!;
    if (r.x < minX) minX = r.x;
    if (r.y < minY) minY = r.y;
    const r2x = r.x + r.width;
    const r2y = r.y + r.height;
    if (r2x > maxX) maxX = r2x;
    if (r2y > maxY) maxY = r2y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

export const rectInflate = (r: Rect, dx: number, dy: number = dx): Rect => ({
  x: r.x - dx,
  y: r.y - dy,
  width: r.width + 2 * dx,
  height: r.height + 2 * dy,
});

/** Returns the AABB of the 4 transformed corners of the rect. */
export const rectTransformAABB = (r: Rect, m: Mat2D): Rect => {
  const p1 = matApply(m, { x: r.x, y: r.y });
  const p2 = matApply(m, { x: r.x + r.width, y: r.y });
  const p3 = matApply(m, { x: r.x + r.width, y: r.y + r.height });
  const p4 = matApply(m, { x: r.x, y: r.y + r.height });
  const minX = Math.min(p1.x, p2.x, p3.x, p4.x);
  const minY = Math.min(p1.y, p2.y, p3.y, p4.y);
  const maxX = Math.max(p1.x, p2.x, p3.x, p4.x);
  const maxY = Math.max(p1.y, p2.y, p3.y, p4.y);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

export const rectCorners = (r: Rect): [Vec2, Vec2, Vec2, Vec2] => [
  { x: r.x, y: r.y },
  { x: r.x + r.width, y: r.y },
  { x: r.x + r.width, y: r.y + r.height },
  { x: r.x, y: r.y + r.height },
];

export const rectEmpty = (r: Rect): boolean => r.width <= 0 || r.height <= 0;

export const rectNormalized = (r: Rect): Rect => {
  let { x, y, width, height } = r;
  if (width < 0) {
    x += width;
    width = -width;
  }
  if (height < 0) {
    y += height;
    height = -height;
  }
  return { x, y, width, height };
};
