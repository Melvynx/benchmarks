import { z } from "zod";

export const DRAWING_DOCUMENT_VERSION = 1 as const;
export const DRAWING_DOCUMENT_WIDTH = 1280 as const;
export const DRAWING_DOCUMENT_HEIGHT = 720 as const;
export const DRAWING_DOCUMENT_BACKGROUND = "#ffffff";
export const MIN_DRAWING_OBJECT_SIZE = 1;

const finiteNumberSchema = z.number().finite();
const positiveSizeSchema = finiteNumberSchema.positive().max(10_000);
const normalizedCoordinateSchema = finiteNumberSchema.min(0).max(1);
const colorSchema = z.string().trim().min(1).max(100);

export const DrawingPointSchema = z
  .object({
    x: normalizedCoordinateSchema,
    y: normalizedCoordinateSchema,
  })
  .strict();

export type DrawingPoint = z.infer<typeof DrawingPointSchema>;

export type CanvasPoint = {
  x: number;
  y: number;
};

export type DrawingBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const DrawingObjectBaseSchema = z
  .object({
    id: z.string().trim().min(1).max(200),
    x: finiteNumberSchema,
    y: finiteNumberSchema,
    width: positiveSizeSchema,
    height: positiveSizeSchema,
    opacity: finiteNumberSchema.min(0).max(1),
  })
  .strict();

const strokedShapeFields = {
  fill: colorSchema,
  stroke: colorSchema,
  strokeWidth: finiteNumberSchema.min(0).max(100),
};

export const DrawingRectObjectSchema = DrawingObjectBaseSchema.extend({
  type: z.literal("rect"),
  ...strokedShapeFields,
}).strict();

export const DrawingEllipseObjectSchema = DrawingObjectBaseSchema.extend({
  type: z.literal("ellipse"),
  ...strokedShapeFields,
}).strict();

export const DrawingArrowObjectSchema = DrawingObjectBaseSchema.extend({
  type: z.literal("arrow"),
  startX: normalizedCoordinateSchema,
  startY: normalizedCoordinateSchema,
  endX: normalizedCoordinateSchema,
  endY: normalizedCoordinateSchema,
  stroke: colorSchema,
  strokeWidth: finiteNumberSchema.positive().max(100),
}).strict();

export const DrawingTextObjectSchema = DrawingObjectBaseSchema.extend({
  type: z.literal("text"),
  text: z.string().max(10_000),
  color: colorSchema,
  fontSize: finiteNumberSchema.positive().max(500),
  fontFamily: z.enum(["sans", "display"]),
  fontWeight: z.enum(["normal", "bold"]),
  align: z.enum(["left", "center", "right"]),
}).strict();

export const DrawingPencilObjectSchema = DrawingObjectBaseSchema.extend({
  type: z.literal("pencil"),
  points: z.array(DrawingPointSchema).min(2).max(10_000),
  stroke: colorSchema,
  strokeWidth: finiteNumberSchema.positive().max(100),
}).strict();

export const DrawingImageObjectSchema = DrawingObjectBaseSchema.extend({
  type: z.literal("image"),
  src: z.string().trim().min(1).max(5_000),
  alt: z.string().max(500),
  fit: z.enum(["cover", "contain"]),
}).strict();

export const DrawingPersonObjectSchema = DrawingObjectBaseSchema.extend({
  type: z.literal("person"),
  label: z.string().trim().min(1).max(100),
  fill: colorSchema,
  stroke: colorSchema,
}).strict();

export const DrawingObjectSchema = z.discriminatedUnion("type", [
  DrawingRectObjectSchema,
  DrawingEllipseObjectSchema,
  DrawingArrowObjectSchema,
  DrawingTextObjectSchema,
  DrawingPencilObjectSchema,
  DrawingImageObjectSchema,
  DrawingPersonObjectSchema,
]);

export type DrawingRectObject = z.infer<typeof DrawingRectObjectSchema>;
export type DrawingEllipseObject = z.infer<typeof DrawingEllipseObjectSchema>;
export type DrawingArrowObject = z.infer<typeof DrawingArrowObjectSchema>;
export type DrawingTextObject = z.infer<typeof DrawingTextObjectSchema>;
export type DrawingPencilObject = z.infer<typeof DrawingPencilObjectSchema>;
export type DrawingImageObject = z.infer<typeof DrawingImageObjectSchema>;
export type DrawingPersonObject = z.infer<typeof DrawingPersonObjectSchema>;
export type DrawingObject = z.infer<typeof DrawingObjectSchema>;

// Short aliases keep editor rendering code readable while the Drawing-prefixed
// names remain explicit at persistence boundaries.
export type RectObject = DrawingRectObject;
export type EllipseObject = DrawingEllipseObject;
export type ArrowObject = DrawingArrowObject;
export type TextObject = DrawingTextObject;
export type PencilObject = DrawingPencilObject;
export type ImageObject = DrawingImageObject;
export type PersonObject = DrawingPersonObject;

export const DrawingDocumentSchema = z
  .object({
    version: z.literal(DRAWING_DOCUMENT_VERSION),
    width: z.literal(DRAWING_DOCUMENT_WIDTH),
    height: z.literal(DRAWING_DOCUMENT_HEIGHT),
    background: colorSchema,
    objects: z.array(DrawingObjectSchema).max(500),
  })
  .strict()
  .superRefine((document, context) => {
    const objectIds = new Set<string>();

    for (const [index, object] of document.objects.entries()) {
      if (objectIds.has(object.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate drawing object id: ${object.id}`,
          path: ["objects", index, "id"],
        });
      }
      objectIds.add(object.id);
    }
  });

export type DrawingDocument = z.infer<typeof DrawingDocumentSchema>;

export type DrawingObjectFactoryInput<TObject extends DrawingObject> = Partial<
  Omit<TObject, "type">
>;

let fallbackObjectId = 0;

export function createDrawingObjectId(): string {
  try {
    return globalThis.crypto.randomUUID();
  } catch {
    fallbackObjectId += 1;
    return `drawing-object-${Date.now()}-${fallbackObjectId}`;
  }
}

export function createRectangle(
  input: DrawingObjectFactoryInput<DrawingRectObject> = {},
): DrawingRectObject {
  return DrawingRectObjectSchema.parse({
    id: createDrawingObjectId(),
    type: "rect",
    x: 120,
    y: 120,
    width: 320,
    height: 180,
    opacity: 1,
    fill: "#ffffff",
    stroke: "#111827",
    strokeWidth: 4,
    ...input,
  });
}

export function createEllipse(
  input: DrawingObjectFactoryInput<DrawingEllipseObject> = {},
): DrawingEllipseObject {
  return DrawingEllipseObjectSchema.parse({
    id: createDrawingObjectId(),
    type: "ellipse",
    x: 160,
    y: 140,
    width: 260,
    height: 180,
    opacity: 1,
    fill: "#ffffff",
    stroke: "#111827",
    strokeWidth: 4,
    ...input,
  });
}

export function createArrow(
  input: DrawingObjectFactoryInput<DrawingArrowObject> = {},
): DrawingArrowObject {
  return DrawingArrowObjectSchema.parse({
    id: createDrawingObjectId(),
    type: "arrow",
    x: 300,
    y: 260,
    width: 280,
    height: 120,
    opacity: 1,
    startX: 0,
    startY: 0,
    endX: 1,
    endY: 1,
    stroke: "#dc2626",
    strokeWidth: 8,
    ...input,
  });
}

export function createText(
  input: DrawingObjectFactoryInput<DrawingTextObject> = {},
): DrawingTextObject {
  return DrawingTextObjectSchema.parse({
    id: createDrawingObjectId(),
    type: "text",
    x: 120,
    y: 100,
    width: 600,
    height: 160,
    opacity: 1,
    text: "Add a headline",
    color: "#111827",
    fontSize: 72,
    fontFamily: "sans",
    fontWeight: "bold",
    align: "left",
    ...input,
  });
}

export function createPencil(
  input: DrawingObjectFactoryInput<DrawingPencilObject> = {},
): DrawingPencilObject {
  return DrawingPencilObjectSchema.parse({
    id: createDrawingObjectId(),
    type: "pencil",
    x: 200,
    y: 320,
    width: 300,
    height: 120,
    opacity: 1,
    points: [
      { x: 0, y: 0.5 },
      { x: 0.33, y: 0.2 },
      { x: 0.66, y: 0.8 },
      { x: 1, y: 0.5 },
    ],
    stroke: "#111827",
    strokeWidth: 6,
    ...input,
  });
}

export type CreateImageInput = DrawingObjectFactoryInput<DrawingImageObject> &
  Pick<DrawingImageObject, "src">;

export function createImage(input: CreateImageInput): DrawingImageObject {
  return DrawingImageObjectSchema.parse({
    id: createDrawingObjectId(),
    type: "image",
    x: 160,
    y: 100,
    width: 420,
    height: 420,
    opacity: 1,
    alt: "Inserted image",
    fit: "cover",
    ...input,
  });
}

export function createPerson(
  input: DrawingObjectFactoryInput<DrawingPersonObject> = {},
): DrawingPersonObject {
  return DrawingPersonObjectSchema.parse({
    id: createDrawingObjectId(),
    type: "person",
    x: 820,
    y: 100,
    width: 320,
    height: 520,
    opacity: 1,
    label: "PERSON",
    fill: "#e2e8f0",
    stroke: "#475569",
    ...input,
  });
}

export type CreateDrawingDocumentInput = {
  background?: string;
  objects?: DrawingObject[];
};

export function createDrawingDocument(
  input: CreateDrawingDocumentInput = {},
): DrawingDocument {
  return DrawingDocumentSchema.parse({
    version: DRAWING_DOCUMENT_VERSION,
    width: DRAWING_DOCUMENT_WIDTH,
    height: DRAWING_DOCUMENT_HEIGHT,
    background: input.background ?? DRAWING_DOCUMENT_BACKGROUND,
    objects: input.objects ?? [],
  });
}

export function createEmptyDrawingDocument(
  background = DRAWING_DOCUMENT_BACKGROUND,
): DrawingDocument {
  return createDrawingDocument({ background });
}

export function parseDrawingDocument(input: unknown): DrawingDocument {
  const document: unknown =
    typeof input === "string" ? JSON.parse(input) : input;

  return DrawingDocumentSchema.parse(document);
}

export function serializeDrawingDocument(document: DrawingDocument): string {
  return JSON.stringify(DrawingDocumentSchema.parse(document));
}

export function cloneDrawingObject<TObject extends DrawingObject>(
  object: TObject,
): TObject {
  return DrawingObjectSchema.parse(object) as TObject;
}

export function cloneDrawingDocument(
  document: DrawingDocument,
): DrawingDocument {
  return DrawingDocumentSchema.parse(document);
}

export function getObjectBounds(object: DrawingObject): DrawingBounds {
  return {
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
  };
}

export function normalizeBounds(bounds: DrawingBounds): DrawingBounds {
  const x = bounds.width < 0 ? bounds.x + bounds.width : bounds.x;
  const y = bounds.height < 0 ? bounds.y + bounds.height : bounds.y;

  return {
    x,
    y,
    width: Math.max(Math.abs(bounds.width), MIN_DRAWING_OBJECT_SIZE),
    height: Math.max(Math.abs(bounds.height), MIN_DRAWING_OBJECT_SIZE),
  };
}

export function moveObject<TObject extends DrawingObject>(
  object: TObject,
  deltaX: number,
  deltaY: number,
): TObject {
  return {
    ...object,
    x: object.x + deltaX,
    y: object.y + deltaY,
  };
}

export function resizeObject<TObject extends DrawingObject>(
  object: TObject,
  bounds: DrawingBounds,
): TObject {
  const normalizedBounds = normalizeBounds(bounds);

  return {
    ...object,
    ...normalizedBounds,
  };
}

export function duplicateObject<TObject extends DrawingObject>(
  object: TObject,
  offset = 24,
): TObject {
  const clone = cloneDrawingObject(object);

  return {
    ...clone,
    id: createDrawingObjectId(),
    x: clone.x + offset,
    y: clone.y + offset,
  };
}

export function localPointToCanvasPoint(
  bounds: DrawingBounds,
  point: DrawingPoint,
): CanvasPoint {
  return {
    x: bounds.x + point.x * bounds.width,
    y: bounds.y + point.y * bounds.height,
  };
}

function clampNormalized(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function canvasPointToLocalPoint(
  bounds: DrawingBounds,
  point: CanvasPoint,
): DrawingPoint {
  return {
    x: clampNormalized((point.x - bounds.x) / bounds.width),
    y: clampNormalized((point.y - bounds.y) / bounds.height),
  };
}

export function getBoundsForCanvasPoints(
  points: readonly CanvasPoint[],
): DrawingBounds {
  if (points.length === 0) {
    throw new Error("At least one canvas point is required");
  }

  const firstPoint = points[0];
  let minX = firstPoint.x;
  let maxX = firstPoint.x;
  let minY = firstPoint.y;
  let maxY = firstPoint.y;

  for (const point of points.slice(1)) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, MIN_DRAWING_OBJECT_SIZE),
    height: Math.max(maxY - minY, MIN_DRAWING_OBJECT_SIZE),
  };
}

export type ArrowFromCanvasPointsInput = Partial<
  Pick<DrawingArrowObject, "id" | "opacity" | "stroke" | "strokeWidth">
>;

export function createArrowFromCanvasPoints(
  start: CanvasPoint,
  end: CanvasPoint,
  input: ArrowFromCanvasPointsInput = {},
): DrawingArrowObject {
  const bounds = getBoundsForCanvasPoints([start, end]);
  const localStart = canvasPointToLocalPoint(bounds, start);
  const localEnd = canvasPointToLocalPoint(bounds, end);

  return createArrow({
    ...bounds,
    startX: localStart.x,
    startY: localStart.y,
    endX: localEnd.x,
    endY: localEnd.y,
    ...input,
  });
}

export type PencilFromCanvasPointsInput = Partial<
  Pick<DrawingPencilObject, "id" | "opacity" | "stroke" | "strokeWidth">
>;

export function createPencilFromCanvasPoints(
  canvasPoints: readonly CanvasPoint[],
  input: PencilFromCanvasPointsInput = {},
): DrawingPencilObject {
  if (canvasPoints.length === 0) {
    throw new Error("At least one canvas point is required");
  }

  const points =
    canvasPoints.length === 1
      ? [canvasPoints[0], canvasPoints[0]]
      : [...canvasPoints];
  const bounds = getBoundsForCanvasPoints(points);

  return createPencil({
    ...bounds,
    points: points.map((point) => canvasPointToLocalPoint(bounds, point)),
    ...input,
  });
}

function distanceToLineSegment(
  point: CanvasPoint,
  start: CanvasPoint,
  end: CanvasPoint,
): number {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const projection = Math.min(
    1,
    Math.max(
      0,
      ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) /
        lengthSquared,
    ),
  );
  const nearestX = start.x + projection * deltaX;
  const nearestY = start.y + projection * deltaY;

  return Math.hypot(point.x - nearestX, point.y - nearestY);
}

function isPointInBounds(
  point: CanvasPoint,
  bounds: DrawingBounds,
  tolerance: number,
): boolean {
  return (
    point.x >= bounds.x - tolerance &&
    point.x <= bounds.x + bounds.width + tolerance &&
    point.y >= bounds.y - tolerance &&
    point.y <= bounds.y + bounds.height + tolerance
  );
}

export function containsPoint(
  object: DrawingObject,
  point: CanvasPoint,
  tolerance = 8,
): boolean {
  const bounds = getObjectBounds(object);

  if (object.type === "ellipse") {
    const radiusX = object.width / 2 + tolerance;
    const radiusY = object.height / 2 + tolerance;
    const centerX = object.x + object.width / 2;
    const centerY = object.y + object.height / 2;
    const normalizedX = (point.x - centerX) / radiusX;
    const normalizedY = (point.y - centerY) / radiusY;

    return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
  }

  if (object.type === "arrow") {
    const start = localPointToCanvasPoint(bounds, {
      x: object.startX,
      y: object.startY,
    });
    const end = localPointToCanvasPoint(bounds, {
      x: object.endX,
      y: object.endY,
    });

    return distanceToLineSegment(point, start, end) <= tolerance;
  }

  if (object.type === "pencil") {
    const canvasPoints = object.points.map((localPoint) =>
      localPointToCanvasPoint(bounds, localPoint),
    );

    return canvasPoints.slice(1).some((end, index) => {
      const start = canvasPoints[index];
      return distanceToLineSegment(point, start, end) <= tolerance;
    });
  }

  return isPointInBounds(point, bounds, tolerance);
}

export function isPersonObject(
  object: DrawingObject,
): object is DrawingPersonObject {
  return object.type === "person";
}

export function hasPersonObject(
  documentOrObjects: DrawingDocument | readonly DrawingObject[],
): boolean {
  const objects =
    "version" in documentOrObjects
      ? documentOrObjects.objects
      : documentOrObjects;

  return objects.some(isPersonObject);
}

export const STARTER_TEMPLATE_IDS = [
  "big-text-subject",
  "reaction-arrow",
  "versus-split",
  "tutorial-callout",
] as const;

export type DrawingStarterTemplateId = (typeof STARTER_TEMPLATE_IDS)[number];

export type DrawingStarterTemplate = {
  id: DrawingStarterTemplateId;
  name: string;
  description: string;
};

export const STARTER_TEMPLATES: readonly DrawingStarterTemplate[] = [
  {
    id: "big-text-subject",
    name: "Big text + subject",
    description: "A bold promise with a clear subject on the right.",
  },
  {
    id: "reaction-arrow",
    name: "Reaction + arrow",
    description: "A reaction-led composition with one strong focal arrow.",
  },
  {
    id: "versus-split",
    name: "Versus split",
    description: "A balanced before-and-after or head-to-head layout.",
  },
  {
    id: "tutorial-callout",
    name: "Tutorial callout",
    description: "A simple tutorial frame with a numbered callout.",
  },
];

function createBigTextSubjectTemplate(): DrawingDocument {
  return createDrawingDocument({
    background: "#f8fafc",
    objects: [
      createText({
        x: 72,
        y: 100,
        width: 720,
        height: 250,
        text: "YOUR BIG\nIDEA",
        fontSize: 112,
        fontWeight: "bold",
      }),
      createPencil({
        x: 84,
        y: 382,
        width: 610,
        height: 28,
        points: [
          { x: 0, y: 0.65 },
          { x: 0.28, y: 0.35 },
          { x: 0.58, y: 0.72 },
          { x: 1, y: 0.25 },
        ],
        stroke: "#f97316",
        strokeWidth: 14,
      }),
      createPerson({
        x: 850,
        y: 72,
        width: 350,
        height: 590,
        label: "SUBJECT",
        fill: "#dbeafe",
        stroke: "#2563eb",
      }),
    ],
  });
}

function createReactionArrowTemplate(): DrawingDocument {
  return createDrawingDocument({
    background: "#fff7ed",
    objects: [
      createPerson({
        x: 68,
        y: 86,
        width: 430,
        height: 570,
        label: "REACTION",
        fill: "#ffedd5",
        stroke: "#ea580c",
      }),
      createEllipse({
        x: 700,
        y: 72,
        width: 480,
        height: 220,
        fill: "#ffffff",
        stroke: "#111827",
        strokeWidth: 6,
      }),
      createText({
        x: 740,
        y: 122,
        width: 400,
        height: 120,
        text: "NO WAY!",
        fontSize: 72,
        align: "center",
      }),
      createArrowFromCanvasPoints(
        { x: 930, y: 360 },
        { x: 480, y: 400 },
        { stroke: "#dc2626", strokeWidth: 16 },
      ),
    ],
  });
}

function createVersusSplitTemplate(): DrawingDocument {
  return createDrawingDocument({
    background: "#ffffff",
    objects: [
      createRectangle({
        x: 0,
        y: 0,
        width: 640,
        height: 720,
        fill: "#dbeafe",
        stroke: "transparent",
        strokeWidth: 0,
      }),
      createRectangle({
        x: 640,
        y: 0,
        width: 640,
        height: 720,
        fill: "#fee2e2",
        stroke: "transparent",
        strokeWidth: 0,
      }),
      createPerson({
        x: 76,
        y: 120,
        width: 390,
        height: 530,
        label: "BEFORE",
        fill: "#bfdbfe",
        stroke: "#2563eb",
      }),
      createPerson({
        x: 814,
        y: 120,
        width: 390,
        height: 530,
        label: "AFTER",
        fill: "#fecaca",
        stroke: "#dc2626",
      }),
      createEllipse({
        x: 530,
        y: 260,
        width: 220,
        height: 220,
        fill: "#111827",
        stroke: "#ffffff",
        strokeWidth: 10,
      }),
      createText({
        x: 545,
        y: 318,
        width: 190,
        height: 100,
        text: "VS",
        color: "#ffffff",
        fontSize: 82,
        align: "center",
      }),
    ],
  });
}

function createTutorialCalloutTemplate(): DrawingDocument {
  return createDrawingDocument({
    background: "#f8fafc",
    objects: [
      createText({
        x: 70,
        y: 54,
        width: 850,
        height: 110,
        text: "3 SIMPLE STEPS",
        fontSize: 76,
        fontWeight: "bold",
      }),
      createRectangle({
        x: 72,
        y: 190,
        width: 790,
        height: 450,
        fill: "#ffffff",
        stroke: "#334155",
        strokeWidth: 6,
      }),
      createEllipse({
        x: 940,
        y: 230,
        width: 210,
        height: 210,
        fill: "#facc15",
        stroke: "#111827",
        strokeWidth: 6,
      }),
      createText({
        x: 965,
        y: 270,
        width: 160,
        height: 125,
        text: "1",
        fontSize: 104,
        align: "center",
      }),
      createArrowFromCanvasPoints(
        { x: 1010, y: 500 },
        { x: 770, y: 410 },
        { stroke: "#dc2626", strokeWidth: 14 },
      ),
      createText({
        x: 900,
        y: 555,
        width: 310,
        height: 80,
        text: "CLICK HERE",
        color: "#dc2626",
        fontSize: 46,
        align: "center",
      }),
    ],
  });
}

const templateBuilders: Record<
  DrawingStarterTemplateId,
  () => DrawingDocument
> = {
  "big-text-subject": createBigTextSubjectTemplate,
  "reaction-arrow": createReactionArrowTemplate,
  "versus-split": createVersusSplitTemplate,
  "tutorial-callout": createTutorialCalloutTemplate,
};

export function createDocumentFromTemplate(
  templateId: DrawingStarterTemplateId,
): DrawingDocument {
  return templateBuilders[templateId]();
}
