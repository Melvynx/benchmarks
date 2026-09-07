import { nanoid } from "nanoid";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DRAWING_VERSION,
  DrawingDocumentSchema,
  type ArrowElement,
  type Bounds,
  type DrawingDocument,
  type DrawingElement,
  type HandleId,
  type ImageElement,
  type PencilElement,
  type PersonElement,
  type Point,
  type RectElement,
  type TextElement,
} from "./drawing.schema";

export const MIN_SIZE = 16;
export const HANDLE_HIT_SIZE = 14;
export const ROTATION_HANDLE_OFFSET = 28;

const DEFAULT_STROKE = "#1a1a1a";
const DEFAULT_FILL = "transparent";

export function createElementId() {
  return `el_${nanoid(10)}`;
}

export function createEmptyDocument(): DrawingDocument {
  return {
    version: DRAWING_VERSION,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    background: "#fafafa",
    elements: [],
  };
}

export function serializeDrawingDocument(document: DrawingDocument): string {
  return JSON.stringify(document);
}

export function parseDrawingDocument(raw: unknown): DrawingDocument {
  if (typeof raw === "string") {
    return DrawingDocumentSchema.parse(JSON.parse(raw));
  }
  return DrawingDocumentSchema.parse(raw);
}

export function tryParseDrawingDocument(raw: unknown): DrawingDocument | null {
  try {
    return parseDrawingDocument(raw);
  } catch {
    return null;
  }
}

export function cloneDocument(document: DrawingDocument): DrawingDocument {
  return structuredClone(document);
}

export function getElementCenter(element: DrawingElement): Point {
  return {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  };
}

export function rotatePoint(point: Point, origin: Point, angleDeg: number): Point {
  if (!angleDeg) return point;
  const angle = (angleDeg * Math.PI) / 180;
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  return {
    x: origin.x + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: origin.y + dx * Math.sin(angle) + dy * Math.cos(angle),
  };
}

export function unrotatePoint(
  point: Point,
  origin: Point,
  angleDeg: number,
): Point {
  return rotatePoint(point, origin, -angleDeg);
}

export function getElementBounds(element: DrawingElement): Bounds {
  if (element.type === "pencil") {
    return getPencilBounds(element);
  }
  if (element.type === "arrow") {
    return {
      x: Math.min(element.x, element.x + element.width),
      y: Math.min(element.y, element.y + element.height),
      width: Math.max(1, Math.abs(element.width)),
      height: Math.max(1, Math.abs(element.height)),
    };
  }
  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };
}

function getPencilBounds(element: PencilElement): Bounds {
  if (element.points.length === 0) {
    return { x: element.x, y: element.y, width: element.width, height: element.height };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of element.points) {
    minX = Math.min(minX, element.x + point.x);
    minY = Math.min(minY, element.y + point.y);
    maxX = Math.max(maxX, element.x + point.x);
    maxY = Math.max(maxY, element.y + point.y);
  }
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceToSegment(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return distance(point, start);
  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq),
  );
  return distance(point, { x: start.x + t * dx, y: start.y + t * dy });
}

export function hitTestElement(element: DrawingElement, point: Point): boolean {
  const center = getElementCenter(element);
  const local = unrotatePoint(point, center, element.rotation);

  if (element.type === "arrow") {
    const start = { x: element.x, y: element.y };
    const end = { x: element.x + element.width, y: element.y + element.height };
    return distanceToSegment(local, start, end) <= Math.max(8, element.strokeWidth + 6);
  }

  if (element.type === "pencil") {
    const points = element.points.map((item) => ({
      x: element.x + item.x,
      y: element.y + item.y,
    }));
    for (let index = 1; index < points.length; index += 1) {
      if (distanceToSegment(local, points[index - 1], points[index]) <= 8) {
        return true;
      }
    }
    return false;
  }

  const pad = 4;
  return (
    local.x >= element.x - pad &&
    local.x <= element.x + element.width + pad &&
    local.y >= element.y - pad &&
    local.y <= element.y + element.height + pad
  );
}

export function hitTestTopElement(
  elements: DrawingElement[],
  point: Point,
): DrawingElement | null {
  for (let index = elements.length - 1; index >= 0; index -= 1) {
    const element = elements[index];
    if (hitTestElement(element, point)) return element;
  }
  return null;
}

export function getHandlePositions(element: DrawingElement): Record<HandleId, Point> {
  const { x, y, width, height } = getElementBounds(element);
  const center = getElementCenter(element);
  const local: Record<HandleId, Point> = {
    nw: { x, y },
    n: { x: x + width / 2, y },
    ne: { x: x + width, y },
    e: { x: x + width, y: y + height / 2 },
    se: { x: x + width, y: y + height },
    s: { x: x + width / 2, y: y + height },
    sw: { x, y: y + height },
    w: { x, y: y + height / 2 },
    rotate: { x: x + width / 2, y: y - ROTATION_HANDLE_OFFSET },
  };

  if (!element.rotation) return local;

  return Object.fromEntries(
    Object.entries(local).map(([key, value]) => [
      key,
      rotatePoint(value, center, element.rotation),
    ]),
  ) as Record<HandleId, Point>;
}

export function hitTestHandle(
  element: DrawingElement,
  point: Point,
): HandleId | null {
  const handles = getHandlePositions(element);
  let closest: HandleId | null = null;
  let closestDistance = HANDLE_HIT_SIZE;
  for (const [id, position] of Object.entries(handles) as [HandleId, Point][]) {
    const current = distance(point, position);
    if (current <= closestDistance) {
      closest = id;
      closestDistance = current;
    }
  }
  return closest;
}

export function moveElements(
  elements: DrawingElement[],
  ids: Set<string>,
  delta: Point,
): DrawingElement[] {
  return elements.map((element) => {
    if (!ids.has(element.id)) return element;
    return {
      ...element,
      x: element.x + delta.x,
      y: element.y + delta.y,
    };
  });
}

function normalizeRect(x: number, y: number, width: number, height: number) {
  const nextX = width < 0 ? x + width : x;
  const nextY = height < 0 ? y + height : y;
  return {
    x: nextX,
    y: nextY,
    width: Math.max(MIN_SIZE, Math.abs(width)),
    height: Math.max(MIN_SIZE, Math.abs(height)),
  };
}

export function resizeElement(
  element: DrawingElement,
  handle: HandleId,
  pointer: Point,
  options: { shift?: boolean } = {},
): DrawingElement {
  if (handle === "rotate") {
    const center = getElementCenter(element);
    const angle =
      (Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180) / Math.PI +
      90;
    const snapped = options.shift ? Math.round(angle / 15) * 15 : angle;
    return { ...element, rotation: snapped };
  }

  const center = getElementCenter(element);
  const localPointer = unrotatePoint(pointer, center, element.rotation);
  const aspect = element.width / Math.max(1, element.height);

  if (element.type === "arrow") {
    if (handle === "nw" || handle === "w" || handle === "sw" || handle === "n") {
      return {
        ...element,
        width: element.x + element.width - localPointer.x,
        height: element.y + element.height - localPointer.y,
        x: localPointer.x,
        y: localPointer.y,
      };
    }
    return {
      ...element,
      width: localPointer.x - element.x,
      height: localPointer.y - element.y,
    };
  }

  let left = element.x;
  let top = element.y;
  let right = element.x + element.width;
  let bottom = element.y + element.height;

  if (handle.includes("w")) left = localPointer.x;
  if (handle.includes("e")) right = localPointer.x;
  if (handle.includes("n")) top = localPointer.y;
  if (handle.includes("s")) bottom = localPointer.y;

  const next = normalizeRect(left, top, right - left, bottom - top);

  if (options.shift) {
    const size = Math.max(next.width, next.height);
    const lockedWidth = handle === "n" || handle === "s" ? size * aspect : size;
    const lockedHeight = handle === "e" || handle === "w" ? size / aspect : size;
    if (handle.includes("w")) {
      next.x = right - lockedWidth;
    }
    if (handle.includes("n")) {
      next.y = bottom - lockedHeight;
    }
    next.width = lockedWidth;
    next.height = lockedHeight;
  }

  if (element.type === "text") {
    const scale = next.height / Math.max(1, element.height);
    return {
      ...element,
      ...next,
      fontSize: Math.max(12, element.fontSize * scale),
    };
  }

  if (element.type === "pencil") {
    const scaleX = next.width / Math.max(1, element.width);
    const scaleY = next.height / Math.max(1, element.height);
    return {
      ...element,
      ...next,
      points: element.points.map((point) => ({
        x: point.x * scaleX,
        y: point.y * scaleY,
      })),
    };
  }

  return { ...element, ...next };
}

export function duplicateElements(
  elements: DrawingElement[],
  ids: Set<string>,
  offset = 24,
): { elements: DrawingElement[]; duplicatedIds: string[] } {
  const duplicated: DrawingElement[] = [];
  const duplicatedIds: string[] = [];
  for (const element of elements) {
    if (!ids.has(element.id)) continue;
    const nextId = createElementId();
    duplicatedIds.push(nextId);
    duplicated.push({
      ...structuredClone(element),
      id: nextId,
      x: element.x + offset,
      y: element.y + offset,
    });
  }
  return { elements: [...elements, ...duplicated], duplicatedIds };
}

export function deleteElements(
  elements: DrawingElement[],
  ids: Set<string>,
): DrawingElement[] {
  return elements.filter((element) => !ids.has(element.id));
}

export function createRectElement(partial: Partial<RectElement> = {}): RectElement {
  return {
    id: createElementId(),
    type: "rect",
    x: 80,
    y: 80,
    width: 240,
    height: 140,
    rotation: 0,
    stroke: DEFAULT_STROKE,
    fill: DEFAULT_FILL,
    strokeWidth: 3,
    opacity: 1,
    cornerRadius: 8,
    ...partial,
  };
}

export function createEllipseElement(
  partial: Partial<DrawingElement> & { type?: "ellipse" } = {},
): DrawingElement {
  return {
    id: createElementId(),
    x: 80,
    y: 80,
    width: 180,
    height: 180,
    rotation: 0,
    stroke: DEFAULT_STROKE,
    fill: DEFAULT_FILL,
    strokeWidth: 3,
    opacity: 1,
    ...partial,
    type: "ellipse",
  };
}

export function createArrowElement(
  partial: Partial<ArrowElement> = {},
): ArrowElement {
  return {
    id: createElementId(),
    type: "arrow",
    x: 80,
    y: 200,
    width: 240,
    height: 0,
    rotation: 0,
    stroke: DEFAULT_STROKE,
    fill: DEFAULT_FILL,
    strokeWidth: 4,
    opacity: 1,
    ...partial,
  };
}

export function createTextElement(partial: Partial<TextElement> = {}): TextElement {
  return {
    id: createElementId(),
    type: "text",
    x: 80,
    y: 80,
    width: 520,
    height: 96,
    rotation: 0,
    stroke: "transparent",
    fill: DEFAULT_STROKE,
    strokeWidth: 0,
    opacity: 1,
    text: "YOUR TITLE",
    fontSize: 72,
    fontWeight: 800,
    align: "left",
    ...partial,
  };
}

export function createPencilElement(
  partial: Partial<PencilElement> = {},
): PencilElement {
  return {
    id: createElementId(),
    type: "pencil",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    rotation: 0,
    stroke: DEFAULT_STROKE,
    fill: "transparent",
    strokeWidth: 3,
    opacity: 1,
    points: [{ x: 0, y: 0 }],
    ...partial,
  };
}

export function createImageElement(
  partial: Partial<ImageElement> & Pick<ImageElement, "src">,
): ImageElement {
  return {
    id: createElementId(),
    type: "image",
    x: 80,
    y: 80,
    width: 320,
    height: 180,
    rotation: 0,
    stroke: "transparent",
    fill: "transparent",
    strokeWidth: 0,
    opacity: 1,
    ...partial,
  };
}

export function createPersonElement(
  partial: Partial<PersonElement> = {},
): PersonElement {
  return {
    id: createElementId(),
    type: "person",
    x: 900,
    y: 160,
    width: 220,
    height: 480,
    rotation: 0,
    stroke: "#4b5563",
    fill: "#6b7280",
    strokeWidth: 3,
    opacity: 1,
    ...partial,
  };
}

export function constrainRect(
  start: Point,
  current: Point,
  shift: boolean,
): Bounds {
  let width = current.x - start.x;
  let height = current.y - start.y;
  if (shift) {
    const size = Math.max(Math.abs(width), Math.abs(height));
    width = Math.sign(width || 1) * size;
    height = Math.sign(height || 1) * size;
  }
  return normalizeRect(start.x, start.y, width, height);
}

export function constrainArrow(
  start: Point,
  current: Point,
  shift: boolean,
): { x: number; y: number; width: number; height: number } {
  let width = current.x - start.x;
  let height = current.y - start.y;
  if (shift) {
    const angle = Math.atan2(height, width);
    const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    const length = Math.hypot(width, height);
    width = Math.cos(snapped) * length;
    height = Math.sin(snapped) * length;
  }
  return { x: start.x, y: start.y, width, height };
}

export function documentHasPerson(document: DrawingDocument) {
  return document.elements.some((element) => element.type === "person");
}

export function documentTitle(document: DrawingDocument) {
  const text = document.elements.find(
    (element): element is TextElement =>
      element.type === "text" && element.text.trim().length > 0,
  );
  return text?.text.trim().slice(0, 80) ?? "Drawing inspiration";
}

export function documentDescription(document: DrawingDocument) {
  const texts = document.elements
    .filter((element): element is TextElement => element.type === "text")
    .map((element) => element.text.trim())
    .filter(Boolean);
  const kinds = new Set(document.elements.map((element) => element.type));
  const parts = ["Hand-drawn thumbnail composition."];
  if (texts.length > 0) {
    parts.push(`Text: ${texts.join(" / ")}`);
  }
  if (kinds.has("person")) {
    parts.push(
      "Contains grey person placeholders that should be replaced with real people.",
    );
  }
  return parts.join(" ");
}

export function normalizePencilElement(element: PencilElement): PencilElement {
  if (element.points.length === 0) return element;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of element.points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return {
    ...element,
    x: element.x + minX,
    y: element.y + minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    points: element.points.map((point) => ({
      x: point.x - minX,
      y: point.y - minY,
    })),
  };
}
