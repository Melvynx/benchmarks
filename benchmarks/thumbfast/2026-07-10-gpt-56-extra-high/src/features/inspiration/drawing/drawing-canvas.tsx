import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import {
  DRAWING_COLORS,
  DRAWING_HEIGHT,
  DRAWING_WIDTH,
  createTextAt,
  type DrawingArrowObject,
  type DrawingDocument,
  type DrawingEllipseObject,
  type DrawingObject,
  type DrawingPathObject,
  type DrawingPoint,
  type DrawingRectangleObject,
  type DrawingTextObject,
  type DrawingTool,
  type ResizeHandle,
} from "./drawing-document";
import {
  getDrawingObjectAtPoint,
  getResizeHandleAtPoint,
  normalizePathPoints,
  preloadDrawingImageSources,
  renderDrawingDocument,
  type DrawingImageCache,
} from "./drawing-renderer";

type DrawingUpdate =
  | DrawingDocument
  | ((document: DrawingDocument) => DrawingDocument);

type DrawingCanvasProps = {
  document: DrawingDocument;
  documentRef: RefObject<DrawingDocument>;
  imageCache: DrawingImageCache;
  selectedObjectId: string | null;
  editingTextId: string | null;
  textDraft: string;
  tool: DrawingTool;
  disabled?: boolean;
  setSelectedObjectId: (id: string | null) => void;
  setTool: (tool: DrawingTool) => void;
  setTextDraft: (value: string) => void;
  onEditText: (object: DrawingTextObject) => void;
  onFinishText: () => void;
  commit: (update: DrawingUpdate) => void;
  preview: (update: DrawingUpdate) => void;
  commitGesture: (before: DrawingDocument) => void;
  cancelGesture: (before: DrawingDocument) => void;
};

type Gesture =
  | {
      kind: "move";
      pointerId: number;
      start: DrawingPoint;
      before: DrawingDocument;
      object: DrawingObject;
    }
  | {
      kind: "resize";
      pointerId: number;
      start: DrawingPoint;
      before: DrawingDocument;
      object: DrawingObject;
      handle: ResizeHandle;
    }
  | {
      kind: "shape";
      pointerId: number;
      start: DrawingPoint;
      before: DrawingDocument;
      objectId: string;
      tool: "arrow" | "rectangle" | "ellipse";
    }
  | {
      kind: "path";
      pointerId: number;
      before: DrawingDocument;
      objectId: string;
      points: DrawingPoint[];
    };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function withObject(
  document: DrawingDocument,
  objectId: string,
  update: (object: DrawingObject) => DrawingObject,
): DrawingDocument {
  return {
    ...document,
    objects: document.objects.map((object) =>
      object.id === objectId ? update(object) : object,
    ),
  };
}

function constrainEndPoint(
  start: DrawingPoint,
  end: DrawingPoint,
  tool: "arrow" | "rectangle" | "ellipse",
  constrained: boolean,
) {
  if (!constrained) return end;
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (tool === "arrow") {
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    return {
      x: start.x + Math.cos(snappedAngle) * length,
      y: start.y + Math.sin(snappedAngle) * length,
    };
  }

  const size = Math.max(Math.abs(dx), Math.abs(dy));
  return {
    x: start.x + (dx < 0 ? -size : size),
    y: start.y + (dy < 0 ? -size : size),
  };
}

function shapeBounds(start: DrawingPoint, end: DrawingPoint) {
  const rawWidth = Math.abs(end.x - start.x);
  const rawHeight = Math.abs(end.y - start.y);
  const width = Math.max(1, rawWidth);
  const height = Math.max(1, rawHeight);
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width,
    height,
  };
}

function createShapeObject(
  tool: "arrow" | "rectangle" | "ellipse",
  id: string,
  start: DrawingPoint,
  end: DrawingPoint,
): DrawingRectangleObject | DrawingEllipseObject | DrawingArrowObject {
  const bounds = shapeBounds(start, end);
  const base = { id, ...bounds, opacity: 1 };

  if (tool === "rectangle") {
    return {
      ...base,
      type: "rectangle",
      fill: "#ffffff",
      stroke: DRAWING_COLORS.ink,
      strokeWidth: 5,
      radius: 18,
    };
  }
  if (tool === "ellipse") {
    return {
      ...base,
      type: "ellipse",
      fill: "#ffffff",
      stroke: DRAWING_COLORS.ink,
      strokeWidth: 5,
    };
  }
  return {
    ...base,
    type: "arrow",
    color: DRAWING_COLORS.red,
    strokeWidth: 12,
    start: {
      x: (start.x - bounds.x) / bounds.width,
      y: (start.y - bounds.y) / bounds.height,
    },
    end: {
      x: (end.x - bounds.x) / bounds.width,
      y: (end.y - bounds.y) / bounds.height,
    },
  };
}

function moveObject(
  object: DrawingObject,
  start: DrawingPoint,
  current: DrawingPoint,
) {
  const visibleEdge = 28;
  return {
    ...object,
    x: clamp(
      object.x + current.x - start.x,
      -object.width + visibleEdge,
      DRAWING_WIDTH - visibleEdge,
    ),
    y: clamp(
      object.y + current.y - start.y,
      -object.height + visibleEdge,
      DRAWING_HEIGHT - visibleEdge,
    ),
  };
}

function resizeObject(
  object: DrawingObject,
  handle: ResizeHandle,
  start: DrawingPoint,
  current: DrawingPoint,
  preserveAspect: boolean,
) {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  const west = handle === "nw" || handle === "sw";
  const north = handle === "nw" || handle === "ne";
  let width = Math.max(24, object.width + (west ? -dx : dx));
  let height = Math.max(24, object.height + (north ? -dy : dy));

  if (preserveAspect) {
    const ratio = object.width / object.height;
    const widthDelta = Math.abs(width - object.width);
    const heightDelta = Math.abs(height - object.height) * ratio;
    if (widthDelta >= heightDelta) {
      height = Math.max(24, width / ratio);
    } else {
      width = Math.max(24, height * ratio);
    }
  }

  return {
    ...object,
    x: west ? object.x + object.width - width : object.x,
    y: north ? object.y + object.height - height : object.y,
    width,
    height,
  };
}

function pointerCursor(tool: DrawingTool) {
  if (tool === "select") return "cursor-default";
  if (tool === "text") return "cursor-text";
  return "cursor-crosshair";
}

export function DrawingCanvas({
  document,
  documentRef,
  imageCache,
  selectedObjectId,
  editingTextId,
  textDraft,
  tool,
  disabled = false,
  setSelectedObjectId,
  setTool,
  setTextDraft,
  onEditText,
  onFinishText,
  commit,
  preview,
  commitGesture,
  cancelGesture,
}: DrawingCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const [canvasCssWidth, setCanvasCssWidth] = useState(0);
  const [imageRevision, setImageRevision] = useState(0);
  const canvasScale = Math.max(canvasCssWidth / DRAWING_WIDTH, 0.1);
  const imageSourcesKey = document.objects
    .filter((object) => object.type === "image")
    .map((object) => object.src)
    .join("\u0000");
  const imageSources = useMemo(
    () => (imageSourcesKey ? imageSourcesKey.split("\u0000") : []),
    [imageSourcesKey],
  );

  const editingText = useMemo(
    () =>
      document.objects.find(
        (object): object is DrawingTextObject =>
          object.id === editingTextId && object.type === "text",
      ) ?? null,
    [document.objects, editingTextId],
  );

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const updateSize = () => setCanvasCssWidth(wrapper.clientWidth);
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (imageSources.length === 0) return;
    let cancelled = false;
    void preloadDrawingImageSources(imageSources, imageCache)
      .then(() => {
        if (!cancelled) setImageRevision((revision) => revision + 1);
      })
      .catch(() => {
        if (!cancelled) setImageRevision((revision) => revision + 1);
      });
    return () => {
      cancelled = true;
    };
  }, [imageCache, imageSources]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const renderedDocument = editingTextId
      ? {
          ...document,
          objects: document.objects.filter(
            (object) => object.id !== editingTextId,
          ),
        }
      : document;
    renderDrawingDocument(
      context,
      renderedDocument,
      imageCache,
      editingTextId ? null : selectedObjectId,
      canvasScale,
    );
  }, [
    canvasScale,
    document,
    editingTextId,
    imageCache,
    imageRevision,
    selectedObjectId,
  ]);

  useEffect(() => {
    if (!editingText) return;
    const textArea = textAreaRef.current;
    if (!textArea) return;
    textArea.focus();
    textArea.select();
  }, [editingText]);

  const getPoint = useCallback(
    (
      event:
        | ReactPointerEvent<HTMLCanvasElement>
        | ReactMouseEvent<HTMLCanvasElement>,
    ): DrawingPoint => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const bounds = canvas.getBoundingClientRect();
      return {
        x: clamp(
          ((event.clientX - bounds.left) / bounds.width) * DRAWING_WIDTH,
          0,
          DRAWING_WIDTH,
        ),
        y: clamp(
          ((event.clientY - bounds.top) / bounds.height) * DRAWING_HEIGHT,
          0,
          DRAWING_HEIGHT,
        ),
      };
    },
    [],
  );

  const beginGesture = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>, gesture: Gesture) => {
      gestureRef.current = gesture;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (disabled || event.button !== 0) return;
      if (editingTextId) onFinishText();
      event.preventDefault();
      const point = getPoint(event);
      const currentDocument = documentRef.current;

      if (tool === "text") {
        const text = createTextAt(point.x, point.y);
        commit({
          ...currentDocument,
          objects: [...currentDocument.objects, text],
        });
        setSelectedObjectId(text.id);
        setTool("select");
        onEditText(text);
        return;
      }

      if (tool === "pencil") {
        const objectId = crypto.randomUUID();
        const path: DrawingPathObject = {
          id: objectId,
          type: "path",
          x: point.x,
          y: point.y,
          width: 1,
          height: 1,
          opacity: 1,
          color: DRAWING_COLORS.ink,
          strokeWidth: 8,
          points: [{ x: 0.5, y: 0.5 }],
        };
        preview({
          ...currentDocument,
          objects: [...currentDocument.objects, path],
        });
        setSelectedObjectId(objectId);
        beginGesture(event, {
          kind: "path",
          pointerId: event.pointerId,
          before: currentDocument,
          objectId,
          points: [point],
        });
        return;
      }

      if (tool !== "select") {
        const objectId = crypto.randomUUID();
        const shape = createShapeObject(tool, objectId, point, point);
        preview({
          ...currentDocument,
          objects: [...currentDocument.objects, shape],
        });
        setSelectedObjectId(objectId);
        beginGesture(event, {
          kind: "shape",
          pointerId: event.pointerId,
          start: point,
          before: currentDocument,
          objectId,
          tool,
        });
        return;
      }

      const currentSelectedObject = currentDocument.objects.find(
        (object) => object.id === selectedObjectId,
      );
      if (currentSelectedObject) {
        const handle = getResizeHandleAtPoint(
          currentSelectedObject,
          point,
          canvasScale,
        );
        if (handle) {
          beginGesture(event, {
            kind: "resize",
            pointerId: event.pointerId,
            start: point,
            before: currentDocument,
            object: currentSelectedObject,
            handle,
          });
          return;
        }
      }

      const hit = getDrawingObjectAtPoint(currentDocument, point);
      if (!hit) {
        setSelectedObjectId(null);
        return;
      }
      setSelectedObjectId(hit.id);
      beginGesture(event, {
        kind: "move",
        pointerId: event.pointerId,
        start: point,
        before: currentDocument,
        object: hit,
      });
    },
    [
      beginGesture,
      canvasScale,
      commit,
      disabled,
      documentRef,
      editingTextId,
      getPoint,
      onEditText,
      onFinishText,
      preview,
      selectedObjectId,
      setSelectedObjectId,
      setTool,
      tool,
    ],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      event.preventDefault();
      const point = getPoint(event);

      if (gesture.kind === "move") {
        preview(
          withObject(gesture.before, gesture.object.id, () =>
            moveObject(gesture.object, gesture.start, point),
          ),
        );
        return;
      }

      if (gesture.kind === "resize") {
        preview(
          withObject(gesture.before, gesture.object.id, () =>
            resizeObject(
              gesture.object,
              gesture.handle,
              gesture.start,
              point,
              event.shiftKey,
            ),
          ),
        );
        return;
      }

      if (gesture.kind === "shape") {
        const constrainedPoint = constrainEndPoint(
          gesture.start,
          point,
          gesture.tool,
          event.shiftKey,
        );
        preview({
          ...gesture.before,
          objects: [
            ...gesture.before.objects,
            createShapeObject(
              gesture.tool,
              gesture.objectId,
              gesture.start,
              constrainedPoint,
            ),
          ],
        });
        return;
      }

      const previous = gesture.points.at(-1);
      if (
        previous &&
        Math.hypot(point.x - previous.x, point.y - previous.y) < 3
      ) {
        return;
      }
      gesture.points.push(point);
      const normalized = normalizePathPoints(gesture.points);
      const path: DrawingPathObject = {
        id: gesture.objectId,
        type: "path",
        ...normalized,
        opacity: 1,
        color: DRAWING_COLORS.ink,
        strokeWidth: 8,
      };
      preview({
        ...gesture.before,
        objects: [...gesture.before.objects, path],
      });
    },
    [getPoint, preview],
  );

  const finishGesture = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      gestureRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const currentDocument = documentRef.current;
      const object = currentDocument.objects.find(
        (item) =>
          item.id ===
          (gesture.kind === "move" || gesture.kind === "resize"
            ? gesture.object.id
            : gesture.objectId),
      );
      const shapeIsTooSmall =
        gesture.kind === "shape" &&
        (!object ||
          (gesture.tool === "arrow"
            ? Math.hypot(object.width, object.height) < 8
            : object.width < 8 || object.height < 8));
      const shouldDiscard =
        shapeIsTooSmall ||
        (gesture.kind === "path" && gesture.points.length < 2);

      if (shouldDiscard) {
        cancelGesture(gesture.before);
        setSelectedObjectId(null);
      } else {
        commitGesture(gesture.before);
      }
      if (gesture.kind === "shape" || gesture.kind === "path") {
        setTool("select");
      }
    },
    [cancelGesture, commitGesture, documentRef, setSelectedObjectId, setTool],
  );

  const cancelActiveGesture = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      gestureRef.current = null;
      cancelGesture(gesture.before);
      setTool("select");
    },
    [cancelGesture, setTool],
  );

  const handleDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      const currentDocument = documentRef.current;
      const object = getDrawingObjectAtPoint(currentDocument, getPoint(event));
      if (object?.type !== "text") return;
      setSelectedObjectId(object.id);
      setTool("select");
      onEditText(object);
    },
    [disabled, documentRef, getPoint, onEditText, setSelectedObjectId, setTool],
  );

  return (
    <div
      ref={wrapperRef}
      className="relative aspect-video w-full overflow-hidden rounded-xl bg-white shadow-[0_20px_70px_rgba(0,0,0,0.22)] ring-1 ring-black/10"
    >
      <canvas
        ref={canvasRef}
        width={DRAWING_WIDTH}
        height={DRAWING_HEIGHT}
        tabIndex={0}
        role="application"
        aria-label="Drawing canvas"
        aria-describedby="drawing-shortcuts"
        className={cn(
          "size-full touch-none outline-none select-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
          pointerCursor(tool),
          disabled && "cursor-wait",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishGesture}
        onPointerCancel={cancelActiveGesture}
        onDoubleClick={handleDoubleClick}
      />

      {editingText && (
        <textarea
          ref={textAreaRef}
          value={textDraft}
          aria-label="Edit text"
          className="absolute resize-none overflow-hidden border-2 border-blue-500 bg-white/90 p-0 ring-2 ring-blue-500/20 outline-none"
          style={{
            left: `${(editingText.x / DRAWING_WIDTH) * 100}%`,
            top: `${(editingText.y / DRAWING_HEIGHT) * 100}%`,
            width: `${(editingText.width / DRAWING_WIDTH) * 100}%`,
            height: `${(editingText.height / DRAWING_HEIGHT) * 100}%`,
            color: editingText.color,
            fontFamily: '"Geist", "Arial Black", Inter, sans-serif',
            fontSize: editingText.fontSize * canvasScale,
            fontWeight: editingText.fontWeight,
            lineHeight: 1.04,
            textAlign: editingText.align,
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => setTextDraft(event.target.value)}
          onBlur={onFinishText}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              onFinishText();
            }
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              onFinishText();
            }
          }}
        />
      )}
    </div>
  );
}
