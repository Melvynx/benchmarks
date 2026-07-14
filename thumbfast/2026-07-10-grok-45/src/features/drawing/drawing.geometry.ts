import type {
  ArrowElement,
  DrawingElement,
  FreehandElement,
  ResizeHandle,
} from "./drawing.types";

export type Point = { x: number; y: number };
export type Bounds = { x: number; y: number; width: number; height: number };

const HANDLE_SIZE = 10;
const MIN_SIZE = 16;

export function getElementBounds(element: DrawingElement): Bounds {
  if (element.type === "arrow") {
    const [start, end] = element.points;
    const minX = Math.min(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxX = Math.max(start.x, end.x);
    const maxY = Math.max(start.y, end.y);
    return {
      x: minX,
      y: minY,
      width: Math.max(maxX - minX, 1),
      height: Math.max(maxY - minY, 1),
    };
  }

  if (element.type === "freehand") {
    const xs = element.points.map((point) => point.x);
    const ys = element.points.map((point) => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return {
      x: minX,
      y: minY,
      width: Math.max(maxX - minX, 1),
      height: Math.max(maxY - minY, 1),
    };
  }

  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };
}

export function getSelectionBounds(elements: DrawingElement[]): Bounds | null {
  if (elements.length === 0) return null;
  const bounds = elements.map(getElementBounds);
  const minX = Math.min(...bounds.map((bound) => bound.x));
  const minY = Math.min(...bounds.map((bound) => bound.y));
  const maxX = Math.max(...bounds.map((bound) => bound.x + bound.width));
  const maxY = Math.max(...bounds.map((bound) => bound.y + bound.height));
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function rotatePoint(point: Point, center: Point, degrees: number): Point {
  if (!degrees) return point;
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

function getElementCenter(element: DrawingElement): Point {
  const bounds = getElementBounds(element);
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

function pointInRotatedRect(
  point: Point,
  bounds: Bounds,
  rotation: number,
): boolean {
  const center = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
  const local = rotatePoint(point, center, -rotation);
  return (
    local.x >= bounds.x &&
    local.x <= bounds.x + bounds.width &&
    local.y >= bounds.y &&
    local.y <= bounds.y + bounds.height
  );
}

function distanceToSegment(point: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - a.x, point.y - a.y);
  }
  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)),
  );
  const projection = { x: a.x + t * dx, y: a.y + t * dy };
  return Math.hypot(point.x - projection.x, point.y - projection.y);
}

function hitTestArrow(point: Point, element: ArrowElement) {
  const [start, end] = element.points;
  return distanceToSegment(point, start, end) <= Math.max(element.strokeWidth, 8);
}

function hitTestFreehand(point: Point, element: FreehandElement) {
  for (let index = 1; index < element.points.length; index += 1) {
    if (
      distanceToSegment(
        point,
        element.points[index - 1],
        element.points[index],
      ) <= Math.max(element.strokeWidth, 8)
    ) {
      return true;
    }
  }
  return false;
}

export function hitTestElement(point: Point, element: DrawingElement): boolean {
  if (element.type === "arrow") return hitTestArrow(point, element);
  if (element.type === "freehand") return hitTestFreehand(point, element);
  return pointInRotatedRect(point, getElementBounds(element), element.rotation);
}

export function hitTestTopElement(
  point: Point,
  elements: DrawingElement[],
): DrawingElement | null {
  for (let index = elements.length - 1; index >= 0; index -= 1) {
    const element = elements[index];
    if (hitTestElement(point, element)) return element;
  }
  return null;
}

export function getResizeHandles(bounds: Bounds): Record<
  Exclude<ResizeHandle, "rotate">,
  Bounds
> {
  const half = HANDLE_SIZE / 2;
  const { x, y, width, height } = bounds;
  return {
    nw: { x: x - half, y: y - half, width: HANDLE_SIZE, height: HANDLE_SIZE },
    ne: {
      x: x + width - half,
      y: y - half,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
    },
    sw: {
      x: x - half,
      y: y + height - half,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
    },
    se: {
      x: x + width - half,
      y: y + height - half,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
    },
    n: {
      x: x + width / 2 - half,
      y: y - half,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
    },
    s: {
      x: x + width / 2 - half,
      y: y + height - half,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
    },
    e: {
      x: x + width - half,
      y: y + height / 2 - half,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
    },
    w: {
      x: x - half,
      y: y + height / 2 - half,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
    },
  };
}

export function getRotateHandle(bounds: Bounds): Bounds {
  const half = HANDLE_SIZE / 2;
  return {
    x: bounds.x + bounds.width / 2 - half,
    y: bounds.y - 28 - half,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
  };
}

export function hitTestHandle(
  point: Point,
  bounds: Bounds,
): ResizeHandle | null {
  const rotate = getRotateHandle(bounds);
  if (
    point.x >= rotate.x &&
    point.x <= rotate.x + rotate.width &&
    point.y >= rotate.y &&
    point.y <= rotate.y + rotate.height
  ) {
    return "rotate";
  }

  const handles = getResizeHandles(bounds);
  for (const [name, handle] of Object.entries(handles) as [
    Exclude<ResizeHandle, "rotate">,
    Bounds,
  ][]) {
    if (
      point.x >= handle.x &&
      point.x <= handle.x + handle.width &&
      point.y >= handle.y &&
      point.y <= handle.y + handle.height
    ) {
      return name;
    }
  }
  return null;
}

export function moveElement(
  element: DrawingElement,
  dx: number,
  dy: number,
): DrawingElement {
  if (element.type === "arrow") {
    return {
      ...element,
      x: element.x + dx,
      y: element.y + dy,
      points: [
        { x: element.points[0].x + dx, y: element.points[0].y + dy },
        { x: element.points[1].x + dx, y: element.points[1].y + dy },
      ],
    };
  }

  if (element.type === "freehand") {
    return {
      ...element,
      x: element.x + dx,
      y: element.y + dy,
      points: element.points.map((point) => ({
        x: point.x + dx,
        y: point.y + dy,
      })),
    };
  }

  return {
    ...element,
    x: element.x + dx,
    y: element.y + dy,
  };
}

function constrainAspect(
  width: number,
  height: number,
  aspect: number,
  anchor: "width" | "height",
) {
  if (anchor === "width") {
    return { width, height: Math.max(MIN_SIZE, width / aspect) };
  }
  return { width: Math.max(MIN_SIZE, height * aspect), height };
}

export function resizeElement(
  element: DrawingElement,
  handle: Exclude<ResizeHandle, "rotate">,
  pointer: Point,
  originBounds: Bounds,
  shiftKey: boolean,
): DrawingElement {
  if (element.type === "arrow") {
    const [start, end] = element.points;
    if (handle === "nw" || handle === "w" || handle === "sw" || handle === "n") {
      return {
        ...element,
        points: [{ x: pointer.x, y: pointer.y }, end],
        x: Math.min(pointer.x, end.x),
        y: Math.min(pointer.y, end.y),
        width: Math.max(Math.abs(end.x - pointer.x), 1),
        height: Math.max(Math.abs(end.y - pointer.y), 1),
      };
    }
    return {
      ...element,
      points: [start, { x: pointer.x, y: pointer.y }],
      x: Math.min(start.x, pointer.x),
      y: Math.min(start.y, pointer.y),
      width: Math.max(Math.abs(pointer.x - start.x), 1),
      height: Math.max(Math.abs(pointer.y - start.y), 1),
    };
  }

  let { x, y, width, height } = originBounds;
  const aspect = originBounds.width / Math.max(originBounds.height, 1);

  switch (handle) {
    case "se":
      width = Math.max(MIN_SIZE, pointer.x - x);
      height = Math.max(MIN_SIZE, pointer.y - y);
      break;
    case "sw":
      width = Math.max(MIN_SIZE, x + width - pointer.x);
      height = Math.max(MIN_SIZE, pointer.y - y);
      x = pointer.x;
      break;
    case "ne":
      width = Math.max(MIN_SIZE, pointer.x - x);
      height = Math.max(MIN_SIZE, y + height - pointer.y);
      y = pointer.y;
      break;
    case "nw":
      width = Math.max(MIN_SIZE, x + width - pointer.x);
      height = Math.max(MIN_SIZE, y + height - pointer.y);
      x = pointer.x;
      y = pointer.y;
      break;
    case "e":
      width = Math.max(MIN_SIZE, pointer.x - x);
      break;
    case "w":
      width = Math.max(MIN_SIZE, x + width - pointer.x);
      x = pointer.x;
      break;
    case "s":
      height = Math.max(MIN_SIZE, pointer.y - y);
      break;
    case "n":
      height = Math.max(MIN_SIZE, y + height - pointer.y);
      y = pointer.y;
      break;
  }

  if (shiftKey && (handle === "se" || handle === "sw" || handle === "ne" || handle === "nw")) {
    const constrained = constrainAspect(width, height, aspect, "width");
    width = constrained.width;
    height = constrained.height;
    if (handle === "nw" || handle === "sw") {
      x = originBounds.x + originBounds.width - width;
    }
    if (handle === "nw" || handle === "ne") {
      y = originBounds.y + originBounds.height - height;
    }
  }

  if (element.type === "freehand") {
    const scaleX = width / Math.max(originBounds.width, 1);
    const scaleY = height / Math.max(originBounds.height, 1);
    return {
      ...element,
      x,
      y,
      width,
      height,
      points: element.points.map((point) => ({
        x: x + (point.x - originBounds.x) * scaleX,
        y: y + (point.y - originBounds.y) * scaleY,
      })),
    };
  }

  if (element.type === "text") {
    const scale = height / Math.max(originBounds.height, 1);
    return {
      ...element,
      x,
      y,
      width,
      height,
      fontSize: Math.max(16, Math.round(element.fontSize * scale)),
    };
  }

  return {
    ...element,
    x,
    y,
    width,
    height,
  };
}

export function rotateElement(
  element: DrawingElement,
  pointer: Point,
): DrawingElement {
  const center = getElementCenter(element);
  const angle =
    (Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180) / Math.PI +
    90;
  return {
    ...element,
    rotation: Math.round(angle),
  };
}

export function normalizeDrawnBox(
  start: Point,
  end: Point,
  shiftKey: boolean,
): Bounds {
  let width = Math.abs(end.x - start.x);
  let height = Math.abs(end.y - start.y);
  if (shiftKey) {
    const size = Math.max(width, height);
    width = size;
    height = size;
  }
  return {
    x: end.x < start.x ? start.x - width : start.x,
    y: end.y < start.y ? start.y - height : start.y,
    width: Math.max(width, 1),
    height: Math.max(height, 1),
  };
}
