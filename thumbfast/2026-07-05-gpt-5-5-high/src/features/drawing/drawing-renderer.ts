import type { DrawingDocument, DrawingObject } from "./drawing-types";

async function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load drawing image"));
    image.crossOrigin = "anonymous";
    image.src = src;
  });
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  size: number,
) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - size * Math.cos(angle - Math.PI / 6),
    toY - size * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    toX - size * Math.cos(angle + Math.PI / 6),
    toY - size * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
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
  if (line) lines.push(line);
  return lines;
}

function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  object: Extract<DrawingObject, { type: "placeholder" }>,
) {
  ctx.save();
  ctx.strokeStyle = object.stroke;
  ctx.fillStyle = object.fill;
  ctx.lineWidth = object.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.strokeRect(object.x, object.y, object.width, object.height);
  ctx.fillRect(object.x, object.y, object.width, object.height);

  const centerX = object.x + object.width / 2;
  const headRadius = Math.min(object.width, object.height) * 0.16;
  const headY = object.y + object.height * 0.26;
  ctx.beginPath();
  ctx.arc(centerX, headY, headRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX, headY + headRadius);
  ctx.lineTo(centerX, object.y + object.height * 0.68);
  ctx.moveTo(centerX, object.y + object.height * 0.42);
  ctx.lineTo(object.x + object.width * 0.25, object.y + object.height * 0.56);
  ctx.moveTo(centerX, object.y + object.height * 0.42);
  ctx.lineTo(object.x + object.width * 0.75, object.y + object.height * 0.5);
  ctx.moveTo(centerX, object.y + object.height * 0.68);
  ctx.lineTo(object.x + object.width * 0.32, object.y + object.height * 0.88);
  ctx.moveTo(centerX, object.y + object.height * 0.68);
  ctx.lineTo(object.x + object.width * 0.7, object.y + object.height * 0.88);
  ctx.stroke();

  ctx.font = "700 28px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#44403c";
  ctx.textAlign = "center";
  ctx.fillText(object.label, centerX, object.y + object.height - 34);
  ctx.restore();
}

async function drawObject(
  ctx: CanvasRenderingContext2D,
  object: DrawingObject,
) {
  ctx.save();
  ctx.globalAlpha = object.opacity ?? 1;
  ctx.strokeStyle = object.stroke;
  ctx.fillStyle = object.fill === "transparent" ? "rgba(0,0,0,0)" : object.fill;
  ctx.lineWidth = object.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (object.type === "rectangle") {
    if (object.fill !== "transparent") {
      ctx.fillRect(object.x, object.y, object.width, object.height);
    }
    ctx.strokeRect(object.x, object.y, object.width, object.height);
  } else if (object.type === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(
      object.x + object.width / 2,
      object.y + object.height / 2,
      object.width / 2,
      object.height / 2,
      0,
      0,
      Math.PI * 2,
    );
    if (object.fill !== "transparent") ctx.fill();
    ctx.stroke();
  } else if (object.type === "arrow") {
    ctx.beginPath();
    ctx.moveTo(object.x, object.y);
    ctx.lineTo(object.endX, object.endY);
    ctx.stroke();
    ctx.fillStyle = object.stroke;
    drawArrowHead(
      ctx,
      object.x,
      object.y,
      object.endX,
      object.endY,
      Math.max(18, object.strokeWidth * 3),
    );
  } else if (object.type === "text") {
    ctx.font = `${object.fontWeight} ${object.fontSize}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = object.stroke;
    ctx.textAlign = object.align;
    ctx.textBaseline = "top";
    const lines = wrapText(ctx, object.text, object.width);
    const x =
      object.align === "center" ? object.x + object.width / 2 : object.x;
    lines.forEach((line, index) => {
      ctx.fillText(line, x, object.y + index * object.fontSize * 1.08);
    });
  } else if (object.type === "pencil") {
    ctx.beginPath();
    object.points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  } else if (object.type === "image") {
    const image = await loadImage(object.src);
    ctx.drawImage(image, object.x, object.y, object.width, object.height);
  } else {
    drawPlaceholder(ctx, object);
  }

  ctx.restore();
}

export async function renderDrawingDocumentToBlob(document: DrawingDocument) {
  const canvas = window.document.createElement("canvas");
  canvas.width = document.width;
  canvas.height = document.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");

  ctx.fillStyle = document.background;
  ctx.fillRect(0, 0, document.width, document.height);

  await document.objects.reduce(async (previous, object) => {
    await previous;
    await drawObject(ctx, object);
  }, Promise.resolve());

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not render drawing preview"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}
