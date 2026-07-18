import { nanoid } from "nanoid";
import { z } from "zod";

export const DRAWING_WIDTH = 1600;
export const DRAWING_HEIGHT = 900;
export const DRAWING_VERSION = 1 as const;

const colorSchema = z.string().min(1).max(64);

const baseObjectSchema = z.object({
  id: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().nonnegative(),
  height: z.number().finite().nonnegative(),
  stroke: colorSchema,
  fill: colorSchema,
  strokeWidth: z.number().finite().min(0).max(40),
  opacity: z.number().finite().min(0).max(1),
});

const textObjectSchema = baseObjectSchema.extend({
  type: z.literal("text"),
  text: z.string().max(2_000),
  fontSize: z.number().finite().min(12).max(360),
  fontWeight: z.union([z.literal(500), z.literal(700), z.literal(900)]),
  textAlign: z.union([
    z.literal("left"),
    z.literal("center"),
    z.literal("right"),
  ]),
});

const rectangleObjectSchema = baseObjectSchema.extend({
  type: z.literal("rectangle"),
  radius: z.number().finite().min(0).max(100),
});

const ellipseObjectSchema = baseObjectSchema.extend({
  type: z.literal("ellipse"),
});

const arrowObjectSchema = baseObjectSchema.extend({
  type: z.literal("arrow"),
  flipX: z.boolean(),
  flipY: z.boolean(),
});

const pencilObjectSchema = baseObjectSchema.extend({
  type: z.literal("pencil"),
  points: z
    .array(
      z.object({
        x: z.number().finite().min(0).max(1),
        y: z.number().finite().min(0).max(1),
      }),
    )
    .min(2)
    .max(5_000),
});

const imageObjectSchema = baseObjectSchema.extend({
  type: z.literal("image"),
  dataUrl: z.string().min(1),
  alt: z.string().max(200),
});

const personObjectSchema = baseObjectSchema.extend({
  type: z.literal("person"),
  label: z.string().max(80),
});

export const drawingObjectSchema = z.discriminatedUnion("type", [
  textObjectSchema,
  rectangleObjectSchema,
  ellipseObjectSchema,
  arrowObjectSchema,
  pencilObjectSchema,
  imageObjectSchema,
  personObjectSchema,
]);

export const drawingDocumentSchema = z.object({
  version: z.literal(DRAWING_VERSION),
  width: z.literal(DRAWING_WIDTH),
  height: z.literal(DRAWING_HEIGHT),
  background: colorSchema,
  objects: z.array(drawingObjectSchema).max(500),
});

export type DrawingObject = z.infer<typeof drawingObjectSchema>;
export type DrawingDocument = z.infer<typeof drawingDocumentSchema>;
export type DrawingObjectType = DrawingObject["type"];
export type DrawingTool =
  | "select"
  | "text"
  | "arrow"
  | "rectangle"
  | "ellipse"
  | "pencil";
export type ResizeHandle = "nw" | "ne" | "sw" | "se";

export type DrawingPoint = { x: number; y: number };

const BASE_STYLE = {
  stroke: "#172033",
  fill: "transparent",
  strokeWidth: 5,
  opacity: 1,
} as const;

export function createDrawingDocument(): DrawingDocument {
  return {
    version: DRAWING_VERSION,
    width: DRAWING_WIDTH,
    height: DRAWING_HEIGHT,
    background: "#fffdf8",
    objects: [],
  };
}

export function createTextObject(
  point: DrawingPoint,
  text = "Type something",
): Extract<DrawingObject, { type: "text" }> {
  return {
    id: nanoid(),
    type: "text",
    x: point.x,
    y: point.y,
    width: 560,
    height: 150,
    ...BASE_STYLE,
    fill: "#172033",
    strokeWidth: 0,
    text,
    fontSize: 82,
    fontWeight: 900,
    textAlign: "left",
  };
}

export function createShapeObject(
  type: "rectangle" | "ellipse" | "arrow",
  point: DrawingPoint,
): DrawingObject {
  const base = {
    id: nanoid(),
    x: point.x,
    y: point.y,
    width: 1,
    height: 1,
    ...BASE_STYLE,
  };

  if (type === "rectangle") {
    return { ...base, type, radius: 24 };
  }
  if (type === "ellipse") {
    return { ...base, type };
  }
  return {
    ...base,
    type,
    fill: "#ef4444",
    stroke: "#ef4444",
    strokeWidth: 9,
    flipX: false,
    flipY: false,
  };
}

export function createPersonObject(
  point: DrawingPoint = { x: 1_010, y: 170 },
): Extract<DrawingObject, { type: "person" }> {
  return {
    id: nanoid(),
    type: "person",
    x: point.x,
    y: point.y,
    width: 370,
    height: 610,
    stroke: "#172033",
    fill: "#f2c6a0",
    strokeWidth: 5,
    opacity: 1,
    label: "Subject",
  };
}

export function createImageObject(input: {
  dataUrl: string;
  width: number;
  height: number;
  alt: string;
}): Extract<DrawingObject, { type: "image" }> {
  const maxWidth = 760;
  const maxHeight = 620;
  const scale = Math.min(maxWidth / input.width, maxHeight / input.height, 1);
  const width = Math.max(80, input.width * scale);
  const height = Math.max(80, input.height * scale);

  return {
    id: nanoid(),
    type: "image",
    x: (DRAWING_WIDTH - width) / 2,
    y: (DRAWING_HEIGHT - height) / 2,
    width,
    height,
    stroke: "#172033",
    fill: "transparent",
    strokeWidth: 0,
    opacity: 1,
    dataUrl: input.dataUrl,
    alt: input.alt,
  };
}

export function createPencilObject(
  points: DrawingPoint[],
): Extract<DrawingObject, { type: "pencil" }> {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.max(2, Math.max(...xs) - minX);
  const height = Math.max(2, Math.max(...ys) - minY);

  return {
    id: nanoid(),
    type: "pencil",
    x: minX,
    y: minY,
    width,
    height,
    stroke: "#172033",
    fill: "transparent",
    strokeWidth: 7,
    opacity: 1,
    points: points.map((point) => ({
      x: clamp((point.x - minX) / width, 0, 1),
      y: clamp((point.y - minY) / height, 0, 1),
    })),
  };
}

export function serializeDrawingDocument(document: DrawingDocument) {
  return JSON.stringify(drawingDocumentSchema.parse(document));
}

export function deserializeDrawingDocument(value?: string | null) {
  if (!value) return createDrawingDocument();

  try {
    return drawingDocumentSchema.parse(JSON.parse(value));
  } catch {
    return createDrawingDocument();
  }
}

export function cloneDrawingObject<T extends DrawingObject>(object: T): T {
  return structuredClone(object);
}

export function cloneDrawingDocument(document: DrawingDocument) {
  return structuredClone(document);
}

export function duplicateDrawingObject(
  object: DrawingObject,
  offset = 32,
): DrawingObject {
  return {
    ...cloneDrawingObject(object),
    id: nanoid(),
    x: clamp(object.x + offset, 0, DRAWING_WIDTH - Math.max(object.width, 20)),
    y: clamp(
      object.y + offset,
      0,
      DRAWING_HEIGHT - Math.max(object.height, 20),
    ),
  };
}

export function updateDrawingObject(
  document: DrawingDocument,
  id: string,
  updater: (object: DrawingObject) => DrawingObject,
): DrawingDocument {
  return {
    ...document,
    objects: document.objects.map((object) =>
      object.id === id ? updater(object) : object,
    ),
  };
}

export function getDrawingTitle(document: DrawingDocument) {
  const firstText = document.objects.find(
    (object): object is Extract<DrawingObject, { type: "text" }> =>
      object.type === "text" && Boolean(object.text.trim()),
  );
  return (
    firstText?.text.trim().replace(/\s+/g, " ").slice(0, 70) ||
    "Drawing inspiration"
  );
}

export function constrainLine(
  start: DrawingPoint,
  point: DrawingPoint,
): DrawingPoint {
  const dx = point.x - start.x;
  const dy = point.y - start.y;
  const distance = Math.hypot(dx, dy);
  const snappedAngle =
    Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  return {
    x: start.x + Math.cos(snappedAngle) * distance,
    y: start.y + Math.sin(snappedAngle) * distance,
  };
}

export function normalizeDraggedObject(
  object: DrawingObject,
  start: DrawingPoint,
  end: DrawingPoint,
): DrawingObject {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.max(1, Math.abs(end.x - start.x));
  const height = Math.max(1, Math.abs(end.y - start.y));

  if (object.type === "arrow") {
    return {
      ...object,
      x,
      y,
      width,
      height,
      flipX: end.x < start.x,
      flipY: end.y < start.y,
    };
  }

  return { ...object, x, y, width, height };
}

export function objectBounds(object: DrawingObject) {
  return {
    x: object.x,
    y: object.y,
    width: Math.max(object.width, 1),
    height: Math.max(object.height, 1),
  };
}

type StarterTemplate = {
  id: "big-text-subject" | "reaction-arrow" | "versus" | "tutorial";
  name: string;
  description: string;
  createObjects: () => DrawingObject[];
};

function templateText(
  text: string,
  x: number,
  y: number,
  width: number,
  fontSize: number,
  fill = "#172033",
): Extract<DrawingObject, { type: "text" }> {
  return {
    ...createTextObject({ x, y }, text),
    width,
    height: fontSize * 2.3,
    fontSize,
    fill,
  };
}

function templateRectangle(
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
): Extract<DrawingObject, { type: "rectangle" }> {
  return {
    ...(createShapeObject("rectangle", { x, y }) as Extract<
      DrawingObject,
      { type: "rectangle" }
    >),
    width,
    height,
    fill,
    stroke: "#172033",
    strokeWidth: 4,
  };
}

function templateArrow(
  x: number,
  y: number,
  width: number,
  height: number,
): Extract<DrawingObject, { type: "arrow" }> {
  return {
    ...(createShapeObject("arrow", { x, y }) as Extract<
      DrawingObject,
      { type: "arrow" }
    >),
    width,
    height,
  };
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "big-text-subject",
    name: "Big idea",
    description: "Big text plus a subject",
    createObjects: () => [
      templateRectangle(70, 90, 1_460, 720, "#fff7df"),
      templateText("YOUR BIG\nIDEA", 130, 205, 760, 132),
      createPersonObject({ x: 1_040, y: 145 }),
    ],
  },
  {
    id: "reaction-arrow",
    name: "Reaction",
    description: "Person reaction plus arrow",
    createObjects: () => [
      templateRectangle(70, 90, 1_460, 720, "#e9f4ff"),
      createPersonObject({ x: 160, y: 155 }),
      templateArrow(590, 415, 360, 80),
      templateText("LOOK HERE", 980, 330, 450, 96, "#172033"),
    ],
  },
  {
    id: "versus",
    name: "Versus",
    description: "Split-screen comparison",
    createObjects: () => [
      templateRectangle(70, 90, 710, 720, "#e9f4ff"),
      templateRectangle(820, 90, 710, 720, "#fff0e8"),
      { ...createPersonObject({ x: 210, y: 225 }), width: 300, height: 500 },
      { ...createPersonObject({ x: 1_080, y: 225 }), width: 300, height: 500 },
      templateText("VS", 685, 355, 230, 122, "#ef4444"),
    ],
  },
  {
    id: "tutorial",
    name: "Tutorial",
    description: "Headline and callout",
    createObjects: () => [
      templateRectangle(70, 90, 1_460, 720, "#f4f0ff"),
      templateText("HOW TO DO IT", 120, 125, 1_030, 112),
      templateRectangle(150, 425, 690, 235, "#ffffff"),
      templateText("3 SIMPLE STEPS", 205, 485, 560, 65, "#172033"),
      templateArrow(850, 500, 310, 80),
      { ...createPersonObject({ x: 1_180, y: 295 }), width: 250, height: 420 },
    ],
  },
];

export function createDocumentFromTemplate(templateId: StarterTemplate["id"]) {
  const template = STARTER_TEMPLATES.find((item) => item.id === templateId);
  return {
    ...createDrawingDocument(),
    objects: template?.createObjects() ?? [],
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
