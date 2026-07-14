import {
  getElementBounds,
  getResizeHandles,
  getRotateHandle,
  getSelectionBounds,
  type Bounds,
} from "./drawing.geometry";
import type {
  ArrowElement,
  DrawingDocument,
  DrawingElement,
  FreehandElement,
  PersonElement,
  TextElement,
} from "./drawing.types";

const imageCache = new Map<string, HTMLImageElement>();

export function preloadDrawingImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached?.complete) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      imageCache.set(src, image);
      resolve(image);
    };
    image.onerror = reject;
    image.src = src;
    imageCache.set(src, image);
  });
}

function getCachedImage(src: string) {
  return imageCache.get(src);
}

function withElementTransform(
  ctx: CanvasRenderingContext2D,
  element: DrawingElement,
  draw: () => void,
) {
  const bounds = getElementBounds(element);
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  ctx.save();
  ctx.globalAlpha = element.opacity;
  if (element.rotation) {
    ctx.translate(centerX, centerY);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
  }
  draw();
  ctx.restore();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function strokeAndFill(
  ctx: CanvasRenderingContext2D,
  element: DrawingElement,
) {
  if (element.fillColor && element.fillColor !== "transparent") {
    ctx.fillStyle = element.fillColor;
    ctx.fill();
  }
  if (element.strokeWidth > 0 && element.strokeColor !== "transparent") {
    ctx.strokeStyle = element.strokeColor;
    ctx.lineWidth = element.strokeWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

function drawArrowShape(ctx: CanvasRenderingContext2D, element: ArrowElement) {
  const [start, end] = element.points;
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headLength = Math.max(16, element.strokeWidth * 4);

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.strokeStyle = element.strokeColor;
  ctx.lineWidth = element.strokeWidth;
  ctx.lineCap = "round";
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
  ctx.fillStyle = element.strokeColor;
  ctx.fill();
}

function drawFreehand(
  ctx: CanvasRenderingContext2D,
  element: FreehandElement,
) {
  if (element.points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(element.points[0].x, element.points[0].y);
  for (let index = 1; index < element.points.length; index += 1) {
    ctx.lineTo(element.points[index].x, element.points[index].y);
  }
  ctx.strokeStyle = element.strokeColor;
  ctx.lineWidth = element.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function drawText(ctx: CanvasRenderingContext2D, element: TextElement) {
  ctx.fillStyle = element.strokeColor;
  ctx.font = `${element.fontWeight} ${element.fontSize}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = element.align;
  const lines = element.text.split("\n");
  const lineHeight = element.fontSize * 1.2;
  let textX = element.x;
  if (element.align === "center") textX = element.x + element.width / 2;
  if (element.align === "right") textX = element.x + element.width;
  lines.forEach((line, index) => {
    ctx.fillText(line, textX, element.y + index * lineHeight, element.width);
  });
}

function drawPerson(ctx: CanvasRenderingContext2D, element: PersonElement) {
  const { x, y, width, height } = element;
  const headRadius = width * 0.22;
  const headCx = x + width / 2;
  const headCy = y + height * 0.22;
  const bodyTop = headCy + headRadius + 8;
  const bodyWidth = width * 0.55;
  const bodyHeight = height * 0.42;
  const bodyX = headCx - bodyWidth / 2;

  ctx.beginPath();
  ctx.arc(headCx, headCy, headRadius, 0, Math.PI * 2);
  strokeAndFill(ctx, element);

  drawRoundedRect(ctx, bodyX, bodyTop, bodyWidth, bodyHeight, 24);
  strokeAndFill(ctx, element);

  ctx.beginPath();
  ctx.moveTo(bodyX + 8, bodyTop + 28);
  ctx.lineTo(x + 8, bodyTop + bodyHeight * 0.7);
  ctx.moveTo(bodyX + bodyWidth - 8, bodyTop + 28);
  ctx.lineTo(x + width - 8, bodyTop + bodyHeight * 0.7);
  ctx.strokeStyle = element.strokeColor;
  ctx.lineWidth = element.strokeWidth;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.fillStyle = element.strokeColor;
  ctx.font = `600 ${Math.max(14, width * 0.12)}px "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(element.label, headCx, y + height - height * 0.12, width);
}

function drawElement(ctx: CanvasRenderingContext2D, element: DrawingElement) {
  withElementTransform(ctx, element, () => {
    switch (element.type) {
      case "rectangle": {
        drawRoundedRect(
          ctx,
          element.x,
          element.y,
          element.width,
          element.height,
          element.cornerRadius,
        );
        strokeAndFill(ctx, element);
        break;
      }
      case "ellipse": {
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
        strokeAndFill(ctx, element);
        break;
      }
      case "arrow":
        drawArrowShape(ctx, element);
        break;
      case "freehand":
        drawFreehand(ctx, element);
        break;
      case "text":
        drawText(ctx, element);
        break;
      case "image": {
        const image = getCachedImage(element.src);
        if (image?.complete) {
          ctx.drawImage(
            image,
            element.x,
            element.y,
            element.width,
            element.height,
          );
        } else {
          drawRoundedRect(
            ctx,
            element.x,
            element.y,
            element.width,
            element.height,
            8,
          );
          ctx.fillStyle = "#e9ecef";
          ctx.fill();
          void preloadDrawingImage(element.src);
        }
        break;
      }
      case "person":
        drawPerson(ctx, element);
        break;
    }
  });
}

function drawHandle(ctx: CanvasRenderingContext2D, bounds: Bounds) {
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#1971c2";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
  ctx.fill();
  ctx.stroke();
}

function drawSelection(
  ctx: CanvasRenderingContext2D,
  elements: DrawingElement[],
) {
  const bounds = getSelectionBounds(elements);
  if (!bounds) return;

  ctx.save();
  ctx.strokeStyle = "#1971c2";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(bounds.x - 1, bounds.y - 1, bounds.width + 2, bounds.height + 2);
  ctx.setLineDash([]);

  const handles = getResizeHandles(bounds);
  for (const handle of Object.values(handles)) {
    drawHandle(ctx, handle);
  }

  const rotate = getRotateHandle(bounds);
  ctx.beginPath();
  ctx.moveTo(bounds.x + bounds.width / 2, bounds.y);
  ctx.lineTo(bounds.x + bounds.width / 2, rotate.y + rotate.height / 2);
  ctx.strokeStyle = "#1971c2";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(
    rotate.x + rotate.width / 2,
    rotate.y + rotate.height / 2,
    rotate.width / 2,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function renderDrawingDocument(
  ctx: CanvasRenderingContext2D,
  doc: DrawingDocument,
  options?: {
    selectedIds?: string[];
    previewElement?: DrawingElement | null;
    showSelection?: boolean;
  },
) {
  ctx.clearRect(0, 0, doc.width, doc.height);
  ctx.fillStyle = doc.background;
  ctx.fillRect(0, 0, doc.width, doc.height);

  for (const element of doc.elements) {
    drawElement(ctx, element);
  }

  if (options?.previewElement) {
    drawElement(ctx, options.previewElement);
  }

  if (options?.showSelection !== false && options?.selectedIds?.length) {
    const selected = doc.elements.filter((element) =>
      options.selectedIds?.includes(element.id),
    );
    drawSelection(ctx, selected);
  }
}

export async function exportDrawingToBlob(
  doc: DrawingDocument,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = doc.width;
  canvas.height = doc.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context");

  const imageElements = doc.elements.filter(
    (element) => element.type === "image",
  );
  await Promise.all(
    imageElements.map((element) =>
      element.type === "image"
        ? preloadDrawingImage(element.src).catch(() => null)
        : Promise.resolve(null),
    ),
  );

  renderDrawingDocument(ctx, doc, { showSelection: false });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to export drawing"));
          return;
        }
        resolve(blob);
      },
      "image/png",
      0.95,
    );
  });
}
