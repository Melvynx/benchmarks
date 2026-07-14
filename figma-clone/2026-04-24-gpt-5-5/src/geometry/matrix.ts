import type { Point } from "../types/nodes";

export type Matrix = Readonly<{
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}>;

export const identity: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

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

export function translate(x: number, y: number): Matrix {
  return { a: 1, b: 0, c: 0, d: 1, e: x, f: y };
}

export function scale(x: number, y = x): Matrix {
  return { a: x, b: 0, c: 0, d: y, e: 0, f: 0 };
}

export function rotate(degrees: number): Matrix {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

export function invert(matrix: Matrix): Matrix {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  if (Math.abs(determinant) < Number.EPSILON) {
    return identity;
  }
  return {
    a: matrix.d / determinant,
    b: -matrix.b / determinant,
    c: -matrix.c / determinant,
    d: matrix.a / determinant,
    e: (matrix.c * matrix.f - matrix.d * matrix.e) / determinant,
    f: (matrix.b * matrix.e - matrix.a * matrix.f) / determinant,
  };
}

export function transformPoint(matrix: Matrix, point: Point): Point {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  };
}

export function nodeMatrix(node: { x: number; y: number; width: number; height: number; rotation: number }): Matrix {
  return multiply(
    translate(node.x + node.width / 2, node.y + node.height / 2),
    multiply(rotate(node.rotation), translate(-node.width / 2, -node.height / 2)),
  );
}

export function screenToWorld(viewport: { x: number; y: number; zoom: number }, point: Point): Point {
  return { x: (point.x - viewport.x) / viewport.zoom, y: (point.y - viewport.y) / viewport.zoom };
}

export function worldToScreen(viewport: { x: number; y: number; zoom: number }, point: Point): Point {
  return { x: point.x * viewport.zoom + viewport.x, y: point.y * viewport.zoom + viewport.y };
}

export function snapAngle(degrees: number, step = 15): number {
  return Math.round(degrees / step) * step;
}
