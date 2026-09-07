import { z } from "zod";

export const DRAWING_VERSION = 1;
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

export const DRAWING_TOOLS = [
  "select",
  "text",
  "arrow",
  "rect",
  "ellipse",
  "pencil",
  "image",
  "person",
] as const;

export type DrawingTool = (typeof DRAWING_TOOLS)[number];

export const HANDLE_IDS = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
  "rotate",
] as const;

export type HandleId = (typeof HANDLE_IDS)[number];

const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const BaseElementSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0),
  stroke: z.string().default("#1a1a1a"),
  fill: z.string().default("transparent"),
  strokeWidth: z.number().default(3),
  opacity: z.number().min(0).max(1).default(1),
});

export const RectElementSchema = BaseElementSchema.extend({
  type: z.literal("rect"),
  cornerRadius: z.number().default(8),
});

export const EllipseElementSchema = BaseElementSchema.extend({
  type: z.literal("ellipse"),
});

export const ArrowElementSchema = BaseElementSchema.extend({
  type: z.literal("arrow"),
});

export const TextElementSchema = BaseElementSchema.extend({
  type: z.literal("text"),
  text: z.string(),
  fontSize: z.number().default(64),
  fontWeight: z.number().default(800),
  align: z.enum(["left", "center", "right"]).default("left"),
});

export const PencilElementSchema = BaseElementSchema.extend({
  type: z.literal("pencil"),
  points: z.array(PointSchema).min(1),
});

export const ImageElementSchema = BaseElementSchema.extend({
  type: z.literal("image"),
  src: z.string().min(1),
});

export const PersonElementSchema = BaseElementSchema.extend({
  type: z.literal("person"),
});

export const DrawingElementSchema = z.discriminatedUnion("type", [
  RectElementSchema,
  EllipseElementSchema,
  ArrowElementSchema,
  TextElementSchema,
  PencilElementSchema,
  ImageElementSchema,
  PersonElementSchema,
]);

export const DrawingDocumentSchema = z.object({
  version: z.literal(DRAWING_VERSION),
  width: z.number().default(CANVAS_WIDTH),
  height: z.number().default(CANVAS_HEIGHT),
  background: z.string().default("#fafafa"),
  elements: z.array(DrawingElementSchema),
});

export type Point = z.infer<typeof PointSchema>;
export type RectElement = z.infer<typeof RectElementSchema>;
export type EllipseElement = z.infer<typeof EllipseElementSchema>;
export type ArrowElement = z.infer<typeof ArrowElementSchema>;
export type TextElement = z.infer<typeof TextElementSchema>;
export type PencilElement = z.infer<typeof PencilElementSchema>;
export type ImageElement = z.infer<typeof ImageElementSchema>;
export type PersonElement = z.infer<typeof PersonElementSchema>;
export type DrawingElement = z.infer<typeof DrawingElementSchema>;
export type DrawingDocument = z.infer<typeof DrawingDocumentSchema>;

export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function isDrawingTool(value: string): value is DrawingTool {
  return (DRAWING_TOOLS as readonly string[]).includes(value);
}
