export const DRAWING_CANVAS = {
  width: 1280,
  height: 720,
  aspectRatio: "16:9",
} as const;

export const drawingToolMap = {
  select: "select",
  pan: "pan",
  pen: "pen",
  rect: "rect",
  roundRect: "roundRect",
  ellipse: "ellipse",
  line: "line",
  arrow: "arrow",
  text: "text",
  placeholder: "placeholder",
  image: "image",
} as const;

export type DrawingTool = keyof typeof drawingToolMap;

export const drawingObjectTypeMap = {
  freehand: "freehand",
  rect: "rect",
  ellipse: "ellipse",
  line: "line",
  arrow: "arrow",
  text: "text",
  image: "image",
  placeholder: "placeholder",
} as const;

export type DrawingObjectType = keyof typeof drawingObjectTypeMap;

export type DrawingTextAlign = "left" | "center" | "right";

export type DrawingPlaceholderVariant =
  | "person"
  | "face"
  | "reaction"
  | "badge"
  | "burst"
  | "callout"
  | "emoji";

export type DrawingStyle = {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  radius?: number;
  fontSize?: number;
  fontWeight?: number;
  align?: DrawingTextAlign;
  outline?: boolean;
  shadow?: boolean;
  arrowHead?: boolean;
};

type DrawingObjectBase<TType extends DrawingObjectType> = {
  id: string;
  type: TType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked?: boolean;
  visible?: boolean;
  groupId?: string;
  style: DrawingStyle;
};

export type DrawingShapeObject =
  | DrawingObjectBase<"rect">
  | DrawingObjectBase<"ellipse">
  | DrawingObjectBase<"line">
  | DrawingObjectBase<"arrow">;

export type DrawingFreehandObject = DrawingObjectBase<"freehand"> & {
  type: "freehand";
  points: { x: number; y: number }[];
};

export type DrawingTextObject = DrawingObjectBase<"text"> & {
  type: "text";
  text: string;
};

export type DrawingImageObject = DrawingObjectBase<"image"> & {
  type: "image";
  src: string;
};

export type DrawingPlaceholderObject = DrawingObjectBase<"placeholder"> & {
  type: "placeholder";
  variant: DrawingPlaceholderVariant;
};

export type DrawingObject =
  | DrawingFreehandObject
  | DrawingTextObject
  | DrawingImageObject
  | DrawingPlaceholderObject
  | DrawingShapeObject;

export type DrawingDocument = {
  version: 1;
  canvas: {
    width: number;
    height: number;
    aspectRatio: string;
    background: string;
  };
  templateId?: string;
  objects: DrawingObject[];
  updatedAt: string;
};

export function createEmptyDrawingDocument(
  templateId?: string,
): DrawingDocument {
  return {
    version: 1,
    canvas: {
      width: DRAWING_CANVAS.width,
      height: DRAWING_CANVAS.height,
      aspectRatio: DRAWING_CANVAS.aspectRatio,
      background: "#f8fafc",
    },
    templateId,
    objects: [],
    updatedAt: new Date().toISOString(),
  };
}

export function createDrawingId(prefix = "obj") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function isDrawingDocument(value: unknown): value is DrawingDocument {
  if (!value || typeof value !== "object") return false;
  const doc = value as Partial<DrawingDocument>;
  return doc.version === 1 && Boolean(doc.canvas) && Array.isArray(doc.objects);
}

export function hasDrawingPlaceholders(document: DrawingDocument) {
  return document.objects.some((object) => object.type === "placeholder");
}
