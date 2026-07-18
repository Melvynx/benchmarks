import { v, type Infer } from "convex/values";

const drawingObjectBase = {
  id: v.string(),
  x: v.number(),
  y: v.number(),
  width: v.number(),
  height: v.number(),
  opacity: v.number(),
};

const shapeStyle = {
  fill: v.string(),
  stroke: v.string(),
  strokeWidth: v.number(),
};

const rectangleValidator = v.object({
  ...drawingObjectBase,
  ...shapeStyle,
  type: v.literal("rect"),
});

const ellipseValidator = v.object({
  ...drawingObjectBase,
  ...shapeStyle,
  type: v.literal("ellipse"),
});

const arrowValidator = v.object({
  ...drawingObjectBase,
  type: v.literal("arrow"),
  stroke: v.string(),
  strokeWidth: v.number(),
  startX: v.number(),
  startY: v.number(),
  endX: v.number(),
  endY: v.number(),
});

const textValidator = v.object({
  ...drawingObjectBase,
  type: v.literal("text"),
  text: v.string(),
  fontSize: v.number(),
  fontFamily: v.union(v.literal("sans"), v.literal("display")),
  fontWeight: v.union(v.literal("normal"), v.literal("bold")),
  align: v.union(v.literal("left"), v.literal("center"), v.literal("right")),
  color: v.string(),
});

const pencilValidator = v.object({
  ...drawingObjectBase,
  type: v.literal("pencil"),
  points: v.array(
    v.object({
      x: v.number(),
      y: v.number(),
    }),
  ),
  stroke: v.string(),
  strokeWidth: v.number(),
});

const imageValidator = v.object({
  ...drawingObjectBase,
  type: v.literal("image"),
  src: v.string(),
  alt: v.string(),
  fit: v.union(v.literal("cover"), v.literal("contain")),
});

const personValidator = v.object({
  ...drawingObjectBase,
  type: v.literal("person"),
  label: v.string(),
  fill: v.string(),
  stroke: v.string(),
});

export const drawingObjectValidator = v.union(
  rectangleValidator,
  ellipseValidator,
  arrowValidator,
  textValidator,
  pencilValidator,
  imageValidator,
  personValidator,
);

export const drawingDocumentValidator = v.object({
  version: v.literal(1),
  width: v.literal(1280),
  height: v.literal(720),
  background: v.string(),
  objects: v.array(drawingObjectValidator),
});

export type DrawingDocumentValue = Infer<typeof drawingDocumentValidator>;

const MAX_OBJECTS = 500;
const MAX_POINTS = 10_000;

export function assertValidDrawingDocument(
  document: DrawingDocumentValue,
): void {
  assertString(document.background, 1, 100);
  if (document.objects.length > MAX_OBJECTS) invalidDocument();

  const objectIds = new Set<string>();
  for (const object of document.objects) {
    assertString(object.id, 1, 200);
    if (objectIds.has(object.id)) invalidDocument();
    objectIds.add(object.id);

    assertFinite(object.x);
    assertFinite(object.y);
    assertRange(object.width, Number.MIN_VALUE, 10_000);
    assertRange(object.height, Number.MIN_VALUE, 10_000);
    assertRange(object.opacity, 0, 1);

    if (object.type === "rect" || object.type === "ellipse") {
      assertString(object.fill, 1, 100);
      assertString(object.stroke, 1, 100);
      assertRange(object.strokeWidth, 0, 100);
      continue;
    }

    if (object.type === "arrow") {
      assertString(object.stroke, 1, 100);
      assertRange(object.strokeWidth, Number.MIN_VALUE, 100);
      assertNormalized(object.startX);
      assertNormalized(object.startY);
      assertNormalized(object.endX);
      assertNormalized(object.endY);
      continue;
    }

    if (object.type === "text") {
      assertString(object.text, 0, 10_000, false);
      assertString(object.color, 1, 100);
      assertRange(object.fontSize, Number.MIN_VALUE, 500);
      continue;
    }

    if (object.type === "pencil") {
      assertString(object.stroke, 1, 100);
      assertRange(object.strokeWidth, Number.MIN_VALUE, 100);
      if (object.points.length < 2 || object.points.length > MAX_POINTS) {
        invalidDocument();
      }
      for (const point of object.points) {
        assertNormalized(point.x);
        assertNormalized(point.y);
      }
      continue;
    }

    if (object.type === "image") {
      assertString(object.src, 1, 5_000);
      assertString(object.alt, 0, 500, false);
      continue;
    }

    assertString(object.label, 1, 100);
    assertString(object.fill, 1, 100);
    assertString(object.stroke, 1, 100);
  }
}

function assertFinite(value: number): void {
  if (!Number.isFinite(value)) invalidDocument();
}

function assertRange(value: number, minimum: number, maximum: number): void {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    invalidDocument();
  }
}

function assertNormalized(value: number): void {
  assertRange(value, 0, 1);
}

function assertString(
  value: string,
  minimum: number,
  maximum: number,
  trim = true,
): void {
  const checked = trim ? value.trim() : value;
  if (checked.length < minimum || value.length > maximum) invalidDocument();
}

function invalidDocument(): never {
  throw new Error("Invalid drawing document");
}
