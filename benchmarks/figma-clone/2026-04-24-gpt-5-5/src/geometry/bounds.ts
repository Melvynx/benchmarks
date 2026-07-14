import type { Point, SceneNode } from "../types/nodes";
import { nodeMatrix, transformPoint } from "./matrix";

export type Bounds = Readonly<{ x: number; y: number; width: number; height: number }>;

export function corners(bounds: Bounds): readonly [Point, Point, Point, Point] {
  return [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
  ];
}

export function localCorners(node: Pick<SceneNode, "width" | "height">): readonly [Point, Point, Point, Point] {
  return [
    { x: 0, y: 0 },
    { x: node.width, y: 0 },
    { x: node.width, y: node.height },
    { x: 0, y: node.height },
  ];
}

export function nodeCorners(node: SceneNode): readonly [Point, Point, Point, Point] {
  const matrix = nodeMatrix(node);
  const [a, b, c, d] = localCorners(node).map((point) => transformPoint(matrix, point));
  return [a, b, c, d];
}

export function boundsFromPoints(points: readonly Point[]): Bounds {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function nodeBounds(node: SceneNode): Bounds {
  return boundsFromPoints(nodeCorners(node));
}

export function unionBounds(bounds: readonly Bounds[]): Bounds | null {
  if (bounds.length === 0) return null;
  return boundsFromPoints(bounds.flatMap((bound) => corners(bound)));
}

export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
}

export function containsPoint(bounds: Bounds, point: Point): boolean {
  return point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height;
}

export function inflateBounds(bounds: Bounds, amount: number): Bounds {
  return {
    x: bounds.x - amount,
    y: bounds.y - amount,
    width: bounds.width + amount * 2,
    height: bounds.height + amount * 2,
  };
}
