import { z } from "zod";

export const DRAWING_VERSION = 1;
export const DRAWING_WIDTH = 1280;
export const DRAWING_HEIGHT = 720;
export const DRAWING_BACKGROUND = "#fffef9";
export const DRAWING_FONT =
  '"Chalkboard SE", "Comic Sans MS", "Segoe Print", cursive';

export const DRAWING_STROKES = [
  "#1e1e1e",
  "#e03131",
  "#1971c2",
  "#f59f00",
  "#2f9e44",
] as const;

export const DRAWING_FILLS = [
  "transparent",
  "#ffffff",
  "#fff3bf",
  "#ffd8d8",
  "#d0ebff",
] as const;

export const DRAWING_STROKE_WIDTHS = [2, 4, 8] as const;

const pointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

const boxSchema = {
  id: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite(),
  height: z.number().finite(),
  rotation: z.number().finite(),
};

const shapeStyleSchema = {
  stroke: z.string().min(1),
  fill: z.string().min(1),
  strokeWidth: z.number().positive().max(64),
};

export const rectObjectSchema = z.object({
  ...boxSchema,
  type: z.literal("rect"),
  ...shapeStyleSchema,
});

export const ellipseObjectSchema = z.object({
  ...boxSchema,
  type: z.literal("ellipse"),
  ...shapeStyleSchema,
});

export const arrowObjectSchema = z.object({
  ...boxSchema,
  type: z.literal("arrow"),
  stroke: z.string().min(1),
  strokeWidth: z.number().positive().max(64),
});

export const textObjectSchema = z.object({
  ...boxSchema,
  type: z.literal("text"),
  text: z.string().max(500),
  fontSize: z.number().positive().max(400),
  color: z.string().min(1),
});

export const pencilObjectSchema = z.object({
  ...boxSchema,
  type: z.literal("pencil"),
  points: z.array(pointSchema).min(1).max(4000),
  stroke: z.string().min(1),
  strokeWidth: z.number().positive().max(64),
});

export const imageObjectSchema = z.object({
  ...boxSchema,
  type: z.literal("image"),
  src: z.string().min(1).max(2000),
});

export const personObjectSchema = z.object({
  ...boxSchema,
  type: z.literal("person"),
  label: z.string().min(1).max(40),
  stroke: z.string().min(1),
  fill: z.string().min(1),
  strokeWidth: z.number().positive().max(64),
});

export const drawingObjectSchema = z.discriminatedUnion("type", [
  rectObjectSchema,
  ellipseObjectSchema,
  arrowObjectSchema,
  textObjectSchema,
  pencilObjectSchema,
  imageObjectSchema,
  personObjectSchema,
]);

export const drawingDocumentSchema = z.object({
  version: z.literal(DRAWING_VERSION),
  width: z.literal(DRAWING_WIDTH),
  height: z.literal(DRAWING_HEIGHT),
  background: z.string().min(1),
  objects: z.array(drawingObjectSchema).max(200),
});

export type Point = z.infer<typeof pointSchema>;
export type RectObject = z.infer<typeof rectObjectSchema>;
export type EllipseObject = z.infer<typeof ellipseObjectSchema>;
export type ArrowObject = z.infer<typeof arrowObjectSchema>;
export type TextObject = z.infer<typeof textObjectSchema>;
export type PencilObject = z.infer<typeof pencilObjectSchema>;
export type ImageObject = z.infer<typeof imageObjectSchema>;
export type PersonObject = z.infer<typeof personObjectSchema>;
export type DrawingObject = z.infer<typeof drawingObjectSchema>;
export type DrawingDocument = z.infer<typeof drawingDocumentSchema>;

export type DrawingTool =
  | "select"
  | "text"
  | "arrow"
  | "rect"
  | "ellipse"
  | "pencil"
  | "person";

export type ShapeStyle = {
  stroke: string;
  fill: string;
  strokeWidth: number;
};

export function createEmptyDrawing(): DrawingDocument {
  return {
    version: DRAWING_VERSION,
    width: DRAWING_WIDTH,
    height: DRAWING_HEIGHT,
    background: DRAWING_BACKGROUND,
    objects: [],
  };
}

export function serializeDrawing(document: DrawingDocument) {
  return JSON.stringify(document);
}

export function parseDrawingDocument(value: unknown): DrawingDocument | null {
  const raw = typeof value === "string" ? safeJsonParse(value) : value;
  const parsed = drawingDocumentSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function assertDrawingDocument(value: string): DrawingDocument {
  if (value.length > 700_000) throw new Error("Drawing is too large");
  const document = parseDrawingDocument(value);
  if (!document) throw new Error("Drawing data is invalid");
  return document;
}

export function describeDrawing(document: DrawingDocument) {
  const texts = document.objects
    .filter((object): object is TextObject => object.type === "text")
    .map((object) => object.text.trim())
    .filter(Boolean);
  const summary = texts.slice(0, 3).join(" · ");
  const base = summary || "Hand-drawn thumbnail composition";
  const hasPerson = document.objects.some((object) => object.type === "person");
  return hasPerson ? `${base}. Includes a subject placeholder.` : base;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
