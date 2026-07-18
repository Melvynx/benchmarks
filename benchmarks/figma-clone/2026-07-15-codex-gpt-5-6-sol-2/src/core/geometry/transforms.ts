import {
  applyMatrixToPoint,
  composeMatrices,
  IDENTITY_MATRIX,
  invertMatrix,
  rotationMatrixDegrees,
  translationMatrix,
} from './matrix2d';
import type { Matrix2D } from './matrix2d';
import { transformRectBounds, transformRectCorners } from './bounds';
import type { AABB } from './rect';
import type { Vec2 } from './vec2';

/** Position is parent-local and rotation is clockwise degrees in screen coordinates. */
export interface LocalTransform {
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
}

export interface TransformRect extends LocalTransform {
  readonly width: number;
  readonly height: number;
}

/** Nodes rotate about their local origin; their drawable rectangle is [0,width] x [0,height]. */
export function localTransformMatrix(transform: LocalTransform): Matrix2D {
  return composeMatrices(
    translationMatrix(transform.x, transform.y),
    rotationMatrixDegrees(transform.rotation),
  );
}

export function worldTransformMatrix(
  transform: LocalTransform,
  parentWorld: Matrix2D = IDENTITY_MATRIX,
): Matrix2D {
  return composeMatrices(parentWorld, localTransformMatrix(transform));
}

export function localToWorldPoint(
  point: Vec2,
  transform: LocalTransform,
  parentWorld: Matrix2D = IDENTITY_MATRIX,
): Vec2 {
  return applyMatrixToPoint(worldTransformMatrix(transform, parentWorld), point);
}

export function worldToLocalPoint(
  point: Vec2,
  transform: LocalTransform,
  parentWorld: Matrix2D = IDENTITY_MATRIX,
): Vec2 {
  return applyMatrixToPoint(invertMatrix(worldTransformMatrix(transform, parentWorld)), point);
}

export function frameWorldCorners(
  frame: TransformRect,
  parentWorld: Matrix2D = IDENTITY_MATRIX,
): readonly [Vec2, Vec2, Vec2, Vec2] {
  return transformRectCorners(
    { x: 0, y: 0, width: frame.width, height: frame.height },
    worldTransformMatrix(frame, parentWorld),
  );
}

export function frameWorldBounds(
  frame: TransformRect,
  parentWorld: Matrix2D = IDENTITY_MATRIX,
): AABB {
  return transformRectBounds(
    { x: 0, y: 0, width: frame.width, height: frame.height },
    worldTransformMatrix(frame, parentWorld),
  );
}
