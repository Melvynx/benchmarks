import { nanoid } from "nanoid";
import {
  DRAWING_HEIGHT,
  DRAWING_VERSION,
  DRAWING_WIDTH,
  drawingDocumentSchema,
  type ArrowElement,
  type DrawingDocument,
  type DrawingElement,
  type EllipseElement,
  type FreehandElement,
  type ImageElement,
  type PersonElement,
  type RectangleElement,
  type TextElement,
} from "./drawing.types";

export function createEmptyDrawingDocument(
  overrides?: Partial<DrawingDocument>,
): DrawingDocument {
  return {
    version: DRAWING_VERSION,
    width: DRAWING_WIDTH,
    height: DRAWING_HEIGHT,
    background: "#f8f7f4",
    elements: [],
    ...overrides,
  };
}

export function createElementId() {
  return nanoid(10);
}

export function cloneDocument(doc: DrawingDocument): DrawingDocument {
  return structuredClone(doc);
}

export function serializeDrawingDocument(doc: DrawingDocument): string {
  return JSON.stringify(doc);
}

export function parseDrawingDocument(raw: unknown): DrawingDocument {
  if (typeof raw === "string") {
    return drawingDocumentSchema.parse(JSON.parse(raw));
  }
  return drawingDocumentSchema.parse(raw);
}

export function tryParseDrawingDocument(
  raw: unknown,
): DrawingDocument | null {
  try {
    return parseDrawingDocument(raw);
  } catch {
    return null;
  }
}

export function createRectangle(
  partial: Partial<RectangleElement> & Pick<RectangleElement, "x" | "y">,
): RectangleElement {
  return {
    id: createElementId(),
    type: "rectangle",
    width: 200,
    height: 120,
    rotation: 0,
    strokeColor: "#1e1e1e",
    fillColor: "transparent",
    strokeWidth: 3,
    opacity: 1,
    cornerRadius: 8,
    ...partial,
  };
}

export function createEllipse(
  partial: Partial<EllipseElement> & Pick<EllipseElement, "x" | "y">,
): EllipseElement {
  return {
    id: createElementId(),
    type: "ellipse",
    width: 180,
    height: 180,
    rotation: 0,
    strokeColor: "#1e1e1e",
    fillColor: "transparent",
    strokeWidth: 3,
    opacity: 1,
    ...partial,
  };
}

export function createArrow(
  partial: Partial<ArrowElement> &
    Pick<ArrowElement, "x" | "y" | "points">,
): ArrowElement {
  const [start, end] = partial.points;
  const minX = Math.min(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxX = Math.max(start.x, end.x);
  const maxY = Math.max(start.y, end.y);
  return {
    id: createElementId(),
    type: "arrow",
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
    rotation: 0,
    strokeColor: "#e03131",
    fillColor: "transparent",
    strokeWidth: 4,
    opacity: 1,
    ...partial,
    x: partial.x ?? minX,
    y: partial.y ?? minY,
  };
}

export function createText(
  partial: Partial<TextElement> & Pick<TextElement, "x" | "y" | "text">,
): TextElement {
  const fontSize = partial.fontSize ?? 64;
  const text = partial.text;
  const width = partial.width ?? Math.max(text.length * fontSize * 0.55, 120);
  const height = partial.height ?? fontSize * 1.3;
  return {
    id: createElementId(),
    type: "text",
    width,
    height,
    rotation: 0,
    strokeColor: "#1e1e1e",
    fillColor: "transparent",
    strokeWidth: 0,
    opacity: 1,
    fontSize,
    fontWeight: 700,
    align: "left",
    ...partial,
  };
}

export function createFreehand(
  partial: Partial<FreehandElement> &
    Pick<FreehandElement, "x" | "y" | "points">,
): FreehandElement {
  const xs = partial.points.map((point) => point.x);
  const ys = partial.points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    id: createElementId(),
    type: "freehand",
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
    rotation: 0,
    strokeColor: "#1e1e1e",
    fillColor: "transparent",
    strokeWidth: 3,
    opacity: 1,
    ...partial,
    x: partial.x ?? minX,
    y: partial.y ?? minY,
  };
}

export function createImage(
  partial: Partial<ImageElement> &
    Pick<ImageElement, "x" | "y" | "src" | "width" | "height">,
): ImageElement {
  return {
    id: createElementId(),
    type: "image",
    rotation: 0,
    strokeColor: "transparent",
    fillColor: "transparent",
    strokeWidth: 0,
    opacity: 1,
    ...partial,
  };
}

export function createPerson(
  partial: Partial<PersonElement> & Pick<PersonElement, "x" | "y">,
): PersonElement {
  return {
    id: createElementId(),
    type: "person",
    width: 180,
    height: 280,
    rotation: 0,
    strokeColor: "#868e96",
    fillColor: "#dee2e6",
    strokeWidth: 3,
    opacity: 1,
    label: "Person",
    ...partial,
  };
}

export function duplicateElements(
  elements: DrawingElement[],
  offset = 24,
): DrawingElement[] {
  return elements.map((element) => ({
    ...structuredClone(element),
    id: createElementId(),
    x: element.x + offset,
    y: element.y + offset,
  }));
}

export function getElementById(doc: DrawingDocument, id: string) {
  return doc.elements.find((element) => element.id === id);
}

export function updateElements(
  doc: DrawingDocument,
  ids: string[],
  updater: (element: DrawingElement) => DrawingElement,
): DrawingDocument {
  const idSet = new Set(ids);
  return {
    ...doc,
    elements: doc.elements.map((element) =>
      idSet.has(element.id) ? updater(element) : element,
    ),
  };
}

export function removeElements(
  doc: DrawingDocument,
  ids: string[],
): DrawingDocument {
  const idSet = new Set(ids);
  return {
    ...doc,
    elements: doc.elements.filter((element) => !idSet.has(element.id)),
  };
}

export function addElements(
  doc: DrawingDocument,
  elements: DrawingElement[],
): DrawingDocument {
  return {
    ...doc,
    elements: [...doc.elements, ...elements],
  };
}

export function bringToFront(
  doc: DrawingDocument,
  ids: string[],
): DrawingDocument {
  const idSet = new Set(ids);
  const selected = doc.elements.filter((element) => idSet.has(element.id));
  const rest = doc.elements.filter((element) => !idSet.has(element.id));
  return { ...doc, elements: [...rest, ...selected] };
}
