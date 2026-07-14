// Rasterize a drawing document to a PNG data URL. This is the preview image
// stored on the inspiration (through the normal durable-image path) and shown
// everywhere a regular inspiration thumbnail appears.
//
// We render on a 2D canvas rather than serializing the DOM so the export is
// deterministic and independent of the on-screen editor. Images are loaded
// with crossOrigin so the canvas stays exportable; if a source taints the
// canvas anyway we fall back to a placeholder box so saving never hard-fails.

import {
  DRAWING_FONT_STACKS,
  isLinearElement,
  type DrawingDocument,
  type DrawingElement,
  type Point,
} from "./drawing-document";

const EXPORT_WIDTH = 1280;
const EXPORT_HEIGHT = 720;

type LoadedImages = Map<string, HTMLImageElement>;

export async function renderDocumentToDataUrl(
  document: DrawingDocument,
): Promise<string> {
  const canvas = window.document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported");

  const scaleX = EXPORT_WIDTH / document.width;
  const scaleY = EXPORT_HEIGHT / document.height;
  ctx.scale(scaleX, scaleY);

  const images = await loadImages(document.elements);

  paintBackground(ctx, document);
  for (const element of document.elements) {
    drawElement(ctx, element, images);
  }

  try {
    return canvas.toDataURL("image/png");
  } catch {
    // Tainted canvas (a cross-origin image without CORS). Re-render with
    // placeholder boxes for images so the export still succeeds.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
    ctx.scale(scaleX, scaleY);
    paintBackground(ctx, document);
    for (const element of document.elements) {
      drawElement(ctx, element, new Map());
    }
    return canvas.toDataURL("image/png");
  }
}

function paintBackground(
  ctx: CanvasRenderingContext2D,
  document: DrawingDocument,
) {
  ctx.fillStyle = document.background || "#ffffff";
  ctx.fillRect(0, 0, document.width, document.height);
}

async function loadImages(elements: DrawingElement[]): Promise<LoadedImages> {
  const urls = new Set<string>();
  for (const element of elements) {
    if (element.type === "image" && element.url) urls.add(element.url);
  }
  const entries = await Promise.all(
    [...urls].map(async (url) => {
      const image = await loadImage(url).catch(() => null);
      return [url, image] as const;
    }),
  );
  const map: LoadedImages = new Map();
  for (const [url, image] of entries) {
    if (image) map.set(url, image);
  }
  return map;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function drawElement(
  ctx: CanvasRenderingContext2D,
  element: DrawingElement,
  images: LoadedImages,
) {
  ctx.save();
  ctx.globalAlpha = element.opacity;

  if (isLinearElement(element)) {
    drawArrow(
      ctx,
      element.start,
      element.end,
      element.stroke,
      element.strokeWidth,
    );
    ctx.restore();
    return;
  }

  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate(element.rotation);
  ctx.translate(-element.width / 2, -element.height / 2);

  switch (element.type) {
    case "rectangle":
      drawRoundedRect(
        ctx,
        0,
        0,
        element.width,
        element.height,
        element.cornerRadius,
      );
      fillAndStroke(ctx, element.fill, element.stroke, element.strokeWidth);
      break;
    case "ellipse":
      ctx.beginPath();
      ctx.ellipse(
        element.width / 2,
        element.height / 2,
        element.width / 2,
        element.height / 2,
        0,
        0,
        Math.PI * 2,
      );
      fillAndStroke(ctx, element.fill, element.stroke, element.strokeWidth);
      break;
    case "freedraw":
      drawFreedraw(
        ctx,
        element.points,
        element.width,
        element.height,
        element.stroke,
        element.strokeWidth,
      );
      break;
    case "image": {
      const image = images.get(element.url);
      if (image) {
        ctx.drawImage(image, 0, 0, element.width, element.height);
      } else {
        drawImagePlaceholder(ctx, element.width, element.height);
      }
      break;
    }
    case "placeholder":
      drawPlaceholder(ctx, element.width, element.height, element.color);
      break;
    case "text":
      drawText(ctx, element);
      break;
  }

  ctx.restore();
}

function fillAndStroke(
  ctx: CanvasRenderingContext2D,
  fill: string,
  stroke: string,
  strokeWidth: number,
) {
  if (fill && fill !== "transparent") {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (strokeWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.lineJoin = "round";
    ctx.stroke();
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawFreedraw(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  width: number,
  height: number,
  stroke: string,
  strokeWidth: number,
) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x * width, points[0].y * height);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x * width, points[index].y * height);
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  stroke: string,
  strokeWidth: number,
) {
  const headLength = Math.max(14, strokeWidth * 3.2);
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  ctx.strokeStyle = stroke;
  ctx.fillStyle = stroke;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle - Math.PI / 6),
    end.y - headLength * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    end.x - headLength * Math.cos(angle + Math.PI / 6),
    end.y - headLength * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

function drawImagePlaceholder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, width, height);
}

function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
) {
  // A neutral clay figure: head + shoulders, matching the anonymize style.
  const headRadius = Math.min(width, height) * 0.22;
  const centerX = width / 2;
  const headY = height * 0.26;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(centerX, headY, headRadius, 0, Math.PI * 2);
  ctx.fill();

  const bodyTop = headY + headRadius * 1.1;
  const bodyWidth = width * 0.72;
  const bodyHeight = height - bodyTop;
  drawRoundedRect(
    ctx,
    centerX - bodyWidth / 2,
    bodyTop,
    bodyWidth,
    bodyHeight * 1.4,
    bodyWidth / 2,
  );
  ctx.fillStyle = color;
  ctx.fill();
}

function drawText(
  ctx: CanvasRenderingContext2D,
  element: Extract<DrawingElement, { type: "text" }>,
) {
  const lines = (element.text || "").split("\n");
  const lineHeight = element.fontSize * 1.2;
  ctx.fillStyle = element.color;
  ctx.font = `${element.fontWeight} ${element.fontSize}px ${DRAWING_FONT_STACKS[element.fontFamily]}`;
  ctx.textBaseline = "middle";
  ctx.textAlign =
    element.align === "left"
      ? "left"
      : element.align === "right"
        ? "right"
        : "center";

  const totalHeight = lines.length * lineHeight;
  let y = element.height / 2 - totalHeight / 2 + lineHeight / 2;
  const x =
    element.align === "left"
      ? 0
      : element.align === "right"
        ? element.width
        : element.width / 2;

  for (const line of lines) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
}
