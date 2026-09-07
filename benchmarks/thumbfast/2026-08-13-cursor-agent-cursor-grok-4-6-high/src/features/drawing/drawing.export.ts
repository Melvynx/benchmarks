import {
  getElementCenter,
  rotatePoint,
} from "./drawing.document";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  type DrawingDocument,
  type DrawingElement,
  type Point,
} from "./drawing.schema";

const PERSON_PATHS = [
  { type: "ellipse" as const, cx: 0.5, cy: 0.16, rx: 0.16, ry: 0.12 },
  { type: "rect" as const, x: 0.34, y: 0.3, w: 0.32, h: 0.32, r: 0.08 },
  { type: "rect" as const, x: 0.12, y: 0.32, w: 0.18, h: 0.08, r: 0.04 },
  { type: "rect" as const, x: 0.7, y: 0.32, w: 0.18, h: 0.08, r: 0.04 },
  { type: "rect" as const, x: 0.36, y: 0.62, w: 0.12, h: 0.3, r: 0.05 },
  { type: "rect" as const, x: 0.52, y: 0.62, w: 0.12, h: 0.3, r: 0.05 },
];

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function withElementTransform(
  ctx: CanvasRenderingContext2D,
  element: DrawingElement,
  draw: () => void,
) {
  const center = getElementCenter(element);
  ctx.save();
  ctx.globalAlpha = element.opacity;
  ctx.translate(center.x, center.y);
  ctx.rotate((element.rotation * Math.PI) / 180);
  ctx.translate(-center.x, -center.y);
  draw();
  ctx.restore();
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  size: number,
) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - size * Math.cos(angle - Math.PI / 6),
    end.y - size * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    end.x - size * Math.cos(angle + Math.PI / 6),
    end.y - size * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

function drawPerson(ctx: CanvasRenderingContext2D, element: DrawingElement) {
  ctx.fillStyle = element.fill === "transparent" ? "#6b7280" : element.fill;
  ctx.strokeStyle = element.stroke;
  ctx.lineWidth = element.strokeWidth;
  for (const path of PERSON_PATHS) {
    if (path.type === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(
        element.x + path.cx * element.width,
        element.y + path.cy * element.height,
        path.rx * element.width,
        path.ry * element.height,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.stroke();
    } else {
      roundRect(
        ctx,
        element.x + path.x * element.width,
        element.y + path.y * element.height,
        path.w * element.width,
        path.h * element.height,
        path.r * Math.min(element.width, element.height),
      );
      ctx.fill();
      ctx.stroke();
    }
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(" ");
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

async function loadImage(src: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  const url = src.startsWith("http")
    ? `/api/proxy-image?url=${encodeURIComponent(src)}`
    : src;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Failed to load drawing image"));
    image.src = url;
  });
  return image;
}

function drawElement(
  ctx: CanvasRenderingContext2D,
  element: DrawingElement,
  images: Map<string, HTMLImageElement>,
) {
  withElementTransform(ctx, element, () => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = element.stroke;
    ctx.fillStyle = element.fill === "transparent" ? "rgba(0,0,0,0)" : element.fill;
    ctx.lineWidth = element.strokeWidth;

    if (element.type === "rect") {
      roundRect(
        ctx,
        element.x,
        element.y,
        element.width,
        element.height,
        element.cornerRadius,
      );
      if (element.fill !== "transparent") ctx.fill();
      if (element.stroke !== "transparent") ctx.stroke();
      return;
    }

    if (element.type === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(
        element.x + element.width / 2,
        element.y + element.height / 2,
        element.width / 2,
        element.height / 2,
        0,
        0,
        Math.PI * 2,
      );
      if (element.fill !== "transparent") ctx.fill();
      if (element.stroke !== "transparent") ctx.stroke();
      return;
    }

    if (element.type === "arrow") {
      const start = { x: element.x, y: element.y };
      const end = {
        x: element.x + element.width,
        y: element.y + element.height,
      };
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.fillStyle = element.stroke;
      drawArrowHead(ctx, start, end, Math.max(14, element.strokeWidth * 3));
      return;
    }

    if (element.type === "pencil") {
      const points = element.points.map((point) => ({
        x: element.x + point.x,
        y: element.y + point.y,
      }));
      if (points.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let index = 1; index < points.length; index += 1) {
        ctx.lineTo(points[index].x, points[index].y);
      }
      ctx.stroke();
      return;
    }

    if (element.type === "text") {
      ctx.fillStyle = element.fill === "transparent" ? "#1a1a1a" : element.fill;
      ctx.font = `${element.fontWeight} ${element.fontSize}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textBaseline = "top";
      ctx.textAlign = element.align;
      const x =
        element.align === "center"
          ? element.x + element.width / 2
          : element.align === "right"
            ? element.x + element.width
            : element.x;
      const lines = wrapText(ctx, element.text, element.width);
      lines.forEach((line, index) => {
        ctx.fillText(line, x, element.y + index * element.fontSize * 1.1);
      });
      return;
    }

    if (element.type === "image") {
      const image = images.get(element.src);
      if (image) {
        ctx.drawImage(image, element.x, element.y, element.width, element.height);
      } else {
        roundRect(ctx, element.x, element.y, element.width, element.height, 8);
        ctx.fillStyle = "#e5e7eb";
        ctx.fill();
      }
      return;
    }

    drawPerson(ctx, element);
  });
}

export async function exportDrawingPng(document: DrawingDocument): Promise<Blob> {
  const canvas = window.document.createElement("canvas");
  canvas.width = document.width || CANVAS_WIDTH;
  canvas.height = document.height || CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create drawing preview");

  ctx.fillStyle = document.background || "#fafafa";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const imageSrcs = [
    ...new Set(
      document.elements
        .filter((element) => element.type === "image")
        .map((element) => element.src),
    ),
  ];
  const images = new Map<string, HTMLImageElement>();
  await Promise.all(
    imageSrcs.map(async (src) => {
      try {
        images.set(src, await loadImage(src));
      } catch {
        // Preview still exports without the missing bitmap.
      }
    }),
  );

  for (const element of document.elements) {
    drawElement(ctx, element, images);
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (!blob) throw new Error("Failed to export drawing preview");
  return blob;
}

export function getPersonPlaceholderPaths() {
  return PERSON_PATHS;
}

export function rotateHandlePoint(point: Point, element: DrawingElement) {
  return rotatePoint(point, getElementCenter(element), element.rotation);
}
