import type { GeometricNode, VectorNode } from "../types";
import { distToSegment, pointInPolygon } from "./bounds";
import type { Box, Vec } from "./matrix";

export function hitLocal(node: GeometricNode, geom: Box, local: Vec, pad: number): boolean {
  const w = Math.max(geom.width, 0.001);
  const h = Math.max(geom.height, 0.001);
  if (node.type === "ellipse") {
    const nx = (local.x - w / 2) / (w / 2);
    const ny = (local.y - h / 2) / (h / 2);
    return nx * nx + ny * ny <= 1;
  }
  if (node.type === "line") {
    const stroke = node.strokes.find((item) => item.visible)?.width ?? 2;
    return distToSegment(local, { x: 0, y: h / 2 }, { x: w, y: h / 2 }) <= Math.max(pad, stroke / 2 + 2);
  }
  if (node.type === "polygon") return pointInPolygon(local, polygonLocal(node.sides, w, h));
  if (node.type === "star") return pointInPolygon(local, starLocal(node.points, node.innerRatio, w, h));
  if (node.type === "vector") return hitVector(node, local, pad);
  return local.x >= -pad && local.y >= -pad && local.x <= w + pad && local.y <= h + pad;
}

export function polygonLocal(sides: number, width: number, height: number): Vec[] {
  const pts: Vec[] = [];
  const count = Math.max(3, sides);
  for (let i = 0; i < count; i += 1) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    pts.push({ x: width / 2 + (Math.cos(angle) * width) / 2, y: height / 2 + (Math.sin(angle) * height) / 2 });
  }
  return pts;
}

export function starLocal(points: number, innerRatio: number, width: number, height: number): Vec[] {
  const pts: Vec[] = [];
  const count = Math.max(3, points);
  for (let i = 0; i < count * 2; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / count;
    const radius = i % 2 === 0 ? 1 : innerRatio;
    pts.push({
      x: width / 2 + (Math.cos(angle) * width * radius) / 2,
      y: height / 2 + (Math.sin(angle) * height * radius) / 2,
    });
  }
  return pts;
}

function hitVector(node: VectorNode, local: Vec, pad: number): boolean {
  for (const contour of node.contours) {
    const flat = flatten(contour.points);
    if (flat.length < 2) continue;
    if (node.closed && pointInPolygon(local, flat)) return true;
    for (let i = 0; i < flat.length - 1; i += 1) {
      const a = flat[i];
      const b = flat[i + 1];
      if (a && b && distToSegment(local, a, b) <= Math.max(pad, 4)) return true;
    }
    if (node.closed && flat[0] && flat[flat.length - 1] && distToSegment(local, flat[flat.length - 1]!, flat[0]) <= Math.max(pad, 4)) {
      return true;
    }
  }
  return false;
}

export function flatten(points: VectorNode["contours"][number]["points"], steps = 8): Vec[] {
  if (points.length === 0) return [];
  const out: Vec[] = [];
  const first = points[0];
  if (!first) return [];
  out.push({ x: first.x, y: first.y });
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;
    const c1 = a.handleOut ? { x: a.x + a.handleOut.x, y: a.y + a.handleOut.y } : { x: a.x, y: a.y };
    const c2 = b.handleIn ? { x: b.x + b.handleIn.x, y: b.y + b.handleIn.y } : { x: b.x, y: b.y };
    const straight = !a.handleOut && !b.handleIn;
    if (straight) out.push({ x: b.x, y: b.y });
    else {
      for (let s = 1; s <= steps; s += 1) {
        const t = s / steps;
        out.push(cubic(a, c1, c2, b, t));
      }
    }
  }
  return out;
}

function cubic(p0: Vec, p1: Vec, p2: Vec, p3: Vec, t: number): Vec {
  const mt = 1 - t;
  return {
    x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
    y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
  };
}
