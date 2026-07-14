import type {
  ArrowDrawingObject,
  DrawingDocument,
  DrawingObject,
  PencilDrawingObject,
} from "./drawing-document";

export type ResizeHandle = "north-west" | "north-east" | "south-west" | "south-east";

type DrawingCanvasProps = {
  svgRef: React.Ref<SVGSVGElement>;
  document: DrawingDocument;
  selectedObjectId: string | null;
  editingTextId: string | null;
  onCanvasPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void;
  onCanvasPointerMove: (event: React.PointerEvent<SVGSVGElement>) => void;
  onCanvasPointerUp: (event: React.PointerEvent<SVGSVGElement>) => void;
  onObjectPointerDown: (
    event: React.PointerEvent<SVGGElement>,
    object: DrawingObject,
  ) => void;
  onObjectDoubleClick: (object: DrawingObject) => void;
  onResizePointerDown: (
    event: React.PointerEvent<SVGCircleElement>,
    handle: ResizeHandle,
  ) => void;
};

function getArrowEndpoints(object: ArrowDrawingObject) {
  switch (object.direction) {
    case "up-right":
      return { startX: 0, startY: object.height, endX: object.width, endY: 0 };
    case "down-left":
      return { startX: object.width, startY: 0, endX: 0, endY: object.height };
    case "up-left":
      return {
        startX: object.width,
        startY: object.height,
        endX: 0,
        endY: 0,
      };
    case "down-right":
      return { startX: 0, startY: 0, endX: object.width, endY: object.height };
  }
}

function ArrowObject({ object }: { object: ArrowDrawingObject }) {
  const { startX, startY, endX, endY } = getArrowEndpoints(object);
  const angle = Math.atan2(endY - startY, endX - startX);
  const headLength = Math.max(22, object.strokeWidth * 3);
  const firstHeadX = endX - headLength * Math.cos(angle - Math.PI / 6);
  const firstHeadY = endY - headLength * Math.sin(angle - Math.PI / 6);
  const secondHeadX = endX - headLength * Math.cos(angle + Math.PI / 6);
  const secondHeadY = endY - headLength * Math.sin(angle + Math.PI / 6);

  return (
    <path
      d={`M ${startX} ${startY} L ${endX} ${endY} M ${endX} ${endY} L ${firstHeadX} ${firstHeadY} M ${endX} ${endY} L ${secondHeadX} ${secondHeadY}`}
      fill="none"
      stroke={object.stroke}
      strokeWidth={object.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function PencilObject({ object }: { object: PencilDrawingObject }) {
  const points = object.points
    .map((point) => `${point.x * object.width},${point.y * object.height}`)
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

function PersonObject({
  object,
}: {
  object: Extract<DrawingObject, { type: "person" }>;
}) {
  const headRadius = Math.min(object.width * 0.22, object.height * 0.16);
  return (
    <>
      <circle
        cx={object.width / 2}
        cy={object.height * 0.25}
        r={headRadius}
        fill={object.fill}
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
      />
      <rect
        x={object.width * 0.12}
        y={object.height * 0.52}
        width={object.width * 0.76}
        height={object.height * 0.42}
        rx={object.width * 0.16}
        fill={object.fill}
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
      />
      <text
        x={object.width / 2}
        y={object.height * 0.79}
        fill={object.stroke}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize={Math.max(18, object.width * 0.08)}
        fontWeight={700}
      >
        {object.label}
      </text>
    </>
  );
}

function DrawingObjectContent({ object }: { object: DrawingObject }) {
  switch (object.type) {
    case "rectangle":
      return (
        <rect
          width={object.width}
          height={object.height}
          rx={object.cornerRadius}
          fill={object.fill}
          stroke={object.stroke}
          strokeWidth={object.strokeWidth}
        />
      );
    case "ellipse":
      return (
        <ellipse
          cx={object.width / 2}
          cy={object.height / 2}
          rx={object.width / 2}
          ry={object.height / 2}
          fill={object.fill}
          stroke={object.stroke}
          strokeWidth={object.strokeWidth}
        />
      );
    case "arrow":
      return <ArrowObject object={object} />;
    case "text":
      return (
        <foreignObject width={object.width} height={object.height}>
          <div
            className="flex size-full overflow-hidden whitespace-pre-wrap"
            style={{
              color: object.fill,
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              fontSize: object.fontSize,
              fontWeight: object.fontWeight === "bold" ? 800 : 500,
              lineHeight: 1.02,
              textAlign: object.textAlign,
              alignItems: "flex-start",
              justifyContent:
                object.textAlign === "left"
                  ? "flex-start"
                  : object.textAlign === "right"
                    ? "flex-end"
                    : "center",
            }}
          >
            {object.text}
          </div>
        </foreignObject>
      );
    case "pencil":
      return <PencilObject object={object} />;
    case "image":
      return (
        <image
          href={object.src}
          width={object.width}
          height={object.height}
          preserveAspectRatio="none"
        />
      );
    case "person":
      return <PersonObject object={object} />;
  }
}

function SelectionOutline({
  object,
  onResizePointerDown,
}: {
  object: DrawingObject;
  onResizePointerDown: DrawingCanvasProps["onResizePointerDown"];
}) {
  const handles = [
    { name: "north-west", x: object.x, y: object.y, cursor: "nwse-resize" },
    {
      name: "north-east",
      x: object.x + object.width,
      y: object.y,
      cursor: "nesw-resize",
    },
    {
      name: "south-west",
      x: object.x,
      y: object.y + object.height,
      cursor: "nesw-resize",
    },
    {
      name: "south-east",
      x: object.x + object.width,
      y: object.y + object.height,
      cursor: "nwse-resize",
    },
  ] as const;

  return (
    <g
      transform={`rotate(${object.rotation} ${object.x + object.width / 2} ${object.y + object.height / 2})`}
      className="pointer-events-none"
    >
      <rect
        x={object.x - 4}
        y={object.y - 4}
        width={object.width + 8}
        height={object.height + 8}
        rx={8}
        fill="none"
        stroke="#2563eb"
        strokeWidth={3}
        strokeDasharray="8 6"
      />
      {handles.map((handle) => (
        <circle
          key={handle.name}
          cx={handle.x}
          cy={handle.y}
          r={10}
          fill="#ffffff"
          stroke="#2563eb"
          strokeWidth={4}
          className="pointer-events-auto"
          style={{ cursor: handle.cursor }}
          onPointerDown={(event) => onResizePointerDown(event, handle.name)}
        />
      ))}
    </g>
  );
}

export function DrawingCanvas({
  svgRef,
  document,
  selectedObjectId,
  editingTextId,
  onCanvasPointerDown,
  onCanvasPointerMove,
  onCanvasPointerUp,
  onObjectPointerDown,
  onObjectDoubleClick,
  onResizePointerDown,
}: DrawingCanvasProps) {
  const selectedObject = document.objects.find(
    (object) => object.id === selectedObjectId,
  );

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${document.width} ${document.height}`}
      className="size-full touch-none select-none"
      role="application"
      aria-label="Thumbnail drawing canvas"
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onCanvasPointerMove}
      onPointerUp={onCanvasPointerUp}
      onPointerCancel={onCanvasPointerUp}
    >
      <rect width={document.width} height={document.height} fill={document.background} />
      {document.objects.map((object) => (
        <g
          key={object.id}
          transform={`translate(${object.x} ${object.y}) rotate(${object.rotation} ${object.width / 2} ${object.height / 2})`}
          opacity={editingTextId === object.id ? 0 : object.opacity}
          onPointerDown={(event) => onObjectPointerDown(event, object)}
          onDoubleClick={(event) => {
            event.stopPropagation();
            onObjectDoubleClick(object);
          }}
          style={{ cursor: "move" }}
        >
          <rect width={object.width} height={object.height} fill="transparent" />
          <DrawingObjectContent object={object} />
        </g>
      ))}
      {selectedObject && editingTextId !== selectedObject.id ? (
        <SelectionOutline
          object={selectedObject}
          onResizePointerDown={onResizePointerDown}
        />
      ) : null}
    </svg>
  );
}
