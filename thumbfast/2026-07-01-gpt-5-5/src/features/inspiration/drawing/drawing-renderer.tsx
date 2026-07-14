import type * as React from "react";
import type { DrawingDocument, DrawingObject } from "./drawing-types";

type DrawingSceneProps = {
  document: DrawingDocument;
  selectedIds?: string[];
  viewBox?: string;
  onObjectPointerDown?: (
    event: React.PointerEvent<SVGGraphicsElement>,
    object: DrawingObject,
  ) => void;
  onResizePointerDown?: (
    event: React.PointerEvent<SVGRectElement>,
    object: DrawingObject,
    handle: string,
  ) => void;
  onRotatePointerDown?: (
    event: React.PointerEvent<SVGCircleElement>,
    object: DrawingObject,
  ) => void;
};

const selectionStyle = {
  fill: "none",
  stroke: "#2563eb",
  strokeWidth: 2,
  strokeDasharray: "8 6",
  vectorEffect: "non-scaling-stroke",
} as const;

function centerOf(object: DrawingObject) {
  return {
    x: object.x + object.width / 2,
    y: object.y + object.height / 2,
  };
}

function transformFor(object: DrawingObject) {
  const center = centerOf(object);
  return `rotate(${object.rotation} ${center.x} ${center.y})`;
}

function getObjectOpacity(object: DrawingObject) {
  return object.opacity ?? object.style.opacity ?? 1;
}

function renderPlaceholder(object: DrawingObject) {
  if (object.type !== "placeholder") return null;
  const { x, y, width, height, style } = object;
  const stroke = style.stroke ?? "#374151";
  const fill = style.fill ?? "#d1d5db";
  const strokeWidth = style.strokeWidth ?? 5;

  if (object.variant === "badge") {
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={height * 0.22}
          fill="#facc15"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={Math.max(28, height * 0.35)}
          fontWeight={900}
          fill="#111827"
        >
          BADGE
        </text>
      </g>
    );
  }

  if (object.variant === "burst") {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const points = Array.from({ length: 20 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 20;
      const radius = index % 2 === 0 ? width * 0.5 : width * 0.34;
      return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
    }).join(" ");
    return (
      <g>
        <polygon
          points={points}
          fill="#fde047"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={Math.max(34, width * 0.16)}
          fontWeight={900}
          fill="#111827"
        >
          WOW
        </text>
      </g>
    );
  }

  if (object.variant === "callout") {
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={24}
          fill="#ffffff"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={x + 45}
          cy={y + height / 2}
          r={height * 0.25}
          fill="#2563eb"
        />
        <text
          x={x + 45}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={height * 0.28}
          fontWeight={900}
          fill="#ffffff"
        >
          1
        </text>
        <line
          x1={x + 88}
          y1={y + height * 0.38}
          x2={x + width - 28}
          y2={y + height * 0.38}
          stroke="#111827"
          strokeWidth={6}
        />
        <line
          x1={x + 88}
          y1={y + height * 0.64}
          x2={x + width - 70}
          y2={y + height * 0.64}
          stroke="#6b7280"
          strokeWidth={6}
        />
      </g>
    );
  }

  if (object.variant === "emoji") {
    const cx = x + width / 2;
    const cy = y + height / 2;
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={Math.min(width, height) / 2}
          fill="#fde047"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        <circle cx={cx - width * 0.16} cy={cy - height * 0.1} r={10} />
        <circle cx={cx + width * 0.16} cy={cy - height * 0.1} r={10} />
        <path
          d={`M ${cx - width * 0.18} ${cy + height * 0.12} Q ${cx} ${cy + height * 0.26} ${cx + width * 0.18} ${cy + height * 0.12}`}
          fill="none"
          stroke="#111827"
          strokeLinecap="round"
          strokeWidth={8}
        />
      </g>
    );
  }

  const headCx = x + width / 2;
  const headCy = y + height * 0.22;
  const bodyY = y + height * 0.42;
  return (
    <g>
      <ellipse
        cx={headCx}
        cy={headCy}
        rx={width * (object.variant === "face" ? 0.36 : 0.22)}
        ry={height * (object.variant === "face" ? 0.25 : 0.17)}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {object.variant !== "face" ? (
        <>
          <path
            d={`M ${x + width * 0.5} ${bodyY} C ${x + width * 0.28} ${bodyY + height * 0.04}, ${x + width * 0.18} ${y + height * 0.76}, ${x + width * 0.2} ${y + height * 0.96} L ${x + width * 0.8} ${y + height * 0.96} C ${x + width * 0.82} ${y + height * 0.76}, ${x + width * 0.72} ${bodyY + height * 0.04}, ${x + width * 0.5} ${bodyY} Z`}
            fill={fill}
            stroke={stroke}
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
          />
          {object.variant === "reaction" ? (
            <>
              <line
                x1={x + width * 0.28}
                y1={bodyY + height * 0.06}
                x2={x}
                y2={y + height * 0.22}
                stroke={stroke}
                strokeLinecap="round"
                strokeWidth={strokeWidth + 3}
              />
              <line
                x1={x + width * 0.72}
                y1={bodyY + height * 0.06}
                x2={x + width}
                y2={y + height * 0.22}
                stroke={stroke}
                strokeLinecap="round"
                strokeWidth={strokeWidth + 3}
              />
            </>
          ) : null}
        </>
      ) : null}
    </g>
  );
}

function renderObject(object: DrawingObject, interactive: boolean) {
  const commonProps = {
    opacity: getObjectOpacity(object),
    transform: transformFor(object),
    style: {
      cursor: interactive && !object.locked ? "move" : "default",
      display: object.visible === false ? "none" : undefined,
    },
  };

  if (object.type === "rect") {
    return (
      <rect
        {...commonProps}
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        rx={object.style.radius ?? 0}
        fill={object.style.fill ?? "transparent"}
        stroke={object.style.stroke ?? "transparent"}
        strokeWidth={object.style.strokeWidth ?? 0}
      />
    );
  }

  if (object.type === "ellipse") {
    return (
      <ellipse
        {...commonProps}
        cx={object.x + object.width / 2}
        cy={object.y + object.height / 2}
        rx={Math.abs(object.width / 2)}
        ry={Math.abs(object.height / 2)}
        fill={object.style.fill ?? "transparent"}
        stroke={object.style.stroke ?? "transparent"}
        strokeWidth={object.style.strokeWidth ?? 0}
      />
    );
  }

  if (object.type === "line" || object.type === "arrow") {
    const markerEnd = object.type === "arrow" ? `url(#arrow-head)` : undefined;
    return (
      <line
        {...commonProps}
        x1={object.x}
        y1={object.y}
        x2={object.x + object.width}
        y2={object.y + object.height}
        stroke={object.style.stroke ?? "#111827"}
        strokeLinecap="round"
        strokeWidth={object.style.strokeWidth ?? 6}
        markerEnd={markerEnd}
      />
    );
  }

  if (object.type === "freehand") {
    const points = object.points
      .map((point, index) =>
        index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
      )
      .join(" ");
    return (
      <path
        {...commonProps}
        d={points}
        fill="none"
        stroke={object.style.stroke ?? "#111827"}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={object.style.strokeWidth ?? 5}
      />
    );
  }

  if (object.type === "text") {
    const align = object.style.align ?? "center";
    const textAnchor =
      align === "left" ? "start" : align === "right" ? "end" : "middle";
    const textX =
      align === "left"
        ? object.x
        : align === "right"
          ? object.x + object.width
          : object.x + object.width / 2;
    const y = object.y + object.height / 2;
    const fontSize = object.style.fontSize ?? 56;
    const shadow = object.style.shadow
      ? "drop-shadow(0 8px 8px rgb(0 0 0 / 0.35))"
      : undefined;
    const text = object.text ?? "Text";
    return (
      <text
        {...commonProps}
        x={textX}
        y={y}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        fill={object.style.fill ?? "#111827"}
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize={fontSize}
        fontWeight={object.style.fontWeight ?? 800}
        paintOrder="stroke"
        stroke={
          object.style.outline ? (object.style.stroke ?? "#ffffff") : "none"
        }
        strokeLinejoin="round"
        strokeWidth={object.style.outline ? (object.style.strokeWidth ?? 8) : 0}
        style={{ ...commonProps.style, filter: shadow }}
      >
        {text}
      </text>
    );
  }

  if (object.type === "image") {
    return (
      <image
        {...commonProps}
        href={object.src}
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        preserveAspectRatio="xMidYMid slice"
      />
    );
  }

  if (object.type === "placeholder") {
    return <g {...commonProps}>{renderPlaceholder(object)}</g>;
  }

  return null;
}

function renderSelection(
  object: DrawingObject,
  props: Pick<DrawingSceneProps, "onResizePointerDown" | "onRotatePointerDown">,
) {
  if (object.visible === false) return null;
  const handles = [
    ["nw", object.x, object.y],
    ["ne", object.x + object.width, object.y],
    ["sw", object.x, object.y + object.height],
    ["se", object.x + object.width, object.y + object.height],
  ] as const;
  const center = centerOf(object);
  return (
    <g transform={transformFor(object)} pointerEvents="all">
      <rect
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        {...selectionStyle}
      />
      {handles.map(([handle, x, y]) => (
        <rect
          key={handle}
          x={x - 7}
          y={y - 7}
          width={14}
          height={14}
          rx={3}
          fill="#ffffff"
          stroke="#2563eb"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          style={{ cursor: `${handle}-resize` }}
          onPointerDown={(event) =>
            props.onResizePointerDown?.(event, object, handle)
          }
        />
      ))}
      <line
        x1={center.x}
        y1={object.y}
        x2={center.x}
        y2={object.y - 44}
        stroke="#2563eb"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={center.x}
        cy={object.y - 52}
        r={8}
        fill="#ffffff"
        stroke="#2563eb"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        style={{ cursor: "grab" }}
        onPointerDown={(event) => props.onRotatePointerDown?.(event, object)}
      />
    </g>
  );
}

export function DrawingScene({
  document,
  selectedIds = [],
  viewBox,
  onObjectPointerDown,
  onResizePointerDown,
  onRotatePointerDown,
}: DrawingSceneProps) {
  const selected = new Set(selectedIds);
  return (
    <svg
      viewBox={
        viewBox ?? `0 0 ${document.canvas.width} ${document.canvas.height}`
      }
      className="size-full"
      role="img"
      aria-label="Drawing inspiration preview"
    >
      <defs>
        <marker
          id="arrow-head"
          markerWidth="12"
          markerHeight="12"
          refX="10"
          refY="6"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M 0 0 L 12 6 L 0 12 z" fill="context-stroke" />
        </marker>
      </defs>
      <rect
        x={0}
        y={0}
        width={document.canvas.width}
        height={document.canvas.height}
        fill={document.canvas.background}
      />
      {document.objects.map((object) => (
        <g
          key={object.id}
          onPointerDown={(event) => onObjectPointerDown?.(event, object)}
        >
          {renderObject(object, Boolean(onObjectPointerDown))}
        </g>
      ))}
      {document.objects
        .filter((object) => selected.has(object.id))
        .map((object) => (
          <g key={`selection-${object.id}`}>
            {renderSelection(object, {
              onResizePointerDown,
              onRotatePointerDown,
            })}
          </g>
        ))}
    </svg>
  );
}

function withCanvasTransform(
  ctx: CanvasRenderingContext2D,
  object: DrawingObject,
  draw: () => void,
) {
  const center = centerOf(object);
  ctx.save();
  ctx.globalAlpha = getObjectOpacity(object);
  ctx.translate(center.x, center.y);
  ctx.rotate((object.rotation * Math.PI) / 180);
  ctx.translate(-center.x, -center.y);
  draw();
  ctx.restore();
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  size: number,
) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - size * Math.cos(angle - Math.PI / 6),
    y2 - size * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    x2 - size * Math.cos(angle + Math.PI / 6),
    y2 - size * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle.toString();
  ctx.fill();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function drawObject(
  ctx: CanvasRenderingContext2D,
  object: DrawingObject,
) {
  if (object.visible === false) return;
  withCanvasTransform(ctx, object, () => {
    ctx.lineWidth = object.style.strokeWidth ?? 0;
    ctx.strokeStyle = object.style.stroke ?? "transparent";
    ctx.fillStyle = object.style.fill ?? "transparent";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (object.type === "rect") {
      const radius = object.style.radius ?? 0;
      ctx.beginPath();
      ctx.roundRect(object.x, object.y, object.width, object.height, radius);
      ctx.fill();
      if ((object.style.strokeWidth ?? 0) > 0) ctx.stroke();
    } else if (object.type === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(
        object.x + object.width / 2,
        object.y + object.height / 2,
        Math.abs(object.width / 2),
        Math.abs(object.height / 2),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      if ((object.style.strokeWidth ?? 0) > 0) ctx.stroke();
    } else if (object.type === "line" || object.type === "arrow") {
      ctx.lineWidth = object.style.strokeWidth ?? 6;
      ctx.strokeStyle = object.style.stroke ?? "#111827";
      ctx.beginPath();
      ctx.moveTo(object.x, object.y);
      ctx.lineTo(object.x + object.width, object.y + object.height);
      ctx.stroke();
      if (object.type === "arrow") {
        drawArrowHead(
          ctx,
          object.x,
          object.y,
          object.x + object.width,
          object.y + object.height,
          Math.max(18, ctx.lineWidth * 2.2),
        );
      }
    } else if (object.type === "freehand") {
      ctx.lineWidth = object.style.strokeWidth ?? 5;
      ctx.strokeStyle = object.style.stroke ?? "#111827";
      ctx.beginPath();
      object.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    } else if (object.type === "text") {
      const fontSize = object.style.fontSize ?? 56;
      const weight = object.style.fontWeight ?? 800;
      ctx.font = `${weight} ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = object.style.align ?? "center";
      const x =
        object.style.align === "left"
          ? object.x
          : object.style.align === "right"
            ? object.x + object.width
            : object.x + object.width / 2;
      const y = object.y + object.height / 2;
      if (object.style.shadow) {
        ctx.shadowColor = "rgba(0,0,0,0.35)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 8;
      }
      if (object.style.outline) {
        ctx.lineWidth = object.style.strokeWidth ?? 8;
        ctx.strokeStyle = object.style.stroke ?? "#ffffff";
        ctx.strokeText(object.text ?? "Text", x, y);
      }
      ctx.fillStyle = object.style.fill ?? "#111827";
      ctx.fillText(object.text ?? "Text", x, y);
      ctx.shadowColor = "transparent";
    } else if (object.type === "placeholder") {
      ctx.fillStyle = object.style.fill ?? "#d1d5db";
      ctx.strokeStyle = object.style.stroke ?? "#374151";
      ctx.lineWidth = object.style.strokeWidth ?? 5;
      ctx.beginPath();
      ctx.roundRect(object.x, object.y, object.width, object.height, 28);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#111827";
      ctx.font = `900 ${Math.max(34, object.height * 0.18)}px Inter, ui-sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        object.variant.toUpperCase(),
        object.x + object.width / 2,
        object.y + object.height / 2,
      );
    }
  });

  if (object.type === "image") {
    try {
      const image = await loadImage(object.src);
      withCanvasTransform(ctx, object, () => {
        ctx.drawImage(image, object.x, object.y, object.width, object.height);
      });
    } catch {
      withCanvasTransform(ctx, object, () => {
        ctx.fillStyle = "#e5e7eb";
        ctx.fillRect(object.x, object.y, object.width, object.height);
        ctx.strokeStyle = "#6b7280";
        ctx.lineWidth = 4;
        ctx.strokeRect(object.x, object.y, object.width, object.height);
      });
    }
  }
}

export async function exportDrawingDocumentToBlob(document: DrawingDocument) {
  const canvas = window.document.createElement("canvas");
  canvas.width = document.canvas.width;
  canvas.height = document.canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");

  ctx.fillStyle = document.canvas.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const object of document.objects) {
    await drawObject(ctx, object);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to export drawing"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}
