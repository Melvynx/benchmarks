import type { Bounds, Point, SceneNode } from "./types";

export interface Matrix {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
}

export const IDENTITY: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
export const point = (x: number, y: number): Point => ({ x, y });

export function multiply(left: Matrix, right: Matrix): Matrix {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  };
}

export const translate = (x: number, y: number): Matrix => ({ a: 1, b: 0, c: 0, d: 1, e: x, f: y });

export function rotate(degrees: number): Matrix {
  const radians = (degrees * Math.PI) / 180;
  return { a: Math.cos(radians), b: Math.sin(radians), c: -Math.sin(radians), d: Math.cos(radians), e: 0, f: 0 };
}

export function invert(matrix: Matrix): Matrix {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  if (Math.abs(determinant) < Number.EPSILON) return IDENTITY;
  return {
    a: matrix.d / determinant,
    b: -matrix.b / determinant,
    c: -matrix.c / determinant,
    d: matrix.a / determinant,
    e: (matrix.c * matrix.f - matrix.d * matrix.e) / determinant,
    f: (matrix.b * matrix.e - matrix.a * matrix.f) / determinant,
  };
}

export function transformPoint(matrix: Matrix, value: Point): Point {
  return { x: matrix.a * value.x + matrix.c * value.y + matrix.e, y: matrix.b * value.x + matrix.d * value.y + matrix.f };
}

export function nodeLocalMatrix(node: SceneNode): Matrix {
  const center = point(node.width / 2, node.height / 2);
  return multiply(
    translate(node.x, node.y),
    multiply(translate(center.x, center.y), multiply(rotate(node.rotation), translate(-center.x, -center.y))),
  );
}

export function worldMatrix(node: SceneNode, nodes: Readonly<Record<string, SceneNode>>): Matrix {
  let matrix = nodeLocalMatrix(node);
  let parentId = node.parentId;
  const visited = new Set<string>();
  while (parentId) {
    if (visited.has(parentId)) break;
    visited.add(parentId);
    const parent = nodes[parentId];
    if (!parent) break;
    matrix = multiply(nodeLocalMatrix(parent), matrix);
    parentId = parent.parentId;
  }
  return matrix;
}

export function boundsCorners(bounds: Bounds): readonly Point[] {
  return [point(0, 0), point(bounds.width, 0), point(bounds.width, bounds.height), point(0, bounds.height)];
}

export function transformedBounds(bounds: Bounds, matrix: Matrix): Bounds {
  const corners = boundsCorners(bounds).map((corner) => transformPoint(matrix, corner));
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

export function nodeWorldBounds(node: SceneNode, nodes: Readonly<Record<string, SceneNode>>): Bounds {
  return transformedBounds({ x: 0, y: 0, width: node.width, height: node.height }, worldMatrix(node, nodes));
}

export function unionBounds(bounds: readonly Bounds[]): Bounds | null {
  if (bounds.length === 0) return null;
  const minX = Math.min(...bounds.map((item) => item.x));
  const minY = Math.min(...bounds.map((item) => item.y));
  const maxX = Math.max(...bounds.map((item) => item.x + item.width));
  const maxY = Math.max(...bounds.map((item) => item.y + item.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export const containsPoint = (bounds: Bounds, value: Point): boolean =>
  value.x >= bounds.x && value.x <= bounds.x + bounds.width && value.y >= bounds.y && value.y <= bounds.y + bounds.height;

export const intersects = (left: Bounds, right: Bounds): boolean =>
  left.x <= right.x + right.width && left.x + left.width >= right.x && left.y <= right.y + right.height && left.y + left.height >= right.y;

export const distance = (left: Point, right: Point): number => Math.hypot(right.x - left.x, right.y - left.y);
export const clamp = (value: number, minimum: number, maximum: number): number => Math.min(maximum, Math.max(minimum, value));
export const snapAngle = (degrees: number, increment = 15): number => Math.round(degrees / increment) * increment;
export const normalizeAngle = (degrees: number): number => ((degrees % 360) + 360) % 360;

export function screenToWorld(value: Point, viewport: { x: number; y: number; zoom: number }): Point {
  return { x: (value.x - viewport.x) / viewport.zoom, y: (value.y - viewport.y) / viewport.zoom };
}

export function worldToScreen(value: Point, viewport: { x: number; y: number; zoom: number }): Point {
  return { x: value.x * viewport.zoom + viewport.x, y: value.y * viewport.zoom + viewport.y };
}

export function rotatePointAround(value: Point, center: Point, degrees: number): Point {
  const matrix = multiply(translate(center.x, center.y), multiply(rotate(degrees), translate(-center.x, -center.y)));
  return transformPoint(matrix, value);
}

export function pointInNode(value: Point, node: SceneNode, nodes: Readonly<Record<string, SceneNode>>): boolean {
  const local = transformPoint(invert(worldMatrix(node, nodes)), value);
  if (node.type === "ellipse") {
    const rx = node.width / 2;
    const ry = node.height / 2;
    return ((local.x - rx) ** 2) / rx ** 2 + ((local.y - ry) ** 2) / ry ** 2 <= 1;
  }
  if (node.type === "line") {
    const length = Math.max(node.width, 1);
    const cross = Math.abs((local.y * length) / Math.max(length, 1));
    return local.x >= -4 && local.x <= node.width + 4 && cross <= Math.max(5, node.stroke.width);
  }
  return local.x >= 0 && local.y >= 0 && local.x <= node.width && local.y <= node.height;
}

export function roundTo(value: number, precision = 2): number {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}
