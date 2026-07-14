import { nanoid } from "nanoid";
import { z } from "zod";

export const DRAWING_CANVAS = {
  width: 1280,
  height: 720,
} as const;

export const DRAWING_COLORS = [
  "#171717",
  "#ffffff",
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
] as const;

export const DRAWING_TOOL = {
  SELECT: "select",
  TEXT: "text",
  ARROW: "arrow",
  RECTANGLE: "rectangle",
  ELLIPSE: "ellipse",
  PENCIL: "pencil",
  IMAGE: "image",
  PERSON: "person",
} as const;

export type DrawingTool = (typeof DRAWING_TOOL)[keyof typeof DRAWING_TOOL];

const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const BaseObjectSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number(),
  opacity: z.number().min(0).max(1),
  fill: z.string(),
  stroke: z.string(),
  strokeWidth: z.number().positive(),
});

const RectangleObjectSchema = BaseObjectSchema.extend({
  type: z.literal("rectangle"),
  cornerRadius: z.number().min(0),
});

const EllipseObjectSchema = BaseObjectSchema.extend({
  type: z.literal("ellipse"),
});

const ArrowObjectSchema = BaseObjectSchema.extend({
  type: z.literal("arrow"),
  direction: z.union([
    z.literal("down-right"),
    z.literal("up-right"),
    z.literal("down-left"),
    z.literal("up-left"),
  ]),
});

const TextObjectSchema = BaseObjectSchema.extend({
  type: z.literal("text"),
  text: z.string(),
  fontSize: z.number().positive(),
  fontWeight: z.union([z.literal("normal"), z.literal("bold")]),
  textAlign: z.union([
    z.literal("left"),
    z.literal("center"),
    z.literal("right"),
  ]),
});

const PencilObjectSchema = BaseObjectSchema.extend({
  type: z.literal("pencil"),
  points: z.array(PointSchema).min(2),
});

const ImageObjectSchema = BaseObjectSchema.extend({
  type: z.literal("image"),
  src: z.string().min(1),
  alt: z.string(),
});

const PersonObjectSchema = BaseObjectSchema.extend({
  type: z.literal("person"),
  label: z.string(),
});

export const DrawingObjectSchema = z.discriminatedUnion("type", [
  RectangleObjectSchema,
  EllipseObjectSchema,
  ArrowObjectSchema,
  TextObjectSchema,
  PencilObjectSchema,
  ImageObjectSchema,
  PersonObjectSchema,
]);

export const DrawingDocumentSchema = z.object({
  version: z.literal(1),
  name: z.string(),
  width: z.literal(DRAWING_CANVAS.width),
  height: z.literal(DRAWING_CANVAS.height),
  background: z.string(),
  objects: z.array(DrawingObjectSchema),
});

export type DrawingPoint = z.infer<typeof PointSchema>;
export type DrawingObject = z.infer<typeof DrawingObjectSchema>;
export type DrawingDocument = z.infer<typeof DrawingDocumentSchema>;
export type TextDrawingObject = z.infer<typeof TextObjectSchema>;
export type PencilDrawingObject = z.infer<typeof PencilObjectSchema>;
export type ArrowDrawingObject = z.infer<typeof ArrowObjectSchema>;

export type DrawingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DrawingTemplate = {
  id: string;
  name: string;
  description: string;
  createObjects: () => DrawingObject[];
};

const DEFAULT_OBJECT_STYLE = {
  rotation: 0,
  opacity: 1,
  fill: "transparent",
  stroke: "#171717",
  strokeWidth: 5,
} as const;

export function createDrawingId() {
  return nanoid(12);
}

export function createDrawingDocument(
  name = "Untitled drawing",
): DrawingDocument {
  return {
    version: 1,
    name,
    width: DRAWING_CANVAS.width,
    height: DRAWING_CANVAS.height,
    background: "#f7f3ea",
    objects: [],
  };
}

export function serializeDrawingDocument(document: DrawingDocument) {
  return JSON.stringify(DrawingDocumentSchema.parse(document));
}

export function deserializeDrawingDocument(serialized: string) {
  return DrawingDocumentSchema.parse(JSON.parse(serialized) as unknown);
}

export function updateDrawingObject(
  document: DrawingDocument,
  objectId: string,
  patch: Partial<DrawingObject>,
): DrawingDocument {
  return {
    ...document,
    objects: document.objects.map((object) =>
      object.id === objectId
        ? DrawingObjectSchema.parse({ ...object, ...patch })
        : object,
    ),
  };
}

export function deleteDrawingObject(
  document: DrawingDocument,
  objectId: string,
): DrawingDocument {
  return {
    ...document,
    objects: document.objects.filter((object) => object.id !== objectId),
  };
}

export function duplicateDrawingObject(
  object: DrawingObject,
  offset = 24,
): DrawingObject {
  return DrawingObjectSchema.parse({
    ...object,
    id: createDrawingId(),
    x: Math.min(object.x + offset, DRAWING_CANVAS.width - object.width),
    y: Math.min(object.y + offset, DRAWING_CANVAS.height - object.height),
  });
}

export function normalizeDrawingBox(
  start: DrawingPoint,
  end: DrawingPoint,
  minimumSize = 8,
): DrawingBox {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.max(Math.abs(end.x - start.x), minimumSize),
    height: Math.max(Math.abs(end.y - start.y), minimumSize),
  };
}

export function getArrowDirection(
  start: DrawingPoint,
  end: DrawingPoint,
): ArrowDrawingObject["direction"] {
  if (end.x >= start.x && end.y >= start.y) return "down-right";
  if (end.x >= start.x && end.y < start.y) return "up-right";
  if (end.x < start.x && end.y >= start.y) return "down-left";
  return "up-left";
}

export function createRectangleObject(box: DrawingBox): DrawingObject {
  return {
    ...DEFAULT_OBJECT_STYLE,
    ...box,
    id: createDrawingId(),
    type: "rectangle",
    fill: "#ffffff",
    cornerRadius: 20,
  };
}

export function createEllipseObject(box: DrawingBox): DrawingObject {
  return {
    ...DEFAULT_OBJECT_STYLE,
    ...box,
    id: createDrawingId(),
    type: "ellipse",
    fill: "#ffffff",
  };
}

export function createArrowObject(
  start: DrawingPoint,
  end: DrawingPoint,
): DrawingObject {
  return {
    ...DEFAULT_OBJECT_STYLE,
    ...normalizeDrawingBox(start, end, 16),
    id: createDrawingId(),
    type: "arrow",
    direction: getArrowDirection(start, end),
    stroke: "#ef4444",
    strokeWidth: 10,
  };
}

export function createTextObject(point: DrawingPoint): TextDrawingObject {
  return {
    ...DEFAULT_OBJECT_STYLE,
    id: createDrawingId(),
    type: "text",
    x: point.x,
    y: point.y,
    width: 420,
    height: 112,
    fill: "#171717",
    stroke: "transparent",
    text: "DOUBLE-CLICK TO EDIT",
    fontSize: 54,
    fontWeight: "bold",
    textAlign: "left",
  };
}

export function createPersonObject(point: DrawingPoint): DrawingObject {
  return {
    ...DEFAULT_OBJECT_STYLE,
    id: createDrawingId(),
    type: "person",
    x: point.x,
    y: point.y,
    width: 280,
    height: 430,
    fill: "#d4d4d4",
    stroke: "#525252",
    strokeWidth: 5,
    label: "SUBJECT",
  };
}

export function createImageObject(
  src: string,
  alt: string,
): DrawingObject {
  return {
    ...DEFAULT_OBJECT_STYLE,
    id: createDrawingId(),
    type: "image",
    x: 400,
    y: 180,
    width: 480,
    height: 300,
    fill: "transparent",
    stroke: "transparent",
    strokeWidth: 1,
    src,
    alt,
  };
}

export function createPencilObject(
  points: DrawingPoint[],
): PencilDrawingObject {
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const x = Math.min(...xValues);
  const y = Math.min(...yValues);
  const width = Math.max(Math.max(...xValues) - x, 8);
  const height = Math.max(Math.max(...yValues) - y, 8);

  return {
    ...DEFAULT_OBJECT_STYLE,
    id: createDrawingId(),
    type: "pencil",
    x,
    y,
    width,
    height,
    fill: "transparent",
    strokeWidth: 7,
    points: points.map((point) => ({
      x: (point.x - x) / width,
      y: (point.y - y) / height,
    })),
  };
}

function makeText(
  text: string,
  box: DrawingBox,
  fontSize: number,
  fill = "#171717",
): TextDrawingObject {
  return {
    ...DEFAULT_OBJECT_STYLE,
    ...box,
    id: createDrawingId(),
    type: "text",
    fill,
    stroke: "transparent",
    text,
    fontSize,
    fontWeight: "bold",
    textAlign: "left",
  };
}

function makePerson(box: DrawingBox): DrawingObject {
  return {
    ...DEFAULT_OBJECT_STYLE,
    ...box,
    id: createDrawingId(),
    type: "person",
    fill: "#d4d4d4",
    stroke: "#525252",
    strokeWidth: 5,
    label: "SUBJECT",
  };
}

export const DRAWING_TEMPLATES: DrawingTemplate[] = [
  {
    id: "big-text-subject",
    name: "Big text + subject",
    description: "Bold headline with a clear subject area.",
    createObjects: () => [
      makeText("YOUR BIG IDEA", { x: 70, y: 120, width: 650, height: 210 }, 86),
      makeText(
        "A short supporting line",
        { x: 76, y: 350, width: 560, height: 80 },
        36,
        "#525252",
      ),
      makePerson({ x: 845, y: 120, width: 300, height: 500 }),
    ],
  },
  {
    id: "reaction-arrow",
    name: "Reaction + arrow",
    description: "A reaction subject pointing to a reveal.",
    createObjects: () => [
      makePerson({ x: 80, y: 160, width: 310, height: 470 }),
      makeText("WAIT... WHAT?", { x: 520, y: 95, width: 640, height: 150 }, 78),
      createArrowObject({ x: 520, y: 420 }, { x: 960, y: 315 }),
      createEllipseObject({ x: 930, y: 270, width: 180, height: 180 }),
    ],
  },
  {
    id: "versus",
    name: "Split-screen versus",
    description: "Two sides with a strong central comparison.",
    createObjects: () => [
      {
        ...createRectangleObject({ x: 40, y: 55, width: 555, height: 610 }),
        fill: "#dbeafe",
        stroke: "#2563eb",
      },
      {
        ...createRectangleObject({ x: 685, y: 55, width: 555, height: 610 }),
        fill: "#fee2e2",
        stroke: "#dc2626",
      },
      makeText("A", { x: 240, y: 260, width: 180, height: 160 }, 126, "#2563eb"),
      makeText("B", { x: 875, y: 260, width: 180, height: 160 }, 126, "#dc2626"),
      makeText("VS", { x: 550, y: 290, width: 180, height: 120 }, 74),
    ],
  },
  {
    id: "tutorial-callout",
    name: "Tutorial callout",
    description: "A focused content frame with a clear annotation.",
    createObjects: () => [
      createRectangleObject({ x: 80, y: 90, width: 760, height: 500 }),
      makeText("DO THIS FIRST", { x: 750, y: 65, width: 450, height: 120 }, 62, "#ef4444"),
      createArrowObject({ x: 940, y: 210 }, { x: 735, y: 310 }),
      makeText("1", { x: 115, y: 115, width: 130, height: 130 }, 96, "#3b82f6"),
    ],
  },
];
