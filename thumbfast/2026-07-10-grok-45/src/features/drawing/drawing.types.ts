import { z } from "zod";

export const DRAWING_WIDTH = 1280;
export const DRAWING_HEIGHT = 720;
export const DRAWING_VERSION = 1 as const;

export const DRAWING_TOOLS = [
  "select",
  "text",
  "arrow",
  "rectangle",
  "ellipse",
  "freehand",
  "image",
  "person",
] as const;

export type DrawingTool = (typeof DRAWING_TOOLS)[number];

export const DRAWING_COLORS = [
  "#1e1e1e",
  "#e03131",
  "#2f9e44",
  "#1971c2",
  "#f08c00",
  "#ffffff",
] as const;

export type DrawingColor = (typeof DRAWING_COLORS)[number];

const baseElementSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0),
  strokeColor: z.string().default("#1e1e1e"),
  fillColor: z.string().default("transparent"),
  strokeWidth: z.number().default(3),
  opacity: z.number().default(1),
});

export const rectangleElementSchema = baseElementSchema.extend({
  type: z.literal("rectangle"),
  cornerRadius: z.number().default(8),
});

export const ellipseElementSchema = baseElementSchema.extend({
  type: z.literal("ellipse"),
});

export const arrowElementSchema = baseElementSchema.extend({
  type: z.literal("arrow"),
  points: z.tuple([
    z.object({ x: z.number(), y: z.number() }),
    z.object({ x: z.number(), y: z.number() }),
  ]),
});

export const textElementSchema = baseElementSchema.extend({
  type: z.literal("text"),
  text: z.string(),
  fontSize: z.number().default(64),
  fontWeight: z.union([z.literal(400), z.literal(700)]).default(700),
  align: z
    .union([z.literal("left"), z.literal("center"), z.literal("right")])
    .default("left"),
});

export const freehandElementSchema = baseElementSchema.extend({
  type: z.literal("freehand"),
  points: z.array(z.object({ x: z.number(), y: z.number() })).min(1),
});

export const imageElementSchema = baseElementSchema.extend({
  type: z.literal("image"),
  src: z.string(),
});

export const personElementSchema = baseElementSchema.extend({
  type: z.literal("person"),
  label: z.string().default("Person"),
});

export const drawingElementSchema = z.discriminatedUnion("type", [
  rectangleElementSchema,
  ellipseElementSchema,
  arrowElementSchema,
  textElementSchema,
  freehandElementSchema,
  imageElementSchema,
  personElementSchema,
]);

export const drawingDocumentSchema = z.object({
  version: z.literal(1),
  width: z.number().default(DRAWING_WIDTH),
  height: z.number().default(DRAWING_HEIGHT),
  background: z.string().default("#f8f7f4"),
  elements: z.array(drawingElementSchema),
});

export type RectangleElement = z.infer<typeof rectangleElementSchema>;
export type EllipseElement = z.infer<typeof ellipseElementSchema>;
export type ArrowElement = z.infer<typeof arrowElementSchema>;
export type TextElement = z.infer<typeof textElementSchema>;
export type FreehandElement = z.infer<typeof freehandElementSchema>;
export type ImageElement = z.infer<typeof imageElementSchema>;
export type PersonElement = z.infer<typeof personElementSchema>;
export type DrawingElement = z.infer<typeof drawingElementSchema>;
export type DrawingDocument = z.infer<typeof drawingDocumentSchema>;

export type ResizeHandle =
  | "nw"
  | "ne"
  | "sw"
  | "se"
  | "n"
  | "s"
  | "e"
  | "w"
  | "rotate";

export type DrawingSelection = {
  ids: string[];
};

export function isDrawingTool(value: string): value is DrawingTool {
  return (DRAWING_TOOLS as readonly string[]).includes(value);
}
