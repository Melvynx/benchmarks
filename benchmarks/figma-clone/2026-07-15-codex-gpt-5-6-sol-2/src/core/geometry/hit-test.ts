import { applyMatrixToPoint, matrixScaleFactors, tryInvertMatrix } from './matrix2d';
import type { Matrix2D } from './matrix2d';
import { expandRect, insetRect, normalizeRect, rectContainsPoint } from './rect';
import type { Rect } from './rect';
import { distanceSquaredVec2, GEOMETRY_EPSILON } from './vec2';
import type { Vec2 } from './vec2';

export interface CornerRadii {
  readonly topLeft: number;
  readonly topRight: number;
  readonly bottomRight: number;
  readonly bottomLeft: number;
}

export interface RectHitShape {
  readonly kind: 'rect';
  readonly rect: Rect;
  readonly cornerRadii?: number | CornerRadii;
}

export interface EllipseHitShape {
  readonly kind: 'ellipse';
  readonly rect: Rect;
}

export interface LineHitShape {
  readonly kind: 'line';
  readonly start: Vec2;
  readonly end: Vec2;
  readonly strokeWidth: number;
}

export interface PolygonHitShape {
  readonly kind: 'polygon';
  readonly points: readonly Vec2[];
}

export type HitShape = RectHitShape | EllipseHitShape | LineHitShape | PolygonHitShape;

export interface HitTestOptions {
  /** Filled interiors participate by default for closed shapes. */
  readonly fill?: boolean;
  /** Local-space stroke width. Line shapes use their own width when omitted. */
  readonly strokeWidth?: number;
  /** Extra local-space hit slop around the visible geometry. */
  readonly tolerance?: number;
}

export function uniformCornerRadii(radius: number): CornerRadii {
  return { topLeft: radius, topRight: radius, bottomRight: radius, bottomLeft: radius };
}

/** Applies the CSS corner scaling rule so adjacent radii never overlap. */
export function normalizeCornerRadii(radii: number | CornerRadii, rect: Rect): CornerRadii {
  const normalized = normalizeRect(rect);
  const source = typeof radii === 'number' ? uniformCornerRadii(radii) : radii;
  const clamped: CornerRadii = {
    topLeft: Math.max(0, source.topLeft),
    topRight: Math.max(0, source.topRight),
    bottomRight: Math.max(0, source.bottomRight),
    bottomLeft: Math.max(0, source.bottomLeft),
  };

  const ratios = [
    ratioOrOne(normalized.width, clamped.topLeft + clamped.topRight),
    ratioOrOne(normalized.width, clamped.bottomLeft + clamped.bottomRight),
    ratioOrOne(normalized.height, clamped.topLeft + clamped.bottomLeft),
    ratioOrOne(normalized.height, clamped.topRight + clamped.bottomRight),
  ];
  const scale = Math.min(1, ...ratios);

  return {
    topLeft: clamped.topLeft * scale,
    topRight: clamped.topRight * scale,
    bottomRight: clamped.bottomRight * scale,
    bottomLeft: clamped.bottomLeft * scale,
  };
}

export function pointInRoundedRect(
  point: Vec2,
  rect: Rect,
  radii: number | CornerRadii = 0,
  tolerance = 0,
): boolean {
  const normalized = normalizeRect(rect);
  const expanded = tolerance === 0 ? normalized : expandRect(normalized, tolerance);
  const corners = normalizeCornerRadii(addToCornerRadii(radii, tolerance), expanded);

  if (!rectContainsPoint(expanded, point)) return false;

  const left = expanded.x;
  const top = expanded.y;
  const right = left + expanded.width;
  const bottom = top + expanded.height;

  if (corners.topLeft > 0 && point.x < left + corners.topLeft && point.y < top + corners.topLeft) {
    return pointInCircle(
      point,
      { x: left + corners.topLeft, y: top + corners.topLeft },
      corners.topLeft,
    );
  }
  if (
    corners.topRight > 0 &&
    point.x > right - corners.topRight &&
    point.y < top + corners.topRight
  ) {
    return pointInCircle(
      point,
      { x: right - corners.topRight, y: top + corners.topRight },
      corners.topRight,
    );
  }
  if (
    corners.bottomRight > 0 &&
    point.x > right - corners.bottomRight &&
    point.y > bottom - corners.bottomRight
  ) {
    return pointInCircle(
      point,
      { x: right - corners.bottomRight, y: bottom - corners.bottomRight },
      corners.bottomRight,
    );
  }
  if (
    corners.bottomLeft > 0 &&
    point.x < left + corners.bottomLeft &&
    point.y > bottom - corners.bottomLeft
  ) {
    return pointInCircle(
      point,
      { x: left + corners.bottomLeft, y: bottom - corners.bottomLeft },
      corners.bottomLeft,
    );
  }

  return true;
}

export function pointInEllipse(point: Vec2, rect: Rect, tolerance = 0): boolean {
  const normalized = normalizeRect(rect);
  const radiusX = normalized.width / 2 + tolerance;
  const radiusY = normalized.height / 2 + tolerance;
  if (radiusX <= 0 || radiusY <= 0) return false;

  const centerX = normalized.x + normalized.width / 2;
  const centerY = normalized.y + normalized.height / 2;
  const normalizedX = (point.x - centerX) / radiusX;
  const normalizedY = (point.y - centerY) / radiusY;
  return normalizedX * normalizedX + normalizedY * normalizedY <= 1 + GEOMETRY_EPSILON;
}

export function distancePointToSegment(point: Vec2, start: Vec2, end: Vec2): number {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (lengthSquared <= GEOMETRY_EPSILON) return Math.sqrt(distanceSquaredVec2(point, start));

  const projection = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared),
  );
  const nearest = { x: start.x + segmentX * projection, y: start.y + segmentY * projection };
  return Math.sqrt(distanceSquaredVec2(point, nearest));
}

export function pointOnLine(point: Vec2, start: Vec2, end: Vec2, tolerance: number): boolean {
  return distancePointToSegment(point, start, end) <= tolerance;
}

export function pointInPolygon(
  point: Vec2,
  points: readonly Vec2[],
  edgeTolerance = GEOMETRY_EPSILON,
): boolean {
  if (points.length < 3) return false;
  if (pointNearPolygonEdge(point, points, edgeTolerance)) return true;

  let inside = false;
  for (
    let currentIndex = 0, previousIndex = points.length - 1;
    currentIndex < points.length;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const current = points[currentIndex];
    const previous = points[previousIndex];
    if (current === undefined || previous === undefined) continue;

    const crossesRay =
      current.y > point.y !== previous.y > point.y &&
      point.x <
        ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;
    if (crossesRay) inside = !inside;
  }
  return inside;
}

export function hitTestShape(point: Vec2, shape: HitShape, options: HitTestOptions = {}): boolean {
  const tolerance = Math.max(0, options.tolerance ?? 0);
  const includeFill = options.fill ?? shape.kind !== 'line';
  const strokeWidth = Math.max(
    0,
    options.strokeWidth ?? (shape.kind === 'line' ? shape.strokeWidth : 0),
  );

  switch (shape.kind) {
    case 'rect':
      return hitTestRect(point, shape, includeFill, strokeWidth, tolerance);
    case 'ellipse':
      return hitTestEllipse(point, shape.rect, includeFill, strokeWidth, tolerance);
    case 'line':
      return pointOnLine(point, shape.start, shape.end, strokeWidth / 2 + tolerance);
    case 'polygon':
      return hitTestPolygon(point, shape.points, includeFill, strokeWidth, tolerance);
    default:
      return assertNever(shape);
  }
}

/**
 * Converts a world point to shape-local coordinates before exact testing.
 * Hit tolerance is specified in world units and conservatively converted through scale.
 */
export function hitTestTransformedShape(
  worldPoint: Vec2,
  shape: HitShape,
  worldMatrix: Matrix2D,
  options: HitTestOptions = {},
): boolean {
  const inverse = tryInvertMatrix(worldMatrix);
  if (inverse === null) return false;

  const inverseScales = matrixScaleFactors(inverse);
  const localTolerance = (options.tolerance ?? 0) * Math.max(inverseScales.x, inverseScales.y);
  return hitTestShape(applyMatrixToPoint(inverse, worldPoint), shape, {
    ...options,
    tolerance: localTolerance,
  });
}

function hitTestRect(
  point: Vec2,
  shape: RectHitShape,
  includeFill: boolean,
  strokeWidth: number,
  tolerance: number,
): boolean {
  const radii = shape.cornerRadii ?? 0;
  if (includeFill && pointInRoundedRect(point, shape.rect, radii, tolerance)) return true;
  if (strokeWidth <= 0 && tolerance <= 0) return false;

  const boundarySlop = strokeWidth / 2 + tolerance;
  if (!pointInRoundedRect(point, shape.rect, radii, boundarySlop)) return false;

  const normalized = normalizeRect(shape.rect);
  const inner = insetRect(normalized, boundarySlop);
  if (inner.width <= 0 || inner.height <= 0) return true;
  return !pointInRoundedRect(point, inner, subtractFromCornerRadii(radii, boundarySlop));
}

function hitTestEllipse(
  point: Vec2,
  rect: Rect,
  includeFill: boolean,
  strokeWidth: number,
  tolerance: number,
): boolean {
  if (includeFill && pointInEllipse(point, rect, tolerance)) return true;
  const boundarySlop = strokeWidth / 2 + tolerance;
  if (boundarySlop <= 0 || !pointInEllipse(point, rect, boundarySlop)) return false;

  const inner = insetRect(normalizeRect(rect), boundarySlop);
  return inner.width <= 0 || inner.height <= 0 || !pointInEllipse(point, inner);
}

function hitTestPolygon(
  point: Vec2,
  points: readonly Vec2[],
  includeFill: boolean,
  strokeWidth: number,
  tolerance: number,
): boolean {
  if (includeFill && pointInPolygon(point, points, tolerance)) return true;
  return pointNearPolygonEdge(point, points, strokeWidth / 2 + tolerance);
}

function pointNearPolygonEdge(point: Vec2, points: readonly Vec2[], tolerance: number): boolean {
  if (points.length < 2) return false;
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    if (start !== undefined && end !== undefined && pointOnLine(point, start, end, tolerance))
      return true;
  }
  return false;
}

function pointInCircle(point: Vec2, center: Vec2, radius: number): boolean {
  return distanceSquaredVec2(point, center) <= radius * radius + GEOMETRY_EPSILON;
}

function addToCornerRadii(radii: number | CornerRadii, amount: number): CornerRadii {
  const source = typeof radii === 'number' ? uniformCornerRadii(radii) : radii;
  return {
    topLeft: Math.max(0, source.topLeft + amount),
    topRight: Math.max(0, source.topRight + amount),
    bottomRight: Math.max(0, source.bottomRight + amount),
    bottomLeft: Math.max(0, source.bottomLeft + amount),
  };
}

function subtractFromCornerRadii(radii: number | CornerRadii, amount: number): CornerRadii {
  return addToCornerRadii(radii, -amount);
}

function ratioOrOne(numerator: number, denominator: number): number {
  return denominator <= GEOMETRY_EPSILON ? 1 : numerator / denominator;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported hit shape: ${JSON.stringify(value)}`);
}
