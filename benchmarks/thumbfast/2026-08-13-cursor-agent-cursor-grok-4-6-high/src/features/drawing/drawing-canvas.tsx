import { cn } from "@/lib/utils";
import { useRef, useState } from "react";

import {
  getHandlePositions,
  getElementBounds,
} from "./drawing.document";
import { getPersonPlaceholderPaths } from "./drawing.export";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  type DrawingDocument,
  type DrawingElement,
  type DrawingTool,
  type Point,
  type TextElement,
} from "./drawing.schema";

type DrawingCanvasProps = {
  document: DrawingDocument;
  selectedIds: string[];
  tool: DrawingTool;
  editingTextId: string | null;
  onPointerDown: (point: Point, event: PointerEvent) => void;
  onPointerMove: (point: Point) => void;
  onPointerUp: () => void;
  onDoubleClick: (point: Point) => void;
  onTextChange: (id: string, text: string) => void;
  onTextEditEnd: () => void;
};

function clientToCanvas(
  event: Pick<PointerEvent, "clientX" | "clientY">,
  svg: SVGSVGElement,
): Point {
  const rect = svg.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
  };
}

function PersonShape({ element }: { element: DrawingElement }) {
  return (
    <g>
      {getPersonPlaceholderPaths().map((path, index) =>
        path.type === "ellipse" ? (
          <ellipse
            key={index}
            cx={element.x + path.cx * element.width}
            cy={element.y + path.cy * element.height}
            rx={path.rx * element.width}
            ry={path.ry * element.height}
            fill={element.fill === "transparent" ? "#6b7280" : element.fill}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
          />
        ) : (
          <rect
            key={index}
            x={element.x + path.x * element.width}
            y={element.y + path.y * element.height}
            width={path.w * element.width}
            height={path.h * element.height}
            rx={path.r * Math.min(element.width, element.height)}
            fill={element.fill === "transparent" ? "#6b7280" : element.fill}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
          />
        ),
      )}
    </g>
  );
}

function ElementShape({ element }: { element: DrawingElement }) {
  const transform = element.rotation
    ? `rotate(${element.rotation} ${element.x + element.width / 2} ${element.y + element.height / 2})`
    : undefined;
  const common = {
    opacity: element.opacity,
    transform,
  };

  if (element.type === "rect") {
    return (
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rx={element.cornerRadius}
        fill={element.fill === "transparent" ? "none" : element.fill}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...common}
      />
    );
  }

  if (element.type === "ellipse") {
    return (
      <ellipse
        cx={element.x + element.width / 2}
        cy={element.y + element.height / 2}
        rx={element.width / 2}
        ry={element.height / 2}
        fill={element.fill === "transparent" ? "none" : element.fill}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
        {...common}
      />
    );
  }

  if (element.type === "arrow") {
    const markerId = `arrow-${element.id}`;
    return (
      <g {...common}>
        <defs>
          <marker
            id={markerId}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8 Z" fill={element.stroke} />
          </marker>
        </defs>
        <line
          x1={element.x}
          y1={element.y}
          x2={element.x + element.width}
          y2={element.y + element.height}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          strokeLinecap="round"
          markerEnd={`url(#${markerId})`}
        />
      </g>
    );
  }

  if (element.type === "pencil") {
    const d = element.points
      .map((point, index) => {
        const x = element.x + point.x;
        const y = element.y + point.y;
        return `${index === 0 ? "M" : "L"}${x} ${y}`;
      })
      .join(" ");
    return (
      <path
        d={d}
        fill="none"
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...common}
      />
    );
  }

  if (element.type === "text") {
    const lines = element.text.split("\n");
    const anchor =
      element.align === "center"
        ? "middle"
        : element.align === "right"
          ? "end"
          : "start";
    const x =
      element.align === "center"
        ? element.x + element.width / 2
        : element.align === "right"
          ? element.x + element.width
          : element.x;
    return (
      <text
        x={x}
        y={element.y + element.fontSize * 0.9}
        fill={element.fill === "transparent" ? "#1a1a1a" : element.fill}
        fontSize={element.fontSize}
        fontWeight={element.fontWeight}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        textAnchor={anchor}
        {...common}
      >
        {lines.map((line, index) => (
          <tspan key={index} x={x} dy={index === 0 ? 0 : element.fontSize * 1.1}>
            {line || " "}
          </tspan>
        ))}
      </text>
    );
  }

  if (element.type === "image") {
    return (
      <image
        href={element.src}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        preserveAspectRatio="xMidYMid slice"
        {...common}
      />
    );
  }

  return <PersonShape element={element} />;
}

function SelectionOverlay({ element }: { element: DrawingElement }) {
  const bounds = getElementBounds(element);
  const handles = getHandlePositions(element);
  const transform = element.rotation
    ? `rotate(${element.rotation} ${element.x + element.width / 2} ${element.y + element.height / 2})`
    : undefined;

  return (
    <g>
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fill="none"
        stroke="#2563eb"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        transform={transform}
      />
      <line
        x1={handles.n.x}
        y1={handles.n.y}
        x2={handles.rotate.x}
        y2={handles.rotate.y}
        stroke="#2563eb"
        strokeWidth={1}
      />
      {Object.entries(handles).map(([id, point]) => (
        <rect
          key={id}
          x={point.x - 5}
          y={point.y - 5}
          width={10}
          height={10}
          rx={id === "rotate" ? 5 : 1.5}
          fill={id === "rotate" ? "#2563eb" : "#fff"}
          stroke="#2563eb"
          strokeWidth={1.5}
        />
      ))}
    </g>
  );
}

export function DrawingCanvas({
  document,
  selectedIds,
  tool,
  editingTextId,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
  onTextChange,
  onTextEditEnd,
}: DrawingCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [frameEl, setFrameEl] = useState<HTMLDivElement | null>(null);
  const editingElement = document.elements.find(
    (element): element is TextElement =>
      element.id === editingTextId && element.type === "text",
  );

  const cursor =
    tool === "select" ? "default" : tool === "text" ? "text" : "crosshair";

  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center p-6">
      <div
        ref={setFrameEl}
        className="relative aspect-video w-full max-w-[1280px] overflow-hidden rounded-lg border bg-[#fafafa] shadow-sm"
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          className="size-full touch-none"
          style={{ cursor }}
          onPointerDown={(event) => {
            if (!svgRef.current) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            onPointerDown(clientToCanvas(event.nativeEvent, svgRef.current), event.nativeEvent);
          }}
          onPointerMove={(event) => {
            if (!svgRef.current) return;
            onPointerMove(clientToCanvas(event.nativeEvent, svgRef.current));
          }}
          onPointerUp={() => onPointerUp()}
          onPointerCancel={() => onPointerUp()}
          onDoubleClick={(event) => {
            if (!svgRef.current) return;
            onDoubleClick(clientToCanvas(event.nativeEvent, svgRef.current));
          }}
        >
          <rect
            x={0}
            y={0}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            fill={document.background}
          />
          {document.elements.map((element) =>
            element.id === editingTextId ? null : (
              <ElementShape key={element.id} element={element} />
            ),
          )}
          {document.elements
            .filter((element) => selectedIds.includes(element.id))
            .map((element) => (
              <SelectionOverlay key={`sel-${element.id}`} element={element} />
            ))}
        </svg>

        {editingElement && frameEl ? (
          <TextEditor
            element={editingElement}
            frame={frameEl}
            onChange={(text) => onTextChange(editingElement.id, text)}
            onEnd={onTextEditEnd}
          />
        ) : null}
      </div>
    </div>
  );
}

function TextEditor({
  element,
  frame,
  onChange,
  onEnd,
}: {
  element: TextElement;
  frame: HTMLDivElement;
  onChange: (text: string) => void;
  onEnd: () => void;
}) {
  const rect = frame.getBoundingClientRect();
  const left = (element.x / CANVAS_WIDTH) * rect.width;
  const top = (element.y / CANVAS_HEIGHT) * rect.height;
  const width = (element.width / CANVAS_WIDTH) * rect.width;
  const height = (element.height / CANVAS_HEIGHT) * rect.height;
  const fontSize = (element.fontSize / CANVAS_HEIGHT) * rect.height;

  return (
    <textarea
      autoFocus
      value={element.text}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onEnd}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onEnd();
        }
      }}
      className={cn(
        "absolute resize-none overflow-hidden border-none bg-transparent p-0 outline-none",
        element.align === "center" && "text-center",
        element.align === "right" && "text-right",
      )}
      style={{
        left,
        top,
        width,
        height,
        fontSize,
        fontWeight: element.fontWeight,
        color: element.fill === "transparent" ? "#1a1a1a" : element.fill,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        lineHeight: 1.1,
      }}
    />
  );
}
