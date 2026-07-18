import { applyMatrixToPoint, matrixAroundPoint, rotationMatrix } from './matrix2d';
import type { Matrix2D } from './matrix2d';
import { aabbFromPoints, rectCenter, rectCorners } from './rect';
import type { AABB, Rect } from './rect';
import type { Vec2 } from './vec2';

export function transformRectCorners(
  rect: Rect,
  matrix: Matrix2D,
): readonly [Vec2, Vec2, Vec2, Vec2] {
  const [topLeft, topRight, bottomRight, bottomLeft] = rectCorners(rect);
  return [
    applyMatrixToPoint(matrix, topLeft),
    applyMatrixToPoint(matrix, topRight),
    applyMatrixToPoint(matrix, bottomRight),
    applyMatrixToPoint(matrix, bottomLeft),
  ];
}

export function transformRectBounds(rect: Rect, matrix: Matrix2D): AABB {
  return aabbFromPoints(transformRectCorners(rect, matrix));
}

export function rotatedRectCorners(
  rect: Rect,
  radians: number,
  pivot: Vec2 = rectCenter(rect),
): readonly [Vec2, Vec2, Vec2, Vec2] {
  return transformRectCorners(rect, matrixAroundPoint(rotationMatrix(radians), pivot));
}

export function rotatedRectBounds(
  rect: Rect,
  radians: number,
  pivot: Vec2 = rectCenter(rect),
): AABB {
  return aabbFromPoints(rotatedRectCorners(rect, radians, pivot));
}
