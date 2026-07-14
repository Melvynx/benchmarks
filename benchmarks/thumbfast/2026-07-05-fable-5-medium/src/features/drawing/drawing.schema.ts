import { z } from "zod";

export const DRAWING_WIDTH = 1280;
export const DRAWING_HEIGHT = 720;
export const DRAWING_VERSION = 1;

export const DRAWING_STROKE_COLORS = [
  "#1e1e1e",
  "#e03131",
  "#1971c2",
  "#2f9e44",
  "#f08c00",
  "#ffffff",
] as const;

export const DRAWING_FILL_COLORS = [
  "transparent",
  "#ffc9c9",
  "#a5d8ff",
  "#b2f2bb",
  "#ffec99",
  "#e9ecef",
] as const;

export const DRAWING_STROKE_WIDTHS = [2, 4, 8] as const;
export const DRAWING_FONT_SIZES = [28, 48, 80] as const;
export const DRAWING_FONT_FAMILY = "Arial, Helvetica, sans-serif";
export const DRAWING_LINE_HEIGHT = 1.25;

const elementBaseSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  /** Rotation in radians around the element center. */
  angle: z.number(),
  stroke: z.string(),
  fill: z.string(),
  strokeWidth: z.number(),
});

const rectangleElementSchema = elementBaseSchema.extend({
  type: z.literal("rectangle"),
});

const ellipseElementSchema = elementBaseSchema.extend({
  type: z.literal("ellipse"),
});

/** Arrow goes from (x, y) to (x + width, y + height); width/height may be negative. */
const arrowElementSchema = elementBaseSchema.extend({
  type: z.literal("arrow"),
});

/** Freehand stroke; points are relative to (x, y) and normalized to the 0..width/0..height box. */
const freedrawElementSchema = elementBaseSchema.extend({
  type: z.literal("freedraw"),
  points: z.array(z.tuple([z.number(), z.number()])),
});

const textElementSchema = elementBaseSchema.extend({
  type: z.literal("text"),
  text: z.string(),
  fontSize: z.number(),
});

const imageElementSchema = elementBaseSchema.extend({
  type: z.literal("image"),
  url: z.string(),
});

const personElementSchema = elementBaseSchema.extend({
  type: z.literal("person"),
});

export const drawingElementSchema = z.discriminatedUnion("type", [
  rectangleElementSchema,
  ellipseElementSchema,
  arrowElementSchema,
  freedrawElementSchema,
  textElementSchema,
  imageElementSchema,
  personElementSchema,
]);

export const drawingDocumentSchema = z.object({
  version: z.literal(DRAWING_VERSION),
  width: z.number(),
  height: z.number(),
  background: z.string(),
  elements: z.array(drawingElementSchema),
});

export type DrawingElement = z.infer<typeof drawingElementSchema>;
export type DrawingElementType = DrawingElement["type"];
export type RectangleElement = z.infer<typeof rectangleElementSchema>;
export type EllipseElement = z.infer<typeof ellipseElementSchema>;
export type ArrowElement = z.infer<typeof arrowElementSchema>;
export type FreedrawElement = z.infer<typeof freedrawElementSchema>;
export type TextElement = z.infer<typeof textElementSchema>;
export type ImageElement = z.infer<typeof imageElementSchema>;
export type PersonElement = z.infer<typeof personElementSchema>;
export type DrawingDocument = z.infer<typeof drawingDocumentSchema>;

export function createEmptyDrawing(): DrawingDocument {
  return {
    version: DRAWING_VERSION,
    width: DRAWING_WIDTH,
    height: DRAWING_HEIGHT,
    background: "#ffffff",
    elements: [],
  };
}

export function createElementId() {
  return crypto.randomUUID();
}

export function serializeDrawing(doc: DrawingDocument): string {
  return JSON.stringify(doc);
}

export function parseDrawing(raw: string): DrawingDocument | null {
  try {
    const result = drawingDocumentSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
