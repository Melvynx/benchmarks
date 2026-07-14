import {
  Canvas,
  Ellipse,
  Line,
  PencilBrush,
  Point,
  Rect,
  Textbox,
  type FabricObject,
} from "fabric";
import { useEffect, useRef } from "react";
import { useDrawingEditorStore } from "./drawing-editor.store";
import { getObjectData, tagObject } from "./drawing-object-factory";
import {
  createArrowObject,
  DEFAULT_LINE_STYLE,
  DEFAULT_SHAPE_STYLE,
} from "./drawing-shapes";
import {
  clearGuides,
  computeSnapGuides,
  renderGuides,
} from "./drawing-snap-guides";
import type { DrawingObjectKind, DrawingTool } from "./drawing.types";

const MIN_DRAG_SIZE = 4;
const HISTORY_DEBOUNCE_MS = 150;
const SHAPE_DRAG_TOOLS = new Set<DrawingTool>([
  "rect",
  "roundedRect",
  "ellipse",
  "line",
  "arrow",
]);

export type DrawingCanvasHandle = {
  canvas: Canvas;
  /** Runs `init` with history capture suppressed, then records the result as the undo baseline. */
  initializeScene: (
    init: (canvas: Canvas) => void | Promise<void>,
  ) => Promise<void>;
  /** Restores a snapshot popped off the undo/redo stack without recording a new history entry. */
  restoreFromHistory: (json: string) => Promise<void>;
  /** Call after any imperative mutation that doesn't itself fire object:added/removed/modified (z-order, nudge, style panel edits). */
  notifyChange: () => void;
};

type CreationState = {
  tool: DrawingTool;
  startX: number;
  startY: number;
  object: FabricObject;
};

type PanState = {
  lastX: number;
  lastY: number;
};

function createDraftObject(tool: DrawingTool, x: number, y: number) {
  switch (tool) {
    case "rect":
      return new Rect({
        left: x,
        top: y,
        width: 1,
        height: 1,
        fill: DEFAULT_SHAPE_STYLE.fill,
        stroke: DEFAULT_SHAPE_STYLE.stroke,
        strokeWidth: DEFAULT_SHAPE_STYLE.strokeWidth,
      });
    case "roundedRect":
      return new Rect({
        left: x,
        top: y,
        width: 1,
        height: 1,
        rx: 16,
        ry: 16,
        fill: DEFAULT_SHAPE_STYLE.fill,
        stroke: DEFAULT_SHAPE_STYLE.stroke,
        strokeWidth: DEFAULT_SHAPE_STYLE.strokeWidth,
      });
    case "ellipse":
      return new Ellipse({
        left: x,
        top: y,
        rx: 1,
        ry: 1,
        fill: DEFAULT_SHAPE_STYLE.fill,
        stroke: DEFAULT_SHAPE_STYLE.stroke,
        strokeWidth: DEFAULT_SHAPE_STYLE.strokeWidth,
      });
    case "line":
      return new Line([x, y, x, y], {
        stroke: DEFAULT_LINE_STYLE.stroke,
        strokeWidth: DEFAULT_LINE_STYLE.strokeWidth,
        strokeLineCap: "round",
      });
    case "arrow":
      return createArrowObject(x, y, x, y);
    default:
      throw new Error(`"${tool}" is not a draggable shape tool`);
  }
}

type FabricCanvasProps = {
  width: number;
  height: number;
  onReady: (handle: DrawingCanvasHandle) => void;
};

export function FabricCanvas({ width, height, onReady }: FabricCanvasProps) {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<Canvas | null>(null);

  const toolRef = useRef<DrawingTool>("select");
  const tool = useDrawingEditorStore((s) => s.tool);
  const setTool = useDrawingEditorStore((s) => s.setTool);
  const setSelectedIds = useDrawingEditorStore((s) => s.setSelectedIds);
  const setZoom = useDrawingEditorStore((s) => s.setZoom);
  const pushHistory = useDrawingEditorStore((s) => s.pushHistory);
  const resetHistory = useDrawingEditorStore((s) => s.resetHistory);

  const isLoadingRef = useRef(false);
  const isCreatingRef = useRef(false);
  const creationStateRef = useRef<CreationState | null>(null);
  const panStateRef = useRef<PanState | null>(null);
  const guideLinesRef = useRef<Line[]>([]);
  const historyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    toolRef.current = tool;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.discardActiveObject();
    canvas.isDrawingMode = tool === "freehand";
    canvas.selection = tool === "select";
    canvas.skipTargetFind = tool !== "select";
    canvas.defaultCursor = tool === "pan" ? "grab" : "default";
    canvas.requestRenderAll();
  }, [tool]);

  useEffect(() => {
    const el = canvasElRef.current;
    if (!el) return;

    const canvas = new Canvas(el, {
      width,
      height,
      backgroundColor: "#ffffff",
      preserveObjectStacking: true,
      selection: true,
    });
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.width = 6;
    canvas.freeDrawingBrush.color = "#111111";
    canvasRef.current = canvas;

    const scheduleHistoryPush = () => {
      if (isLoadingRef.current || isCreatingRef.current) return;
      if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
      historyTimeoutRef.current = setTimeout(() => {
        pushHistory(JSON.stringify(canvas.toObject(["data"])));
      }, HISTORY_DEBOUNCE_MS);
    };

    const syncSelection = () => {
      const ids = canvas
        .getActiveObjects()
        .filter((object) => object.excludeFromExport !== true)
        .map((object) => getObjectData(object)?.id)
        .filter((id): id is string => Boolean(id));
      setSelectedIds(ids);
    };

    const handleMouseDown = (opt: { e: Event }) => {
      if (canvas.isDrawingMode) return;
      const currentTool = toolRef.current;
      const nativeEvent = opt.e as MouseEvent;

      if (currentTool === "pan") {
        panStateRef.current = {
          lastX: nativeEvent.clientX,
          lastY: nativeEvent.clientY,
        };
        canvas.defaultCursor = "grabbing";
        return;
      }

      if (currentTool === "text") {
        const point = canvas.getScenePoint(nativeEvent);
        const textbox = new Textbox("Text", {
          left: point.x,
          top: point.y,
          fontSize: 48,
          fontFamily: "Arial",
          fontWeight: "700",
          fill: "#111111",
          width: 280,
        });
        tagObject(textbox, { kind: "text" });
        canvas.add(textbox);
        canvas.setActiveObject(textbox);
        textbox.enterEditing();
        textbox.selectAll();
        canvas.requestRenderAll();
        setTool("select");
        return;
      }

      if (SHAPE_DRAG_TOOLS.has(currentTool)) {
        const point = canvas.getScenePoint(nativeEvent);
        isCreatingRef.current = true;
        const object = createDraftObject(currentTool, point.x, point.y);
        canvas.add(object);
        creationStateRef.current = {
          tool: currentTool,
          startX: point.x,
          startY: point.y,
          object,
        };
        canvas.requestRenderAll();
      }
    };

    const handleMouseMove = (opt: { e: Event }) => {
      if (canvas.isDrawingMode) return;
      const nativeEvent = opt.e as MouseEvent;

      if (panStateRef.current) {
        const dx = nativeEvent.clientX - panStateRef.current.lastX;
        const dy = nativeEvent.clientY - panStateRef.current.lastY;
        panStateRef.current.lastX = nativeEvent.clientX;
        panStateRef.current.lastY = nativeEvent.clientY;
        canvas.relativePan(new Point(dx, dy));
        return;
      }

      const creation = creationStateRef.current;
      if (!creation) return;

      const point = canvas.getScenePoint(nativeEvent);
      const { startX, startY, tool: creationTool } = creation;

      if (creationTool === "line") {
        creation.object.set({ x2: point.x, y2: point.y } as never);
      } else if (creationTool === "arrow") {
        canvas.remove(creation.object);
        creation.object = createArrowObject(startX, startY, point.x, point.y);
        canvas.add(creation.object);
      } else if (creationTool === "ellipse") {
        creation.object.set({
          left: Math.min(startX, point.x),
          top: Math.min(startY, point.y),
          rx: Math.abs(point.x - startX) / 2,
          ry: Math.abs(point.y - startY) / 2,
        });
      } else {
        creation.object.set({
          left: Math.min(startX, point.x),
          top: Math.min(startY, point.y),
          width: Math.abs(point.x - startX),
          height: Math.abs(point.y - startY),
        });
      }
      creation.object.setCoords();
      canvas.requestRenderAll();
    };

    const handleMouseUp = () => {
      if (panStateRef.current) {
        panStateRef.current = null;
        canvas.defaultCursor = toolRef.current === "pan" ? "grab" : "default";
        return;
      }

      const creation = creationStateRef.current;
      if (!creation) return;
      creationStateRef.current = null;
      isCreatingRef.current = false;

      const box = creation.object.getBoundingRect();
      if (box.width < MIN_DRAG_SIZE && box.height < MIN_DRAG_SIZE) {
        canvas.remove(creation.object);
        canvas.requestRenderAll();
        return;
      }

      const kind: DrawingObjectKind =
        creation.tool === "arrow" ? "arrow" : "shape";
      tagObject(creation.object, { kind });
      canvas.setActiveObject(creation.object);
      canvas.requestRenderAll();
      setTool("select");
      scheduleHistoryPush();
    };

    const handleMouseWheel = (opt: { e: WheelEvent }) => {
      opt.e.preventDefault();
      opt.e.stopPropagation();
      let zoom = canvas.getZoom() * 0.999 ** opt.e.deltaY;
      zoom = Math.min(4, Math.max(0.1, zoom));
      canvas.zoomToPoint(new Point(opt.e.offsetX, opt.e.offsetY), zoom);
      setZoom(zoom);
    };

    const handleObjectMoving = (opt: { target: FabricObject }) => {
      clearGuides(canvas, guideLinesRef.current);
      const { guides, deltaX, deltaY } = computeSnapGuides(canvas, opt.target);
      if (deltaX) opt.target.left += deltaX;
      if (deltaY) opt.target.top += deltaY;
      opt.target.setCoords();
      guideLinesRef.current = renderGuides(canvas, guides);
    };

    const handleTransformEnd = () => {
      if (guideLinesRef.current.length > 0) {
        clearGuides(canvas, guideLinesRef.current);
        guideLinesRef.current = [];
        canvas.requestRenderAll();
      }
      scheduleHistoryPush();
    };

    const handlePathCreated = (opt: { path: FabricObject }) => {
      tagObject(opt.path, { kind: "freehand" });
    };

    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);
    canvas.on("mouse:wheel", handleMouseWheel);
    canvas.on("object:moving", handleObjectMoving);
    canvas.on("object:modified", handleTransformEnd);
    canvas.on("object:added", scheduleHistoryPush);
    canvas.on("object:removed", scheduleHistoryPush);
    canvas.on("path:created", handlePathCreated);
    canvas.on("selection:created", syncSelection);
    canvas.on("selection:updated", syncSelection);
    canvas.on("selection:cleared", () => setSelectedIds([]));

    onReady({
      canvas,
      initializeScene: async (init) => {
        isLoadingRef.current = true;
        await init(canvas);
        canvas.requestRenderAll();
        isLoadingRef.current = false;
        resetHistory(JSON.stringify(canvas.toObject(["data"])));
      },
      restoreFromHistory: async (json) => {
        isLoadingRef.current = true;
        canvas.discardActiveObject();
        await canvas.loadFromJSON(JSON.parse(json) as Record<string, unknown>);
        canvas.requestRenderAll();
        isLoadingRef.current = false;
      },
      notifyChange: scheduleHistoryPush,
    });

    return () => {
      if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
      void canvas.dispose();
      canvasRef.current = null;
    };
    // Mount once: width/height define the fixed artboard for this editor session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasElRef} className="block rounded shadow-lg" />;
}
