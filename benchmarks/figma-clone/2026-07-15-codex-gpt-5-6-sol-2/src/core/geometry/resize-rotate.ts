import {
  applyMatrixToPoint,
  degreesToRadians,
  IDENTITY_MATRIX,
  invertMatrix,
  normalizeDegrees,
  radiansToDegrees,
} from './matrix2d';
import type { Matrix2D } from './matrix2d';
import type { Rect } from './rect';
import { worldTransformMatrix } from './transforms';
import type { TransformRect } from './transforms';
import { angleVec2, distanceVec2, GEOMETRY_EPSILON, rotateVec2, subtractVec2 } from './vec2';
import type { Vec2 } from './vec2';

export type ResizeHandle =
  | 'north-west'
  | 'north'
  | 'north-east'
  | 'east'
  | 'south-east'
  | 'south'
  | 'south-west'
  | 'west';

export interface ResizeFrameInput {
  readonly initial: TransformRect;
  readonly handle: ResizeHandle;
  readonly startPointerWorld: Vec2;
  readonly currentPointerWorld: Vec2;
  readonly parentWorld?: Matrix2D;
  /** Shift behavior: keep the initial local aspect ratio. */
  readonly keepAspectRatio?: boolean;
  /** Alt behavior: move the opposite edge symmetrically around the initial center. */
  readonly fromCenter?: boolean;
  readonly minWidth?: number;
  readonly minHeight?: number;
}

export interface ResizeFrameResult {
  readonly frame: TransformRect;
  /** Bounds of the resized box expressed in the initial node's local coordinate system. */
  readonly localBounds: Rect;
  readonly localPointerDelta: Vec2;
}

export interface RotateFrameInput {
  readonly initial: TransformRect;
  readonly startPointerWorld: Vec2;
  readonly currentPointerWorld: Vec2;
  readonly parentWorld?: Matrix2D;
  /** Shift behavior: snap the final rotation to the configured increment. */
  readonly snap?: boolean;
  readonly snapIncrementDegrees?: number;
}

export interface RotateFrameResult {
  readonly frame: TransformRect;
  readonly pivotWorld: Vec2;
  readonly deltaDegrees: number;
}

export function resizeHandleLocalPoint(handle: ResizeHandle, width: number, height: number): Vec2 {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  switch (handle) {
    case 'north-west':
      return { x: 0, y: 0 };
    case 'north':
      return { x: halfWidth, y: 0 };
    case 'north-east':
      return { x: width, y: 0 };
    case 'east':
      return { x: width, y: halfHeight };
    case 'south-east':
      return { x: width, y: height };
    case 'south':
      return { x: halfWidth, y: height };
    case 'south-west':
      return { x: 0, y: height };
    case 'west':
      return { x: 0, y: halfHeight };
    default:
      return assertNever(handle);
  }
}

/**
 * Resizes in the node's frozen local axes. The opposite edge/corner remains fixed,
 * including when the node or any ancestor is rotated or scaled.
 */
export function resizeFrameLocalAxes(input: ResizeFrameInput): ResizeFrameResult {
  assertValidFrame(input.initial);

  const parentWorld = input.parentWorld ?? IDENTITY_MATRIX;
  const initialWorld = worldTransformMatrix(input.initial, parentWorld);
  const worldToInitialLocal = invertMatrix(initialWorld);
  const startLocal = applyMatrixToPoint(worldToInitialLocal, input.startPointerWorld);
  const currentLocal = applyMatrixToPoint(worldToInitialLocal, input.currentPointerWorld);
  const localPointerDelta = subtractVec2(currentLocal, startLocal);

  const fromCenter = input.fromCenter ?? false;
  const keepAspectRatio = input.keepAspectRatio ?? false;
  const affectsWest = handleHasWest(input.handle);
  const affectsEast = handleHasEast(input.handle);
  const affectsNorth = handleHasNorth(input.handle);
  const affectsSouth = handleHasSouth(input.handle);
  const affectsX = affectsWest || affectsEast;
  const affectsY = affectsNorth || affectsSouth;

  let rawLeft = 0;
  let rawTop = 0;
  let rawRight = input.initial.width;
  let rawBottom = input.initial.height;

  if (affectsWest) {
    rawLeft += localPointerDelta.x;
    if (fromCenter) rawRight -= localPointerDelta.x;
  }
  if (affectsEast) {
    rawRight += localPointerDelta.x;
    if (fromCenter) rawLeft -= localPointerDelta.x;
  }
  if (affectsNorth) {
    rawTop += localPointerDelta.y;
    if (fromCenter) rawBottom -= localPointerDelta.y;
  }
  if (affectsSouth) {
    rawBottom += localPointerDelta.y;
    if (fromCenter) rawTop -= localPointerDelta.y;
  }

  const minWidth = Math.max(GEOMETRY_EPSILON, input.minWidth ?? 1);
  const minHeight = Math.max(GEOMETRY_EPSILON, input.minHeight ?? 1);
  const rawWidth = rawRight - rawLeft;
  const rawHeight = rawBottom - rawTop;

  let targetWidth = affectsX ? Math.max(minWidth, rawWidth) : input.initial.width;
  let targetHeight = affectsY ? Math.max(minHeight, rawHeight) : input.initial.height;

  if (keepAspectRatio) {
    const scaleX = rawWidth / input.initial.width;
    const scaleY = rawHeight / input.initial.height;
    let desiredScale: number;
    if (affectsX && affectsY) {
      desiredScale = Math.abs(scaleX - 1) >= Math.abs(scaleY - 1) ? scaleX : scaleY;
    } else {
      desiredScale = affectsX ? scaleX : scaleY;
    }

    const minimumScale = Math.max(minWidth / input.initial.width, minHeight / input.initial.height);
    const scale = Math.max(minimumScale, desiredScale);
    targetWidth = input.initial.width * scale;
    targetHeight = input.initial.height * scale;
  }

  const horizontal = placeResizedAxis(
    input.initial.width,
    targetWidth,
    affectsWest,
    affectsEast,
    fromCenter || (keepAspectRatio && !affectsX),
  );
  const vertical = placeResizedAxis(
    input.initial.height,
    targetHeight,
    affectsNorth,
    affectsSouth,
    fromCenter || (keepAspectRatio && !affectsY),
  );
  const localBounds: Rect = {
    x: horizontal.start,
    y: vertical.start,
    width: horizontal.end - horizontal.start,
    height: vertical.end - vertical.start,
  };

  const newOriginWorld = applyMatrixToPoint(initialWorld, { x: localBounds.x, y: localBounds.y });
  const newOriginParent = applyMatrixToPoint(invertMatrix(parentWorld), newOriginWorld);

  return {
    frame: {
      x: newOriginParent.x,
      y: newOriginParent.y,
      width: localBounds.width,
      height: localBounds.height,
      rotation: input.initial.rotation,
    },
    localBounds,
    localPointerDelta,
  };
}

/** Rotates around the immutable world-space center and optionally snaps to degree increments. */
export function rotateFrameAroundCenter(input: RotateFrameInput): RotateFrameResult {
  assertValidFrame(input.initial);
  const parentWorld = input.parentWorld ?? IDENTITY_MATRIX;
  const initialWorld = worldTransformMatrix(input.initial, parentWorld);
  const pivotWorld = applyMatrixToPoint(initialWorld, {
    x: input.initial.width / 2,
    y: input.initial.height / 2,
  });

  const startVector = subtractVec2(input.startPointerWorld, pivotWorld);
  const currentVector = subtractVec2(input.currentPointerWorld, pivotWorld);
  const canMeasureAngle =
    distanceVec2(input.startPointerWorld, pivotWorld) > GEOMETRY_EPSILON &&
    distanceVec2(input.currentPointerWorld, pivotWorld) > GEOMETRY_EPSILON;
  const gestureDelta = canMeasureAngle
    ? radiansToDegrees(normalizedAngleDelta(angleVec2(startVector), angleVec2(currentVector)))
    : 0;

  let rotation = input.initial.rotation + gestureDelta;
  if (input.snap ?? false) {
    const increment = Math.abs(input.snapIncrementDegrees ?? 15);
    if (increment > GEOMETRY_EPSILON) rotation = Math.round(rotation / increment) * increment;
  }
  rotation = normalizeDegrees(rotation);

  const pivotParent = applyMatrixToPoint(invertMatrix(parentWorld), pivotWorld);
  const centerOffset = rotateVec2(
    { x: input.initial.width / 2, y: input.initial.height / 2 },
    degreesToRadians(rotation),
  );
  const frame: TransformRect = {
    x: pivotParent.x - centerOffset.x,
    y: pivotParent.y - centerOffset.y,
    width: input.initial.width,
    height: input.initial.height,
    rotation,
  };

  return { frame, pivotWorld, deltaDegrees: normalizeDegrees(rotation - input.initial.rotation) };
}

function placeResizedAxis(
  initialSize: number,
  targetSize: number,
  affectsNegativeEdge: boolean,
  affectsPositiveEdge: boolean,
  aroundCenter: boolean,
): { readonly start: number; readonly end: number } {
  if (aroundCenter) {
    const center = initialSize / 2;
    return { start: center - targetSize / 2, end: center + targetSize / 2 };
  }
  if (affectsNegativeEdge) return { start: initialSize - targetSize, end: initialSize };
  if (affectsPositiveEdge) return { start: 0, end: targetSize };
  return { start: 0, end: initialSize };
}

function handleHasWest(handle: ResizeHandle): boolean {
  return handle === 'west' || handle === 'north-west' || handle === 'south-west';
}

function handleHasEast(handle: ResizeHandle): boolean {
  return handle === 'east' || handle === 'north-east' || handle === 'south-east';
}

function handleHasNorth(handle: ResizeHandle): boolean {
  return handle === 'north' || handle === 'north-west' || handle === 'north-east';
}

function handleHasSouth(handle: ResizeHandle): boolean {
  return handle === 'south' || handle === 'south-west' || handle === 'south-east';
}

function normalizedAngleDelta(startRadians: number, endRadians: number): number {
  const fullTurn = Math.PI * 2;
  return ((((endRadians - startRadians + Math.PI) % fullTurn) + fullTurn) % fullTurn) - Math.PI;
}

function assertValidFrame(frame: TransformRect): void {
  if (
    !Number.isFinite(frame.x) ||
    !Number.isFinite(frame.y) ||
    !Number.isFinite(frame.width) ||
    !Number.isFinite(frame.height) ||
    !Number.isFinite(frame.rotation) ||
    frame.width <= 0 ||
    frame.height <= 0
  ) {
    throw new RangeError('Transform frame must contain finite values and positive dimensions');
  }
}

function assertNever(value: never): never {
  throw new Error(`Unsupported resize handle: ${String(value)}`);
}
