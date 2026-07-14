import type { Point, SceneNode } from "../types/nodes";
import { containsPoint } from "./bounds";
import { invert, nodeMatrix, transformPoint } from "./matrix";

export type HitResult = Readonly<{ nodeId: string; point: Point }>;

export function pointInNode(node: SceneNode, worldPoint: Point): boolean {
  if (!node.visible || node.locked) return false;
  const local = transformPoint(invert(nodeMatrix(node)), worldPoint);
  if (local.x < 0 || local.x > node.width || local.y < 0 || local.y > node.height) return false;

  switch (node.type) {
    case "ellipse": {
      const rx = node.width / 2;
      const ry = node.height / 2;
      const dx = (local.x - rx) / Math.max(rx, 0.0001);
      const dy = (local.y - ry) / Math.max(ry, 0.0001);
      return dx * dx + dy * dy <= 1;
    }
    case "line": {
      const [a, b] = node.points;
      const distance = distanceToSegment(local, a, b);
      return distance <= Math.max(6, node.strokes[0]?.width ?? 1);
    }
    case "polygon":
      return pointInPolygon(local, polygonPoints(node.width, node.height, node.sides, node.star, node.innerRadius));
    default:
      return containsPoint({ x: 0, y: 0, width: node.width, height: node.height }, local);
  }
}

function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

export function polygonPoints(width: number, height: number, sides: number, star: boolean, innerRadius: number): Point[] {
  const count = star ? sides * 2 : sides;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2;
  return Array.from({ length: count }, (_, index) => {
    const isInner = star && index % 2 === 1;
    const r = isInner ? radius * innerRadius : radius;
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });
}

function pointInPolygon(point: Point, points: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const pi = points[i];
    const pj = points[j];
    const intersects = pi.y > point.y !== pj.y > point.y && point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
}
