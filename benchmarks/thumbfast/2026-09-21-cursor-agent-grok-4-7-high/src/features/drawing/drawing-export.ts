import { upfetch } from "@/lib/up-fetch";
import type { DrawingDocument, DrawingObject } from "./drawing.schema";
import { DRAWING_FONT } from "./drawing.schema";
import { centerOf } from "./drawing-geometry";
import {
  arrowGeometry,
  pencilPolyline,
  personGeometry,
  roughEllipsePath,
  roughRectPath,
} from "./drawing-rough";

export async function renderDrawingPng(drawing: DrawingDocument) {
  const canvas = globalThis.document.createElement("canvas");
  canvas.width = drawing.width;
  canvas.height = drawing.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not render the drawing preview");

  context.fillStyle = drawing.background;
  context.fillRect(0, 0, drawing.width, drawing.height);

  const images = new Map<string, CanvasImageSource>();
  await Promise.all(
    drawing.objects
      .filter(
        (object): object is Extract<DrawingObject, { type: "image" }> =>
          object.type === "image",
      )
      .map(async (object) => {
        const image = await loadImage(object.src);
        if (image) images.set(object.src, image);
      }),
  );

  for (const object of drawing.objects) {
    context.save();
    const center = centerOf(object);
    context.translate(center.x, center.y);
    context.rotate((object.rotation * Math.PI) / 180);
    context.translate(-center.x, -center.y);
    drawObject(context, object, images.get(object.type === "image" ? object.src : ""));
    context.restore();
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((next: Blob | null) => {
      if (next) resolve(next);
      else reject(new Error("Could not render the drawing preview"));
    }, "image/png");
  });
  return blob.arrayBuffer();
}

function drawObject(
  context: CanvasRenderingContext2D,
  object: DrawingObject,
  image: CanvasImageSource | undefined,
) {
  context.lineJoin = "round";
  context.lineCap = "round";

  if (object.type === "rect" || object.type === "ellipse") {
    const path = new Path2D(
      object.type === "rect"
        ? roughRectPath(object.x, object.y, object.width, object.height, object.id)
        : roughEllipsePath(
            object.x,
            object.y,
            object.width,
            object.height,
            object.id,
          ),
    );
    if (object.fill !== "transparent") {
      context.fillStyle = object.fill;
      context.fill(path);
    }
    context.strokeStyle = object.stroke;
    context.lineWidth = object.strokeWidth;
    context.stroke(path);
    return;
  }

  if (object.type === "arrow") {
    const geometry = arrowGeometry(object);
    context.strokeStyle = object.stroke;
    context.lineWidth = object.strokeWidth;
    context.stroke(new Path2D(geometry.shaft));
    context.stroke(new Path2D(geometry.head));
    return;
  }

  if (object.type === "pencil") {
    context.strokeStyle = object.stroke;
    context.lineWidth = object.strokeWidth;
    context.stroke(new Path2D(pencilPolyline(object)));
    return;
  }

  if (object.type === "text") {
    drawWrappedText(context, object);
    return;
  }

  if (object.type === "image") {
    if (image) {
      context.drawImage(image, object.x, object.y, object.width, object.height);
      return;
    }
    context.fillStyle = "#f1efe8";
    context.fillRect(object.x, object.y, object.width, object.height);
    context.strokeStyle = "#1e1e1e";
    context.lineWidth = 3;
    context.strokeRect(object.x, object.y, object.width, object.height);
    context.fillStyle = "#1e1e1e";
    context.font = `28px ${DRAWING_FONT}`;
    context.fillText("Image", object.x + 16, object.y + object.height / 2);
    return;
  }

  const person = personGeometry(object);
  context.fillStyle = object.fill;
  context.strokeStyle = object.stroke;
  context.lineWidth = object.strokeWidth;
  context.beginPath();
  context.ellipse(
    person.cx,
    person.headCy,
    person.headRadius,
    person.headRadius * 1.05,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.stroke();
  const shoulders = new Path2D(person.shoulders);
  context.fill(shoulders);
  context.stroke(shoulders);
  context.fillStyle = object.stroke;
  context.font = `${Math.max(18, object.width * 0.08)}px ${DRAWING_FONT}`;
  context.textAlign = "center";
  context.fillText(object.label, person.cx, person.labelY);
  context.textAlign = "left";
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  object: Extract<DrawingObject, { type: "text" }>,
) {
  context.fillStyle = object.color;
  context.font = `${object.fontSize}px ${DRAWING_FONT}`;
  const lineHeight = object.fontSize * 1.15;
  const lines = object.text.split("\n").flatMap((line) =>
    wrapLine(context, line, object.width),
  );
  lines.forEach((line, index) => {
    const y = object.y + object.fontSize + index * lineHeight;
    if (y > object.y + object.height + lineHeight) return;
    context.fillText(line, object.x, y);
  });
}

function wrapLine(
  context: CanvasRenderingContext2D,
  line: string,
  maxWidth: number,
) {
  if (!line) return [""];
  const words = line.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (context.measureText(next).width <= maxWidth || !current) current = next;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function loadImage(src: string) {
  try {
    const blob = await upfetch("/api/proxy-image", {
      params: { url: src },
      parseResponse: async (response: Response) => {
        if (!response.ok) throw new Error("Image proxy failed");
        return response.blob();
      },
    });
    return await createImageBitmap(blob as Blob);
  } catch {
    return null;
  }
}
