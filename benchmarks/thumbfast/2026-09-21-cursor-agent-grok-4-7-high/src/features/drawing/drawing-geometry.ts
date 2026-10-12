import type { DrawingObject, Point } from "./drawing.schema";

export type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

export type Handle =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "rotate";

const RESIZE_HANDLES: Exclude<Handle, "rotate">[] = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
];

const HANDLE_EDGES: Record<
  Exclude<Handle, "rotate">,
  { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean }
> = {
  nw: { left: true, top: true },
  n: { top: true },
  ne: { right: true, top: true },
  e: { right: true },
  se: { right: true, bottom: true },
  s: { bottom: true },
  sw: { left: true, bottom: true },
  w: { left: true },
};

export function centerOf(box: Box): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export function rotatePoint(point: Point, origin: Point, degrees: number): Point {
  const rad = (degrees * Math.PI) / 180;
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  return {
    x: origin.x + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: origin.y + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

export function toLocal(point: Point, box: Box): Point {
  return rotatePoint(point, centerOf(box), -box.rotation);
}

export function handlePoint(box: Box, handle: Handle): Point {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const local =
    handle === "rotate"
      ? { x: cx, y: box.y - 36 }
      : localHandle(box, handle);
  return rotatePoint(local, centerOf(box), box.rotation);
}

export function hitTest(
  objects: DrawingObject[],
  point: Point,
): DrawingObject | null {
  for (let index = objects.length - 1; index >= 0; index -= 1) {
    const object = objects[index];
    if (object && hitTestObject(object, point)) return object;
  }
  return null;
}

export function hitTestObject(object: DrawingObject, point: Point) {
  const local = toLocal(point, object);
  if (object.type === "arrow") {
    const y = object.y + object.height / 2;
    const distance = distanceToSegment(
      local,
      { x: object.x, y },
      { x: object.x + object.width, y },
    );
    return distance <= Math.max(14, object.strokeWidth + 8);
  }

  if (object.type === "pencil") {
    const absolute = object.points.map((pencilPoint) => ({
      x: object.x + pencilPoint.x * object.width,
      y: object.y + pencilPoint.y * object.height,
    }));
    for (let index = 1; index < absolute.length; index += 1) {
      const previous = absolute[index - 1];
      const current = absolute[index];
      if (!previous || !current) continue;
      if (
        distanceToSegment(local, previous, current) <=
        Math.max(12, object.strokeWidth + 6)
      ) {
        return true;
      }
    }
    return false;
  }

  return (
    local.x >= object.x - 4 &&
    local.x <= object.x + object.width + 4 &&
    local.y >= object.y - 4 &&
    local.y <= object.y + object.height + 4
  );
}

export function hitTestHandle(
  object: DrawingObject,
  point: Point,
  radius: number,
): Handle | null {
  const handles: Handle[] = [...RESIZE_HANDLES, "rotate"];
  for (const handle of handles) {
    const target = handlePoint(object, handle);
    if (Math.hypot(point.x - target.x, point.y - target.y) <= radius) {
      return handle;
    }
  }
  return null;
}

export function boxFromPoints(start: Point, end: Point, lockAspect: boolean) {
  let dx = end.x - start.x;
  let dy = end.y - start.y;
  if (lockAspect) {
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    dx = Math.sign(dx || 1) * size;
    dy = Math.sign(dy || 1) * size;
  }
  return {
    x: dx < 0 ? start.x + dx : start.x,
    y: dy < 0 ? start.y + dy : start.y,
    width: Math.abs(dx),
    height: Math.abs(dy),
    rotation: 0,
  };
}

export function arrowBoxFromPoints(start: Point, end: Point, lockAngle: boolean) {
  let dx = end.x - start.x;
  let dy = end.y - start.y;
  if (lockAngle) {
    const snapped = snapTo45(dx, dy);
    dx = snapped.x;
    dy = snapped.y;
  }
  const length = Math.max(12, Math.hypot(dx, dy));
  const rotation = (Math.atan2(dy, dx) * 180) / Math.PI;
  const cx = start.x + dx / 2;
  const cy = start.y + dy / 2;
  const height = 36;
  return {
    x: cx - length / 2,
    y: cy - height / 2,
    width: length,
    height,
    rotation,
  };
}

export function resizeObject(
  snapshot: DrawingObject,
  handle: Exclude<Handle, "rotate">,
  worldPoint: Point,
  lockAspect: boolean,
): DrawingObject {
  const local = toLocal(worldPoint, snapshot);
  const edges = HANDLE_EDGES[handle];
  let left = snapshot.x;
  let right = snapshot.x + snapshot.width;
  let top = snapshot.y;
  let bottom = snapshot.y + snapshot.height;

  if (edges.left) left = local.x;
  if (edges.right) right = local.x;
  if (edges.top) top = local.y;
  if (edges.bottom) bottom = local.y;

  if (lockAspect && snapshot.height > 0) {
    const ratio = snapshot.width / snapshot.height;
    const horizontal = Boolean(edges.left || edges.right);
    const vertical = Boolean(edges.top || edges.bottom);
    if (horizontal && vertical) {
      const width = right - left;
      const height = Math.sign(bottom - top || 1) * (Math.abs(width) / ratio);
      if (edges.top && !edges.bottom) top = bottom - height;
      else bottom = top + height;
    } else if (horizontal) {
      const width = right - left;
      const height = width / ratio;
      const cy = snapshot.y + snapshot.height / 2;
      top = cy - height / 2;
      bottom = cy + height / 2;
    } else if (vertical) {
      const height = bottom - top;
      const width = height * ratio;
      const cx = snapshot.x + snapshot.width / 2;
      left = cx - width / 2;
      right = cx + width / 2;
    }
  }

  if (left > right) [left, right] = [right, left];
  if (top > bottom) [top, bottom] = [bottom, top];

  const minSize = snapshot.type === "text" ? 24 : 8;
  if (right - left < minSize) {
    if (edges.left && !edges.right) left = right - minSize;
    else right = left + minSize;
  }
  if (bottom - top < minSize) {
    if (edges.top && !edges.bottom) top = bottom - minSize;
    else bottom = top + minSize;
  }

  const width = right - left;
  const height = bottom - top;
  const next = {
    ...snapshot,
    x: left,
    y: top,
    width,
    height,
  };

  if (snapshot.type === "text" && next.type === "text") {
    const scale = snapshot.width > 0 ? width / snapshot.width : 1;
    return {
      ...next,
      fontSize: clamp(snapshot.fontSize * scale, 16, 280),
    };
  }

  return next;
}

export function rotateObject(
  snapshot: DrawingObject,
  worldPoint: Point,
  startPoint: Point,
  lockAngle: boolean,
) {
  const origin = centerOf(snapshot);
  const start = Math.atan2(startPoint.y - origin.y, startPoint.x - origin.x);
  const current = Math.atan2(worldPoint.y - origin.y, worldPoint.x - origin.x);
  let rotation = snapshot.rotation + ((current - start) * 180) / Math.PI;
  if (lockAngle) rotation = Math.round(rotation / 15) * 15;
  rotation = ((rotation % 360) + 360) % 360;
  return { ...snapshot, rotation };
}

export function translateObject(object: DrawingObject, dx: number, dy: number) {
  return { ...object, x: object.x + dx, y: object.y + dy };
}

export function pencilFromPoints(
  id: string,
  points: Point[],
  stroke: string,
  strokeWidth: number,
): DrawingObject | null {
  if (points.length === 0) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const pad = Math.max(4, strokeWidth);
  const x = minX - pad;
  const y = minY - pad;
  const width = Math.max(8, maxX - minX + pad * 2);
  const height = Math.max(8, maxY - minY + pad * 2);
  return {
    id,
    type: "pencil",
    x,
    y,
    width,
    height,
    rotation: 0,
    stroke,
    strokeWidth,
    points: points.map((point) => ({
      x: (point.x - x) / width,
      y: (point.y - y) / height,
    })),
  };
}

export function clampPoint(point: Point, width: number, height: number): Point {
  return {
    x: clamp(point.x, 0, width),
    y: clamp(point.y, 0, height),
  };
}

function localHandle(box: Box, handle: Exclude<Handle, "rotate">): Point {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  switch (handle) {
    case "nw":
      return { x: box.x, y: box.y };
    case "n":
      return { x: cx, y: box.y };
    case "ne":
      return { x: box.x + box.width, y: box.y };
    case "e":
      return { x: box.x + box.width, y: cy };
    case "se":
      return { x: box.x + box.width, y: box.y + box.height };
    case "s":
      return { x: cx, y: box.y + box.height };
    case "sw":
      return { x: box.x, y: box.y + box.height };
    case "w":
      return { x: box.x, y: cy };
  }
}

function snapTo45(dx: number, dy: number): Point {
  const length = Math.hypot(dx, dy);
  if (length === 0) return { x: 0, y: 0 };
  const angle = Math.atan2(dy, dx);
  const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  return { x: Math.cos(snapped) * length, y: Math.sin(snapped) * length };
}

function distanceToSegment(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = clamp(
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
    0,
    1,
  );
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
