import { upfetch } from "@/lib/up-fetch";
import {
  DRAWING_HEIGHT,
  DRAWING_WIDTH,
  type DrawingArrowObject,
  type DrawingDocument,
  type DrawingImageObject,
  type DrawingObject,
  type DrawingPathObject,
  type DrawingPoint,
  type ResizeHandle,
} from "./drawing-document";

const HANDLE_CSS_SIZE = 16;
const HANDLE_HIT_CSS_SIZE = 44;
const IMAGE_CORNER_RADIUS = 18;
const FONT_FAMILY = '"Geist", "Arial Black", Inter, sans-serif';

type DrawingImageCacheEntry =
  | { status: "loading"; promise: Promise<HTMLImageElement> }
  | { status: "loaded"; image: HTMLImageElement }
  | { status: "error"; message: string };

export type DrawingImageCache = Map<string, DrawingImageCacheEntry>;

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.roundRect(x, y, width, height, safeRadius);
}

function applyOpacity(
  context: CanvasRenderingContext2D,
  object: DrawingObject,
) {
  context.globalAlpha = object.opacity;
  context.lineCap = "round";
  context.lineJoin = "round";
}

function drawRectangle(
  context: CanvasRenderingContext2D,
  object: Extract<DrawingObject, { type: "rectangle" }>,
) {
  roundedRectPath(
    context,
    object.x,
    object.y,
    object.width,
    object.height,
    object.radius,
  );
  context.fillStyle = object.fill;
  context.fill();
  context.strokeStyle = object.stroke;
  context.lineWidth = object.strokeWidth;
  context.stroke();
}

function drawEllipse(
  context: CanvasRenderingContext2D,
  object: Extract<DrawingObject, { type: "ellipse" }>,
) {
  context.beginPath();
  context.ellipse(
    object.x + object.width / 2,
    object.y + object.height / 2,
    object.width / 2,
    object.height / 2,
    0,
    0,
    Math.PI * 2,
  );
  context.fillStyle = object.fill;
  context.fill();
  context.strokeStyle = object.stroke;
  context.lineWidth = object.strokeWidth;
  context.stroke();
}

export function getArrowPoints(object: DrawingArrowObject) {
  return {
    start: {
      x: object.x + object.start.x * object.width,
      y: object.y + object.start.y * object.height,
    },
    end: {
      x: object.x + object.end.x * object.width,
      y: object.y + object.end.y * object.height,
    },
  };
}

function drawArrow(
  context: CanvasRenderingContext2D,
  object: DrawingArrowObject,
) {
  const { start, end } = getArrowPoints(object);
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headLength = Math.max(20, object.strokeWidth * 2.4);

  context.strokeStyle = object.color;
  context.fillStyle = object.color;
  context.lineWidth = object.strokeWidth;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();

  context.beginPath();
  context.moveTo(end.x, end.y);
  context.lineTo(
    end.x - headLength * Math.cos(angle - Math.PI / 6),
    end.y - headLength * Math.sin(angle - Math.PI / 6),
  );
  context.lineTo(
    end.x - headLength * Math.cos(angle + Math.PI / 6),
    end.y - headLength * Math.sin(angle + Math.PI / 6),
  );
  context.closePath();
  context.fill();
}

function drawingPathPoints(object: DrawingPathObject) {
  return object.points.map((point) => ({
    x: object.x + point.x * object.width,
    y: object.y + point.y * object.height,
  }));
}

function drawPath(
  context: CanvasRenderingContext2D,
  object: DrawingPathObject,
) {
  const points = drawingPathPoints(object);
  const first = points[0];

  context.strokeStyle = object.color;
  context.lineWidth = object.strokeWidth;
  context.beginPath();
  context.moveTo(first.x, first.y);

  if (points.length === 1) {
    context.lineTo(first.x + 0.01, first.y + 0.01);
  } else {
    for (let index = 1; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      context.quadraticCurveTo(
        current.x,
        current.y,
        (current.x + next.x) / 2,
        (current.y + next.y) / 2,
      );
    }
    const last = points.at(-1);
    if (last) context.lineTo(last.x, last.y);
  }
  context.stroke();
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let line = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${line} ${word}`;
      if (context.measureText(candidate).width <= maxWidth) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

function drawText(
  context: CanvasRenderingContext2D,
  object: Extract<DrawingObject, { type: "text" }>,
) {
  context.save();
  context.beginPath();
  context.rect(object.x, object.y, object.width, object.height);
  context.clip();
  context.fillStyle = object.color;
  context.font = `${object.fontWeight} ${object.fontSize}px ${FONT_FAMILY}`;
  context.textAlign = object.align;
  context.textBaseline = "top";

  const textX =
    object.align === "left"
      ? object.x
      : object.align === "center"
        ? object.x + object.width / 2
        : object.x + object.width;
  const lineHeight = object.fontSize * 1.04;
  const lines = wrapText(context, object.text, object.width);
  lines.forEach((line, index) => {
    context.fillText(line, textX, object.y + index * lineHeight);
  });
  context.restore();
}

function drawContainedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  object: DrawingImageObject,
) {
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = object.width / object.height;
  let drawWidth = object.width;
  let drawHeight = object.height;
  let drawX = object.x;
  let drawY = object.y;

  if (sourceRatio > targetRatio) {
    drawHeight = object.width / sourceRatio;
    drawY += (object.height - drawHeight) / 2;
  } else {
    drawWidth = object.height * sourceRatio;
    drawX += (object.width - drawWidth) / 2;
  }
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function drawCoveredImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  object: DrawingImageObject,
) {
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = object.width / object.height;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;

  if (sourceRatio > targetRatio) {
    sourceWidth = image.naturalHeight * targetRatio;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = image.naturalWidth / targetRatio;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  }
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    object.x,
    object.y,
    object.width,
    object.height,
  );
}

function drawImageObject(
  context: CanvasRenderingContext2D,
  object: DrawingImageObject,
  imageCache: DrawingImageCache,
) {
  roundedRectPath(
    context,
    object.x,
    object.y,
    object.width,
    object.height,
    IMAGE_CORNER_RADIUS,
  );
  context.save();
  context.clip();
  context.fillStyle = "#e5e5e5";
  context.fillRect(object.x, object.y, object.width, object.height);
  const imageEntry = imageCache.get(object.src);
  if (imageEntry?.status === "loaded") {
    const image = imageEntry.image;
    if (object.fit === "contain") {
      drawContainedImage(context, image, object);
    } else {
      drawCoveredImage(context, image, object);
    }
  } else {
    const hasError = imageEntry?.status === "error";
    context.fillStyle = hasError ? "#b91c1c" : "#737373";
    context.font = `600 24px ${FONT_FAMILY}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
      hasError ? "Image unavailable" : "Loading image…",
      object.x + object.width / 2,
      object.y + object.height / 2,
    );
  }
  context.restore();
}

function drawPerson(
  context: CanvasRenderingContext2D,
  object: Extract<DrawingObject, { type: "person" }>,
) {
  const centerX = object.x + object.width / 2;
  const headRadius = Math.min(object.width * 0.2, object.height * 0.16);
  const headY = object.y + object.height * 0.25;
  const bodyY = object.y + object.height * 0.46;
  const bodyHeight = object.height * 0.47;

  context.fillStyle = object.fill;
  context.strokeStyle = object.stroke;
  context.lineWidth = Math.max(4, object.width * 0.012);
  context.setLineDash([12, 10]);

  context.beginPath();
  context.arc(centerX, headY, headRadius, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  roundedRectPath(
    context,
    object.x + object.width * 0.12,
    bodyY,
    object.width * 0.76,
    bodyHeight,
    object.width * 0.24,
  );
  context.fill();
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = object.stroke;
  context.font = `700 ${Math.max(15, object.width * 0.055)}px ${FONT_FAMILY}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    object.label,
    centerX,
    object.y + object.height * 0.74,
    object.width * 0.62,
  );
}

function drawObject(
  context: CanvasRenderingContext2D,
  object: DrawingObject,
  imageCache: DrawingImageCache,
) {
  context.save();
  applyOpacity(context, object);
  switch (object.type) {
    case "rectangle":
      drawRectangle(context, object);
      break;
    case "ellipse":
      drawEllipse(context, object);
      break;
    case "arrow":
      drawArrow(context, object);
      break;
    case "path":
      drawPath(context, object);
      break;
    case "text":
      drawText(context, object);
      break;
    case "image":
      drawImageObject(context, object, imageCache);
      break;
    case "person":
      drawPerson(context, object);
      break;
  }
  context.restore();
}

export function getResizeHandlePoints(object: DrawingObject) {
  return {
    nw: { x: object.x, y: object.y },
    ne: { x: object.x + object.width, y: object.y },
    se: { x: object.x + object.width, y: object.y + object.height },
    sw: { x: object.x, y: object.y + object.height },
  } satisfies Record<ResizeHandle, DrawingPoint>;
}

function drawSelection(
  context: CanvasRenderingContext2D,
  object: DrawingObject,
  selectionScale: number,
) {
  const scale = Math.max(selectionScale, 0.1);
  const handleSize = HANDLE_CSS_SIZE / scale;
  context.save();
  context.strokeStyle = "#2563eb";
  context.lineWidth = 2.5 / scale;
  context.setLineDash([8 / scale, 6 / scale]);
  context.strokeRect(object.x, object.y, object.width, object.height);
  context.setLineDash([]);

  for (const handle of Object.values(getResizeHandlePoints(object))) {
    context.fillStyle = "#ffffff";
    context.strokeStyle = "#2563eb";
    context.lineWidth = 2.5 / scale;
    context.beginPath();
    context.roundRect(
      handle.x - handleSize / 2,
      handle.y - handleSize / 2,
      handleSize,
      handleSize,
      4 / scale,
    );
    context.fill();
    context.stroke();
  }
  context.restore();
}

export function renderDrawingDocument(
  context: CanvasRenderingContext2D,
  document: DrawingDocument,
  imageCache: DrawingImageCache,
  selectedObjectId?: string | null,
  selectionScale = 1,
) {
  context.clearRect(0, 0, DRAWING_WIDTH, DRAWING_HEIGHT);
  context.save();
  context.beginPath();
  context.rect(0, 0, DRAWING_WIDTH, DRAWING_HEIGHT);
  context.clip();
  context.fillStyle = document.background;
  context.fillRect(0, 0, DRAWING_WIDTH, DRAWING_HEIGHT);

  for (const object of document.objects) {
    drawObject(context, object, imageCache);
  }
  context.restore();

  const selectedObject = document.objects.find(
    (object) => object.id === selectedObjectId,
  );
  if (selectedObject) {
    drawSelection(context, selectedObject, selectionScale);
  }
}

function pointDistanceToSegment(
  pointValue: DrawingPoint,
  start: DrawingPoint,
  end: DrawingPoint,
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) {
    return Math.hypot(pointValue.x - start.x, pointValue.y - start.y);
  }
  const ratio = Math.max(
    0,
    Math.min(
      1,
      ((pointValue.x - start.x) * dx + (pointValue.y - start.y) * dy) /
        (dx * dx + dy * dy),
    ),
  );
  return Math.hypot(
    pointValue.x - (start.x + ratio * dx),
    pointValue.y - (start.y + ratio * dy),
  );
}

function isPointInObject(pointValue: DrawingPoint, object: DrawingObject) {
  if (object.type === "ellipse") {
    const centerX = object.x + object.width / 2;
    const centerY = object.y + object.height / 2;
    const normalizedX = (pointValue.x - centerX) / (object.width / 2);
    const normalizedY = (pointValue.y - centerY) / (object.height / 2);
    return normalizedX ** 2 + normalizedY ** 2 <= 1;
  }

  if (object.type === "arrow") {
    const { start, end } = getArrowPoints(object);
    return (
      pointDistanceToSegment(pointValue, start, end) <=
      Math.max(14, object.strokeWidth)
    );
  }

  if (object.type === "path") {
    const points = drawingPathPoints(object);
    return points.some((current, index) => {
      if (index >= points.length - 1) return false;
      const next = points[index + 1];
      return (
        pointDistanceToSegment(pointValue, current, next) <=
        Math.max(14, object.strokeWidth)
      );
    });
  }

  return (
    pointValue.x >= object.x &&
    pointValue.x <= object.x + object.width &&
    pointValue.y >= object.y &&
    pointValue.y <= object.y + object.height
  );
}

export function getDrawingObjectAtPoint(
  document: DrawingDocument,
  pointValue: DrawingPoint,
) {
  return document.objects
    .slice()
    .reverse()
    .find((object) => isPointInObject(pointValue, object));
}

export function getResizeHandleAtPoint(
  object: DrawingObject,
  pointValue: DrawingPoint,
  selectionScale = 1,
): ResizeHandle | null {
  const handles = getResizeHandlePoints(object);
  const hitSize = HANDLE_HIT_CSS_SIZE / Math.max(selectionScale, 0.1);
  for (const [handle, handlePoint] of Object.entries(handles)) {
    if (
      Math.abs(pointValue.x - handlePoint.x) <= hitSize / 2 &&
      Math.abs(pointValue.y - handlePoint.y) <= hitSize / 2
    ) {
      return handle as ResizeHandle;
    }
  }
  return null;
}

export function normalizePathPoints(
  points: DrawingPoint[],
): Pick<DrawingPathObject, "x" | "y" | "width" | "height" | "points"> {
  const minX = Math.min(...points.map((pointValue) => pointValue.x));
  const minY = Math.min(...points.map((pointValue) => pointValue.y));
  const maxX = Math.max(...points.map((pointValue) => pointValue.x));
  const maxY = Math.max(...points.map((pointValue) => pointValue.y));
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  return {
    x: minX,
    y: minY,
    width,
    height,
    points: points.map((pointValue) => ({
      x: (pointValue.x - minX) / width,
      y: (pointValue.y - minY) / height,
    })),
  };
}

async function loadImage(src: string) {
  const sourceUrl = new URL(src, window.location.origin);
  let imageSource = sourceUrl.href;
  let objectUrl: string | null = null;

  if (sourceUrl.origin !== window.location.origin) {
    const proxyUrl = new URL("/api/proxy-image", window.location.origin);
    proxyUrl.searchParams.set(
      "encoded",
      btoa(sourceUrl.href)
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replace(/=+$/, ""),
    );
    const blob = await upfetch(proxyUrl.href, {
      parseResponse: async (response) => response.blob(),
    });
    objectUrl = URL.createObjectURL(blob);
    imageSource = objectUrl;
  }

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error("An inserted image could not be loaded"));
    };
    image.src = imageSource;
  });
}

export async function preloadDrawingImages(
  document: DrawingDocument,
  cache: DrawingImageCache,
) {
  const sources = document.objects
    .filter((object): object is DrawingImageObject => object.type === "image")
    .map((object) => object.src);

  await preloadDrawingImageSources(sources, cache);
}

export async function preloadDrawingImageSources(
  sources: readonly string[],
  cache: DrawingImageCache,
) {
  const loadPromises = [...new Set(sources)].map(async (src) => {
    const cached = cache.get(src);
    if (cached?.status === "loaded") return cached.image;
    if (cached?.status === "loading") return cached.promise;
    if (cached?.status === "error") cache.delete(src);

    const promise = loadImage(src);
    cache.set(src, { status: "loading", promise });
    try {
      const image = await promise;
      cache.set(src, { status: "loaded", image });
      return image;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Image could not be loaded";
      cache.set(src, { status: "error", message });
      throw error;
    }
  });

  await Promise.all(loadPromises);
}

export async function exportDrawingPreview(
  document: DrawingDocument,
  imageCache: DrawingImageCache,
) {
  await preloadDrawingImages(document, imageCache);
  await documentFontsReady();

  const canvas = window.document.createElement("canvas");
  canvas.width = DRAWING_WIDTH;
  canvas.height = DRAWING_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Drawing preview is not supported");
  renderDrawingDocument(context, document, imageCache);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png", 0.95);
  });
  if (!blob) throw new Error("Failed to create drawing preview");
  return blob;
}

async function documentFontsReady() {
  if ("fonts" in window.document) {
    await window.document.fonts.ready;
  }
}
