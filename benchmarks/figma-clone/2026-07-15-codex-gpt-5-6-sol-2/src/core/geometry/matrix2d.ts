import type { Vec2 } from './vec2';
import { GEOMETRY_EPSILON } from './vec2';

/**
 * Canvas-compatible affine matrix. A point is mapped as:
 * x' = a*x + c*y + e, y' = b*x + d*y + f.
 */
export interface Matrix2D {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
}

export const IDENTITY_MATRIX: Matrix2D = Object.freeze({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });

export function matrix2d(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
): Matrix2D {
  return { a, b, c, d, e, f };
}

export function translationMatrix(x: number, y: number): Matrix2D {
  return { a: 1, b: 0, c: 0, d: 1, e: x, f: y };
}

export function scalingMatrix(scaleX: number, scaleY = scaleX): Matrix2D {
  return { a: scaleX, b: 0, c: 0, d: scaleY, e: 0, f: 0 };
}

export function rotationMatrix(radians: number): Matrix2D {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return { a: cosine, b: sine, c: -sine, d: cosine, e: 0, f: 0 };
}

export function rotationMatrixDegrees(degrees: number): Matrix2D {
  return rotationMatrix(degreesToRadians(degrees));
}

/** Returns left * right; the right matrix is applied to points first. */
export function multiplyMatrices(left: Matrix2D, right: Matrix2D): Matrix2D {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  };
}

/** Composes matrices in written order: compose(T, R) maps points through R, then T. */
export function composeMatrices(...matrices: readonly Matrix2D[]): Matrix2D {
  let result = IDENTITY_MATRIX;
  for (const matrix of matrices) result = multiplyMatrices(result, matrix);
  return result;
}

export function determinantMatrix(matrix: Matrix2D): number {
  return matrix.a * matrix.d - matrix.b * matrix.c;
}

export function tryInvertMatrix(matrix: Matrix2D, epsilon = GEOMETRY_EPSILON): Matrix2D | null {
  const determinant = determinantMatrix(matrix);
  if (Math.abs(determinant) <= epsilon) return null;

  return {
    a: matrix.d / determinant,
    b: -matrix.b / determinant,
    c: -matrix.c / determinant,
    d: matrix.a / determinant,
    e: (matrix.c * matrix.f - matrix.d * matrix.e) / determinant,
    f: (matrix.b * matrix.e - matrix.a * matrix.f) / determinant,
  };
}

export function invertMatrix(matrix: Matrix2D, epsilon = GEOMETRY_EPSILON): Matrix2D {
  const inverse = tryInvertMatrix(matrix, epsilon);
  if (inverse === null) throw new RangeError('Cannot invert a singular affine matrix');
  return inverse;
}

export function applyMatrixToPoint(matrix: Matrix2D, point: Vec2): Vec2 {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  };
}

/** Applies only the linear portion; translation is intentionally ignored. */
export function applyMatrixToVector(matrix: Matrix2D, vector: Vec2): Vec2 {
  return {
    x: matrix.a * vector.x + matrix.c * vector.y,
    y: matrix.b * vector.x + matrix.d * vector.y,
  };
}

export function matrixAroundPoint(matrix: Matrix2D, pivot: Vec2): Matrix2D {
  return composeMatrices(
    translationMatrix(pivot.x, pivot.y),
    matrix,
    translationMatrix(-pivot.x, -pivot.y),
  );
}

export function matrixScaleFactors(matrix: Matrix2D): Vec2 {
  return { x: Math.hypot(matrix.a, matrix.b), y: Math.hypot(matrix.c, matrix.d) };
}

export function isFiniteMatrix(matrix: Matrix2D): boolean {
  return (
    Number.isFinite(matrix.a) &&
    Number.isFinite(matrix.b) &&
    Number.isFinite(matrix.c) &&
    Number.isFinite(matrix.d) &&
    Number.isFinite(matrix.e) &&
    Number.isFinite(matrix.f)
  );
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function normalizeDegrees(degrees: number): number {
  const normalized = ((((degrees + 180) % 360) + 360) % 360) - 180;
  return Object.is(normalized, -0) ? 0 : normalized;
}

export function normalizeRadians(radians: number): number {
  const fullTurn = Math.PI * 2;
  const normalized = ((((radians + Math.PI) % fullTurn) + fullTurn) % fullTurn) - Math.PI;
  return Object.is(normalized, -0) ? 0 : normalized;
}
