import { cn } from "@/lib/utils";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type {
  DrawingDocument,
  DrawingObject,
  DrawingPoint,
  TextObject,
} from "./drawing-document";
import type { DrawingTool } from "./drawing-toolbar";

const MIN_OBJECT_SIZE = 24;
const HANDLE_SIZE = 16;
const HANDLE_HIT_SIZE = 38;

type ResizeCorner = "nw" | "ne" | "se" | "sw";

type CanvasPoint = {
  x: number;
  y: number;
};

type Interaction =
  | {
      kind: "move";
      pointerId: number;
      objectId: string;
      start: CanvasPoint;
      origin: DrawingObject;
      previous: DrawingDocument;
    }
  | {
      kind: "resize";
      pointerId: number;
      objectId: string;
      corner: ResizeCorner;
      origin: DrawingObject;
      previous: DrawingDocument;
    }
  | {
      kind: "draw";
      pointerId: number;
      objectId: string;
      tool: "arrow" | "rect" | "ellipse";
      start: CanvasPoint;
      previous: DrawingDocument;
    }
  | {
      kind: "pencil";
      pointerId: number;
      objectId: string;
      points: CanvasPoint[];
      previous: DrawingDocument;
    };

type DrawingCanvasProps = {
  document: DrawingDocument;
  tool: DrawingTool;
  disabled?: boolean;
  selectedObjectId: string | null;
  editingTextId: string | null;
  onSelectObject: (objectId: string | null) => void;
  onToolChange: (tool: DrawingTool) => void;
  onPreviewDocument: (document: DrawingDocument) => void;
  onCommitDocument: (previous: DrawingDocument, next: DrawingDocument) => void;
  onStartTextEditing: (objectId: string) => void;
  onFinishTextEditing: () => void;
};

export function DrawingCanvas({
  document,
  tool,
  disabled = false,
  selectedObjectId,
  editingTextId,
  onSelectObject,
  onToolChange,
  onPreviewDocument,
  onCommitDocument,
  onStartTextEditing,
  onFinishTextEditing,
}: DrawingCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const latestDocumentRef = useRef(document);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [textDraft, setTextDraft] = useState("");

  useEffect(() => {
    latestDocumentRef.current = document;
  }, [document]);

  const selectedObject = document.objects.find(
    (object) => object.id === selectedObjectId,
  );
  const editingText = document.objects.find(
    (object): object is TextObject =>
      object.id === editingTextId && object.type === "text",
  );

  const canvasPoint = (event: ReactPointerEvent): CanvasPoint => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return { x: 0, y: 0 };

    return {
      x: clamp(
        ((event.clientX - bounds.left) / bounds.width) * document.width,
        0,
        document.width,
      ),
      y: clamp(
        ((event.clientY - bounds.top) / bounds.height) * document.height,
        0,
        document.height,
      ),
    };
  };

  const preview = (nextDocument: DrawingDocument) => {
    latestDocumentRef.current = nextDocument;
    onPreviewDocument(nextDocument);
  };

  const handleCanvasPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (disabled || event.button !== 0 || editingTextId) return;
    const point = canvasPoint(event);

    if (tool === "select") {
      onSelectObject(null);
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);

    if (tool === "text") {
      const textObject: TextObject = {
        id: createObjectId(),
        type: "text",
        x: clamp(point.x, 0, document.width - 420),
        y: clamp(point.y - 55, 0, document.height - 110),
        width: 420,
        height: 110,
        opacity: 1,
        text: "Your text",
        fontSize: 64,
        fontFamily: "display",
        fontWeight: "bold",
        align: "left",
        color: "#111827",
      };
      const nextDocument = appendObject(document, textObject);
      onCommitDocument(document, nextDocument);
      onSelectObject(textObject.id);
      onToolChange("select");
      setTextDraft(textObject.text);
      onStartTextEditing(textObject.id);
      return;
    }

    const objectId = createObjectId();
    if (tool === "pencil") {
      setInteraction({
        kind: "pencil",
        pointerId: event.pointerId,
        objectId,
        points: [point],
        previous: document,
      });
      return;
    }

    setInteraction({
      kind: "draw",
      pointerId: event.pointerId,
      objectId,
      tool,
      start: point,
      previous: document,
    });
  };

  const handleObjectPointerDown = (
    event: ReactPointerEvent<SVGGElement>,
    object: DrawingObject,
  ) => {
    if (disabled || event.button !== 0 || tool !== "select" || editingTextId) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    onSelectObject(object.id);
    setInteraction({
      kind: "move",
      pointerId: event.pointerId,
      objectId: object.id,
      start: canvasPoint(event),
      origin: object,
      previous: document,
    });
  };

  const handleResizePointerDown = (
    event: ReactPointerEvent<SVGRectElement>,
    object: DrawingObject,
    corner: ResizeCorner,
  ) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    setInteraction({
      kind: "resize",
      pointerId: event.pointerId,
      objectId: object.id,
      corner,
      origin: object,
      previous: document,
    });
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (disabled || !interaction || event.pointerId !== interaction.pointerId) {
      return;
    }
    const point = canvasPoint(event);

    if (interaction.kind === "move") {
      const nextObject = moveObjectWithinCanvas(
        interaction.origin,
        point.x - interaction.start.x,
        point.y - interaction.start.y,
        document.width,
        document.height,
      );
      preview(replaceObject(interaction.previous, nextObject));
      return;
    }

    if (interaction.kind === "resize") {
      const nextObject = resizeObjectFromCorner(
        interaction.origin,
        interaction.corner,
        point,
        event.shiftKey,
        document.width,
        document.height,
      );
      preview(replaceObject(interaction.previous, nextObject));
      return;
    }

    if (interaction.kind === "pencil") {
      const points = appendPencilPoint(
        interaction.points,
        point,
        event.shiftKey,
      );
      const nextInteraction = { ...interaction, points };
      setInteraction(nextInteraction);
      const pencilObject = createPencilObject(interaction.objectId, points);
      preview(replaceOrAppendObject(interaction.previous, pencilObject));
      return;
    }

    const constrainedPoint = constrainDrawPoint(
      interaction.start,
      point,
      interaction.tool,
      event.shiftKey,
      document.width,
      document.height,
    );
    const object = createDrawnObject(
      interaction.objectId,
      interaction.tool,
      interaction.start,
      constrainedPoint,
      document.width,
      document.height,
    );
    preview(replaceOrAppendObject(interaction.previous, object));
  };

  const finishInteraction = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!interaction || event.pointerId !== interaction.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const nextDocument = latestDocumentRef.current;
    onCommitDocument(interaction.previous, nextDocument);
    onSelectObject(interaction.objectId);
    if (interaction.kind === "draw" || interaction.kind === "pencil") {
      onToolChange("select");
    }
    setInteraction(null);
  };

  const commitTextDraft = () => {
    if (!editingText) {
      onFinishTextEditing();
      return;
    }
    const text = textDraft.trim() || "Text";
    const nextDocument = replaceObject(document, { ...editingText, text });
    onCommitDocument(document, nextDocument);
    onFinishTextEditing();
  };

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_18px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_18px_50px_rgba(0,0,0,0.35)]">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${document.width} ${document.height}`}
        className={cn(
          "size-full select-none",
          disabled
            ? "cursor-wait"
            : tool === "select"
              ? "cursor-default"
              : "cursor-crosshair",
        )}
        style={{ background: document.background, touchAction: "none" }}
        role="application"
        aria-label="Thumbnail drawing canvas"
        aria-disabled={disabled}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishInteraction}
        onPointerCancel={finishInteraction}
      >
        {document.objects.map((object) => (
          <DrawingObjectView
            key={object.id}
            object={object}
            hidden={object.id === editingTextId}
            onPointerDown={(event) => handleObjectPointerDown(event, object)}
            onDoubleClick={(event) => {
              if (disabled) return;
              if (object.type !== "text") return;
              event.preventDefault();
              event.stopPropagation();
              onSelectObject(object.id);
              setTextDraft(object.text);
              onStartTextEditing(object.id);
            }}
            onSelect={() => onSelectObject(object.id)}
          />
        ))}

        {selectedObject && !editingTextId ? (
          <SelectionOutline
            object={selectedObject}
            onResizePointerDown={handleResizePointerDown}
          />
        ) : null}

        {editingText ? (
          <foreignObject
            x={editingText.x}
            y={editingText.y}
            width={Math.max(editingText.width, 120)}
            height={Math.max(editingText.height, 72)}
          >
            <textarea
              autoFocus
              value={textDraft}
              aria-label="Edit drawing text"
              className="size-full resize-none overflow-hidden rounded-md border-2 border-blue-500 bg-white/95 p-2 leading-[1.05] text-black outline-none"
              style={{
                color: editingText.color,
                fontFamily:
                  editingText.fontFamily === "display"
                    ? '"Arial Black", "Arial Narrow", sans-serif'
                    : "Arial, Helvetica, sans-serif",
                fontSize: `${editingText.fontSize}px`,
                fontWeight: editingText.fontWeight === "bold" ? 700 : 400,
                textAlign: editingText.align,
              }}
              onChange={(event) => setTextDraft(event.target.value)}
              onBlur={commitTextDraft}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  commitTextDraft();
                }
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  event.stopPropagation();
                  commitTextDraft();
                }
              }}
            />
          </foreignObject>
        ) : null}
      </svg>
    </div>
  );
}

function DrawingObjectView({
  object,
  hidden,
  onPointerDown,
  onDoubleClick,
  onSelect,
}: {
  object: DrawingObject;
  hidden: boolean;
  onPointerDown: (event: ReactPointerEvent<SVGGElement>) => void;
  onDoubleClick: (event: ReactMouseEvent<SVGGElement>) => void;
  onSelect: () => void;
}) {
  if (hidden) return null;

  return (
    <g
      opacity={object.opacity}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onFocus={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      style={{ cursor: "move" }}
      data-object-id={object.id}
      aria-label={`${object.type} drawing object`}
      role="button"
      tabIndex={0}
    >
      {renderObject(object)}
    </g>
  );
}

function renderObject(object: DrawingObject) {
  if (object.type === "rect") {
    return (
      <rect
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        rx={18}
        fill={object.fill}
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
        strokeLinejoin="round"
      />
    );
  }

  if (object.type === "ellipse") {
    return (
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
  }

  if (object.type === "arrow") {
    const startX = object.x + object.startX * object.width;
    const startY = object.y + object.startY * object.height;
    const endX = object.x + object.endX * object.width;
    const endY = object.y + object.endY * object.height;
    const angle = Math.atan2(endY - startY, endX - startX);
    const lineLength = Math.hypot(endX - startX, endY - startY);
    const arrowHeadLength = Math.min(
      Math.max(object.strokeWidth * 4, 18),
      Math.max(lineLength * 0.4, object.strokeWidth * 2),
    );
    const arrowHeadPoints = [
      `${endX},${endY}`,
      `${endX - arrowHeadLength * Math.cos(angle - Math.PI / 6)},${endY - arrowHeadLength * Math.sin(angle - Math.PI / 6)}`,
      `${endX - arrowHeadLength * Math.cos(angle + Math.PI / 6)},${endY - arrowHeadLength * Math.sin(angle + Math.PI / 6)}`,
    ].join(" ");
    return (
      <>
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke={object.stroke}
          strokeWidth={object.strokeWidth}
          strokeLinecap="round"
        />
        {lineLength === 0 ? (
          <circle
            cx={endX}
            cy={endY}
            r={object.strokeWidth}
            fill={object.stroke}
          />
        ) : (
          <polygon points={arrowHeadPoints} fill={object.stroke} />
        )}
      </>
    );
  }

  if (object.type === "pencil") {
    const points = object.points
      .map(
        (point) =>
          `${object.x + point.x * object.width},${object.y + point.y * object.height}`,
      )
      .join(" ");
    return (
      <polyline
        points={points}
        fill="none"
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  if (object.type === "text") {
    const justifyContent =
      object.align === "center"
        ? "center"
        : object.align === "right"
          ? "flex-end"
          : "flex-start";
    return (
      <foreignObject
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        pointerEvents="all"
      >
        <div
          style={{
            alignItems: "center",
            color: object.color,
            display: "flex",
            fontFamily:
              object.fontFamily === "display"
                ? '"Arial Black", "Arial Narrow", sans-serif'
                : "Arial, Helvetica, sans-serif",
            fontSize: `${object.fontSize}px`,
            fontWeight: object.fontWeight === "bold" ? 700 : 400,
            height: "100%",
            justifyContent,
            lineHeight: 1.05,
            overflow: "hidden",
            textAlign: object.align,
            whiteSpace: "pre-wrap",
            width: "100%",
            wordBreak: "break-word",
          }}
        >
          {object.text}
        </div>
      </foreignObject>
    );
  }

  if (object.type === "image") {
    return (
      <>
        <image
          href={object.src}
          x={object.x}
          y={object.y}
          width={object.width}
          height={object.height}
          preserveAspectRatio={
            object.fit === "cover" ? "xMidYMid slice" : "xMidYMid meet"
          }
        />
        <rect
          x={object.x}
          y={object.y}
          width={object.width}
          height={object.height}
          fill="none"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth={2}
          pointerEvents="none"
        />
      </>
    );
  }

  const padding = Math.max(Math.min(object.width, object.height) * 0.05, 8);
  const centerX = object.x + object.width / 2;
  const headRadius = Math.min(object.width * 0.19, object.height * 0.16);
  const headY = object.y + padding + headRadius;
  const bodyTop = headY + headRadius * 1.3;
  const bodyBottom = object.y + object.height - padding * 2.5;
  const borderWidth = Math.max(
    3,
    Math.min(object.width, object.height) * 0.015,
  );
  return (
    <>
      <rect
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        rx={Math.min(object.width, object.height) * 0.06}
        fill={object.fill}
        stroke={object.stroke}
        strokeWidth={borderWidth}
        strokeDasharray="12 9"
      />
      <circle
        cx={centerX}
        cy={headY}
        r={headRadius}
        fill={object.stroke}
        opacity={0.82}
      />
      <path
        d={`M ${centerX - object.width * 0.4} ${bodyBottom} Q ${centerX - object.width * 0.36} ${bodyTop} ${centerX} ${bodyTop} Q ${centerX + object.width * 0.36} ${bodyTop} ${centerX + object.width * 0.4} ${bodyBottom} Z`}
        fill={object.stroke}
        opacity={0.82}
      />
      <text
        x={centerX}
        y={object.y + object.height - padding * 0.55}
        textAnchor="middle"
        dominantBaseline="text-after-edge"
        fontSize={Math.max(16, Math.min(30, object.width * 0.08))}
        fontFamily="system-ui, sans-serif"
        fontWeight={700}
        fill={object.stroke}
      >
        {object.label}
      </text>
    </>
  );
}

function SelectionOutline({
  object,
  onResizePointerDown,
}: {
  object: DrawingObject;
  onResizePointerDown: (
    event: ReactPointerEvent<SVGRectElement>,
    object: DrawingObject,
    corner: ResizeCorner,
  ) => void;
}) {
  const corners: { corner: ResizeCorner; x: number; y: number }[] = [
    { corner: "nw", x: object.x, y: object.y },
    { corner: "ne", x: object.x + object.width, y: object.y },
    { corner: "se", x: object.x + object.width, y: object.y + object.height },
    { corner: "sw", x: object.x, y: object.y + object.height },
  ];

  return (
    <g aria-label="Selected object controls">
      <rect
        x={object.x - 4}
        y={object.y - 4}
        width={object.width + 8}
        height={object.height + 8}
        fill="none"
        stroke="#2563eb"
        strokeWidth={3}
        strokeDasharray="9 7"
        pointerEvents="none"
      />
      {corners.map(({ corner, x, y }) => (
        <g key={corner}>
          <rect
            x={x - HANDLE_HIT_SIZE / 2}
            y={y - HANDLE_HIT_SIZE / 2}
            width={HANDLE_HIT_SIZE}
            height={HANDLE_HIT_SIZE}
            fill="transparent"
            className={
              corner === "nw" || corner === "se"
                ? "cursor-nwse-resize"
                : "cursor-nesw-resize"
            }
            onPointerDown={(event) =>
              onResizePointerDown(event, object, corner)
            }
          />
          <rect
            x={x - HANDLE_SIZE / 2}
            y={y - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            rx={4}
            fill="white"
            stroke="#2563eb"
            strokeWidth={3}
            pointerEvents="none"
          />
        </g>
      ))}
    </g>
  );
}

function createObjectId() {
  return globalThis.crypto.randomUUID();
}

function appendObject(document: DrawingDocument, object: DrawingObject) {
  return { ...document, objects: [...document.objects, object] };
}

function replaceObject(document: DrawingDocument, object: DrawingObject) {
  return {
    ...document,
    objects: document.objects.map((candidate) =>
      candidate.id === object.id ? object : candidate,
    ),
  };
}

function replaceOrAppendObject(
  document: DrawingDocument,
  object: DrawingObject,
) {
  return document.objects.some((candidate) => candidate.id === object.id)
    ? replaceObject(document, object)
    : appendObject(document, object);
}

function moveObjectWithinCanvas(
  object: DrawingObject,
  deltaX: number,
  deltaY: number,
  canvasWidth: number,
  canvasHeight: number,
): DrawingObject {
  return {
    ...object,
    x: clamp(object.x + deltaX, 0, Math.max(0, canvasWidth - object.width)),
    y: clamp(object.y + deltaY, 0, Math.max(0, canvasHeight - object.height)),
  };
}

function resizeObjectFromCorner(
  object: DrawingObject,
  corner: ResizeCorner,
  point: CanvasPoint,
  constrained: boolean,
  canvasWidth: number,
  canvasHeight: number,
): DrawingObject {
  const opposite = {
    x: corner.includes("w") ? object.x + object.width : object.x,
    y: corner.includes("n") ? object.y + object.height : object.y,
  };
  const deltaX = point.x - opposite.x;
  const deltaY = point.y - opposite.y;
  const directionX =
    deltaX === 0 ? (corner.includes("w") ? -1 : 1) : Math.sign(deltaX);
  const directionY =
    deltaY === 0 ? (corner.includes("n") ? -1 : 1) : Math.sign(deltaY);
  const maxWidth = directionX > 0 ? canvasWidth - opposite.x : opposite.x;
  const maxHeight = directionY > 0 ? canvasHeight - opposite.y : opposite.y;
  let width = clampSize(Math.abs(deltaX), maxWidth);
  let height = clampSize(Math.abs(deltaY), maxHeight);

  if (constrained) {
    const ratio = object.width / Math.max(object.height, 1);
    if (width / height > ratio) {
      height = width / ratio;
    } else {
      width = height * ratio;
    }
    const scale = Math.min(
      1,
      maxWidth > 0 ? maxWidth / width : 0,
      maxHeight > 0 ? maxHeight / height : 0,
    );
    width *= scale;
    height *= scale;
  }

  const x = directionX < 0 ? opposite.x - width : opposite.x;
  const y = directionY < 0 ? opposite.y - height : opposite.y;

  return {
    ...object,
    x: clamp(x, 0, canvasWidth - width),
    y: clamp(y, 0, canvasHeight - height),
    width,
    height,
  };
}

function constrainDrawPoint(
  start: CanvasPoint,
  current: CanvasPoint,
  tool: "arrow" | "rect" | "ellipse",
  constrained: boolean,
  canvasWidth: number,
  canvasHeight: number,
) {
  if (!constrained) return current;
  const deltaX = current.x - start.x;
  const deltaY = current.y - start.y;

  if (tool === "rect" || tool === "ellipse") {
    const directionX = Math.sign(deltaX || 1);
    const directionY = Math.sign(deltaY || 1);
    const maxWidth = directionX > 0 ? canvasWidth - start.x : start.x;
    const maxHeight = directionY > 0 ? canvasHeight - start.y : start.y;
    const size = Math.min(
      Math.max(Math.abs(deltaX), Math.abs(deltaY)),
      maxWidth,
      maxHeight,
    );
    return {
      x: start.x + directionX * size,
      y: start.y + directionY * size,
    };
  }

  const distance = Math.hypot(deltaX, deltaY);
  const angle = Math.atan2(deltaY, deltaX);
  const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  const directionX = Math.cos(snappedAngle);
  const directionY = Math.sin(snappedAngle);
  const maxXDistance =
    Math.abs(directionX) < 0.0001
      ? Number.POSITIVE_INFINITY
      : directionX > 0
        ? (canvasWidth - start.x) / directionX
        : start.x / -directionX;
  const maxYDistance =
    Math.abs(directionY) < 0.0001
      ? Number.POSITIVE_INFINITY
      : directionY > 0
        ? (canvasHeight - start.y) / directionY
        : start.y / -directionY;
  const boundedDistance = Math.min(distance, maxXDistance, maxYDistance);
  return {
    x: start.x + directionX * boundedDistance,
    y: start.y + directionY * boundedDistance,
  };
}

function createDrawnObject(
  id: string,
  tool: "arrow" | "rect" | "ellipse",
  start: CanvasPoint,
  end: CanvasPoint,
  canvasWidth: number,
  canvasHeight: number,
): DrawingObject {
  const width = Math.min(
    canvasWidth,
    Math.max(MIN_OBJECT_SIZE, Math.abs(end.x - start.x)),
  );
  const height = Math.min(
    canvasHeight,
    Math.max(MIN_OBJECT_SIZE, Math.abs(end.y - start.y)),
  );
  const x = clamp(Math.min(start.x, end.x), 0, canvasWidth - width);
  const y = clamp(Math.min(start.y, end.y), 0, canvasHeight - height);

  if (tool === "arrow") {
    const arrowX =
      Math.abs(end.x - start.x) < MIN_OBJECT_SIZE
        ? clamp((start.x + end.x - width) / 2, 0, canvasWidth - width)
        : x;
    const arrowY =
      Math.abs(end.y - start.y) < MIN_OBJECT_SIZE
        ? clamp((start.y + end.y - height) / 2, 0, canvasHeight - height)
        : y;
    return {
      id,
      type: "arrow",
      x: arrowX,
      y: arrowY,
      width,
      height,
      opacity: 1,
      stroke: "#ef4444",
      strokeWidth: 12,
      startX: clamp((start.x - arrowX) / width, 0, 1),
      startY: clamp((start.y - arrowY) / height, 0, 1),
      endX: clamp((end.x - arrowX) / width, 0, 1),
      endY: clamp((end.y - arrowY) / height, 0, 1),
    };
  }

  return {
    id,
    type: tool,
    x,
    y,
    width,
    height,
    opacity: 1,
    fill: tool === "rect" ? "#facc15" : "#3b82f6",
    stroke: "#111827",
    strokeWidth: 6,
  };
}

function clampSize(size: number, maximum: number) {
  if (maximum <= 0) return 0;
  return Math.min(Math.max(size, Math.min(MIN_OBJECT_SIZE, maximum)), maximum);
}

function appendPencilPoint(
  points: CanvasPoint[],
  point: CanvasPoint,
  constrained: boolean,
) {
  const previous = points.at(-1);
  if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) < 3) {
    return points;
  }

  if (!constrained) return [...points, point];
  const start = points[0] ?? point;
  const horizontal = Math.abs(point.x - start.x) >= Math.abs(point.y - start.y);
  return [
    ...points,
    horizontal ? { x: point.x, y: start.y } : { x: start.x, y: point.y },
  ];
}

function createPencilObject(
  id: string,
  sourcePoints: CanvasPoint[],
): DrawingObject {
  const minX = Math.min(...sourcePoints.map((point) => point.x));
  const minY = Math.min(...sourcePoints.map((point) => point.y));
  const maxX = Math.max(...sourcePoints.map((point) => point.x));
  const maxY = Math.max(...sourcePoints.map((point) => point.y));
  const width = Math.max(MIN_OBJECT_SIZE, maxX - minX);
  const height = Math.max(MIN_OBJECT_SIZE, maxY - minY);
  const points: DrawingPoint[] = sourcePoints.map((point) => ({
    x: (point.x - minX) / width,
    y: (point.y - minY) / height,
  }));

  return {
    id,
    type: "pencil",
    x: minX,
    y: minY,
    width,
    height,
    opacity: 1,
    points,
    stroke: "#111827",
    strokeWidth: 8,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
