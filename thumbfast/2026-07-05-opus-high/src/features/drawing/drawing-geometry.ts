// Pure geometry helpers for the drawing editor: bounding boxes, hit testing,
// and rotation-aware resize. All coordinates are in stage space.

import {
  MIN_ELEMENT_SIZE,
  isLinearElement,
  type ArrowElement,
  type DrawingElement,
  type Point,
} from "./drawing-document";

export type Bounds = { x: number; y: number; width: number; height: number };

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export const RESIZE_HANDLES: ResizeHandle[] = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
];

export function rotatePoint(point: Point, center: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/** Axis-aligned, rotation-agnostic bounds (the element's local box). */
export function getElementBounds(element: DrawingElement): Bounds {
  if (isLinearElement(element)) {
    const minX = Math.min(element.start.x, element.end.x);
    const minY = Math.min(element.start.y, element.end.y);
    return {
      x: minX,
      y: minY,
      width: Math.abs(element.end.x - element.start.x),
      height: Math.abs(element.end.y - element.start.y),
    };
  }
  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };
}

export function getElementCenter(element: DrawingElement): Point {
  const bounds = getElementBounds(element);
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

export function getElementRotation(element: DrawingElement): number {
  return isLinearElement(element) ? 0 : element.rotation;
}

/** The four corners of the (possibly rotated) box, in stage coordinates. */
export function getRotatedCorners(element: DrawingElement): Point[] {
  const bounds = getElementBounds(element);
  const center = getElementCenter(element);
  const rotation = getElementRotation(element);
  const corners: Point[] = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
  ];
  return corners.map((corner) => rotatePoint(corner, center, rotation));
}

function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

/**
 * Whether a stage-space point hits the element. Box elements hit anywhere
 * inside their (rotated) bounding box + padding; arrows hit near the segment.
 */
export function hitTestElement(
  element: DrawingElement,
  point: Point,
  padding = 6,
): boolean {
  if (isLinearElement(element)) {
    return (
      distanceToSegment(point, element.start, element.end) <=
      Math.max(padding, element.strokeWidth + 6)
    );
  }
  const center = getElementCenter(element);
  const local = rotatePoint(point, center, -element.rotation);
  return (
    local.x >= element.x - padding &&
    local.x <= element.x + element.width + padding &&
    local.y >= element.y - padding &&
    local.y <= element.y + element.height + padding
  );
}

/** Bounds that contain every element in the list (axis-aligned, rotated). */
export function getSelectionBounds(elements: DrawingElement[]): Bounds | null {
  if (elements.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const element of elements) {
    const corners = isLinearElement(element)
      ? [element.start, element.end]
      : getRotatedCorners(element);
    for (const corner of corners) {
      minX = Math.min(minX, corner.x);
      minY = Math.min(minY, corner.y);
      maxX = Math.max(maxX, corner.x);
      maxY = Math.max(maxY, corner.y);
    }
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Whether an element's bounds intersect a rectangular marquee. */
export function intersectsRect(element: DrawingElement, rect: Bounds): boolean {
  const corners = isLinearElement(element)
    ? [element.start, element.end]
    : getRotatedCorners(element);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const corner of corners) {
    minX = Math.min(minX, corner.x);
    minY = Math.min(minY, corner.y);
    maxX = Math.max(maxX, corner.x);
    maxY = Math.max(maxY, corner.y);
  }
  return (
    minX <= rect.x + rect.width &&
    maxX >= rect.x &&
    minY <= rect.y + rect.height &&
    maxY >= rect.y
  );
}

/** Which local edges a handle moves. */
const HANDLE_EDGES: Record<
  ResizeHandle,
  { left: boolean; right: boolean; top: boolean; bottom: boolean }
> = {
  nw: { left: true, right: false, top: true, bottom: false },
  n: { left: false, right: false, top: true, bottom: false },
  ne: { left: false, right: true, top: true, bottom: false },
  e: { left: false, right: true, top: false, bottom: false },
  se: { left: false, right: true, top: false, bottom: true },
  s: { left: false, right: false, top: false, bottom: true },
  sw: { left: true, right: false, top: false, bottom: true },
  w: { left: true, right: false, top: false, bottom: false },
};

/**
 * Resize a box element by dragging `handle` to stage-space `pointer`, keeping
 * the opposite edge/corner fixed in world space even when rotated.
 * `keepRatio` locks the aspect ratio (Shift on corner handles).
 */
export function resizeBox(
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  },
  handle: ResizeHandle,
  pointer: Point,
  keepRatio: boolean,
): { x: number; y: number; width: number; height: number } {
  const center = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
  // Pointer in the element's local (unrotated) frame.
  const local = rotatePoint(pointer, center, -box.rotation);

  const edges = HANDLE_EDGES[handle];
  let left = box.x;
  let right = box.x + box.width;
  let top = box.y;
  let bottom = box.y + box.height;

  if (edges.left) left = Math.min(local.x, right - MIN_ELEMENT_SIZE);
  if (edges.right) right = Math.max(local.x, left + MIN_ELEMENT_SIZE);
  if (edges.top) top = Math.min(local.y, bottom - MIN_ELEMENT_SIZE);
  if (edges.bottom) bottom = Math.max(local.y, top + MIN_ELEMENT_SIZE);

  let width = right - left;
  let height = bottom - top;

  if (keepRatio && edges.left !== edges.right && edges.top !== edges.bottom) {
    const ratio = box.width / box.height || 1;
    // Scale height to match width along the dominant axis.
    if (width / height > ratio) {
      height = width / ratio;
    } else {
      width = height * ratio;
    }
    if (edges.left) left = right - width;
    else right = left + width;
    if (edges.top) top = bottom - height;
    else bottom = top + height;
  }

  // Recompute the world center from the new box midpoint in the OLD local
  // frame, so the fixed (non-moving) edges stay put in world space.
  const newLocalCenter = {
    x: (left + right) / 2,
    y: (top + bottom) / 2,
  };
  const worldCenter = rotatePoint(newLocalCenter, center, box.rotation);

  return {
    x: worldCenter.x - width / 2,
    y: worldCenter.y - height / 2,
    width,
    height,
  };
}

/** Rotation (radians) so the top-center handle points toward `pointer`. */
export function rotationForPointer(
  center: Point,
  pointer: Point,
  snap: boolean,
): number {
  let angle =
    Math.atan2(pointer.y - center.y, pointer.x - center.x) + Math.PI / 2;
  if (snap) {
    const step = Math.PI / 12; // 15 degrees
    angle = Math.round(angle / step) * step;
  }
  // Normalize to [-PI, PI].
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

/** Translate any element by (dx, dy). */
export function translateElement(
  element: DrawingElement,
  dx: number,
  dy: number,
): DrawingElement {
  if (isLinearElement(element)) {
    return {
      ...element,
      start: { x: element.start.x + dx, y: element.start.y + dy },
      end: { x: element.end.x + dx, y: element.end.y + dy },
    };
  }
  return { ...element, x: element.x + dx, y: element.y + dy };
}

/** Constrain an arrow endpoint to the nearest 15° so lines stay tidy. */
export function constrainArrowEnd(start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  const step = Math.PI / 12;
  const angle = Math.round(Math.atan2(dy, dx) / step) * step;
  return {
    x: start.x + Math.cos(angle) * length,
    y: start.y + Math.sin(angle) * length,
  };
}

export function updateArrowEndpoint(
  arrow: ArrowElement,
  which: "start" | "end",
  point: Point,
): ArrowElement {
  return { ...arrow, [which]: point };
}
