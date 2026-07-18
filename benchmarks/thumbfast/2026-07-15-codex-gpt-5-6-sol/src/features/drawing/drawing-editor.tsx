import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  clamp,
  cloneDrawingDocument,
  cloneDrawingObject,
  constrainLine,
  createDocumentFromTemplate,
  createImageObject,
  createPencilObject,
  createPersonObject,
  createShapeObject,
  createTextObject,
  DRAWING_HEIGHT,
  DRAWING_WIDTH,
  duplicateDrawingObject,
  normalizeDraggedObject,
  objectBounds,
  type DrawingDocument,
  type DrawingObject,
  type DrawingPoint,
  type DrawingTool,
  type ResizeHandle,
  updateDrawingObject,
} from "./drawing-document";
import type { STARTER_TEMPLATES } from "./drawing-document";
import { DrawingProperties } from "./drawing-properties";
import { DrawingObjectSvg, prepareInsertedImage } from "./drawing-renderer";
import { DrawingToolbar } from "./drawing-toolbar";
import { useDrawingHistory } from "./use-drawing-history";

export const DRAWING_EDITOR_MODEL_NAME = "gpt-5.6-sol";

type DrawingEditorProps = {
  initialDocument: DrawingDocument;
  isDirty: boolean;
  isSaving: boolean;
  onDocumentChange: (document: DrawingDocument) => void;
  onSave: (document: DrawingDocument) => void;
  onCancel: () => void;
};

type Interaction = {
  kind: "move" | "resize" | "draw" | "pencil";
  start: DrawingPoint;
  startDocument: DrawingDocument;
  document: DrawingDocument;
  objectId: string;
  handle?: ResizeHandle;
  points?: DrawingPoint[];
};

const HANDLE_SIZE = 24;
const MIN_OBJECT_SIZE = 24;

function getCanvasPoint(
  event: Pick<PointerEvent, "clientX" | "clientY">,
  svg: SVGSVGElement,
): DrawingPoint {
  const rect = svg.getBoundingClientRect();
  return {
    x: clamp(
      ((event.clientX - rect.left) / rect.width) * DRAWING_WIDTH,
      0,
      DRAWING_WIDTH,
    ),
    y: clamp(
      ((event.clientY - rect.top) / rect.height) * DRAWING_HEIGHT,
      0,
      DRAWING_HEIGHT,
    ),
  };
}

function constrainShapePoint(start: DrawingPoint, point: DrawingPoint) {
  const dx = point.x - start.x;
  const dy = point.y - start.y;
  const size = Math.max(Math.abs(dx), Math.abs(dy));
  return {
    x: start.x + Math.sign(dx || 1) * size,
    y: start.y + Math.sign(dy || 1) * size,
  };
}

function resizeObject(
  object: DrawingObject,
  handle: ResizeHandle,
  point: DrawingPoint,
  keepRatio: boolean,
): DrawingObject {
  const bounds = objectBounds(object);
  const anchor = {
    x: handle.includes("w") ? bounds.x + bounds.width : bounds.x,
    y: handle.includes("n") ? bounds.y + bounds.height : bounds.y,
  };
  let width = Math.max(MIN_OBJECT_SIZE, Math.abs(point.x - anchor.x));
  let height = Math.max(MIN_OBJECT_SIZE, Math.abs(point.y - anchor.y));

  if (keepRatio) {
    const ratio = Math.max(0.01, bounds.width / Math.max(bounds.height, 1));
    if (width / height > ratio) height = width / ratio;
    else width = height * ratio;
  }

  const x = handle.includes("w") ? anchor.x - width : anchor.x;
  const y = handle.includes("n") ? anchor.y - height : anchor.y;

  if (object.type === "text") {
    const scale = height / Math.max(bounds.height, 1);
    return {
      ...object,
      x,
      y,
      width,
      height,
      fontSize: clamp(object.fontSize * scale, 12, 360),
    };
  }

  return { ...object, x, y, width, height };
}

function selectionCursor(handle: ResizeHandle) {
  return handle === "nw" || handle === "se" ? "nwse-resize" : "nesw-resize";
}

function SelectionControls({
  object,
  onResizeStart,
}: {
  object: DrawingObject;
  onResizeStart: (
    event: ReactPointerEvent<SVGRectElement>,
    handle: ResizeHandle,
  ) => void;
}) {
  const bounds = objectBounds(object);
  const displayHeight = Math.max(bounds.height, HANDLE_SIZE * 1.25);
  const y =
    bounds.height < displayHeight
      ? bounds.y - (displayHeight - bounds.height) / 2
      : bounds.y;
  const handles: { handle: ResizeHandle; x: number; y: number }[] = [
    { handle: "nw", x: bounds.x, y },
    { handle: "ne", x: bounds.x + bounds.width, y },
    { handle: "sw", x: bounds.x, y: y + displayHeight },
    { handle: "se", x: bounds.x + bounds.width, y: y + displayHeight },
  ];

  return (
    <g>
      <rect
        x={bounds.x - 5}
        y={y - 5}
        width={bounds.width + 10}
        height={displayHeight + 10}
        fill="none"
        stroke="#ef4444"
        strokeWidth={4}
        strokeDasharray="10 7"
        pointerEvents="none"
      />
      {handles.map((item) => (
        <rect
          key={item.handle}
          x={item.x - HANDLE_SIZE / 2}
          y={item.y - HANDLE_SIZE / 2}
          width={HANDLE_SIZE}
          height={HANDLE_SIZE}
          rx={6}
          fill="#ffffff"
          stroke="#ef4444"
          strokeWidth={4}
          style={{ cursor: selectionCursor(item.handle) }}
          onPointerDown={(event) => onResizeStart(event, item.handle)}
        />
      ))}
    </g>
  );
}

export function DrawingEditor({
  initialDocument,
  isDirty,
  isSaving,
  onDocumentChange,
  onSave,
  onCancel,
}: DrawingEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const clipboardRef = useRef<DrawingObject | null>(null);
  const { document, commit, undo, redo, canUndo, canRedo } =
    useDrawingHistory(initialDocument);
  const [tool, setTool] = useState<DrawingTool>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const visibleDocument = interaction?.document ?? document;
  const selectedObject =
    visibleDocument.objects.find((object) => object.id === selectedId) ?? null;
  const editingText = visibleDocument.objects.find(
    (object): object is Extract<DrawingObject, { type: "text" }> =>
      object.id === editingTextId && object.type === "text",
  );

  useEffect(() => onDocumentChange(document), [document, onDocumentChange]);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      setCanvasWidth(entry.contentRect.width);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const commitObjectUpdate = useCallback(
    (id: string, updater: (object: DrawingObject) => DrawingObject) => {
      commit(updateDrawingObject(document, id, updater));
    },
    [commit, document],
  );

  const deleteSelection = useCallback(() => {
    if (!selectedId) return;
    commit({
      ...document,
      objects: document.objects.filter((object) => object.id !== selectedId),
    });
    setSelectedId(null);
    setEditingTextId(null);
  }, [commit, document, selectedId]);

  const duplicateSelection = useCallback(() => {
    if (!selectedObject) return;
    const duplicate = duplicateDrawingObject(selectedObject);
    commit({ ...document, objects: [...document.objects, duplicate] });
    setSelectedId(duplicate.id);
  }, [commit, document, selectedObject]);

  const copySelection = useCallback(() => {
    if (!selectedObject) return;
    clipboardRef.current = cloneDrawingObject(selectedObject);
  }, [selectedObject]);

  const pasteSelection = useCallback(() => {
    if (!clipboardRef.current) return;
    const duplicate = duplicateDrawingObject(clipboardRef.current);
    clipboardRef.current = cloneDrawingObject(duplicate);
    commit({ ...document, objects: [...document.objects, duplicate] });
    setSelectedId(duplicate.id);
    setTool("select");
  }, [commit, document]);

  const finishTextEditing = useCallback(() => {
    if (!editingTextId) return;
    const trimmed = textDraft.trimEnd();
    commitObjectUpdate(editingTextId, (object) =>
      object.type === "text"
        ? { ...object, text: trimmed || "Type something" }
        : object,
    );
    setEditingTextId(null);
  }, [commitObjectUpdate, editingTextId, textDraft]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (isInput && target instanceof HTMLElement) {
          target.blur();
          return;
        }
        if (editingTextId) {
          finishTextEditing();
          return;
        }
        if (selectedId) {
          setSelectedId(null);
          return;
        }
        setTool("select");
        setTemplatesOpen(false);
        return;
      }

      if (isInput) return;
      const command = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (command && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        setSelectedId(null);
        return;
      }
      if (command && key === "c") {
        event.preventDefault();
        copySelection();
        return;
      }
      if (command && key === "v") {
        event.preventDefault();
        pasteSelection();
        return;
      }
      if (command && key === "d") {
        event.preventDefault();
        duplicateSelection();
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        event.preventDefault();
        deleteSelection();
        return;
      }

      const shortcutTools: Partial<Record<string, DrawingTool>> = {
        v: "select",
        t: "text",
        a: "arrow",
        r: "rectangle",
        o: "ellipse",
        p: "pencil",
      };
      const nextTool = shortcutTools[key];
      if (nextTool && !command) {
        event.preventDefault();
        setTool(nextTool);
        setTemplatesOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [
    copySelection,
    deleteSelection,
    duplicateSelection,
    editingTextId,
    finishTextEditing,
    pasteSelection,
    redo,
    selectedId,
    undo,
  ]);

  const capturePointer = (event: ReactPointerEvent<SVGElement>) => {
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const startObjectMove = (
    event: ReactPointerEvent<SVGGElement>,
    object: DrawingObject,
  ) => {
    if (tool !== "select" || !svgRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const start = getCanvasPoint(event.nativeEvent, svgRef.current);
    setSelectedId(object.id);
    setInteraction({
      kind: "move",
      start,
      startDocument: cloneDrawingDocument(document),
      document,
      objectId: object.id,
    });
    capturePointer(event);
  };

  const startResize = (
    event: ReactPointerEvent<SVGRectElement>,
    handle: ResizeHandle,
  ) => {
    if (!selectedObject || !svgRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const start = getCanvasPoint(event.nativeEvent, svgRef.current);
    setInteraction({
      kind: "resize",
      start,
      startDocument: cloneDrawingDocument(document),
      document,
      objectId: selectedObject.id,
      handle,
    });
    capturePointer(event);
  };

  const startCanvasInteraction = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || event.button !== 0) return;
    const point = getCanvasPoint(event.nativeEvent, svgRef.current);
    setTemplatesOpen(false);

    if (tool === "select") {
      setSelectedId(null);
      setEditingTextId(null);
      return;
    }

    if (tool === "text") {
      const object = createTextObject({
        x: clamp(point.x, 20, DRAWING_WIDTH - 580),
        y: clamp(point.y, 20, DRAWING_HEIGHT - 170),
      });
      commit({ ...document, objects: [...document.objects, object] });
      setSelectedId(object.id);
      setEditingTextId(object.id);
      setTextDraft(object.text);
      setTool("select");
      return;
    }

    if (tool === "pencil") {
      const startDocument = cloneDrawingDocument(document);
      const points = [point, { x: point.x + 1, y: point.y + 1 }];
      const object = createPencilObject(points);
      setInteraction({
        kind: "pencil",
        start: point,
        startDocument,
        document: {
          ...startDocument,
          objects: [...startDocument.objects, object],
        },
        objectId: object.id,
        points,
      });
      capturePointer(event);
      return;
    }

    const object = createShapeObject(tool, point);
    const startDocument = cloneDrawingDocument(document);
    setInteraction({
      kind: "draw",
      start: point,
      startDocument,
      document: {
        ...startDocument,
        objects: [...startDocument.objects, object],
      },
      objectId: object.id,
    });
    setSelectedId(object.id);
    capturePointer(event);
  };

  const updateInteraction = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!interaction || !svgRef.current) return;
    const point = getCanvasPoint(event.nativeEvent, svgRef.current);

    setInteraction((current) => {
      if (!current) return null;
      const original = current.startDocument.objects.find(
        (object) => object.id === current.objectId,
      );

      if (current.kind === "move" && original) {
        const dx = point.x - current.start.x;
        const dy = point.y - current.start.y;
        const nextDocument = updateDrawingObject(
          current.startDocument,
          current.objectId,
          (object) => ({
            ...object,
            x: clamp(object.x + dx, 0, DRAWING_WIDTH - object.width),
            y: clamp(object.y + dy, 0, DRAWING_HEIGHT - object.height),
          }),
        );
        return { ...current, document: nextDocument };
      }

      if (current.kind === "resize" && original && current.handle) {
        const handle = current.handle;
        const nextDocument = updateDrawingObject(
          current.startDocument,
          current.objectId,
          () => resizeObject(original, handle, point, event.shiftKey),
        );
        return { ...current, document: nextDocument };
      }

      if (current.kind === "draw") {
        const draft = current.document.objects.find(
          (object) => object.id === current.objectId,
        );
        if (!draft) return current;
        const end = event.shiftKey
          ? draft.type === "arrow"
            ? constrainLine(current.start, point)
            : constrainShapePoint(current.start, point)
          : point;
        const object = normalizeDraggedObject(draft, current.start, end);
        return {
          ...current,
          document: {
            ...current.startDocument,
            objects: [...current.startDocument.objects, object],
          },
        };
      }

      if (current.kind === "pencil") {
        const points = [...(current.points ?? []), point];
        const object = createPencilObject(points);
        const stableObject = { ...object, id: current.objectId };
        return {
          ...current,
          points,
          document: {
            ...current.startDocument,
            objects: [...current.startDocument.objects, stableObject],
          },
        };
      }

      return current;
    });
  };

  const finishInteraction = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!interaction) return;
    const created = interaction.document.objects.find(
      (object) => object.id === interaction.objectId,
    );
    if (
      created &&
      (interaction.kind !== "draw" || created.width > 4 || created.height > 4)
    ) {
      commit(interaction.document);
      setSelectedId(interaction.objectId);
    } else {
      setSelectedId(null);
    }
    if (interaction.kind === "draw") setTool("select");
    setInteraction(null);
    if (svgRef.current?.hasPointerCapture(event.pointerId)) {
      svgRef.current.releasePointerCapture(event.pointerId);
    }
  };

  const enterTextEditing = (
    event: ReactMouseEvent<SVGGElement>,
    object: DrawingObject,
  ) => {
    if (object.type !== "text") return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(object.id);
    setEditingTextId(object.id);
    setTextDraft(object.text);
    setTool("select");
  };

  const addPerson = () => {
    const count = document.objects.filter(
      (object) => object.type === "person",
    ).length;
    const object = createPersonObject({
      x: clamp(1_020 - count * 46, 80, 1_150),
      y: clamp(170 + count * 28, 80, 240),
    });
    commit({ ...document, objects: [...document.objects, object] });
    setSelectedId(object.id);
    setTool("select");
  };

  const handleImageFile = async (file?: File) => {
    if (!file) return;
    setIsPreparingImage(true);
    try {
      const prepared = await prepareInsertedImage(file);
      const object = createImageObject({ ...prepared, alt: file.name });
      commit({ ...document, objects: [...document.objects, object] });
      setSelectedId(object.id);
      setTool("select");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not insert image",
      );
    } finally {
      setIsPreparingImage(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  };

  const insertTemplate = (
    templateId: (typeof STARTER_TEMPLATES)[number]["id"],
  ) => {
    if (
      document.objects.length > 0 &&
      !window.confirm("Replace the current canvas with this starter layout?")
    ) {
      return;
    }
    const next = createDocumentFromTemplate(templateId);
    commit(next);
    setSelectedId(null);
    setTemplatesOpen(false);
    setTool("select");
  };

  const textEditorStyle = useMemo(() => {
    if (!editingText || !canvasWidth) return undefined;
    const scale = canvasWidth / DRAWING_WIDTH;
    return {
      left: `${(editingText.x / DRAWING_WIDTH) * 100}%`,
      top: `${(editingText.y / DRAWING_HEIGHT) * 100}%`,
      width: `${(editingText.width / DRAWING_WIDTH) * 100}%`,
      height: `${Math.max(120, editingText.height) * (canvasWidth / DRAWING_WIDTH)}px`,
      color: editingText.fill,
      fontSize: `${editingText.fontSize * scale}px`,
      fontWeight: editingText.fontWeight,
      textAlign: editingText.textAlign,
      lineHeight: 1.08,
    } as const;
  }, [canvasWidth, editingText]);

  return (
    <div className="fixed inset-0 z-[100] flex h-[100dvh] flex-col overflow-hidden bg-[#f7f6f2] text-slate-900">
      <header className="relative z-20 grid min-h-16 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-slate-200/80 bg-[#f7f6f2]/95 px-3 backdrop-blur-sm sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onCancel}
            className="text-slate-600 hover:bg-white hover:text-slate-950"
            aria-label="Cancel and return"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold tracking-tight text-slate-950 sm:text-base">
              {DRAWING_EDITOR_MODEL_NAME}
            </h1>
            <p className="hidden items-center gap-1 text-[11px] text-slate-500 sm:flex">
              {isDirty ? (
                "Unsaved changes"
              ) : (
                <>
                  <Check className="size-3" /> Saved
                </>
              )}
            </p>
          </div>
        </div>

        <DrawingToolbar
          tool={tool}
          onToolChange={(nextTool) => {
            setTool(nextTool);
            setTemplatesOpen(false);
          }}
          canUndo={canUndo}
          canRedo={canRedo}
          hasSelection={Boolean(selectedObject)}
          templatesOpen={templatesOpen}
          onTemplatesOpenChange={setTemplatesOpen}
          onUndo={() => {
            undo();
            setSelectedId(null);
          }}
          onRedo={() => {
            redo();
            setSelectedId(null);
          }}
          onDuplicate={duplicateSelection}
          onDelete={deleteSelection}
          onAddImage={() => uploadInputRef.current?.click()}
          onAddPerson={addPerson}
          onInsertTemplate={insertTemplate}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="hidden text-slate-600 hover:bg-white sm:inline-flex"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onSave(document)}
            disabled={isSaving || document.objects.length === 0}
            className="bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500"
          >
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {isSaving ? "Saving" : "Save inspiration"}
          </Button>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden px-4 py-4 sm:px-8 sm:py-6">
        <div
          ref={canvasContainerRef}
          className={cn(
            "relative aspect-video max-h-full max-w-full overflow-hidden rounded-md bg-white shadow-[0_18px_70px_rgba(15,23,42,0.15),0_0_0_1px_rgba(15,23,42,0.08)]",
            tool === "select" ? "cursor-default" : "cursor-crosshair",
          )}
          style={{ width: "min(90vw, calc((100dvh - 180px) * 16 / 9))" }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${DRAWING_WIDTH} ${DRAWING_HEIGHT}`}
            className="block size-full touch-none select-none"
            onPointerDown={startCanvasInteraction}
            onPointerMove={updateInteraction}
            onPointerUp={finishInteraction}
            onPointerCancel={finishInteraction}
            aria-label="Drawing canvas"
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
              <pattern
                id="drawing-grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="#172033"
                  strokeWidth="1"
                  opacity="0.035"
                />
              </pattern>
            </defs>
            <rect
              width={DRAWING_WIDTH}
              height={DRAWING_HEIGHT}
              fill={visibleDocument.background}
            />
            <rect
              width={DRAWING_WIDTH}
              height={DRAWING_HEIGHT}
              fill="url(#drawing-grid)"
              pointerEvents="none"
            />

            {visibleDocument.objects.map((object) => (
              <g
                key={object.id}
                onPointerDown={(event) => startObjectMove(event, object)}
                onDoubleClick={(event) => enterTextEditing(event, object)}
                style={{ cursor: tool === "select" ? "move" : "crosshair" }}
              >
                <rect
                  x={object.x - 12}
                  y={object.y - 12}
                  width={Math.max(object.width, 10) + 24}
                  height={Math.max(object.height, 10) + 24}
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth={16}
                  pointerEvents="all"
                />
                <DrawingObjectSvg
                  object={object}
                  muted={editingTextId === object.id}
                />
              </g>
            ))}

            {selectedObject && !editingTextId ? (
              <SelectionControls
                object={selectedObject}
                onResizeStart={startResize}
              />
            ) : null}
          </svg>

          {editingText && textEditorStyle ? (
            <textarea
              autoFocus
              value={textDraft}
              onChange={(event) => setTextDraft(event.target.value)}
              onFocus={(event) => event.currentTarget.select()}
              onBlur={finishTextEditing}
              className="absolute z-10 resize-none overflow-hidden border-2 border-dashed border-red-500 bg-transparent p-0 font-sans outline-none"
              style={textEditorStyle}
              aria-label="Edit text"
            />
          ) : null}

          {isPreparingImage ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm">
                <Loader2 className="size-4 animate-spin text-red-500" />
                Preparing image
              </div>
            </div>
          ) : null}
        </div>

        <div className="min-h-11">
          <DrawingProperties
            object={selectedObject}
            onChange={(updater) => {
              if (selectedId) commitObjectUpdate(selectedId, updater);
            }}
          />
        </div>

        <p className="absolute right-4 bottom-3 hidden text-[11px] text-slate-400 sm:block">
          Shift constrains · Double-click text to edit · Esc clears selection
        </p>
      </main>

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => void handleImageFile(event.target.files?.[0])}
      />
    </div>
  );
}
