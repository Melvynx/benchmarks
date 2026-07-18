import {
  getObjectBounds,
  localPointToCanvasPoint,
  parseDrawingDocument,
} from "./drawing-document";
import type {
  CanvasPoint,
  DrawingDocument,
  DrawingImageObject,
  DrawingObject,
  DrawingPersonObject,
  DrawingTextObject,
} from "./drawing-document";

export type DrawingRenderOptions = {
  canvas?: HTMLCanvasElement;
  pixelRatio?: number;
  imageTimeoutMs?: number;
  renderImages?: boolean;
};

const DEFAULT_IMAGE_TIMEOUT_MS = 5_000;

function drawShapeFillAndStroke(
  context: CanvasRenderingContext2D,
  fill: string,
  stroke: string,
  strokeWidth: number,
): void {
  if (fill !== "transparent") {
    context.fillStyle = fill;
    context.fill();
  }

  if (strokeWidth > 0 && stroke !== "transparent") {
    context.strokeStyle = stroke;
    context.lineWidth = strokeWidth;
    context.stroke();
  }
}

function drawRectangle(
  context: CanvasRenderingContext2D,
  object: Extract<DrawingObject, { type: "rect" }>,
): void {
  roundedRectanglePath(
    context,
    object.x,
    object.y,
    object.width,
    object.height,
    18,
  );
  drawShapeFillAndStroke(
    context,
    object.fill,
    object.stroke,
    object.strokeWidth,
  );
}

function drawEllipse(
  context: CanvasRenderingContext2D,
  object: Extract<DrawingObject, { type: "ellipse" }>,
): void {
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
  drawShapeFillAndStroke(
    context,
    object.fill,
    object.stroke,
    object.strokeWidth,
  );
}

function drawArrow(
  context: CanvasRenderingContext2D,
  object: Extract<DrawingObject, { type: "arrow" }>,
): void {
  const bounds = getObjectBounds(object);
  const start = localPointToCanvasPoint(bounds, {
    x: object.startX,
    y: object.startY,
  });
  const end = localPointToCanvasPoint(bounds, {
    x: object.endX,
    y: object.endY,
  });
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const lineLength = Math.hypot(end.x - start.x, end.y - start.y);
  const arrowHeadLength = Math.min(
    Math.max(object.strokeWidth * 4, 18),
    Math.max(lineLength * 0.4, object.strokeWidth * 2),
  );

  context.strokeStyle = object.stroke;
  context.fillStyle = object.stroke;
  context.lineWidth = object.strokeWidth;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();

  if (lineLength === 0) {
    context.beginPath();
    context.arc(end.x, end.y, object.strokeWidth, 0, Math.PI * 2);
    context.fill();
    return;
  }

  context.beginPath();
  context.moveTo(end.x, end.y);
  context.lineTo(
    end.x - arrowHeadLength * Math.cos(angle - Math.PI / 6),
    end.y - arrowHeadLength * Math.sin(angle - Math.PI / 6),
  );
  context.lineTo(
    end.x - arrowHeadLength * Math.cos(angle + Math.PI / 6),
    end.y - arrowHeadLength * Math.sin(angle + Math.PI / 6),
  );
  context.closePath();
  context.fill();
}

function wrapParagraph(
  context: CanvasRenderingContext2D,
  paragraph: string,
  maxWidth: number,
): string[] {
  if (paragraph.length === 0) {
    return [""];
  }

  const words = paragraph.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const chunks = breakWord(context, word, maxWidth);
    for (const [index, chunk] of chunks.entries()) {
      const candidate =
        currentLine.length === 0
          ? chunk
          : `${currentLine}${index === 0 ? " " : ""}${chunk}`;

      if (
        currentLine.length > 0 &&
        context.measureText(candidate).width > maxWidth
      ) {
        lines.push(currentLine);
        currentLine = chunk;
      } else {
        currentLine = candidate;
      }

      if (index < chunks.length - 1) {
        lines.push(currentLine);
        currentLine = "";
      }
    }
  }

  lines.push(currentLine);
  return lines;
}

function breakWord(
  context: CanvasRenderingContext2D,
  word: string,
  maxWidth: number,
): string[] {
  if (context.measureText(word).width <= maxWidth) return [word];

  const chunks: string[] = [];
  let chunk = "";
  for (const character of word) {
    const candidate = `${chunk}${character}`;
    if (chunk && context.measureText(candidate).width > maxWidth) {
      chunks.push(chunk);
      chunk = character;
    } else {
      chunk = candidate;
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

function getTextLines(
  context: CanvasRenderingContext2D,
  object: DrawingTextObject,
): string[] {
  return object.text
    .split(/\r?\n/)
    .flatMap((paragraph) => wrapParagraph(context, paragraph, object.width));
}

function drawText(
  context: CanvasRenderingContext2D,
  object: DrawingTextObject,
): void {
  const family =
    object.fontFamily === "display"
      ? '"Arial Black", "Arial Narrow", sans-serif'
      : "Arial, Helvetica, sans-serif";
  const fontWeight = object.fontWeight === "bold" ? 700 : 400;
  const lineHeight = object.fontSize * 1.05;

  context.fillStyle = object.color;
  context.font = `${fontWeight} ${object.fontSize}px ${family}`;
  context.textAlign = object.align;
  context.textBaseline = "top";
  context.beginPath();
  context.rect(object.x, object.y, object.width, object.height);
  context.clip();

  const textX =
    object.align === "center"
      ? object.x + object.width / 2
      : object.align === "right"
        ? object.x + object.width
        : object.x;
  const lines = getTextLines(context, object);
  const firstLineY =
    object.y + Math.max(0, (object.height - lines.length * lineHeight) / 2);

  for (const [index, line] of lines.entries()) {
    const textY = firstLineY + index * lineHeight;
    if (textY >= object.y + object.height) {
      break;
    }
    context.fillText(line, textX, textY, object.width);
  }
}

function drawPencil(
  context: CanvasRenderingContext2D,
  object: Extract<DrawingObject, { type: "pencil" }>,
): void {
  const bounds = getObjectBounds(object);
  const points = object.points.map((point) =>
    localPointToCanvasPoint(bounds, point),
  );
  const firstPoint = points[0];

  context.strokeStyle = object.stroke;
  context.lineWidth = object.strokeWidth;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(firstPoint.x, firstPoint.y);

  for (const point of points.slice(1)) {
    context.lineTo(point.x, point.y);
  }

  context.stroke();
}

function roundedRectanglePath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height,
  );
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function drawPerson(
  context: CanvasRenderingContext2D,
  object: DrawingPersonObject,
): void {
  const padding = Math.max(Math.min(object.width, object.height) * 0.05, 8);
  const headRadius = Math.min(object.width * 0.19, object.height * 0.16);
  const centerX = object.x + object.width / 2;
  const headY = object.y + padding + headRadius;
  const bodyTop = headY + headRadius * 1.3;
  const bodyBottom = object.y + object.height - padding * 2.5;

  roundedRectanglePath(
    context,
    object.x,
    object.y,
    object.width,
    object.height,
    Math.min(object.width, object.height) * 0.06,
  );
  context.fillStyle = object.fill;
  context.fill();
  context.strokeStyle = object.stroke;
  context.lineWidth = Math.max(
    3,
    Math.min(object.width, object.height) * 0.015,
  );
  context.setLineDash([12, 9]);
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = object.stroke;
  context.globalAlpha *= 0.82;
  context.beginPath();
  context.arc(centerX, headY, headRadius, 0, Math.PI * 2);
  context.fill();

  context.beginPath();
  context.moveTo(centerX - object.width * 0.4, bodyBottom);
  context.quadraticCurveTo(
    centerX - object.width * 0.36,
    bodyTop,
    centerX,
    bodyTop,
  );
  context.quadraticCurveTo(
    centerX + object.width * 0.36,
    bodyTop,
    centerX + object.width * 0.4,
    bodyBottom,
  );
  context.closePath();
  context.fill();

  context.globalAlpha /= 0.82;
  context.fillStyle = object.stroke;
  context.font = `700 ${Math.max(16, Math.min(30, object.width * 0.08))}px Arial`;
  context.textAlign = "center";
  context.textBaseline = "bottom";
  context.fillText(
    object.label,
    centerX,
    object.y + object.height - padding * 0.55,
    object.width - padding * 2,
  );
}

function drawImagePlaceholder(
  context: CanvasRenderingContext2D,
  object: DrawingImageObject,
): void {
  context.fillStyle = "#f1f5f9";
  context.fillRect(object.x, object.y, object.width, object.height);
  context.strokeStyle = "#94a3b8";
  context.lineWidth = Math.max(2, Math.min(object.width, object.height) * 0.01);
  context.setLineDash([10, 8]);
  context.strokeRect(object.x, object.y, object.width, object.height);
  context.setLineDash([]);

  const inset = Math.min(object.width, object.height) * 0.18;
  context.beginPath();
  context.moveTo(object.x + inset, object.y + object.height - inset);
  context.lineTo(
    object.x + object.width * 0.45,
    object.y + object.height * 0.5,
  );
  context.lineTo(
    object.x + object.width - inset,
    object.y + object.height - inset,
  );
  context.stroke();

  context.fillStyle = "#64748b";
  context.font = `600 ${Math.max(14, Math.min(24, object.width * 0.06))}px Arial`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    object.alt || "Image unavailable",
    object.x + object.width / 2,
    object.y + object.height * 0.24,
    object.width - inset,
  );
}

function drawLoadedImage(
  context: CanvasRenderingContext2D,
  object: DrawingImageObject,
  image: HTMLImageElement,
): void {
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    drawImagePlaceholder(context, object);
    return;
  }

  const scale =
    object.fit === "cover"
      ? Math.max(object.width / sourceWidth, object.height / sourceHeight)
      : Math.min(object.width / sourceWidth, object.height / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const x = object.x + (object.width - width) / 2;
  const y = object.y + (object.height - height) / 2;

  context.save();
  try {
    context.beginPath();
    context.rect(object.x, object.y, object.width, object.height);
    context.clip();
    context.drawImage(image, x, y, width, height);
  } finally {
    context.restore();
  }
}

function drawImage(
  context: CanvasRenderingContext2D,
  object: DrawingImageObject,
  image: HTMLImageElement | null,
): void {
  if (!image) {
    drawImagePlaceholder(context, object);
    return;
  }

  try {
    drawLoadedImage(context, object, image);
  } catch {
    drawImagePlaceholder(context, object);
  }
}

async function loadImage(
  source: string,
  timeoutMs: number,
): Promise<HTMLImageElement | null> {
  // HTMLImageElement exposes events instead of a promise-based loading API.
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;

    const finish = (result: HTMLImageElement | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      resolve(result);
    };
    const timeoutId = setTimeout(() => finish(null), timeoutMs);

    if (/^https?:\/\//i.test(source)) {
      image.crossOrigin = "anonymous";
    }
    image.decoding = "async";
    image.addEventListener("load", () => finish(image), { once: true });
    image.addEventListener("error", () => finish(null), { once: true });
    image.src = source;
  });
}

async function loadDocumentImages(
  objects: readonly DrawingObject[],
  timeoutMs: number,
  renderImages: boolean,
): Promise<Map<string, HTMLImageElement | null>> {
  const imageObjects = objects.filter(
    (object): object is DrawingImageObject => object.type === "image",
  );

  if (!renderImages) {
    return new Map(imageObjects.map((object) => [object.id, null]));
  }

  const entries = await Promise.all(
    imageObjects.map(async (object) => {
      const image = await loadImage(
        canvasSafeImageSource(object.src),
        timeoutMs,
      );
      return [object.id, image] as const;
    }),
  );

  return new Map(entries);
}

function canvasSafeImageSource(source: string): string {
  if (
    source.startsWith("/") ||
    source.startsWith("data:") ||
    source.startsWith("blob:")
  ) {
    return source;
  }

  try {
    const parsed = new URL(source, window.location.href);
    if (parsed.origin === window.location.origin) return parsed.toString();
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return `/api/proxy-image?url=${encodeURIComponent(parsed.toString())}`;
    }
  } catch {
    return source;
  }

  return source;
}

function drawObject(
  context: CanvasRenderingContext2D,
  object: DrawingObject,
  images: ReadonlyMap<string, HTMLImageElement | null>,
): void {
  context.save();
  context.globalAlpha = object.opacity;

  switch (object.type) {
    case "rect":
      drawRectangle(context, object);
      break;
    case "ellipse":
      drawEllipse(context, object);
      break;
    case "arrow":
      drawArrow(context, object);
      break;
    case "text":
      drawText(context, object);
      break;
    case "pencil":
      drawPencil(context, object);
      break;
    case "image":
      drawImage(context, object, images.get(object.id) ?? null);
      break;
    case "person":
      drawPerson(context, object);
      break;
  }

  context.restore();
}

export async function renderDrawingDocumentToCanvas(
  input: DrawingDocument,
  options: DrawingRenderOptions = {},
): Promise<HTMLCanvasElement> {
  const document = parseDrawingDocument(input);
  const pixelRatio = options.pixelRatio ?? 1;
  const imageTimeoutMs = options.imageTimeoutMs ?? DEFAULT_IMAGE_TIMEOUT_MS;

  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) {
    throw new Error("Drawing pixel ratio must be a positive number");
  }
  if (!Number.isFinite(imageTimeoutMs) || imageTimeoutMs < 0) {
    throw new Error("Drawing image timeout must be a non-negative number");
  }

  const canvas = options.canvas ?? window.document.createElement("canvas");
  canvas.width = Math.round(document.width * pixelRatio);
  canvas.height = Math.round(document.height * pixelRatio);

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D rendering is not available");
  }

  const images = await loadDocumentImages(
    document.objects,
    imageTimeoutMs,
    options.renderImages ?? true,
  );

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = document.background;
  context.fillRect(0, 0, document.width, document.height);

  for (const object of document.objects) {
    drawObject(context, object, images);
  }

  return canvas;
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  // HTMLCanvasElement exposes a callback instead of a promise-based export API.
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("The drawing preview could not be encoded"));
        }
      }, "image/png");
    } catch (error) {
      reject(error);
    }
  });
}

export async function exportDrawingDocumentToPngBlob(
  document: DrawingDocument,
  options: DrawingRenderOptions = {},
): Promise<Blob> {
  const canvas = await renderDrawingDocumentToCanvas(document, options);

  try {
    return await canvasToPngBlob(canvas);
  } catch {
    // A remote image without CORS permission can taint a canvas. Re-rendering
    // image objects as calm placeholders keeps the drawing save flow usable.
    const safeCanvas = await renderDrawingDocumentToCanvas(document, {
      ...options,
      canvas,
      renderImages: false,
    });
    return canvasToPngBlob(safeCanvas);
  }
}

export function getArrowCanvasPoints(
  object: Extract<DrawingObject, { type: "arrow" }>,
): { start: CanvasPoint; end: CanvasPoint } {
  const bounds = getObjectBounds(object);

  return {
    start: localPointToCanvasPoint(bounds, {
      x: object.startX,
      y: object.startY,
    }),
    end: localPointToCanvasPoint(bounds, {
      x: object.endX,
      y: object.endY,
    }),
  };
}
