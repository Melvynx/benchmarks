import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBlocker } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Redo2, Undo2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  type Bounds,
  type Point,
  type ResizeHandle,
  RESIZE_HANDLES,
  boundsIntersect,
  getBoundsCenter,
  getElementBounds,
  getHandlePosition,
  hitTestElement,
  measureDrawingText,
  resizeBounds as resizeBoundsForElement,
  rotatePoint,
} from "./drawing-geometry";
import { DrawingScene } from "./drawing-render";
import {
  type DrawingTool,
  addElements,
  createEditorState,
  editorReducer,
  removeElements,
  replaceElements,
} from "./drawing-state";
import type { DrawingTemplate } from "./drawing-templates";
import { DrawingProperties, DrawingToolbar } from "./drawing-toolbar";
import {
  DRAWING_FONT_SIZES,
  DRAWING_LINE_HEIGHT,
  DRAWING_STROKE_WIDTHS,
  type DrawingDocument,
  type DrawingElement,
  type FreedrawElement,
  type TextElement,
  createElementId,
} from "./drawing.schema";

const SELECTION_COLOR = "#6965db";
const NEW_SHAPE_MIN_SIZE = 4;
const PASTE_OFFSET = 24;

type ElementStyle = {
  stroke: string;
  fill: string;
  strokeWidth: number;
  fontSize: number;
};

const DEFAULT_STYLE: ElementStyle = {
  stroke: "#1e1e1e",
  fill: "transparent",
  strokeWidth: DRAWING_STROKE_WIDTHS[1],
  fontSize: DRAWING_FONT_SIZES[1],
};

type Gesture =
  | { kind: "draw"; elementId: string; start: Point }
  | {
      kind: "freedraw";
      elementId: string;
      origin: Point;
      points: [number, number][];
    }
  | {
      kind: "move";
      start: Point;
      origins: Map<string, DrawingElement>;
      moved: boolean;
    }
  | {
      kind: "resize";
      handle: ResizeHandle;
      origin: DrawingElement;
      originBounds: Bounds;
      center: Point;
    }
  | {
      kind: "rotate";
      origin: DrawingElement;
      center: Point;
      startPointerAngle: number;
    }
  | { kind: "marquee"; start: Point; additive: boolean };

// Module-level clipboard so copy/paste survives page-internal remounts.
let elementClipboard: DrawingElement[] = [];

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

function cloneWithNewIds(elements: DrawingElement[], offset: number) {
  return elements.map((element) => ({
    ...element,
    id: createElementId(),
    x: element.x + offset,
    y: element.y + offset,
  }));
}

function scaleElementToBounds(
  element: DrawingElement,
  from: Bounds,
  to: Bounds,
): DrawingElement {
  const scaleX = from.width === 0 ? 1 : to.width / from.width;
  const scaleY = from.height === 0 ? 1 : to.height / from.height;

  if (element.type === "arrow") {
    return {
      ...element,
      x: to.x + (element.x - from.x) * scaleX,
      y: to.y + (element.y - from.y) * scaleY,
      width: element.width * scaleX,
      height: element.height * scaleY,
    };
  }

  if (element.type === "freedraw") {
    return {
      ...element,
      x: to.x,
      y: to.y,
      width: to.width,
      height: to.height,
      points: element.points.map(
        ([px, py]) => [px * scaleX, py * scaleY] as [number, number],
      ),
    };
  }

  if (element.type === "text") {
    const fontSize = Math.max(8, element.fontSize * scaleY);
    const size = measureDrawingText(element.text, fontSize);
    return {
      ...element,
      x: to.x,
      y: to.y,
      fontSize,
      width: size.width,
      height: size.height,
    };
  }

  return {
    ...element,
    x: to.x,
    y: to.y,
    width: to.width,
    height: to.height,
  };
}

type DrawingEditorProps = {
  initialDoc: DrawingDocument;
  initialTitle: string;
  saving: boolean;
  saveLabel: string;
  /** Persist the drawing; resolves with the saved inspiration id, or null on failure. */
  onSave: (payload: {
    doc: DrawingDocument;
    title: string;
  }) => Promise<string | null>;
  /** Called after a successful save, once the dirty guard is released. */
  onSaved: (inspirationId: string) => void;
  onExit: () => void;
  onUploadImage: (file: File) => Promise<string>;
};

export function DrawingEditor({
  initialDoc,
  initialTitle,
  saving,
  saveLabel,
  onSave,
  onSaved,
  onExit,
  onUploadImage,
}: DrawingEditorProps) {
  const [state, dispatch] = useReducer(
    editorReducer,
    initialDoc,
    createEditorState,
  );
  const [title, setTitle] = useState(initialTitle);
  const [style, setStyle] = useState<ElementStyle>(DEFAULT_STYLE);
  const [marquee, setMarquee] = useState<Bounds | null>(null);
  const [scale, setScale] = useState(1);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const savedRef = useRef(false);

  const { doc, selectedIds, tool, editingTextId } = state;
  const selectedElements = useMemo(
    () => doc.elements.filter((element) => selectedIds.includes(element.id)),
    [doc.elements, selectedIds],
  );
  const singleSelection =
    selectedElements.length === 1 ? selectedElements[0] : null;
  const editingText = editingTextId
    ? (doc.elements.find(
        (element): element is TextElement =>
          element.id === editingTextId && element.type === "text",
      ) ?? null)
    : null;

  const isDirty = state.dirty && !savedRef.current;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  useBlocker({
    shouldBlockFn: () => {
      if (!isDirtyRef.current) return false;
      return !window.confirm(
        "You have unsaved changes in this drawing. Leave without saving?",
      );
    },
    enableBeforeUnload: () => isDirtyRef.current,
  });

  // Fit the 16:9 canvas into the available space.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const updateScale = () => {
      const rect = container.getBoundingClientRect();
      // Leave room for the floating toolbar (top) and properties panel (left).
      const next = Math.min(
        (rect.width - 96) / doc.width,
        (rect.height - 140) / doc.height,
      );
      setScale(Math.max(0.1, Math.min(next, 2)));
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, [doc.width, doc.height]);

  const toCanvasPoint = useCallback(
    (event: { clientX: number; clientY: number }): Point => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) / scale,
        y: (event.clientY - rect.top) / scale,
      };
    },
    [scale],
  );

  const applyDoc = useCallback(
    (nextDoc: DrawingDocument, select?: string[]) => {
      dispatch({ type: "apply", doc: nextDoc, select });
    },
    [],
  );

  const finishTextEditing = useCallback(() => {
    const current = stateRef.current;
    if (!current.editingTextId) return;
    const element = current.doc.elements.find(
      (item) => item.id === current.editingTextId,
    );
    if (element?.type === "text" && element.text.trim() === "") {
      dispatch({
        type: "update-doc",
        doc: removeElements(current.doc, [element.id]),
      });
    }
    dispatch({ type: "set-editing-text", id: null });
    dispatch({ type: "commit-gesture" });
  }, []);

  const startTextEditing = useCallback((id: string) => {
    dispatch({ type: "begin-gesture" });
    dispatch({ type: "set-editing-text", id });
    dispatch({ type: "select", ids: [id] });
  }, []);

  const createTextAt = useCallback(
    (point: Point) => {
      const fontSize = style.fontSize;
      const size = measureDrawingText("", fontSize);
      const element: TextElement = {
        id: createElementId(),
        type: "text",
        text: "",
        fontSize,
        x: point.x,
        y: point.y - size.height / 2,
        width: size.width,
        height: size.height,
        angle: 0,
        stroke: style.stroke,
        fill: "transparent",
        strokeWidth: style.strokeWidth,
      };
      dispatch({ type: "begin-gesture" });
      dispatch({
        type: "update-doc",
        doc: addElements(stateRef.current.doc, [element]),
      });
      dispatch({ type: "set-tool", tool: "select" });
      dispatch({ type: "select", ids: [element.id] });
      dispatch({ type: "set-editing-text", id: element.id });
    },
    [style],
  );

  const deleteSelected = useCallback(() => {
    const current = stateRef.current;
    if (current.selectedIds.length === 0) return;
    applyDoc(removeElements(current.doc, current.selectedIds), []);
  }, [applyDoc]);

  const duplicateSelected = useCallback(() => {
    const current = stateRef.current;
    const elements = current.doc.elements.filter((element) =>
      current.selectedIds.includes(element.id),
    );
    if (elements.length === 0) return;
    const clones = cloneWithNewIds(elements, PASTE_OFFSET);
    applyDoc(
      addElements(current.doc, clones),
      clones.map((clone) => clone.id),
    );
  }, [applyDoc]);

  const copySelected = useCallback(() => {
    const current = stateRef.current;
    const elements = current.doc.elements.filter((element) =>
      current.selectedIds.includes(element.id),
    );
    if (elements.length > 0) elementClipboard = elements;
  }, []);

  const pasteClipboard = useCallback(() => {
    if (elementClipboard.length === 0) return;
    const clones = cloneWithNewIds(elementClipboard, PASTE_OFFSET);
    applyDoc(
      addElements(stateRef.current.doc, clones),
      clones.map((clone) => clone.id),
    );
    dispatch({ type: "set-tool", tool: "select" });
  }, [applyDoc]);

  const nudgeSelected = useCallback(
    (dx: number, dy: number) => {
      const current = stateRef.current;
      if (current.selectedIds.length === 0) return;
      const updated = new Map(
        current.doc.elements
          .filter((element) => current.selectedIds.includes(element.id))
          .map((element) => [
            element.id,
            { ...element, x: element.x + dx, y: element.y + dy },
          ]),
      );
      applyDoc(replaceElements(current.doc, updated));
    },
    [applyDoc],
  );

  const insertPerson = useCallback(() => {
    const current = stateRef.current;
    const width = 300;
    const height = 460;
    const element: DrawingElement = {
      id: createElementId(),
      type: "person",
      x: (current.doc.width - width) / 2,
      y: (current.doc.height - height) / 2,
      width,
      height,
      angle: 0,
      stroke: style.stroke,
      fill: "#e9ecef",
      strokeWidth: style.strokeWidth,
    };
    applyDoc(addElements(current.doc, [element]), [element.id]);
    dispatch({ type: "set-tool", tool: "select" });
  }, [applyDoc, style]);

  const insertTemplate = useCallback(
    (template: DrawingTemplate) => {
      const elements = template.createElements();
      applyDoc(
        addElements(stateRef.current.doc, elements),
        elements.map((element) => element.id),
      );
      dispatch({ type: "set-tool", tool: "select" });
    },
    [applyDoc],
  );

  const insertImageFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Only images can be inserted");
        return;
      }
      setIsUploadingImage(true);
      try {
        const url = await onUploadImage(file);
        const dimensions = await new Promise<{ width: number; height: number }>(
          (resolve) => {
            const objectUrl = URL.createObjectURL(file);
            const img = new window.Image();
            img.onload = () => {
              resolve({ width: img.naturalWidth, height: img.naturalHeight });
              URL.revokeObjectURL(objectUrl);
            };
            img.onerror = () => {
              resolve({ width: 4, height: 3 });
              URL.revokeObjectURL(objectUrl);
            };
            img.src = objectUrl;
          },
        );
        const current = stateRef.current;
        const maxWidth = current.doc.width * 0.4;
        const maxHeight = current.doc.height * 0.6;
        const ratio = Math.min(
          maxWidth / dimensions.width,
          maxHeight / dimensions.height,
        );
        const width = Math.round(dimensions.width * ratio);
        const height = Math.round(dimensions.height * ratio);
        const element: DrawingElement = {
          id: createElementId(),
          type: "image",
          url,
          x: (current.doc.width - width) / 2,
          y: (current.doc.height - height) / 2,
          width,
          height,
          angle: 0,
          stroke: "#1e1e1e",
          fill: "transparent",
          strokeWidth: 0,
        };
        applyDoc(addElements(current.doc, [element]), [element.id]);
        dispatch({ type: "set-tool", tool: "select" });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to upload image",
        );
      } finally {
        setIsUploadingImage(false);
      }
    },
    [applyDoc, onUploadImage],
  );

  const updateSelectedStyle = useCallback(
    (patch: Partial<ElementStyle>) => {
      setStyle((current) => ({ ...current, ...patch }));
      const current = stateRef.current;
      if (current.selectedIds.length === 0) return;
      const updated = new Map<string, DrawingElement>();
      for (const element of current.doc.elements) {
        if (!current.selectedIds.includes(element.id)) continue;
        let next: DrawingElement = { ...element };
        if (patch.stroke !== undefined) next.stroke = patch.stroke;
        if (patch.fill !== undefined && element.type !== "text") {
          next.fill = patch.fill;
        }
        if (patch.strokeWidth !== undefined) {
          next.strokeWidth = patch.strokeWidth;
        }
        if (patch.fontSize !== undefined && next.type === "text") {
          const size = measureDrawingText(next.text, patch.fontSize);
          next = {
            ...next,
            fontSize: patch.fontSize,
            width: size.width,
            height: size.height,
          };
        }
        updated.set(element.id, next);
      }
      applyDoc(replaceElements(current.doc, updated));
    },
    [applyDoc],
  );

  const reorderSelected = useCallback(
    (direction: 1 | -1) => {
      const current = stateRef.current;
      if (current.selectedIds.length === 0) return;
      const selected = new Set(current.selectedIds);
      const others = current.doc.elements.filter(
        (element) => !selected.has(element.id),
      );
      const moving = current.doc.elements.filter((element) =>
        selected.has(element.id),
      );
      const indexes = current.doc.elements
        .map((element, index) => (selected.has(element.id) ? index : -1))
        .filter((index) => index >= 0);
      const minIndex = Math.min(...indexes);
      const maxIndex = Math.max(...indexes);
      const insertAt =
        direction === 1
          ? Math.min(others.length, maxIndex - moving.length + 2)
          : Math.max(0, minIndex - 1);
      const elements = [
        ...others.slice(0, insertAt),
        ...moving,
        ...others.slice(insertAt),
      ];
      applyDoc({ ...current.doc, elements });
    },
    [applyDoc],
  );

  const handleSave = useCallback(async () => {
    finishTextEditing();
    const savedId = await onSave({
      doc: stateRef.current.doc,
      title: title.trim() || "Untitled drawing",
    });
    if (savedId) {
      // Release the dirty guard imperatively before navigating so the
      // unsaved-changes blocker does not fire on the post-save redirect.
      savedRef.current = true;
      isDirtyRef.current = false;
      dispatch({ type: "mark-saved" });
      onSaved(savedId);
    }
  }, [finishTextEditing, onSave, onSaved, title]);

  // Track edits after a save so the blocker re-arms.
  useEffect(() => {
    if (state.dirty) savedRef.current = false;
  }, [state.doc, state.dirty]);

  const hitTestAt = useCallback((point: Point) => {
    const elements = stateRef.current.doc.elements;
    for (let index = elements.length - 1; index >= 0; index -= 1) {
      if (hitTestElement(elements[index], point)) return elements[index];
    }
    return null;
  }, []);

  const beginShapeDraw = useCallback(
    (point: Point, shapeTool: Exclude<DrawingTool, "select" | "text">) => {
      const id = createElementId();
      const shared = {
        id,
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
        angle: 0,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
      };
      let element: DrawingElement;
      if (shapeTool === "freedraw") {
        element = {
          ...shared,
          type: "freedraw",
          fill: "transparent",
          points: [[0, 0]],
        };
        gestureRef.current = {
          kind: "freedraw",
          elementId: id,
          origin: point,
          points: [[0, 0]],
        };
      } else if (shapeTool === "arrow") {
        element = { ...shared, type: "arrow", fill: "transparent" };
        gestureRef.current = { kind: "draw", elementId: id, start: point };
      } else {
        element = { ...shared, type: shapeTool, fill: style.fill };
        gestureRef.current = { kind: "draw", elementId: id, start: point };
      }
      dispatch({ type: "begin-gesture" });
      dispatch({
        type: "update-doc",
        doc: addElements(stateRef.current.doc, [element]),
      });
    },
    [style],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      const point = toCanvasPoint(event);

      if (stateRef.current.editingTextId) {
        finishTextEditing();
        return;
      }

      if (tool === "text") {
        createTextAt(point);
        return;
      }

      if (tool !== "select") {
        beginShapeDraw(point, tool);
        return;
      }

      const hit = hitTestAt(point);
      if (hit) {
        let ids = stateRef.current.selectedIds;
        if (event.shiftKey) {
          dispatch({ type: "select", ids: [hit.id], additive: true });
          ids = ids.includes(hit.id)
            ? ids.filter((id) => id !== hit.id)
            : [...ids, hit.id];
        } else if (!ids.includes(hit.id)) {
          dispatch({ type: "select", ids: [hit.id] });
          ids = [hit.id];
        }
        const origins = new Map(
          stateRef.current.doc.elements
            .filter((element) => ids.includes(element.id))
            .map((element) => [element.id, element] as const),
        );
        if (origins.size > 0) {
          dispatch({ type: "begin-gesture" });
          gestureRef.current = {
            kind: "move",
            start: point,
            origins,
            moved: false,
          };
        }
        return;
      }

      if (!event.shiftKey) dispatch({ type: "select", ids: [] });
      gestureRef.current = {
        kind: "marquee",
        start: point,
        additive: event.shiftKey,
      };
      setMarquee({ x: point.x, y: point.y, width: 0, height: 0 });
    },
    [
      beginShapeDraw,
      createTextAt,
      finishTextEditing,
      hitTestAt,
      toCanvasPoint,
      tool,
    ],
  );

  const beginResize = useCallback(
    (event: React.PointerEvent, handle: ResizeHandle) => {
      event.stopPropagation();
      const element = stateRef.current.doc.elements.find((item) =>
        stateRef.current.selectedIds.includes(item.id),
      );
      if (!element) return;
      svgRef.current?.setPointerCapture(event.pointerId);
      const bounds = getElementBounds(element);
      dispatch({ type: "begin-gesture" });
      gestureRef.current = {
        kind: "resize",
        handle,
        origin: element,
        originBounds: bounds,
        center: getBoundsCenter(bounds),
      };
    },
    [],
  );

  const beginRotate = useCallback((event: React.PointerEvent) => {
    event.stopPropagation();
    const element = stateRef.current.doc.elements.find((item) =>
      stateRef.current.selectedIds.includes(item.id),
    );
    if (!element) return;
    svgRef.current?.setPointerCapture(event.pointerId);
    const center = getBoundsCenter(getElementBounds(element));
    const point = toCanvasPointRef.current(event);
    dispatch({ type: "begin-gesture" });
    gestureRef.current = {
      kind: "rotate",
      origin: element,
      center,
      startPointerAngle: Math.atan2(point.y - center.y, point.x - center.x),
    };
  }, []);

  // Stable ref so beginRotate does not depend on scale.
  const toCanvasPointRef = useRef(toCanvasPoint);
  toCanvasPointRef.current = toCanvasPoint;

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const gesture = gestureRef.current;
      const point = toCanvasPoint(event);

      if (!gesture) {
        if (tool === "select" && svgRef.current) {
          const hovered = hitTestAt(point);
          svgRef.current.style.cursor = hovered ? "move" : "default";
        }
        return;
      }

      const current = stateRef.current;

      if (gesture.kind === "marquee") {
        setMarquee({
          x: Math.min(gesture.start.x, point.x),
          y: Math.min(gesture.start.y, point.y),
          width: Math.abs(point.x - gesture.start.x),
          height: Math.abs(point.y - gesture.start.y),
        });
        return;
      }

      if (gesture.kind === "move") {
        const dx = point.x - gesture.start.x;
        const dy = point.y - gesture.start.y;
        if (!gesture.moved && Math.hypot(dx, dy) < 2) return;
        gesture.moved = true;
        const updated = new Map<string, DrawingElement>();
        for (const [id, origin] of gesture.origins) {
          updated.set(id, { ...origin, x: origin.x + dx, y: origin.y + dy });
        }
        dispatch({
          type: "update-doc",
          doc: replaceElements(current.doc, updated),
        });
        return;
      }

      if (gesture.kind === "draw") {
        let width = point.x - gesture.start.x;
        let height = point.y - gesture.start.y;
        const element = current.doc.elements.find(
          (item) => item.id === gesture.elementId,
        );
        if (!element) return;
        if (event.shiftKey) {
          if (element.type === "arrow") {
            // Snap to 45 degree increments.
            const length = Math.hypot(width, height);
            const snapped =
              Math.round(Math.atan2(height, width) / (Math.PI / 4)) *
              (Math.PI / 4);
            width = Math.cos(snapped) * length;
            height = Math.sin(snapped) * length;
          } else {
            const size = Math.max(Math.abs(width), Math.abs(height));
            width = Math.sign(width || 1) * size;
            height = Math.sign(height || 1) * size;
          }
        }
        const updated = new Map<string, DrawingElement>([
          [element.id, { ...element, width, height }],
        ]);
        dispatch({
          type: "update-doc",
          doc: replaceElements(current.doc, updated),
        });
        return;
      }

      if (gesture.kind === "freedraw") {
        const element = current.doc.elements.find(
          (item): item is FreedrawElement => item.id === gesture.elementId,
        );
        if (!element) return;
        gesture.points.push([
          point.x - gesture.origin.x,
          point.y - gesture.origin.y,
        ]);
        const xs = gesture.points.map(([px]) => px);
        const ys = gesture.points.map(([, py]) => py);
        const updated = new Map<string, DrawingElement>([
          [
            element.id,
            {
              ...element,
              points: [...gesture.points],
              width: Math.max(...xs) - Math.min(...xs),
              height: Math.max(...ys) - Math.min(...ys),
            },
          ],
        ]);
        dispatch({
          type: "update-doc",
          doc: replaceElements(current.doc, updated),
        });
        return;
      }

      if (gesture.kind === "resize") {
        const { origin, originBounds, center, handle } = gesture;
        const local = rotatePoint(point, center, -origin.angle);
        const keepAspect =
          origin.type === "text"
            ? true
            : origin.type === "image" || origin.type === "person"
              ? !event.shiftKey
              : event.shiftKey;
        const nextBounds = resizeBoundsForElement(
          originBounds,
          handle,
          local,
          keepAspect,
        );
        const next = scaleElementToBounds(origin, originBounds, nextBounds);
        dispatch({
          type: "update-doc",
          doc: replaceElements(current.doc, new Map([[origin.id, next]])),
        });
        return;
      }

      // Remaining gesture kind: rotate.
      const pointerAngle = Math.atan2(
        point.y - gesture.center.y,
        point.x - gesture.center.x,
      );
      let angle =
        gesture.origin.angle + (pointerAngle - gesture.startPointerAngle);
      if (event.shiftKey) {
        const step = Math.PI / 12;
        angle = Math.round(angle / step) * step;
      }
      dispatch({
        type: "update-doc",
        doc: replaceElements(
          current.doc,
          new Map([[gesture.origin.id, { ...gesture.origin, angle }]]),
        ),
      });
    },
    [hitTestAt, toCanvasPoint, tool],
  );

  const handlePointerUp = useCallback(() => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    if (!gesture) return;
    const current = stateRef.current;

    if (gesture.kind === "marquee") {
      const rect = marquee;
      setMarquee(null);
      if (rect && (rect.width > 2 || rect.height > 2)) {
        const ids = current.doc.elements
          .filter((element) => boundsIntersect(getElementBounds(element), rect))
          .map((element) => element.id);
        dispatch({ type: "select", ids, additive: gesture.additive });
      }
      return;
    }

    if (gesture.kind === "draw" || gesture.kind === "freedraw") {
      const element = current.doc.elements.find(
        (item) =>
          item.id ===
          (gesture.kind === "draw" ? gesture.elementId : gesture.elementId),
      );
      if (!element) {
        dispatch({ type: "cancel-gesture" });
        return;
      }
      const tooSmall =
        Math.abs(element.width) < NEW_SHAPE_MIN_SIZE &&
        Math.abs(element.height) < NEW_SHAPE_MIN_SIZE;
      if (tooSmall) {
        dispatch({ type: "cancel-gesture" });
        return;
      }

      let finalized: DrawingElement = element;
      if (element.type === "freedraw") {
        // Normalize points so the bounding box starts at (x, y).
        const xs = element.points.map(([px]) => px);
        const ys = element.points.map(([, py]) => py);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        finalized = {
          ...element,
          x: element.x + minX,
          y: element.y + minY,
          points: element.points.map(
            ([px, py]) => [px - minX, py - minY] as [number, number],
          ),
        };
      } else if (element.type !== "arrow") {
        // Normalize negative extents for box shapes.
        finalized = {
          ...element,
          x: element.width < 0 ? element.x + element.width : element.x,
          y: element.height < 0 ? element.y + element.height : element.y,
          width: Math.abs(element.width),
          height: Math.abs(element.height),
        };
      }
      dispatch({
        type: "update-doc",
        doc: replaceElements(current.doc, new Map([[element.id, finalized]])),
      });
      dispatch({ type: "commit-gesture" });
      if (element.type !== "freedraw") {
        dispatch({ type: "set-tool", tool: "select" });
        dispatch({ type: "select", ids: [element.id] });
      }
      return;
    }

    dispatch({ type: "commit-gesture" });
  }, [marquee]);

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (tool !== "select") return;
      const point = toCanvasPoint(event);
      const hit = hitTestAt(point);
      if (hit?.type === "text") {
        startTextEditing(hit.id);
        return;
      }
      if (!hit) createTextAt(point);
    },
    [createTextAt, hitTestAt, startTextEditing, toCanvasPoint, tool],
  );

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const editable = isEditableTarget(event.target);
      const mod = event.metaKey || event.ctrlKey;

      if (event.key === "Escape") {
        // Never let Escape bubble into dialogs/router; it only affects the
        // editor: leave text editing, then clear selection, then reset tool.
        event.preventDefault();
        const current = stateRef.current;
        if (current.editingTextId) {
          finishTextEditing();
        } else if (current.selectedIds.length > 0) {
          dispatch({ type: "select", ids: [] });
        } else if (current.tool !== "select") {
          dispatch({ type: "set-tool", tool: "select" });
        } else if (editable && event.target instanceof HTMLElement) {
          event.target.blur();
        }
        return;
      }

      if (editable) return;

      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? "redo" : "undo" });
        return;
      }
      if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        dispatch({ type: "redo" });
        return;
      }
      if (mod && event.key.toLowerCase() === "c") {
        copySelected();
        return;
      }
      if (mod && event.key.toLowerCase() === "v") {
        pasteClipboard();
        return;
      }
      if (mod && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
        return;
      }
      if (mod && event.key.toLowerCase() === "a") {
        event.preventDefault();
        dispatch({
          type: "select",
          ids: stateRef.current.doc.elements.map((element) => element.id),
        });
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
        return;
      }
      if (
        event.key.startsWith("Arrow") &&
        stateRef.current.selectedIds.length > 0
      ) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const deltas: Partial<Record<string, [number, number]>> = {
          ArrowUp: [0, -step],
          ArrowDown: [0, step],
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
        };
        const delta = deltas[event.key];
        if (delta) nudgeSelected(delta[0], delta[1]);
        return;
      }
      if (!mod) {
        const toolByKey: Partial<Record<string, DrawingTool>> = {
          v: "select",
          r: "rectangle",
          o: "ellipse",
          a: "arrow",
          p: "freedraw",
          t: "text",
        };
        const nextTool = toolByKey[event.key.toLowerCase()];
        if (nextTool) dispatch({ type: "set-tool", tool: nextTool });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    copySelected,
    deleteSelected,
    duplicateSelected,
    finishTextEditing,
    nudgeSelected,
    pasteClipboard,
  ]);

  // Focus the text editing overlay when it appears.
  useEffect(() => {
    if (editingTextId) {
      const timer = window.setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [editingTextId]);

  const updateEditingText = useCallback(
    (element: TextElement, text: string) => {
      const size = measureDrawingText(text, element.fontSize);
      dispatch({
        type: "update-doc",
        doc: replaceElements(
          stateRef.current.doc,
          new Map([
            [
              element.id,
              { ...element, text, width: size.width, height: size.height },
            ],
          ]),
        ),
      });
    },
    [],
  );

  const propertiesVisible = tool !== "select" || selectedElements.length > 0;
  const selectionHasText = selectedElements.some(
    (element) => element.type === "text",
  );
  const selectionOnlyImages =
    selectedElements.length > 0 &&
    selectedElements.every((element) => element.type === "image");
  const showFill =
    !selectionOnlyImages &&
    (selectedElements.length > 0
      ? selectedElements.some((element) =>
          ["rectangle", "ellipse", "person"].includes(element.type),
        )
      : ["rectangle", "ellipse"].includes(tool));
  const showFontSize = tool === "text" || selectionHasText;
  const selectionOnlyText =
    selectedElements.length > 0 &&
    selectedElements.every((element) => element.type === "text");
  const showStrokeWidth =
    !selectionOnlyImages &&
    !selectionOnlyText &&
    !(selectedElements.length === 0 && tool === "text");

  const activeStroke = singleSelection?.stroke ?? style.stroke;
  const activeFill = singleSelection?.fill ?? style.fill;
  const activeStrokeWidth = singleSelection?.strokeWidth ?? style.strokeWidth;
  const activeFontSize =
    singleSelection?.type === "text"
      ? singleSelection.fontSize
      : style.fontSize;

  const selectionBounds = singleSelection
    ? getElementBounds(singleSelection)
    : null;
  const handleSize = 8 / scale;

  return (
    <div className="bg-background fixed inset-0 z-[60] flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void insertImageFile(file);
        }}
      />

      {/* Top bar */}
      <header className="bg-background flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back to inspirations"
          onClick={onExit}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex min-w-0 items-center gap-2">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Untitled drawing"
            className="focus-visible:border-input h-8 w-56 border-transparent bg-transparent font-medium shadow-none"
          />
          {isDirty ? (
            <span
              className="bg-primary size-1.5 shrink-0 rounded-full"
              title="Unsaved changes"
            />
          ) : null}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Tooltip delayDuration={400}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Undo"
                disabled={state.past.length === 0}
                onClick={() => dispatch({ type: "undo" })}
              >
                <Undo2 className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Undo</TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={400}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Redo"
                disabled={state.future.length === 0}
                onClick={() => dispatch({ type: "redo" })}
              >
                <Redo2 className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Redo</TooltipContent>
          </Tooltip>
          <Button variant="ghost" onClick={onExit} className="ml-2">
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {saveLabel}
          </Button>
        </div>
      </header>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="bg-muted/30 relative flex-1 overflow-hidden"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative shadow-lg ring-1 ring-black/10"
            style={{ width: doc.width * scale, height: doc.height * scale }}
          >
            <svg
              ref={svgRef}
              width={doc.width * scale}
              height={doc.height * scale}
              viewBox={`0 0 ${doc.width} ${doc.height}`}
              className={
                tool === "select" ? "touch-none" : "cursor-crosshair touch-none"
              }
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onDoubleClick={handleDoubleClick}
            >
              <g pointerEvents="none">
                <DrawingScene doc={doc} />
              </g>

              {/* Selection overlay */}
              <g pointerEvents="none">
                {selectedElements.map((element) => {
                  const bounds = getElementBounds(element);
                  const center = getBoundsCenter(bounds);
                  const hidden = element.id === editingTextId;
                  if (hidden) return null;
                  return (
                    <rect
                      key={element.id}
                      x={bounds.x - 2}
                      y={bounds.y - 2}
                      width={bounds.width + 4}
                      height={bounds.height + 4}
                      fill="none"
                      stroke={SELECTION_COLOR}
                      strokeWidth={1.5 / scale}
                      transform={
                        element.angle
                          ? `rotate(${(element.angle * 180) / Math.PI} ${center.x} ${center.y})`
                          : undefined
                      }
                    />
                  );
                })}
              </g>

              {/* Resize + rotate handles (single selection only) */}
              {singleSelection && selectionBounds && !editingTextId ? (
                <g
                  transform={
                    singleSelection.angle
                      ? `rotate(${(singleSelection.angle * 180) / Math.PI} ${
                          selectionBounds.x + selectionBounds.width / 2
                        } ${selectionBounds.y + selectionBounds.height / 2})`
                      : undefined
                  }
                >
                  {RESIZE_HANDLES.map((handle) => {
                    const position = getHandlePosition(selectionBounds, handle);
                    return (
                      <rect
                        key={handle}
                        x={position.x - handleSize / 2}
                        y={position.y - handleSize / 2}
                        width={handleSize}
                        height={handleSize}
                        fill="#ffffff"
                        stroke={SELECTION_COLOR}
                        strokeWidth={1 / scale}
                        style={{ cursor: HANDLE_CURSORS[handle] }}
                        onPointerDown={(event) => beginResize(event, handle)}
                      />
                    );
                  })}
                  <line
                    x1={selectionBounds.x + selectionBounds.width / 2}
                    y1={selectionBounds.y}
                    x2={selectionBounds.x + selectionBounds.width / 2}
                    y2={selectionBounds.y - 20 / scale}
                    stroke={SELECTION_COLOR}
                    strokeWidth={1 / scale}
                  />
                  <circle
                    cx={selectionBounds.x + selectionBounds.width / 2}
                    cy={selectionBounds.y - 24 / scale}
                    r={handleSize / 2}
                    fill="#ffffff"
                    stroke={SELECTION_COLOR}
                    strokeWidth={1 / scale}
                    style={{ cursor: "grab" }}
                    onPointerDown={beginRotate}
                  />
                </g>
              ) : null}

              {/* Marquee */}
              {marquee ? (
                <rect
                  x={marquee.x}
                  y={marquee.y}
                  width={marquee.width}
                  height={marquee.height}
                  fill={`${SELECTION_COLOR}1a`}
                  stroke={SELECTION_COLOR}
                  strokeWidth={1 / scale}
                  pointerEvents="none"
                />
              ) : null}
            </svg>

            {/* Text editing overlay */}
            {editingText ? (
              <textarea
                ref={textareaRef}
                value={editingText.text}
                onChange={(event) =>
                  updateEditingText(editingText, event.target.value)
                }
                onBlur={finishTextEditing}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    finishTextEditing();
                  }
                }}
                spellCheck={false}
                className="absolute resize-none overflow-hidden bg-transparent outline-none"
                style={{
                  left: editingText.x * scale,
                  top: editingText.y * scale,
                  width: Math.max(editingText.width * scale + 16, 40),
                  height: editingText.height * scale + 8,
                  fontSize: editingText.fontSize * scale,
                  lineHeight: DRAWING_LINE_HEIGHT,
                  fontFamily: "Arial, Helvetica, sans-serif",
                  fontWeight: 700,
                  color: editingText.stroke,
                  whiteSpace: "pre",
                  border: `1px dashed ${SELECTION_COLOR}`,
                }}
              />
            ) : null}
          </div>
        </div>

        {/* Floating toolbar */}
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
          <DrawingToolbar
            tool={tool}
            onToolChange={(nextTool) => {
              finishTextEditing();
              dispatch({ type: "set-tool", tool: nextTool });
            }}
            onInsertImage={() => fileInputRef.current?.click()}
            onInsertPerson={insertPerson}
            onInsertTemplate={insertTemplate}
          />
        </div>

        {/* Contextual properties */}
        {propertiesVisible ? (
          <div className="pointer-events-none absolute top-4 left-4">
            <DrawingProperties
              stroke={activeStroke}
              fill={activeFill}
              strokeWidth={activeStrokeWidth}
              fontSize={activeFontSize}
              showFill={showFill}
              showStrokeWidth={showStrokeWidth}
              showFontSize={showFontSize}
              hasSelection={selectedElements.length > 0}
              onStrokeChange={(stroke) => updateSelectedStyle({ stroke })}
              onFillChange={(fill) => updateSelectedStyle({ fill })}
              onStrokeWidthChange={(strokeWidth) =>
                updateSelectedStyle({ strokeWidth })
              }
              onFontSizeChange={(fontSize) => updateSelectedStyle({ fontSize })}
              onDuplicate={duplicateSelected}
              onDelete={deleteSelected}
              onBringForward={() => reorderSelected(1)}
              onSendBackward={() => reorderSelected(-1)}
            />
          </div>
        ) : null}

        {isUploadingImage ? (
          <div className="bg-background pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-sm">
            <Loader2 className="size-4 animate-spin" />
            Uploading image...
          </div>
        ) : null}
      </div>
    </div>
  );
}
