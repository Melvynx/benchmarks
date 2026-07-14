// Drawing document model for the Thumbfast drawing editor.
//
// A drawing is a flat, ordered list of typed elements laid out in a fixed
// 16:9 virtual stage (STAGE_WIDTH x STAGE_HEIGHT). Everything is stored in
// stage coordinates so a saved scene renders identically at any display size.
//
// Serialization is intentionally simple and versioned: `serializeDocument`
// produces a JSON string that `deserializeDocument` can always read back into
// a well-formed document, tolerating unknown/legacy fields. This is what we
// persist on the inspiration row so the editor can restore the exact scene.

export const DRAWING_DOCUMENT_VERSION = 1;
export const STAGE_WIDTH = 1280;
export const STAGE_HEIGHT = 720;
export const MIN_ELEMENT_SIZE = 8;

export type Point = { x: number; y: number };

export type DrawingTool =
  | "select"
  | "rectangle"
  | "ellipse"
  | "arrow"
  | "text"
  | "freedraw"
  | "image"
  | "placeholder";

export type DrawingElementType =
  | "rectangle"
  | "ellipse"
  | "arrow"
  | "text"
  | "freedraw"
  | "image"
  | "placeholder";

/** Elements that use an axis-aligned bounding box + rotation transform. */
type BoxTransform = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Rotation in radians, clockwise, around the box center. */
  rotation: number;
  opacity: number;
};

type StrokeStyle = {
  stroke: string;
  strokeWidth: number;
};

type FillStyle = {
  /** "transparent" is allowed and means no fill. */
  fill: string;
};

export type RectangleElement = BoxTransform &
  StrokeStyle &
  FillStyle & {
    id: string;
    type: "rectangle";
    cornerRadius: number;
  };

export type EllipseElement = BoxTransform &
  StrokeStyle &
  FillStyle & {
    id: string;
    type: "ellipse";
  };

export type TextElement = BoxTransform & {
  id: string;
  type: "text";
  text: string;
  color: string;
  fontSize: number;
  fontFamily: DrawingFontFamily;
  fontWeight: number;
  align: "left" | "center" | "right";
};

export type FreedrawElement = BoxTransform &
  StrokeStyle & {
    id: string;
    type: "freedraw";
    /** Points normalized to 0..1 of the bounding box, so resize is trivial. */
    points: Point[];
  };

export type ImageElement = BoxTransform & {
  id: string;
  type: "image";
  url: string;
  /** Intrinsic aspect ratio (w/h) for placement, best-effort. */
  naturalRatio?: number;
};

export type PlaceholderElement = BoxTransform & {
  id: string;
  type: "placeholder";
  /** Fill color of the clay figure. */
  color: string;
  label?: string;
};

/** Arrow is the only "linear" element: two endpoints in stage coordinates. */
export type ArrowElement = StrokeStyle & {
  id: string;
  type: "arrow";
  start: Point;
  end: Point;
  opacity: number;
};

export type DrawingElement =
  | RectangleElement
  | EllipseElement
  | TextElement
  | FreedrawElement
  | ImageElement
  | PlaceholderElement
  | ArrowElement;

export type DrawingDocument = {
  version: number;
  width: number;
  height: number;
  background: string;
  elements: DrawingElement[];
};

export type DrawingFontFamily = "hand" | "sans" | "serif";

export const DRAWING_FONT_STACKS: Record<DrawingFontFamily, string> = {
  hand: '"Comic Sans MS", "Segoe Print", "Bradley Hand", "Chalkboard SE", cursive',
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
};

export const DEFAULT_BACKGROUND = "#ffffff";

/** A calm, restrained palette — few colors by default. */
export const DRAWING_PALETTE = [
  "#1e1e1e", // ink
  "#e03131", // red
  "#2f9e44", // green
  "#1971c2", // blue
  "#f08c00", // amber
  "#ae3ec9", // purple
  "#ffffff", // white
] as const;

export const DEFAULT_STROKE = DRAWING_PALETTE[0];
export const DEFAULT_FILL = "transparent";
export const DEFAULT_STROKE_WIDTH = 3;

export function newElementId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `el-${Math.abs(hashString(String(performance.now())))}-${Math.floor(
    performance.now() * 1000,
  )}`;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}

export function isBoxElement(
  element: DrawingElement,
): element is Exclude<DrawingElement, ArrowElement> {
  return element.type !== "arrow";
}

export function isLinearElement(
  element: DrawingElement,
): element is ArrowElement {
  return element.type === "arrow";
}

export function createEmptyDocument(): DrawingDocument {
  return {
    version: DRAWING_DOCUMENT_VERSION,
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT,
    background: DEFAULT_BACKGROUND,
    elements: [],
  };
}

// -------------------------------------------------------------------------
// Serialization
// -------------------------------------------------------------------------

export function serializeDocument(document: DrawingDocument): string {
  return JSON.stringify({
    version: DRAWING_DOCUMENT_VERSION,
    width: document.width,
    height: document.height,
    background: document.background,
    elements: document.elements,
  });
}

export function serializeElements(elements: DrawingElement[]): string {
  return serializeDocument({ ...createEmptyDocument(), elements });
}

/**
 * Parse a stored drawing string into a well-formed document. Never throws:
 * malformed input yields an empty document so the editor still opens.
 */
export function deserializeDocument(raw: string | null | undefined): {
  document: DrawingDocument;
  ok: boolean;
} {
  if (!raw) return { document: createEmptyDocument(), ok: false };
  try {
    const parsed = JSON.parse(raw) as Partial<DrawingDocument>;
    const elements = Array.isArray(parsed.elements)
      ? parsed.elements
          .map(normalizeElement)
          .filter((element): element is DrawingElement => element !== null)
      : [];
    return {
      document: {
        version:
          typeof parsed.version === "number"
            ? parsed.version
            : DRAWING_DOCUMENT_VERSION,
        width: numberOr(parsed.width, STAGE_WIDTH),
        height: numberOr(parsed.height, STAGE_HEIGHT),
        background:
          typeof parsed.background === "string"
            ? parsed.background
            : DEFAULT_BACKGROUND,
        elements,
      },
      ok: true,
    };
  } catch {
    return { document: createEmptyDocument(), ok: false };
  }
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function pointOr(value: unknown, fallback: Point): Point {
  if (value && typeof value === "object") {
    const candidate = value as Partial<Point>;
    if (typeof candidate.x === "number" && typeof candidate.y === "number") {
      return { x: candidate.x, y: candidate.y };
    }
  }
  return fallback;
}

/** Coerce an arbitrary parsed object into a valid element, or null to drop. */
function normalizeElement(raw: unknown): DrawingElement | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const type = value.type;
  const id = typeof value.id === "string" ? value.id : newElementId();
  const opacity = clamp01(numberOr(value.opacity, 1));

  const box = {
    x: numberOr(value.x, 0),
    y: numberOr(value.y, 0),
    width: numberOr(value.width, 100),
    height: numberOr(value.height, 100),
    rotation: numberOr(value.rotation, 0),
    opacity,
  };

  switch (type) {
    case "rectangle":
      return {
        ...box,
        id,
        type,
        stroke: stringOr(value.stroke, DEFAULT_STROKE),
        strokeWidth: numberOr(value.strokeWidth, DEFAULT_STROKE_WIDTH),
        fill: stringOr(value.fill, DEFAULT_FILL),
        cornerRadius: numberOr(value.cornerRadius, 12),
      };
    case "ellipse":
      return {
        ...box,
        id,
        type,
        stroke: stringOr(value.stroke, DEFAULT_STROKE),
        strokeWidth: numberOr(value.strokeWidth, DEFAULT_STROKE_WIDTH),
        fill: stringOr(value.fill, DEFAULT_FILL),
      };
    case "text":
      return {
        ...box,
        id,
        type,
        text: stringOr(value.text, ""),
        color: stringOr(value.color, DEFAULT_STROKE),
        fontSize: numberOr(value.fontSize, 48),
        fontFamily: fontFamilyOr(value.fontFamily),
        fontWeight: numberOr(value.fontWeight, 700),
        align: alignOr(value.align),
      };
    case "freedraw":
      return {
        ...box,
        id,
        type,
        stroke: stringOr(value.stroke, DEFAULT_STROKE),
        strokeWidth: numberOr(value.strokeWidth, DEFAULT_STROKE_WIDTH),
        points: Array.isArray(value.points)
          ? value.points.map((point) => pointOr(point, { x: 0, y: 0 }))
          : [],
      };
    case "image":
      if (typeof value.url !== "string") return null;
      return {
        ...box,
        id,
        type,
        url: value.url,
        naturalRatio:
          typeof value.naturalRatio === "number"
            ? value.naturalRatio
            : undefined,
      };
    case "placeholder":
      return {
        ...box,
        id,
        type,
        color: stringOr(value.color, "#94a3b8"),
        label: typeof value.label === "string" ? value.label : undefined,
      };
    case "arrow":
      return {
        id,
        type,
        opacity,
        stroke: stringOr(value.stroke, DEFAULT_STROKE),
        strokeWidth: numberOr(value.strokeWidth, DEFAULT_STROKE_WIDTH),
        start: pointOr(value.start, { x: 0, y: 0 }),
        end: pointOr(value.end, { x: 100, y: 0 }),
      };
    default:
      return null;
  }
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function fontFamilyOr(value: unknown): DrawingFontFamily {
  return value === "sans" || value === "serif" || value === "hand"
    ? value
    : "hand";
}

function alignOr(value: unknown): "left" | "center" | "right" {
  return value === "left" || value === "right" || value === "center"
    ? value
    : "center";
}
