import type { DrawingDocument, DrawingObject } from "./drawing-document";
import { DRAWING_HEIGHT, DRAWING_WIDTH } from "./drawing-document";
import type { ReactNode } from "react";

type DrawingObjectSvgProps = {
  object: DrawingObject;
  muted?: boolean;
};

function getArrowPoints(object: Extract<DrawingObject, { type: "arrow" }>) {
  return {
    startX: object.flipX ? object.x + object.width : object.x,
    startY: object.flipY ? object.y + object.height : object.y,
    endX: object.flipX ? object.x : object.x + object.width,
    endY: object.flipY ? object.y : object.y + object.height,
  };
}

function TextLines({
  object,
}: {
  object: Extract<DrawingObject, { type: "text" }>;
}) {
  const anchor =
    object.textAlign === "center"
      ? "middle"
      : object.textAlign === "right"
        ? "end"
        : "start";
  const x =
    object.textAlign === "center"
      ? object.x + object.width / 2
      : object.textAlign === "right"
        ? object.x + object.width
        : object.x;
  const lines = object.text.split("\n");

  return (
    <text
      x={x}
      y={object.y + object.fontSize}
      fill={object.fill}
      fontFamily="Geist, ui-sans-serif, system-ui, sans-serif"
      fontSize={object.fontSize}
      fontWeight={object.fontWeight}
      textAnchor={anchor}
      dominantBaseline="alphabetic"
      style={{ userSelect: "none" }}
    >
      {lines.map((line, index) => (
        <tspan
          key={`${object.id}-${index}`}
          x={x}
          dy={index === 0 ? 0 : object.fontSize * 1.08}
        >
          {line || " "}
        </tspan>
      ))}
    </text>
  );
}

function PersonPlaceholder({
  object,
}: {
  object: Extract<DrawingObject, { type: "person" }>;
}) {
  const cx = object.x + object.width / 2;
  const headRadius = Math.min(object.width * 0.24, object.height * 0.16);
  const headY = object.y + object.height * 0.24;
  const bodyY = object.y + object.height * 0.45;
  const bodyWidth = object.width * 0.72;

  return (
    <g>
      <rect
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        rx={object.width * 0.08}
        fill="#f4efe7"
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
        strokeDasharray="16 12"
      />
      <circle
        cx={cx}
        cy={headY}
        r={headRadius}
        fill={object.fill}
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
      />
      <path
        d={`M ${cx - bodyWidth / 2} ${object.y + object.height * 0.82} Q ${cx - bodyWidth / 2} ${bodyY} ${cx} ${bodyY} Q ${cx + bodyWidth / 2} ${bodyY} ${cx + bodyWidth / 2} ${object.y + object.height * 0.82} Z`}
        fill="#d7deea"
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
        strokeLinejoin="round"
      />
      <line
        x1={cx - headRadius * 0.45}
        y1={headY}
        x2={cx + headRadius * 0.45}
        y2={headY}
        stroke={object.stroke}
        strokeWidth={Math.max(3, object.strokeWidth * 0.7)}
        strokeLinecap="round"
        opacity={0.45}
      />
      <text
        x={cx}
        y={object.y + object.height - 28}
        fill={object.stroke}
        fontFamily="Geist, ui-sans-serif, system-ui, sans-serif"
        fontSize={Math.max(20, object.width * 0.075)}
        fontWeight={700}
        textAnchor="middle"
        opacity={0.7}
      >
        {object.label}
      </text>
    </g>
  );
}

export function DrawingObjectSvg({
  object,
  muted = false,
}: DrawingObjectSvgProps) {
  let content: ReactNode;

  switch (object.type) {
    case "rectangle":
      content = (
        <rect
          x={object.x}
          y={object.y}
          width={object.width}
          height={object.height}
          rx={Math.min(object.radius, object.width / 2, object.height / 2)}
          fill={object.fill}
          stroke={object.stroke}
          strokeWidth={object.strokeWidth}
        />
      );
      break;
    case "ellipse":
      content = (
        <ellipse
          cx={object.x + object.width / 2}
          cy={object.y + object.height / 2}
          rx={object.width / 2}
          ry={object.height / 2}
          fill={object.fill}
          stroke={object.stroke}
          strokeWidth={object.strokeWidth}
        />
      );
      break;
    case "arrow": {
      const { startX, startY, endX, endY } = getArrowPoints(object);
      content = (
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke={object.stroke}
          strokeWidth={object.strokeWidth}
          strokeLinecap="round"
          markerEnd="url(#drawing-arrowhead)"
        />
      );
      break;
    }
    case "pencil":
      content = (
        <polyline
          points={object.points
            .map(
              (point) =>
                `${object.x + point.x * object.width},${object.y + point.y * object.height}`,
            )
            .join(" ")}
          fill="none"
          stroke={object.stroke}
          strokeWidth={object.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
      break;
    case "text":
      content = <TextLines object={object} />;
      break;
    case "image":
      content = (
        <image
          href={object.dataUrl}
          x={object.x}
          y={object.y}
          width={object.width}
          height={object.height}
          preserveAspectRatio="none"
        />
      );
      break;
    case "person":
      content = <PersonPlaceholder object={object} />;
      break;
  }

  return (
    <g opacity={muted ? 0.14 : object.opacity} data-object-id={object.id}>
      {content}
    </g>
  );
}

export function DrawingSceneSvg({ document }: { document: DrawingDocument }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${DRAWING_WIDTH} ${DRAWING_HEIGHT}`}
      width={DRAWING_WIDTH}
      height={DRAWING_HEIGHT}
    >
      <defs>
        <marker
          id="drawing-arrowhead"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
        </marker>
      </defs>
      <rect
        width={DRAWING_WIDTH}
        height={DRAWING_HEIGHT}
        fill={document.background}
      />
      {document.objects.map((object) => (
        <DrawingObjectSvg key={object.id} object={object} />
      ))}
    </svg>
  );
}

export async function exportDrawingPreview(document: DrawingDocument) {
  const canvas = window.document.createElement("canvas");
  canvas.width = DRAWING_WIDTH;
  canvas.height = DRAWING_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Preview rendering is unavailable");

  context.fillStyle = document.background;
  context.fillRect(0, 0, DRAWING_WIDTH, DRAWING_HEIGHT);

  const loadedImages = new Map(
    await Promise.all(
      document.objects
        .filter(
          (object): object is Extract<DrawingObject, { type: "image" }> =>
            object.type === "image",
        )
        .map(
          async (object) =>
            [object.id, await loadImage(object.dataUrl)] as const,
        ),
    ),
  );

  for (const object of document.objects) {
    drawObjectToCanvas(context, object, loadedImages);
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("Could not create drawing preview");
  return blob;
}

function drawObjectToCanvas(
  context: CanvasRenderingContext2D,
  object: DrawingObject,
  loadedImages: ReadonlyMap<string, HTMLImageElement>,
) {
  context.save();
  context.globalAlpha = object.opacity;
  context.strokeStyle = object.stroke;
  context.fillStyle = object.fill;
  context.lineWidth = object.strokeWidth;
  context.lineCap = "round";
  context.lineJoin = "round";

  switch (object.type) {
    case "rectangle":
      context.beginPath();
      context.roundRect(
        object.x,
        object.y,
        object.width,
        object.height,
        Math.min(object.radius, object.width / 2, object.height / 2),
      );
      if (object.fill !== "transparent") context.fill();
      if (object.strokeWidth > 0) context.stroke();
      break;
    case "ellipse":
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
      if (object.fill !== "transparent") context.fill();
      if (object.strokeWidth > 0) context.stroke();
      break;
    case "arrow":
      drawArrow(context, object);
      break;
    case "pencil":
      context.beginPath();
      object.points.forEach((point, index) => {
        const x = object.x + point.x * object.width;
        const y = object.y + point.y * object.height;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
      break;
    case "text":
      drawText(context, object);
      break;
    case "image": {
      const image = loadedImages.get(object.id);
      if (!image) throw new Error("Could not load inserted image");
      context.drawImage(image, object.x, object.y, object.width, object.height);
      break;
    }
    case "person":
      drawPerson(context, object);
      break;
  }

  context.restore();
}

function drawArrow(
  context: CanvasRenderingContext2D,
  object: Extract<DrawingObject, { type: "arrow" }>,
) {
  const { startX, startY, endX, endY } = getArrowPoints(object);
  const angle = Math.atan2(endY - startY, endX - startX);
  const head = Math.max(28, object.strokeWidth * 4);

  context.beginPath();
  context.moveTo(startX, startY);
  context.lineTo(endX, endY);
  context.stroke();
  context.beginPath();
  context.moveTo(endX, endY);
  context.lineTo(
    endX - head * Math.cos(angle - Math.PI / 6),
    endY - head * Math.sin(angle - Math.PI / 6),
  );
  context.lineTo(
    endX - head * Math.cos(angle + Math.PI / 6),
    endY - head * Math.sin(angle + Math.PI / 6),
  );
  context.closePath();
  context.fillStyle = object.stroke;
  context.fill();
}

function drawText(
  context: CanvasRenderingContext2D,
  object: Extract<DrawingObject, { type: "text" }>,
) {
  context.fillStyle = object.fill;
  context.font = `${object.fontWeight} ${object.fontSize}px Geist, Arial, sans-serif`;
  context.textAlign = object.textAlign;
  context.textBaseline = "alphabetic";
  const x =
    object.textAlign === "center"
      ? object.x + object.width / 2
      : object.textAlign === "right"
        ? object.x + object.width
        : object.x;
  object.text.split("\n").forEach((line, index) => {
    context.fillText(
      line,
      x,
      object.y + object.fontSize + index * object.fontSize * 1.08,
      object.width,
    );
  });
}

function drawPerson(
  context: CanvasRenderingContext2D,
  object: Extract<DrawingObject, { type: "person" }>,
) {
  const cx = object.x + object.width / 2;
  const headRadius = Math.min(object.width * 0.24, object.height * 0.16);
  const headY = object.y + object.height * 0.24;
  const bodyY = object.y + object.height * 0.45;
  const bodyWidth = object.width * 0.72;

  context.setLineDash([16, 12]);
  context.fillStyle = "#f4efe7";
  context.beginPath();
  context.roundRect(
    object.x,
    object.y,
    object.width,
    object.height,
    object.width * 0.08,
  );
  context.fill();
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = object.fill;
  context.beginPath();
  context.arc(cx, headY, headRadius, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = "#d7deea";
  context.beginPath();
  context.moveTo(cx - bodyWidth / 2, object.y + object.height * 0.82);
  context.quadraticCurveTo(cx - bodyWidth / 2, bodyY, cx, bodyY);
  context.quadraticCurveTo(
    cx + bodyWidth / 2,
    bodyY,
    cx + bodyWidth / 2,
    object.y + object.height * 0.82,
  );
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = object.stroke;
  context.globalAlpha *= 0.7;
  context.font = `700 ${Math.max(20, object.width * 0.075)}px Geist, Arial, sans-serif`;
  context.textAlign = "center";
  context.fillText(object.label, cx, object.y + object.height - 28);
}

async function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load inserted image"));
    image.src = src;
  });
}

export async function prepareInsertedImage(file: File) {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    throw new Error("Choose a PNG, JPEG, or WebP image");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("Image must be smaller than 12 MB");
  }

  const source = await fileToDataUrl(file);
  const image = await loadImage(source);
  const maxDimension = 1_000;
  const scale = Math.min(
    maxDimension / image.width,
    maxDimension / image.height,
    1,
  );
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = window.document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is unavailable");
  context.drawImage(image, 0, 0, width, height);

  let quality = 0.82;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > 220_000 && quality > 0.42) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  return { dataUrl, width, height };
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Could not read image"));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}
