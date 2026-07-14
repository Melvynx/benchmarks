import type {
  DrawingDocument,
  DrawingObject,
  DrawingPoint,
  DrawingTemplateId,
} from "./drawing-types";

export const DRAWING_WIDTH = 1280;
export const DRAWING_HEIGHT = 720;

const DEFAULT_STROKE = "#191919";

export function createEmptyDrawingDocument(): DrawingDocument {
  return {
    version: 1,
    width: DRAWING_WIDTH,
    height: DRAWING_HEIGHT,
    background: "#fffdf7",
    objects: [],
  };
}

export function createDrawingObjectId() {
  return `draw_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function cloneDrawingObject(object: DrawingObject): DrawingObject {
  return {
    ...object,
    id: createDrawingObjectId(),
    x: object.x + 28,
    y: object.y + 28,
  } as DrawingObject;
}

export function getObjectBounds(object: DrawingObject) {
  if (object.type === "arrow") {
    const minX = Math.min(object.x, object.endX);
    const minY = Math.min(object.y, object.endY);
    const maxX = Math.max(object.x, object.endX);
    const maxY = Math.max(object.y, object.endY);
    return {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
  }

  if (object.type === "pencil") {
    const xs = object.points.map((point) => point.x);
    const ys = object.points.map((point) => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
  }

  return {
    x: object.x,
    y: object.y,
    width: Math.max(1, object.width),
    height: Math.max(1, object.height),
  };
}

export function pointInObject(point: DrawingPoint, object: DrawingObject) {
  const bounds = getObjectBounds(object);
  return (
    point.x >= bounds.x - 8 &&
    point.x <= bounds.x + bounds.width + 8 &&
    point.y >= bounds.y - 8 &&
    point.y <= bounds.y + bounds.height + 8
  );
}

export function moveObject(
  object: DrawingObject,
  dx: number,
  dy: number,
): DrawingObject {
  if (object.type === "arrow") {
    return {
      ...object,
      x: object.x + dx,
      y: object.y + dy,
      endX: object.endX + dx,
      endY: object.endY + dy,
    };
  }

  if (object.type === "pencil") {
    return {
      ...object,
      x: object.x + dx,
      y: object.y + dy,
      points: object.points.map((point) => ({
        x: point.x + dx,
        y: point.y + dy,
      })),
    };
  }

  return { ...object, x: object.x + dx, y: object.y + dy };
}

export function resizeObject(
  object: DrawingObject,
  handle: "nw" | "ne" | "sw" | "se",
  point: DrawingPoint,
  preserveAspect: boolean,
): DrawingObject {
  const bounds = getObjectBounds(object);
  const left = handle === "nw" || handle === "sw" ? point.x : bounds.x;
  const top = handle === "nw" || handle === "ne" ? point.y : bounds.y;
  const right =
    handle === "ne" || handle === "se" ? point.x : bounds.x + bounds.width;
  const bottom =
    handle === "sw" || handle === "se" ? point.y : bounds.y + bounds.height;

  let nextX = Math.min(left, right);
  let nextY = Math.min(top, bottom);
  let nextWidth = Math.max(12, Math.abs(right - left));
  let nextHeight = Math.max(12, Math.abs(bottom - top));

  if (preserveAspect) {
    const ratio = bounds.width / bounds.height || 1;
    if (nextWidth / nextHeight > ratio) {
      nextWidth = nextHeight * ratio;
    } else {
      nextHeight = nextWidth / ratio;
    }
    if (handle === "nw" || handle === "sw") {
      nextX = bounds.x + bounds.width - nextWidth;
    }
    if (handle === "nw" || handle === "ne") {
      nextY = bounds.y + bounds.height - nextHeight;
    }
  }

  if (object.type === "arrow") {
    return {
      ...object,
      x: nextX,
      y: nextY,
      endX: nextX + nextWidth,
      endY: nextY + nextHeight,
      width: nextWidth,
      height: nextHeight,
    };
  }

  if (object.type === "pencil") {
    const scaleX = nextWidth / bounds.width;
    const scaleY = nextHeight / bounds.height;
    return {
      ...object,
      x: nextX,
      y: nextY,
      width: nextWidth,
      height: nextHeight,
      points: object.points.map((p) => ({
        x: nextX + (p.x - bounds.x) * scaleX,
        y: nextY + (p.y - bounds.y) * scaleY,
      })),
    };
  }

  return {
    ...object,
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
  };
}

function textObject(
  text: string,
  x: number,
  y: number,
  width: number,
  fontSize: number,
): DrawingObject {
  return {
    id: createDrawingObjectId(),
    type: "text",
    x,
    y,
    width,
    height: fontSize * 1.2,
    stroke: DEFAULT_STROKE,
    fill: "transparent",
    strokeWidth: 0,
    text,
    fontSize,
    fontWeight: 800,
    align: "left",
  };
}

function placeholderObject(
  x: number,
  y: number,
  width: number,
  height: number,
  label = "Subject",
  pose: "front" | "reaction" = "front",
): DrawingObject {
  return {
    id: createDrawingObjectId(),
    type: "placeholder",
    x,
    y,
    width,
    height,
    stroke: DEFAULT_STROKE,
    fill: "#f1efe6",
    strokeWidth: 4,
    label,
    pose,
  };
}

function arrowObject(x: number, y: number, endX: number, endY: number) {
  return {
    id: createDrawingObjectId(),
    type: "arrow",
    x,
    y,
    width: Math.abs(endX - x),
    height: Math.abs(endY - y),
    endX,
    endY,
    stroke: "#e11d48",
    fill: "transparent",
    strokeWidth: 8,
  } satisfies DrawingObject;
}

export function getTemplateObjects(templateId: DrawingTemplateId) {
  if (templateId === "text-subject") {
    return [
      textObject("BIG CLAIM", 76, 110, 520, 88),
      textObject("short proof", 82, 222, 360, 44),
      placeholderObject(760, 110, 340, 520, "Person", "front"),
      {
        id: createDrawingObjectId(),
        type: "rectangle",
        x: 56,
        y: 80,
        width: 560,
        height: 330,
        stroke: DEFAULT_STROKE,
        fill: "transparent",
        strokeWidth: 4,
      } satisfies DrawingObject,
    ];
  }

  if (templateId === "reaction-arrow") {
    return [
      placeholderObject(72, 120, 330, 480, "Reaction", "reaction"),
      textObject("I did not expect this", 620, 92, 470, 68),
      arrowObject(525, 330, 810, 230),
      {
        id: createDrawingObjectId(),
        type: "ellipse",
        x: 735,
        y: 175,
        width: 260,
        height: 180,
        stroke: "#e11d48",
        fill: "transparent",
        strokeWidth: 6,
      } satisfies DrawingObject,
    ];
  }

  if (templateId === "versus") {
    return [
      {
        id: createDrawingObjectId(),
        type: "rectangle",
        x: 60,
        y: 80,
        width: 510,
        height: 560,
        stroke: DEFAULT_STROKE,
        fill: "#f5f5f4",
        strokeWidth: 4,
      } satisfies DrawingObject,
      {
        id: createDrawingObjectId(),
        type: "rectangle",
        x: 710,
        y: 80,
        width: 510,
        height: 560,
        stroke: DEFAULT_STROKE,
        fill: "#f5f5f4",
        strokeWidth: 4,
      } satisfies DrawingObject,
      textObject("OLD WAY", 130, 130, 360, 54),
      textObject("NEW WAY", 780, 130, 360, 54),
      textObject("VS", 585, 302, 140, 88),
    ];
  }

  return [
    textObject("3 STEPS", 86, 80, 360, 78),
    {
      id: createDrawingObjectId(),
      type: "rectangle",
      x: 78,
      y: 210,
      width: 520,
      height: 94,
      stroke: DEFAULT_STROKE,
      fill: "#fff",
      strokeWidth: 4,
    } satisfies DrawingObject,
    textObject("1. Open the tool", 114, 232, 430, 38),
    {
      id: createDrawingObjectId(),
      type: "rectangle",
      x: 78,
      y: 340,
      width: 520,
      height: 94,
      stroke: DEFAULT_STROKE,
      fill: "#fff",
      strokeWidth: 4,
    } satisfies DrawingObject,
    textObject("2. Click one button", 114, 362, 430, 38),
    placeholderObject(815, 120, 300, 460, "Presenter", "front"),
    arrowObject(630, 390, 812, 360),
  ];
}

export function describeDrawingDocument(document: DrawingDocument) {
  const counts = document.objects.reduce<Record<string, number>>(
    (acc, object) => {
      acc[object.type] = (acc[object.type] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const text = document.objects
    .filter((object) => object.type === "text")
    .map((object) => object.text.trim())
    .filter(Boolean)
    .join("; ");

  const parts = [
    "User-created drawing sketch for a YouTube thumbnail. Treat it as loose composition guidance and turn it into a polished realistic thumbnail.",
  ];
  if (text) parts.push(`Visible text intent: ${text}.`);
  if (counts.placeholder) {
    parts.push("Person placeholders should become realistic people.");
  }
  if (counts.arrow || counts.rectangle || counts.ellipse || counts.pencil) {
    parts.push("Shapes indicate emphasis, callouts, framing, and layout.");
  }
  return parts.join(" ");
}
