import { z } from "zod";

export const DRAWING_WIDTH = 1280;
export const DRAWING_HEIGHT = 720;
export const DRAWING_VERSION = 1 as const;
export const MAX_DRAWING_OBJECTS = 300;
export const MAX_DRAWING_METADATA_BYTES = 750_000;

export const DRAWING_COLORS = {
  ink: "#171717",
  paper: "#ffffff",
  red: "#ef4444",
  blue: "#2563eb",
  yellow: "#facc15",
  muted: "#d4d4d4",
} as const;

const finiteNumber = z.number().finite();
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const point = z.object({ x: finiteNumber, y: finiteNumber });

const drawingObjectBase = z.object({
  id: z.string().min(1),
  x: finiteNumber,
  y: finiteNumber,
  width: finiteNumber.positive().max(DRAWING_WIDTH * 4),
  height: finiteNumber.positive().max(DRAWING_HEIGHT * 4),
  opacity: finiteNumber.min(0).max(1),
});

const rectangleObjectSchema = drawingObjectBase.extend({
  type: z.literal("rectangle"),
  fill: color,
  stroke: color,
  strokeWidth: finiteNumber.min(1).max(40),
  radius: finiteNumber.min(0).max(120),
});

const ellipseObjectSchema = drawingObjectBase.extend({
  type: z.literal("ellipse"),
  fill: color,
  stroke: color,
  strokeWidth: finiteNumber.min(1).max(40),
});

const arrowObjectSchema = drawingObjectBase.extend({
  type: z.literal("arrow"),
  color,
  strokeWidth: finiteNumber.min(1).max(40),
  start: point,
  end: point,
});

const pathObjectSchema = drawingObjectBase.extend({
  type: z.literal("path"),
  color,
  strokeWidth: finiteNumber.min(1).max(40),
  points: z.array(point).min(1).max(10_000),
});

const textObjectSchema = drawingObjectBase.extend({
  type: z.literal("text"),
  text: z.string().max(2_000),
  color,
  fontSize: finiteNumber.min(12).max(240),
  fontWeight: z.union([
    z.literal(400),
    z.literal(600),
    z.literal(700),
    z.literal(800),
  ]),
  align: z.union([z.literal("left"), z.literal("center"), z.literal("right")]),
});

const imageObjectSchema = drawingObjectBase.extend({
  type: z.literal("image"),
  src: z.string().url(),
  name: z.string().max(240),
  fit: z.union([z.literal("cover"), z.literal("contain")]),
});

const personObjectSchema = drawingObjectBase.extend({
  type: z.literal("person"),
  fill: color,
  stroke: color,
  label: z.string().max(80),
});

export const DrawingObjectSchema = z.discriminatedUnion("type", [
  rectangleObjectSchema,
  ellipseObjectSchema,
  arrowObjectSchema,
  pathObjectSchema,
  textObjectSchema,
  imageObjectSchema,
  personObjectSchema,
]);

export const DrawingDocumentSchema = z.object({
  version: z.literal(DRAWING_VERSION),
  width: z.literal(DRAWING_WIDTH),
  height: z.literal(DRAWING_HEIGHT),
  background: color,
  objects: z.array(DrawingObjectSchema).max(MAX_DRAWING_OBJECTS),
});

export type DrawingPoint = z.infer<typeof point>;
export type DrawingObject = z.infer<typeof DrawingObjectSchema>;
export type DrawingRectangleObject = z.infer<typeof rectangleObjectSchema>;
export type DrawingEllipseObject = z.infer<typeof ellipseObjectSchema>;
export type DrawingArrowObject = z.infer<typeof arrowObjectSchema>;
export type DrawingPathObject = z.infer<typeof pathObjectSchema>;
export type DrawingTextObject = z.infer<typeof textObjectSchema>;
export type DrawingImageObject = z.infer<typeof imageObjectSchema>;
export type DrawingPersonObject = z.infer<typeof personObjectSchema>;
export type DrawingDocument = z.infer<typeof DrawingDocumentSchema>;
export type DrawingTool =
  | "select"
  | "text"
  | "arrow"
  | "rectangle"
  | "ellipse"
  | "pencil";
export type ResizeHandle = "nw" | "ne" | "se" | "sw";

export const DRAWING_TEMPLATE_IDS = [
  "big-text-subject",
  "reaction-arrow",
  "split-versus",
  "tutorial-callout",
] as const;

export type DrawingTemplateId = (typeof DRAWING_TEMPLATE_IDS)[number];

export const DRAWING_TEMPLATES: readonly {
  id: DrawingTemplateId;
  name: string;
  description: string;
}[] = [
  {
    id: "big-text-subject",
    name: "Bold subject",
    description: "Big headline with a clear subject area",
  },
  {
    id: "reaction-arrow",
    name: "Reaction",
    description: "Person reaction with a directional arrow",
  },
  {
    id: "split-versus",
    name: "Versus",
    description: "A split-screen comparison layout",
  },
  {
    id: "tutorial-callout",
    name: "Tutorial",
    description: "Subject, headline, and focused callout",
  },
];

function createId() {
  return crypto.randomUUID();
}

function commonObject(
  bounds: Pick<DrawingObject, "x" | "y" | "width" | "height">,
) {
  return {
    id: createId(),
    ...bounds,
    opacity: 1,
  };
}

function textObject(
  text: string,
  bounds: Pick<DrawingObject, "x" | "y" | "width" | "height">,
  options: Partial<
    Pick<DrawingTextObject, "color" | "fontSize" | "fontWeight" | "align">
  > = {},
): DrawingTextObject {
  return {
    ...commonObject(bounds),
    type: "text",
    text,
    color: options.color ?? DRAWING_COLORS.ink,
    fontSize: options.fontSize ?? 72,
    fontWeight: options.fontWeight ?? 800,
    align: options.align ?? "left",
  };
}

function personObject(
  bounds: Pick<DrawingObject, "x" | "y" | "width" | "height">,
  label = "SUBJECT",
): DrawingPersonObject {
  return {
    ...commonObject(bounds),
    type: "person",
    fill: "#e5e5e5",
    stroke: "#737373",
    label,
  };
}

function rectangleObject(
  bounds: Pick<DrawingObject, "x" | "y" | "width" | "height">,
  options: Partial<
    Pick<DrawingRectangleObject, "fill" | "stroke" | "strokeWidth" | "radius">
  > = {},
): DrawingRectangleObject {
  return {
    ...commonObject(bounds),
    type: "rectangle",
    fill: options.fill ?? DRAWING_COLORS.paper,
    stroke: options.stroke ?? DRAWING_COLORS.ink,
    strokeWidth: options.strokeWidth ?? 5,
    radius: options.radius ?? 20,
  };
}

function arrowObject(
  bounds: Pick<DrawingObject, "x" | "y" | "width" | "height">,
  options: Partial<Pick<DrawingArrowObject, "color" | "strokeWidth">> = {},
): DrawingArrowObject {
  return {
    ...commonObject(bounds),
    type: "arrow",
    color: options.color ?? DRAWING_COLORS.red,
    strokeWidth: options.strokeWidth ?? 12,
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
  };
}

export function createBlankDrawingDocument(): DrawingDocument {
  return {
    version: DRAWING_VERSION,
    width: DRAWING_WIDTH,
    height: DRAWING_HEIGHT,
    background: DRAWING_COLORS.paper,
    objects: [],
  };
}

export function createDrawingTemplate(
  templateId: DrawingTemplateId,
): DrawingDocument {
  const document = createBlankDrawingDocument();

  switch (templateId) {
    case "big-text-subject":
      return {
        ...document,
        background: "#facc15",
        objects: [
          textObject(
            "BIG IDEA",
            { x: 64, y: 90, width: 630, height: 250 },
            { fontSize: 112 },
          ),
          textObject(
            "Why this changes everything",
            { x: 72, y: 355, width: 560, height: 150 },
            { fontSize: 44, fontWeight: 600 },
          ),
          personObject({ x: 780, y: 86, width: 410, height: 560 }),
        ],
      };
    case "reaction-arrow":
      return {
        ...document,
        background: "#f5f5f5",
        objects: [
          personObject({ x: 80, y: 102, width: 430, height: 540 }, "REACTION"),
          arrowObject(
            { x: 490, y: 260, width: 300, height: 150 },
            { strokeWidth: 18 },
          ),
          rectangleObject(
            { x: 820, y: 120, width: 370, height: 430 },
            { fill: "#ffffff", stroke: "#171717", strokeWidth: 7 },
          ),
          textObject(
            "THIS?!",
            { x: 770, y: 565, width: 460, height: 100 },
            { color: "#ef4444", fontSize: 80, align: "center" },
          ),
        ],
      };
    case "split-versus":
      return {
        ...document,
        objects: [
          rectangleObject(
            { x: 24, y: 24, width: 596, height: 672 },
            { fill: "#dbeafe", stroke: "#2563eb", strokeWidth: 5 },
          ),
          rectangleObject(
            { x: 660, y: 24, width: 596, height: 672 },
            { fill: "#fee2e2", stroke: "#ef4444", strokeWidth: 5 },
          ),
          textObject(
            "BEFORE",
            { x: 70, y: 60, width: 500, height: 100 },
            { color: "#2563eb", fontSize: 64, align: "center" },
          ),
          textObject(
            "AFTER",
            { x: 706, y: 60, width: 500, height: 100 },
            { color: "#ef4444", fontSize: 64, align: "center" },
          ),
          personObject({ x: 180, y: 190, width: 290, height: 430 }),
          personObject({ x: 816, y: 190, width: 290, height: 430 }),
          textObject(
            "VS",
            { x: 570, y: 285, width: 140, height: 100 },
            { fontSize: 70, align: "center" },
          ),
        ],
      };
    case "tutorial-callout":
      return {
        ...document,
        background: "#f5f5f5",
        objects: [
          textObject(
            "DO THIS FIRST",
            { x: 68, y: 60, width: 760, height: 130 },
            { fontSize: 82 },
          ),
          personObject({ x: 760, y: 110, width: 420, height: 540 }),
          rectangleObject(
            { x: 88, y: 250, width: 480, height: 260 },
            { fill: "#ffffff", stroke: "#ef4444", strokeWidth: 10 },
          ),
          textObject(
            "1. Open\n2. Click\n3. Create",
            { x: 130, y: 290, width: 390, height: 190 },
            { fontSize: 48, fontWeight: 700 },
          ),
          arrowObject(
            { x: 520, y: 350, width: 280, height: 120 },
            { strokeWidth: 15 },
          ),
        ],
      };
  }
}

export function parseDrawingDocument(serialized: string): DrawingDocument {
  if (
    new TextEncoder().encode(serialized).byteLength > MAX_DRAWING_METADATA_BYTES
  ) {
    throw new Error("Drawing data is too large");
  }

  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    throw new Error("Drawing data is not valid JSON");
  }

  const result = DrawingDocumentSchema.safeParse(value);
  if (!result.success) {
    throw new Error("Drawing data is invalid or uses an unsupported version");
  }
  return result.data;
}

export function serializeDrawingDocument(document: DrawingDocument): string {
  const parsed = DrawingDocumentSchema.parse(document);
  const serialized = JSON.stringify(parsed);
  if (
    new TextEncoder().encode(serialized).byteLength > MAX_DRAWING_METADATA_BYTES
  ) {
    throw new Error("Drawing data is too large");
  }
  return serialized;
}

export function cloneDrawingObject(
  object: DrawingObject,
  offset = 24,
): DrawingObject {
  return {
    ...structuredClone(object),
    id: createId(),
    x: object.x + offset,
    y: object.y + offset,
  };
}

export function createPersonPlaceholder(): DrawingPersonObject {
  return personObject({ x: 460, y: 110, width: 360, height: 500 });
}

export function createTextAt(x: number, y: number): DrawingTextObject {
  return textObject("Type something", {
    x: Math.min(x, DRAWING_WIDTH - 460),
    y: Math.min(y, DRAWING_HEIGHT - 120),
    width: 440,
    height: 110,
  });
}

export function documentsEqual(left: DrawingDocument, right: DrawingDocument) {
  return JSON.stringify(left) === JSON.stringify(right);
}
