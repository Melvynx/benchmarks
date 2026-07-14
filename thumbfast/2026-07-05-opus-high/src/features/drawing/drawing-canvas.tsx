// The interactive drawing surface: a fixed 16:9 SVG stage that scales to fit
// its container. All pointer logic lives here on the root; elements are
// rendered purely and hit-tested geometrically so rotation and marquee
// selection behave predictably. Text editing uses an HTML textarea overlay
// positioned over the element.

import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  DRAWING_FONT_STACKS,
  MIN_ELEMENT_SIZE,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  isLinearElement,
  type ArrowElement,
  type DrawingElement,
  type Point,
  type TextElement,
} from "./drawing-document";
import { ElementView } from "./drawing-elements";
import {
  createArrow,
  createEllipse,
  createFreedraw,
  createPlaceholder,
  createRectangle,
  createText,
} from "./drawing-factory";
import {
  constrainArrowEnd,
  getElementCenter,
  getSelectionBounds,
  hitTestElement,
  intersectsRect,
  resizeBox,
  rotatePoint,
  rotationForPointer,
  translateElement,
  type Bounds,
  type ResizeHandle,
} from "./drawing-geometry";
import { useDrawingStore } from "./drawing-store";

const HANDLE_PX = 10;
const ROTATE_OFFSET_PX = 26;
const HIT_PX = 14;

type Gesture =
  | { kind: "move"; start: Point; originals: Map<string, DrawingElement> }
  | {
      kind: "resize";
      handle: ResizeHandle;
      id: string;
      original: DrawingElement;
    }
  | { kind: "rotate"; id: string; center: Point }
  | { kind: "arrow-endpoint"; id: string; which: "start" | "end" }
  | { kind: "draw-box"; tool: "rectangle" | "ellipse"; start: Point }
  | { kind: "draw-arrow"; start: Point }
  | { kind: "freedraw"; points: Point[] }
  | { kind: "marquee"; start: Point; additive: boolean; base: string[] };

const HANDLE_LAYOUT: { handle: ResizeHandle; fx: number; fy: number }[] = [
  { handle: "nw", fx: 0, fy: 0 },
  { handle: "n", fx: 0.5, fy: 0 },
  { handle: "ne", fx: 1, fy: 0 },
  { handle: "e", fx: 1, fy: 0.5 },
  { handle: "se", fx: 1, fy: 1 },
  { handle: "s", fx: 0.5, fy: 1 },
  { handle: "sw", fx: 0, fy: 1 },
  { handle: "w", fx: 0, fy: 0.5 },
];

function getBoxHandlePoints(
  element: Exclude<DrawingElement, ArrowElement>,
): { handle: ResizeHandle; point: Point }[] {
  const center = getElementCenter(element);
  return HANDLE_LAYOUT.map(({ handle, fx, fy }) => ({
    handle,
    point: rotatePoint(
      {
        x: element.x + element.width * fx,
        y: element.y + element.height * fy,
      },
      center,
      element.rotation,
    ),
  }));
}

function getRotateHandlePoint(
  element: Exclude<DrawingElement, ArrowElement>,
  scale: number,
): Point {
  const center = getElementCenter(element);
  return rotatePoint(
    {
      x: element.x + element.width / 2,
      y: element.y - ROTATE_OFFSET_PX / scale,
    },
    center,
    element.rotation,
  );
}

export function DrawingCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const [scale, setScale] = useState(1);
  const [marquee, setMarquee] = useState<Bounds | null>(null);

  const elements = useDrawingStore((state) => state.elements);
  const draft = useDrawingStore((state) => state.draft);
  const selectedIds = useDrawingStore((state) => state.selectedIds);
  const tool = useDrawingStore((state) => state.tool);
  const editingId = useDrawingStore((state) => state.editingId);
  const activeStyle = useDrawingStore((state) => state.activeStyle);
  const background = useDrawingStore((state) => state.background);

  // Keep the on-screen scale (px per stage unit) in sync for crisp handles.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0) setScale(rect.width / STAGE_WIDTH);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const toStage = useCallback((clientX: number, clientY: number): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * STAGE_WIDTH,
      y: ((clientY - rect.top) / rect.height) * STAGE_HEIGHT,
    };
  }, []);

  const store = useDrawingStore;

  const selectedElements = elements.filter((element) =>
    selectedIds.includes(element.id),
  );
  const singleSelected =
    selectedElements.length === 1 ? selectedElements[0] : null;

  const beginTextEdit = useCallback(
    (element: TextElement) => {
      store.getState().beginHistory();
      store.setState({ tool: "select", selectedIds: [element.id] });
      store.getState().setEditingId(element.id);
    },
    [store],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (event.button !== 0) return;
      if (editingId) return;
      const point = toStage(event.clientX, event.clientY);
      const state = store.getState();
      const shift = event.shiftKey;
      svgRef.current?.setPointerCapture(event.pointerId);

      // --- Creation tools ---------------------------------------------------
      if (tool === "rectangle" || tool === "ellipse") {
        gestureRef.current = { kind: "draw-box", tool, start: point };
        return;
      }
      if (tool === "arrow") {
        gestureRef.current = { kind: "draw-arrow", start: point };
        return;
      }
      if (tool === "freedraw") {
        gestureRef.current = { kind: "freedraw", points: [point] };
        return;
      }
      if (tool === "text") {
        const element = createText(point, state.activeStyle, "");
        state.addElement(element);
        beginTextEdit(element);
        return;
      }
      if (tool === "placeholder") {
        const element = createPlaceholder(point, state.activeStyle);
        state.addElement(element);
        state.setTool("select");
        return;
      }

      // --- Select tool: handles first --------------------------------------
      if (singleSelected) {
        if (isLinearElement(singleSelected)) {
          const endpoint = hitArrowEndpoint(singleSelected, point, scale);
          if (endpoint) {
            state.beginHistory();
            gestureRef.current = {
              kind: "arrow-endpoint",
              id: singleSelected.id,
              which: endpoint,
            };
            return;
          }
        } else {
          const rotatePointHit = getRotateHandlePoint(singleSelected, scale);
          if (distance(point, rotatePointHit) <= HIT_PX / scale) {
            state.beginHistory();
            gestureRef.current = {
              kind: "rotate",
              id: singleSelected.id,
              center: getElementCenter(singleSelected),
            };
            return;
          }
          for (const { handle, point: handlePoint } of getBoxHandlePoints(
            singleSelected,
          )) {
            if (distance(point, handlePoint) <= HIT_PX / scale) {
              state.beginHistory();
              gestureRef.current = {
                kind: "resize",
                handle,
                id: singleSelected.id,
                original: singleSelected,
              };
              return;
            }
          }
        }
      }

      // --- Select tool: element hit ----------------------------------------
      const hit = [...elements]
        .reverse()
        .find((element) => hitTestElement(element, point, HIT_PX / scale));

      if (hit) {
        let nextSelection = selectedIds;
        if (shift) {
          state.toggleSelection(hit.id);
          nextSelection = store.getState().selectedIds;
        } else if (!selectedIds.includes(hit.id)) {
          state.setSelection([hit.id]);
          nextSelection = [hit.id];
        }
        // Start a move gesture for the current selection.
        const originals = new Map<string, DrawingElement>();
        for (const element of store.getState().elements) {
          if (nextSelection.includes(element.id)) {
            originals.set(element.id, element);
          }
        }
        if (originals.size > 0) {
          state.beginHistory();
          gestureRef.current = { kind: "move", start: point, originals };
        }
        return;
      }

      // --- Empty space: marquee --------------------------------------------
      if (!shift) state.clearSelection();
      gestureRef.current = {
        kind: "marquee",
        start: point,
        additive: shift,
        base: shift ? selectedIds : [],
      };
    },
    [
      beginTextEdit,
      editingId,
      elements,
      scale,
      selectedIds,
      singleSelected,
      store,
      toStage,
      tool,
    ],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const gesture = gestureRef.current;
      if (!gesture) return;
      const point = toStage(event.clientX, event.clientY);
      const state = store.getState();
      const shift = event.shiftKey;

      switch (gesture.kind) {
        case "move": {
          const dx = point.x - gesture.start.x;
          const dy = point.y - gesture.start.y;
          state.replaceElements((list) =>
            list.map((element) => {
              const original = gesture.originals.get(element.id);
              return original ? translateElement(original, dx, dy) : element;
            }),
          );
          break;
        }
        case "resize": {
          const original = gesture.original;
          if (isLinearElement(original)) break;
          const next = resizeBox(
            {
              x: original.x,
              y: original.y,
              width: original.width,
              height: original.height,
              rotation: original.rotation,
            },
            gesture.handle,
            point,
            shift,
          );
          const isCorner = gesture.handle.length === 2;
          state.replaceElements((list) =>
            list.map((element) => {
              if (element.id !== gesture.id) return element;
              if (element.type === "text" && isCorner) {
                const ratio = next.height / Math.max(original.height, 1);
                return {
                  ...element,
                  ...next,
                  fontSize: Math.max(
                    8,
                    Math.round((original as TextElement).fontSize * ratio),
                  ),
                };
              }
              return { ...element, ...next };
            }),
          );
          break;
        }
        case "rotate": {
          const rotation = rotationForPointer(gesture.center, point, shift);
          state.updateElement(gesture.id, { rotation });
          break;
        }
        case "arrow-endpoint": {
          state.replaceElements((list) =>
            list.map((element) =>
              element.id === gesture.id && isLinearElement(element)
                ? { ...element, [gesture.which]: point }
                : element,
            ),
          );
          break;
        }
        case "draw-box": {
          const factory =
            gesture.tool === "rectangle" ? createRectangle : createEllipse;
          const constrained = shift ? squareTo(gesture.start, point) : point;
          state.setDraft(factory(gesture.start, constrained, activeStyle));
          break;
        }
        case "draw-arrow": {
          const end = shift ? constrainArrowEnd(gesture.start, point) : point;
          state.setDraft(createArrow(gesture.start, end, activeStyle));
          break;
        }
        case "freedraw": {
          gesture.points.push(point);
          const element = createFreedraw(gesture.points, activeStyle);
          if (element) state.setDraft(element);
          break;
        }
        case "marquee": {
          const rect = boundsFromPoints(gesture.start, point);
          setMarquee(rect);
          break;
        }
      }
    },
    [activeStyle, store, toStage],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const gesture = gestureRef.current;
      gestureRef.current = null;
      if (!gesture) return;
      const point = toStage(event.clientX, event.clientY);
      const state = store.getState();
      const shift = event.shiftKey;

      switch (gesture.kind) {
        case "draw-box": {
          const factory =
            gesture.tool === "rectangle" ? createRectangle : createEllipse;
          const dragged = shift ? squareTo(gesture.start, point) : point;
          // A plain click (no meaningful drag) drops a default-sized shape.
          const end =
            distance(gesture.start, dragged) < MIN_ELEMENT_SIZE
              ? { x: gesture.start.x + 160, y: gesture.start.y + 120 }
              : dragged;
          const element = factory(gesture.start, end, activeStyle);
          state.setDraft(null);
          state.addElement(element);
          state.setTool("select");
          break;
        }
        case "draw-arrow": {
          const dragged = shift
            ? constrainArrowEnd(gesture.start, point)
            : point;
          const end =
            distance(gesture.start, dragged) < MIN_ELEMENT_SIZE
              ? { x: gesture.start.x + 180, y: gesture.start.y }
              : dragged;
          state.setDraft(null);
          if (distance(gesture.start, end) >= MIN_ELEMENT_SIZE) {
            state.addElement(createArrow(gesture.start, end, activeStyle));
          }
          state.setTool("select");
          break;
        }
        case "freedraw": {
          const element = createFreedraw(gesture.points, activeStyle);
          state.setDraft(null);
          if (element) state.addElement(element);
          state.setTool("select");
          break;
        }
        case "marquee": {
          const rect = boundsFromPoints(gesture.start, point);
          setMarquee(null);
          if (rect.width < 3 && rect.height < 3) break;
          const hitIds = elements
            .filter((element) => intersectsRect(element, rect))
            .map((element) => element.id);
          const next = gesture.additive
            ? Array.from(new Set([...gesture.base, ...hitIds]))
            : hitIds;
          state.setSelection(next);
          break;
        }
        default:
          break;
      }
    },
    [activeStyle, elements, store, toStage],
  );

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const point = toStage(event.clientX, event.clientY);
      const hit = [...elements]
        .reverse()
        .find((element) => hitTestElement(element, point, HIT_PX / scale));
      if (hit && hit.type === "text") {
        beginTextEdit(hit);
      } else if (!hit) {
        // Double-click empty space with select tool drops a text box.
        if (tool === "select") {
          const element = createText(point, store.getState().activeStyle, "");
          store.getState().addElement(element);
          beginTextEdit(element);
        }
      }
    },
    [beginTextEdit, elements, scale, store, toStage, tool],
  );

  const cursorClass =
    tool === "select"
      ? "cursor-default"
      : tool === "text"
        ? "cursor-text"
        : "cursor-crosshair";

  const selectionBounds = getSelectionBounds(selectedElements);

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full select-none"
      style={{ touchAction: "none" }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`}
        className={cn(
          "border-border size-full rounded-xl border shadow-sm",
          cursorClass,
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        <rect
          x={0}
          y={0}
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          fill={background}
        />

        {elements.map((element) => (
          <g key={element.id} style={{ pointerEvents: "none" }}>
            <ElementView
              element={element}
              isEditing={editingId === element.id}
            />
          </g>
        ))}

        {draft ? (
          <g style={{ pointerEvents: "none", opacity: 0.9 }}>
            <ElementView element={draft} isEditing={false} />
          </g>
        ) : null}

        {/* Selection outlines + handles */}
        {!editingId && singleSelected ? (
          <SingleSelectionOverlay element={singleSelected} scale={scale} />
        ) : null}
        {!editingId && !singleSelected && selectionBounds ? (
          <GroupSelectionOverlay bounds={selectionBounds} scale={scale} />
        ) : null}

        {marquee ? (
          <rect
            x={marquee.x}
            y={marquee.y}
            width={marquee.width}
            height={marquee.height}
            className="fill-primary/10 stroke-primary"
            strokeWidth={1 / scale}
            strokeDasharray={`${4 / scale} ${3 / scale}`}
          />
        ) : null}
      </svg>

      {editingId ? (
        <TextEditingOverlay
          element={
            elements.find((element) => element.id === editingId) as
              | TextElement
              | undefined
          }
          scale={scale}
        />
      ) : null}
    </div>
  );
}

function SingleSelectionOverlay({
  element,
  scale,
}: {
  element: DrawingElement;
  scale: number;
}) {
  const handleSize = HANDLE_PX / scale;
  const stroke = 1.5 / scale;

  if (isLinearElement(element)) {
    return (
      <g style={{ pointerEvents: "none" }}>
        <line
          x1={element.start.x}
          y1={element.start.y}
          x2={element.end.x}
          y2={element.end.y}
          className="stroke-primary"
          strokeWidth={stroke}
          strokeDasharray={`${4 / scale} ${3 / scale}`}
        />
        {[element.start, element.end].map((endpoint, index) => (
          <circle
            key={index}
            cx={endpoint.x}
            cy={endpoint.y}
            r={handleSize / 1.4}
            className="fill-background stroke-primary"
            strokeWidth={stroke}
          />
        ))}
      </g>
    );
  }

  const center = getElementCenter(element);
  const rotateHandle = getRotateHandlePoint(element, scale);
  const rotationDeg = (element.rotation * 180) / Math.PI;

  return (
    <g style={{ pointerEvents: "none" }}>
      <g transform={`rotate(${rotationDeg} ${center.x} ${center.y})`}>
        <rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          fill="none"
          className="stroke-primary"
          strokeWidth={stroke}
        />
      </g>
      <line
        x1={center.x}
        y1={element.y}
        x2={rotateHandle.x}
        y2={rotateHandle.y}
        className="stroke-primary"
        strokeWidth={stroke}
        transform={`rotate(${rotationDeg} ${center.x} ${center.y})`}
      />
      <circle
        cx={rotateHandle.x}
        cy={rotateHandle.y}
        r={handleSize / 1.3}
        className="fill-background stroke-primary"
        strokeWidth={stroke}
      />
      {getBoxHandlePoints(element).map(({ handle, point }) => (
        <rect
          key={handle}
          x={point.x - handleSize / 2}
          y={point.y - handleSize / 2}
          width={handleSize}
          height={handleSize}
          rx={handleSize / 4}
          className="fill-background stroke-primary"
          strokeWidth={stroke}
        />
      ))}
    </g>
  );
}

function GroupSelectionOverlay({
  bounds,
  scale,
}: {
  bounds: Bounds;
  scale: number;
}) {
  return (
    <rect
      x={bounds.x}
      y={bounds.y}
      width={bounds.width}
      height={bounds.height}
      fill="none"
      className="stroke-primary"
      strokeWidth={1.5 / scale}
      strokeDasharray={`${5 / scale} ${4 / scale}`}
      style={{ pointerEvents: "none" }}
    />
  );
}

function TextEditingOverlay({
  element,
  scale,
}: {
  element: TextElement | undefined;
  scale: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const store = useDrawingStore;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      textarea.select();
    }
  }, [element?.id]);

  if (!element) return null;

  const commit = () => {
    const current = store
      .getState()
      .elements.find((el) => el.id === element.id) as TextElement | undefined;
    if (current && current.text.trim() === "") {
      // Remove empty text boxes so the canvas stays clean.
      store
        .getState()
        .replaceElements(
          (list) => list.filter((el) => el.id !== element.id),
          false,
        );
    }
    store.getState().setEditingId(null);
  };

  const justify =
    element.align === "left"
      ? "flex-start"
      : element.align === "right"
        ? "flex-end"
        : "center";

  return (
    <div
      className="absolute"
      style={{
        left: `${(element.x / STAGE_WIDTH) * 100}%`,
        top: `${(element.y / STAGE_HEIGHT) * 100}%`,
        width: `${(element.width / STAGE_WIDTH) * 100}%`,
        height: `${(element.height / STAGE_HEIGHT) * 100}%`,
        transform: `rotate(${(element.rotation * 180) / Math.PI}deg)`,
        display: "flex",
        alignItems: "center",
        justifyContent: justify,
      }}
    >
      <textarea
        ref={textareaRef}
        value={element.text}
        onChange={(event) =>
          store
            .getState()
            .updateElement(element.id, { text: event.target.value })
        }
        onBlur={commit}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") {
            event.preventDefault();
            commit();
          }
        }}
        spellCheck={false}
        className="size-full resize-none overflow-hidden border-none bg-transparent p-0 outline-none"
        style={{
          color: element.color,
          fontSize: `${element.fontSize * scale}px`,
          fontFamily: DRAWING_FONT_STACKS[element.fontFamily],
          fontWeight: element.fontWeight,
          lineHeight: 1.2,
          textAlign: element.align,
        }}
      />
    </div>
  );
}

// -------------------------------------------------------------------------
// Small geometry helpers local to interaction
// -------------------------------------------------------------------------

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function boundsFromPoints(a: Point, b: Point): Bounds {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

/** Constrain `b` so the box start..b is a square (for Shift while drawing). */
function squareTo(a: Point, b: Point): Point {
  const size = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  return {
    x: a.x + Math.sign(b.x - a.x || 1) * size,
    y: a.y + Math.sign(b.y - a.y || 1) * size,
  };
}

function hitArrowEndpoint(
  arrow: ArrowElement,
  point: Point,
  scale: number,
): "start" | "end" | null {
  if (distance(point, arrow.start) <= HIT_PX / scale) return "start";
  if (distance(point, arrow.end) <= HIT_PX / scale) return "end";
  return null;
}
