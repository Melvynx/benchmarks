import type { AABB, Handle, Mat2D, PathPoint, Vec2 } from "./types";
import { MIN_SIZE } from "./types";

export const IDENTITY: Mat2D = [1, 0, 0, 1, 0, 0];

export function vec(x: number, y: number): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scaleVec(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, y: a.y * s };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function len(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(a: Vec2): Vec2 {
  const l = len(a);
  if (l < 1e-12) return { x: 0, y: 0 };
  return { x: a.x / l, y: a.y / l };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function degToRad(d: number): number {
  return (d * Math.PI) / 180;
}

export function radToDeg(r: number): number {
  return (r * 180) / Math.PI;
}

export function snapAngle(deg: number, step = 15): number {
  return Math.round(deg / step) * step;
}

export function mul(a: Mat2D, b: Mat2D): Mat2D {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

export function translate(x: number, y: number): Mat2D {
  return [1, 0, 0, 1, x, y];
}

export function rotateMat(deg: number): Mat2D {
  const r = degToRad(deg);
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, s, -s, c, 0, 0];
}

export function scaleMat(sx: number, sy: number): Mat2D {
  return [sx, 0, 0, sy, 0, 0];
}

export function invert(m: Mat2D): Mat2D | null {
  const det = m[0] * m[3] - m[1] * m[2];
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det;
  return [
    m[3] * inv,
    -m[1] * inv,
    -m[2] * inv,
    m[0] * inv,
    (m[2] * m[5] - m[3] * m[4]) * inv,
    (m[1] * m[4] - m[0] * m[5]) * inv,
  ];
}

export function apply(m: Mat2D, p: Vec2): Vec2 {
  return { x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] };
}

export function applyVec(m: Mat2D, v: Vec2): Vec2 {
  return { x: m[0] * v.x + m[2] * v.y, y: m[1] * v.x + m[3] * v.y };
}

export function applyInverse(m: Mat2D, p: Vec2): Vec2 | null {
  const inv = invert(m);
  if (!inv) return null;
  return apply(inv, p);
}

/**
 * Local matrix for a node whose (x,y) is the unrotated top-left in parent space
 * and whose rotation is around the geometric center.
 */
export function nodeLocalMatrix(node: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}): Mat2D {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  return mul(mul(translate(cx, cy), rotateMat(node.rotation)), translate(-node.width / 2, -node.height / 2));
}

export function localToParent(
  node: { x: number; y: number; width: number; height: number; rotation: number },
  local: Vec2,
): Vec2 {
  return apply(nodeLocalMatrix(node), local);
}

export function parentToLocal(
  node: { x: number; y: number; width: number; height: number; rotation: number },
  parent: Vec2,
): Vec2 | null {
  return applyInverse(nodeLocalMatrix(node), parent);
}

export function localCorners(w: number, h: number): Vec2[] {
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
}

export function aabbFromPoints(pts: Vec2[]): AABB {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}

export function nodeAABB(node: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}): AABB {
  const m = nodeLocalMatrix(node);
  return aabbFromPoints(localCorners(node.width, node.height).map((p) => apply(m, p)));
}

export function unionAABB(a: AABB, b: AABB): AABB {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

export function inflateAABB(a: AABB, pad: number): AABB {
  return {
    minX: a.minX - pad,
    minY: a.minY - pad,
    maxX: a.maxX + pad,
    maxY: a.maxY + pad,
  };
}

export function aabbIntersects(a: AABB, b: AABB): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

export function aabbContains(a: AABB, b: AABB): boolean {
  return a.minX <= b.minX && a.minY <= b.minY && a.maxX >= b.maxX && a.maxY >= b.maxY;
}

export function pointInAABB(p: Vec2, a: AABB): boolean {
  return p.x >= a.minX && p.x <= a.maxX && p.y >= a.minY && p.y <= a.maxY;
}

export function aabbWidth(a: AABB): number {
  return a.maxX - a.minX;
}

export function aabbHeight(a: AABB): number {
  return a.maxY - a.minY;
}

export function aabbCenter(a: AABB): Vec2 {
  return { x: (a.minX + a.maxX) / 2, y: (a.minY + a.maxY) / 2 };
}

export function emptyAABB(): AABB {
  return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
}

export const HANDLE_ANCHOR: Record<Handle, Handle> = {
  nw: "se",
  n: "s",
  ne: "sw",
  e: "w",
  se: "nw",
  s: "n",
  sw: "ne",
  w: "e",
};

/** Local-space anchor that stays fixed while a given handle is dragged. */
export function localAnchor(handle: Handle, w: number, h: number): Vec2 {
  switch (handle) {
    case "se":
      return { x: 0, y: 0 };
    case "nw":
      return { x: w, y: h };
    case "ne":
      return { x: 0, y: h };
    case "sw":
      return { x: w, y: 0 };
    case "e":
      return { x: 0, y: h / 2 };
    case "w":
      return { x: w, y: h / 2 };
    case "n":
      return { x: w / 2, y: h };
    case "s":
      return { x: w / 2, y: 0 };
  }
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

/**
 * Resize a rotated box so the opposite handle stays fixed in parent space.
 * Pointers are in the same parent space as the box's x/y.
 */
export function resizeRotated(
  start: Box,
  handle: Handle,
  pointerParent: Vec2,
  opts: { keepRatio: boolean; fromCenter: boolean },
): Box {
  const localPtr = parentToLocal(start, pointerParent);
  if (!localPtr) return { ...start };

  let dx = 0;
  let dy = 0;
  switch (handle) {
    case "e":
    case "ne":
    case "se":
      dx = localPtr.x - start.width;
      break;
    case "w":
    case "nw":
    case "sw":
      dx = -localPtr.x;
      break;
    default:
      break;
  }
  switch (handle) {
    case "s":
    case "se":
    case "sw":
      dy = localPtr.y - start.height;
      break;
    case "n":
    case "ne":
    case "nw":
      dy = -localPtr.y;
      break;
    default:
      break;
  }

  if (opts.fromCenter) {
    dx *= 2;
    dy *= 2;
  }

  let newW = start.width + dx;
  let newH = start.height + dy;

  const flipX = newW < 0;
  const flipY = newH < 0;
  if (flipX) newW = Math.abs(newW);
  if (flipY) newH = Math.abs(newH);

  if (opts.keepRatio && start.width > 0 && start.height > 0) {
    const ratio = start.width / start.height;
    const affectsX = handle.includes("e") || handle.includes("w") || handle === "n" || handle === "s" ? handle !== "n" && handle !== "s" : true;
    const affectsY = handle.includes("n") || handle.includes("s") || handle === "e" || handle === "w" ? handle !== "e" && handle !== "w" : true;
    if (handle === "n" || handle === "s") {
      newW = newH * ratio;
    } else if (handle === "e" || handle === "w") {
      newH = newW / ratio;
    } else if (affectsX && affectsY) {
      if (Math.abs(dx) * start.height > Math.abs(dy) * start.width) {
        newH = newW / ratio;
      } else {
        newW = newH * ratio;
      }
    }
  }

  newW = Math.max(MIN_SIZE, newW);
  newH = Math.max(MIN_SIZE, newH);

  const anchorHandle = opts.fromCenter ? null : handle;
  const startAnchor = opts.fromCenter
    ? { x: start.width / 2, y: start.height / 2 }
    : localAnchor(handle, start.width, start.height);
  const newAnchor = opts.fromCenter
    ? { x: newW / 2, y: newH / 2 }
    : localAnchor(anchorHandle ?? handle, newW, newH);

  const startAnchorParent = localToParent(start, startAnchor);
  const newCenterOffset = applyVec(rotateMat(start.rotation), {
    x: newAnchor.x - newW / 2,
    y: newAnchor.y - newH / 2,
  });
  const newCenter = sub(startAnchorParent, newCenterOffset);

  return {
    x: newCenter.x - newW / 2,
    y: newCenter.y - newH / 2,
    width: newW,
    height: newH,
    rotation: start.rotation,
  };
}

export function rotateAround(point: Vec2, center: Vec2, deg: number): Vec2 {
  const r = degToRad(deg);
  const c = Math.cos(r);
  const s = Math.sin(r);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return { x: center.x + dx * c - dy * s, y: center.y + dx * s + dy * c };
}

export function pointInRect(p: Vec2, w: number, h: number): boolean {
  return p.x >= 0 && p.y >= 0 && p.x <= w && p.y <= h;
}

export function pointInEllipse(p: Vec2, w: number, h: number): boolean {
  if (w <= 0 || h <= 0) return false;
  const nx = p.x / w - 0.5;
  const ny = p.y / h - 0.5;
  return nx * nx * 4 + ny * ny * 4 <= 1;
}

export function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  if (l2 < 1e-12) return dist(p, a);
  const t = clamp(dot(sub(p, a), ab) / l2, 0, 1);
  return dist(p, add(a, scaleVec(ab, t)));
}

export function pointInPolygon(p: Vec2, poly: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i];
    const pj = poly[j];
    if (!pi || !pj) continue;
    const intersect =
      pi.y > p.y !== pj.y > p.y && p.x < ((pj.x - pi.x) * (p.y - pi.y)) / (pj.y - pi.y + 1e-12) + pi.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function regularPolygon(sides: number, w: number, h: number): Vec2[] {
  const n = Math.max(3, Math.round(sides));
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const pts: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  return pts;
}

export function starPolygon(points: number, innerRatio: number, w: number, h: number): Vec2[] {
  const n = Math.max(3, Math.round(points));
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const inner = clamp(innerRatio, 0.05, 0.95);
  const pts: Vec2[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const k = i % 2 === 0 ? 1 : inner;
    pts.push({ x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k });
  }
  return pts;
}

export function ellipsePolygon(w: number, h: number, segments = 64): Vec2[] {
  const pts: Vec2[] = [];
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  for (let i = 0; i < segments; i++) {
    const a = (i * 2 * Math.PI) / segments;
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  return pts;
}

export function cubicPoint(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

export function flattenPath(points: PathPoint[], closed: boolean, steps = 16): Vec2[] {
  if (points.length === 0) return [];
  const pts: Vec2[] = [];
  const n = points.length;
  const count = closed ? n : n - 1;
  for (let i = 0; i < count; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    if (!a || !b) continue;
    const p0 = { x: a.x, y: a.y };
    const p1 = { x: a.x + a.handleOut.x, y: a.y + a.handleOut.y };
    const p2 = { x: b.x + b.handleIn.x, y: b.y + b.handleIn.y };
    const p3 = { x: b.x, y: b.y };
    for (let s = 0; s < steps; s++) {
      pts.push(cubicPoint(p0, p1, p2, p3, s / steps));
    }
  }
  if (!closed) {
    const last = points[n - 1];
    if (last) pts.push({ x: last.x, y: last.y });
  }
  return pts;
}

export function handleScreenPos(
  node: Box,
  handle: Handle,
  worldMat: Mat2D,
): Vec2 {
  const local: Record<Handle, Vec2> = {
    nw: { x: 0, y: 0 },
    n: { x: node.width / 2, y: 0 },
    ne: { x: node.width, y: 0 },
    e: { x: node.width, y: node.height / 2 },
    se: { x: node.width, y: node.height },
    s: { x: node.width / 2, y: node.height },
    sw: { x: 0, y: node.height },
    w: { x: 0, y: node.height / 2 },
  };
  const p = local[handle];
  return apply(mul(worldMat, nodeLocalMatrix(node)), p);
}

export function resizeCursor(handle: Handle, rotation: number): string {
  const base: Record<Handle, number> = {
    e: 0,
    se: 45,
    s: 90,
    sw: 135,
    w: 180,
    nw: 225,
    n: 270,
    ne: 315,
  };
  const a = (((base[handle] + rotation) % 180) + 180) % 180;
  if (a < 22.5 || a >= 157.5) return "ew-resize";
  if (a < 67.5) return "nwse-resize";
  if (a < 112.5) return "ns-resize";
  return "nesw-resize";
}

export function roundRectPath(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | Path2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: { tl: number; tr: number; br: number; bl: number },
): void {
  const tl = clamp(r.tl, 0, Math.min(w, h) / 2);
  const tr = clamp(r.tr, 0, Math.min(w, h) / 2);
  const br = clamp(r.br, 0, Math.min(w, h) / 2);
  const bl = clamp(r.bl, 0, Math.min(w, h) / 2);
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

export function projectToLocalAxes(worldDelta: Vec2, rotation: number): Vec2 {
  const inv = rotateMat(-rotation);
  return applyVec(inv, worldDelta);
}
