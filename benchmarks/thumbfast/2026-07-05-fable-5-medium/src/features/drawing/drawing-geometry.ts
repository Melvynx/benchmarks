import type { DrawingElement } from "./drawing.schema";
import { DRAWING_FONT_FAMILY, DRAWING_LINE_HEIGHT } from "./drawing.schema";

export type Point = { x: number; y: number };

export type Bounds = { x: number; y: number; width: number; height: number };

export const RESIZE_HANDLES = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
] as const;

export type ResizeHandle = (typeof RESIZE_HANDLES)[number];

const ARROW_HIT_THRESHOLD = 10;

/** Normalized bounds with positive width/height (arrows can have negative extents). */
export function getElementBounds(element: DrawingElement): Bounds {
  const x = element.width < 0 ? element.x + element.width : element.x;
  const y = element.height < 0 ? element.y + element.height : element.y;
  return {
    x,
    y,
    width: Math.abs(element.width),
    height: Math.abs(element.height),
  };
}

export function getBoundsCenter(bounds: Bounds): Point {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

export function getElementCenter(element: DrawingElement): Point {
  return getBoundsCenter(getElementBounds(element));
}

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

function distanceToSegment(point: Point, a: Point, b: Point) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSquared = abx * abx + aby * aby;
  if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - a.x) * abx + (point.y - a.y) * aby) / lengthSquared,
    ),
  );
  return Math.hypot(point.x - (a.x + t * abx), point.y - (a.y + t * aby));
}

export function hitTestElement(element: DrawingElement, point: Point): boolean {
  const bounds = getElementBounds(element);
  const center = getBoundsCenter(bounds);
  const local = rotatePoint(point, center, -element.angle);

  if (element.type === "arrow") {
    const start = { x: element.x, y: element.y };
    const end = {
      x: element.x + element.width,
      y: element.y + element.height,
    };
    return distanceToSegment(local, start, end) <= ARROW_HIT_THRESHOLD;
  }

  const pad = Math.max(element.strokeWidth, 4);
  return (
    local.x >= bounds.x - pad &&
    local.x <= bounds.x + bounds.width + pad &&
    local.y >= bounds.y - pad &&
    local.y <= bounds.y + bounds.height + pad
  );
}

export function boundsIntersect(a: Bounds, b: Bounds) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function getHandlePosition(bounds: Bounds, handle: ResizeHandle): Point {
  const { x, y, width, height } = bounds;
  const positions: Record<ResizeHandle, Point> = {
    nw: { x, y },
    n: { x: x + width / 2, y },
    ne: { x: x + width, y },
    e: { x: x + width, y: y + height / 2 },
    se: { x: x + width, y: y + height },
    s: { x: x + width / 2, y: y + height },
    sw: { x, y: y + height },
    w: { x, y: y + height / 2 },
  };
  return positions[handle];
}

const MIN_SIZE = 8;

/**
 * Resize bounds by dragging a handle. `local` is the pointer position in the
 * element's un-rotated frame. Shift preserves the original aspect ratio.
 */
export function resizeBounds(
  origin: Bounds,
  handle: ResizeHandle,
  local: Point,
  keepAspect: boolean,
): Bounds {
  let { x, y } = origin;
  let right = origin.x + origin.width;
  let bottom = origin.y + origin.height;

  if (handle.includes("w")) x = Math.min(local.x, right - MIN_SIZE);
  if (handle.includes("e")) right = Math.max(local.x, x + MIN_SIZE);
  if (handle.includes("n")) y = Math.min(local.y, bottom - MIN_SIZE);
  if (handle.includes("s")) bottom = Math.max(local.y, y + MIN_SIZE);

  let width = right - x;
  let height = bottom - y;

  if (keepAspect && origin.width > 0 && origin.height > 0) {
    const ratio = origin.width / origin.height;
    const isCorner = handle.length === 2;
    if (isCorner) {
      if (width / height > ratio) height = width / ratio;
      else width = height * ratio;
    } else if (handle === "n" || handle === "s") {
      width = height * ratio;
    } else {
      height = width / ratio;
    }
    if (handle.includes("w")) x = right - width;
    if (handle.includes("n")) y = bottom - height;
  }

  return { x, y, width, height };
}

let measureContext: CanvasRenderingContext2D | null = null;

function getMeasureContext() {
  measureContext ??= document.createElement("canvas").getContext("2d");
  return measureContext;
}

export function measureDrawingText(text: string, fontSize: number) {
  const lines = text.split("\n");
  const context = getMeasureContext();
  let width = fontSize;
  if (context) {
    context.font = `700 ${fontSize}px ${DRAWING_FONT_FAMILY}`;
    width = Math.max(
      fontSize / 2,
      ...lines.map((line) => context.measureText(line || " ").width),
    );
  }
  return {
    width: Math.ceil(width),
    height: Math.ceil(lines.length * fontSize * DRAWING_LINE_HEIGHT),
  };
}
