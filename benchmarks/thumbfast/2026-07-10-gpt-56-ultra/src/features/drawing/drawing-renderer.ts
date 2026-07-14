import type {
  ArrowDrawingObject,
  DrawingDocument,
  DrawingObject,
  PencilDrawingObject,
  TextDrawingObject,
} from "./drawing-document";

const PREVIEW_MIME_TYPE = "image/png";

function getArrowEndpoints(object: ArrowDrawingObject) {
  const left = -object.width / 2;
  const right = object.width / 2;
  const top = -object.height / 2;
  const bottom = object.height / 2;

  switch (object.direction) {
    case "up-right":
      return { startX: left, startY: bottom, endX: right, endY: top };
    case "down-left":
      return { startX: right, startY: top, endX: left, endY: bottom };
    case "up-left":
      return { startX: right, startY: bottom, endX: left, endY: top };
    case "down-right":
      return { startX: left, startY: top, endX: right, endY: bottom };
  }
}

function drawArrow(
  context: CanvasRenderingContext2D,
  object: ArrowDrawingObject,
) {
  const { startX, startY, endX, endY } = getArrowEndpoints(object);
  const angle = Math.atan2(endY - startY, endX - startX);
  const headLength = Math.max(22, object.strokeWidth * 3);

  context.beginPath();
  context.moveTo(startX, startY);
  context.lineTo(endX, endY);
  context.moveTo(endX, endY);
  context.lineTo(
    endX - headLength * Math.cos(angle - Math.PI / 6),
    endY - headLength * Math.sin(angle - Math.PI / 6),
  );
  context.moveTo(endX, endY);
  context.lineTo(
    endX - headLength * Math.cos(angle + Math.PI / 6),
    endY - headLength * Math.sin(angle + Math.PI / 6),
  );
  context.stroke();
}

function getWrappedTextLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let currentLine = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${currentLine} ${word}`;
      if (context.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
  }

  return lines;
}

function drawText(
  context: CanvasRenderingContext2D,
  object: TextDrawingObject,
) {
  context.fillStyle = object.fill;
  context.font = `${object.fontWeight === "bold" ? 800 : 500} ${object.fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
  context.textBaseline = "top";
  context.textAlign = object.textAlign;

  const anchorX =
    object.textAlign === "left"
      ? -object.width / 2
      : object.textAlign === "right"
        ? object.width / 2
        : 0;
  const lines = getWrappedTextLines(context, object.text, object.width);
  const lineHeight = object.fontSize * 1.02;

  lines.forEach((line, index) => {
    context.fillText(line, anchorX, -object.height / 2 + index * lineHeight);
  });
}

function drawPencil(
  context: CanvasRenderingContext2D,
  object: PencilDrawingObject,
) {
  const [firstPoint, ...remainingPoints] = object.points;
  context.beginPath();
  context.moveTo(
    -object.width / 2 + firstPoint.x * object.width,
    -object.height / 2 + firstPoint.y * object.height,
  );
  remainingPoints.forEach((point) => {
    context.lineTo(
      -object.width / 2 + point.x * object.width,
      -object.height / 2 + point.y * object.height,
    );
  });
  context.stroke();
}

function drawPerson(
  context: CanvasRenderingContext2D,
  object: Extract<DrawingObject, { type: "person" }>,
) {
  const headRadius = Math.min(object.width * 0.22, object.height * 0.16);
  const headY = -object.height * 0.25;
  const shoulderY = object.height * 0.02;

  context.fillStyle = object.fill;
  context.beginPath();
  context.arc(0, headY, headRadius, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.beginPath();
  context.roundRect(
    -object.width * 0.38,
    shoulderY,
    object.width * 0.76,
    object.height * 0.42,
    object.width * 0.16,
  );
  context.fill();
  context.stroke();

  context.fillStyle = object.stroke;
  context.font = `700 ${Math.max(18, object.width * 0.08)}px Inter, ui-sans-serif, system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(object.label, 0, object.height * 0.26);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load an inserted image"));
    image.src = src;
  });
}

async function drawObject(
  context: CanvasRenderingContext2D,
  object: DrawingObject,
) {
  context.save();
  context.globalAlpha = object.opacity;
  context.translate(object.x + object.width / 2, object.y + object.height / 2);
  context.rotate((object.rotation * Math.PI) / 180);
  context.fillStyle = object.fill;
  context.strokeStyle = object.stroke;
  context.lineWidth = object.strokeWidth;
  context.lineCap = "round";
  context.lineJoin = "round";

  switch (object.type) {
    case "rectangle":
      context.beginPath();
      context.roundRect(
        -object.width / 2,
        -object.height / 2,
        object.width,
        object.height,
        object.cornerRadius,
      );
      if (object.fill !== "transparent") context.fill();
      if (object.stroke !== "transparent") context.stroke();
      break;
    case "ellipse":
      context.beginPath();
      context.ellipse(0, 0, object.width / 2, object.height / 2, 0, 0, Math.PI * 2);
      if (object.fill !== "transparent") context.fill();
      if (object.stroke !== "transparent") context.stroke();
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
    case "image": {
      const image = await loadImage(object.src);
      context.drawImage(
        image,
        -object.width / 2,
        -object.height / 2,
        object.width,
        object.height,
      );
      break;
    }
    case "person":
      drawPerson(context, object);
      break;
  }

  context.restore();
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not render the drawing preview"));
      }
    }, PREVIEW_MIME_TYPE);
  });
}

export async function renderDrawingPreview(document: DrawingDocument) {
  const canvas = window.document.createElement("canvas");
  canvas.width = document.width;
  canvas.height = document.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available in this browser");

  context.fillStyle = document.background;
  context.fillRect(0, 0, document.width, document.height);

  for (const object of document.objects) {
    await drawObject(context, object);
  }

  return canvasToBlob(canvas);
}
