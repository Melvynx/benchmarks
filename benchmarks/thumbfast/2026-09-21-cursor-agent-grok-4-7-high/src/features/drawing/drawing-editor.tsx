import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import {
  saveDrawingInspirationRef,
  uploadInspirationImageRef,
} from "@/features/inspiration/inspiration.convex";
import { cn } from "@/lib/utils";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import { useAction as useConvexAction, useMutation as useConvexMutation } from "convex/react";
import {
  ArrowUpRight,
  Circle,
  ImagePlus,
  Loader2,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  Type,
  Undo2,
  UserRound,
  LayoutTemplate,
} from "lucide-react";
import { nanoid } from "nanoid";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { toast } from "sonner";
import {
  arrowBoxFromPoints,
  boxFromPoints,
  centerOf,
  hitTest,
  hitTestHandle,
  pencilFromPoints,
  resizeObject,
  rotateObject,
  translateObject,
  type Handle,
} from "./drawing-geometry";
import { renderDrawingPng } from "./drawing-export";
import {
  arrowGeometry,
  pencilPolyline,
  personGeometry,
  roughEllipsePath,
  roughRectPath,
} from "./drawing-rough";
import {
  DRAWING_FILLS,
  DRAWING_FONT,
  DRAWING_HEIGHT,
  DRAWING_STROKE_WIDTHS,
  DRAWING_STROKES,
  DRAWING_WIDTH,
  describeDrawing,
  serializeDrawing,
  type ArrowObject,
  type DrawingDocument,
  type DrawingObject,
  type DrawingTool,
  type EllipseObject,
  type ImageObject,
  type PersonObject,
  type Point,
  type RectObject,
  type ShapeStyle,
  type TextObject,
} from "./drawing.schema";
import { DRAWING_TEMPLATES, documentFromTemplate } from "./drawing-templates";

type DrawingEditorProps = {
  orgSlug: string;
  inspirationId?: string;
  initialDocument: DrawingDocument;
  initialName: string;
};

type DragState =
  | {
      kind: "move";
      origin: Point;
      snapshots: DrawingObject[];
      startDoc: DrawingDocument;
      moved: boolean;
    }
  | {
      kind: "resize";
      handle: Exclude<Handle, "rotate">;
      snapshot: DrawingObject;
      startDoc: DrawingDocument;
    }
  | {
      kind: "rotate";
      snapshot: DrawingObject;
      startPoint: Point;
      startDoc: DrawingDocument;
    }
  | {
      kind: "shape";
      tool: "rect" | "ellipse" | "arrow";
      origin: Point;
      object: DrawingObject;
      startDoc: DrawingDocument;
    }
  | {
      kind: "pencil";
      points: Point[];
      startDoc: DrawingDocument;
    }
  | {
      kind: "person";
      origin: Point;
      object: PersonObject;
      startDoc: DrawingDocument;
      moved: boolean;
    };

const TOOLS: Array<{ id: DrawingTool; label: string; shortcut: string }> = [
  { id: "select", label: "Select", shortcut: "V" },
  { id: "text", label: "Text", shortcut: "T" },
  { id: "arrow", label: "Arrow", shortcut: "A" },
  { id: "rect", label: "Rectangle", shortcut: "R" },
  { id: "ellipse", label: "Circle", shortcut: "O" },
  { id: "pencil", label: "Pencil", shortcut: "P" },
  { id: "person", label: "Person", shortcut: "S" },
];

export function DrawingEditor({
  orgSlug,
  inspirationId,
  initialDocument,
  initialName,
}: DrawingEditorProps) {
  const navigate = useNavigate();
  const uploadImage = useConvexAction(uploadInspirationImageRef);
  const saveDrawing = useConvexMutation(saveDrawingInspirationRef);
  const [document, setDocument] = useState(initialDocument);
  const [name, setName] = useState(initialName);
  const [tool, setTool] = useState<DrawingTool>("select");
  const [selection, setSelection] = useState<string[]>([]);
  const [style, setStyle] = useState<ShapeStyle>({
    stroke: DRAWING_STROKES[0],
    fill: "transparent",
    strokeWidth: 4,
  });
  const [draft, setDraft] = useState<DrawingObject | null>(null);
  const [editingText, setEditingText] = useState<{
    id: string;
    text: string;
    startDoc: DrawingDocument;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [historyTick, setHistoryTick] = useState(0);
  const [handleRadius, setHandleRadius] = useState(12);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const docRef = useRef(document);
  const dragRef = useRef<DragState | null>(null);
  const pastRef = useRef<DrawingDocument[]>([]);
  const futureRef = useRef<DrawingDocument[]>([]);
  const savedRef = useRef(serializeDrawing(initialDocument));
  const savedNameRef = useRef(initialName);
  const nameRef = useRef(name);
  nameRef.current = name;
  const blocker = useBlocker({
    withResolver: true,
    enableBeforeUnload: false,
    shouldBlockFn: () =>
      serializeDrawing(docRef.current) !== savedRef.current ||
      nameRef.current.trim() !== savedNameRef.current.trim(),
  });
  const blockerRef = useRef(blocker);
  blockerRef.current = blocker;
  const clipboardRef = useRef<DrawingObject[]>([]);
  const pasteCountRef = useRef(0);
  const selectionRef = useRef(selection);
  const toolRef = useRef(tool);
  const styleRef = useRef(style);
  const editingRef = useRef(editingText);

  docRef.current = document;
  selectionRef.current = selection;
  toolRef.current = tool;
  styleRef.current = style;
  editingRef.current = editingText;

  const dirty =
    serializeDrawing(document) !== savedRef.current ||
    name.trim() !== savedNameRef.current.trim();
  const canUndo = historyTick >= 0 && pastRef.current.length > 0;
  const canRedo = historyTick >= 0 && futureRef.current.length > 0;
  const selected = document.objects.filter((object) =>
    selection.includes(object.id),
  );
  const single = selected.length === 1 ? selected[0] : null;

  useEffect(() => {
    if (blocker.status !== "blocked") return;
    dialogManager.confirm({
      title: "Discard this drawing?",
      description: "You have unsaved changes on this inspiration.",
      variant: "destructive",
      action: {
        label: "Discard",
        variant: "destructive",
        onClick: () => blockerRef.current.proceed?.(),
      },
      cancel: {
        label: "Keep editing",
        onClick: () => blockerRef.current.reset?.(),
      },
    });
  }, [blocker.status]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (
        serializeDrawing(docRef.current) === savedRef.current &&
        name.trim() === savedNameRef.current.trim()
      ) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [name]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof ResizeObserver === "undefined") return;
    const update = () => {
      const width = svg.getBoundingClientRect().width;
      if (width > 0) setHandleRadius((12 / width) * DRAWING_WIDTH);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (isTypingTarget(event.target)) {
          (event.target as HTMLElement).blur();
          return;
        }
        if (editingRef.current) {
          commitTextEdit();
          return;
        }
        setSelection([]);
        return;
      }

      if (isTypingTarget(event.target)) return;

      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (meta && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (meta && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copySelection();
        return;
      }
      if (meta && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteClipboard();
        return;
      }
      if (meta && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelection();
        return;
      }
      if (meta && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelection(docRef.current.objects.map((object) => object.id));
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelection();
        return;
      }

      const shortcut = event.key.toLowerCase();
      const nextTool = TOOLS.find((item) => item.shortcut.toLowerCase() === shortcut);
      if (nextTool && !meta && !event.altKey) {
        event.preventDefault();
        setTool(nextTool.id);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const leave = () => {
    void navigate({ to: `/orgs/${orgSlug}/inspirations` });
  };

  const requestLeave = () => {
    leave();
  };

  const save = async () => {
    if (saving || uploading) return;
    setSaving(true);
    setSaveError(null);
    try {
      commitTextEdit();
      const bytes = await renderDrawingPng(docRef.current);
      const previewUrl = await uploadImage({
        orgSlug,
        bytes,
        fileName: "drawing-preview.png",
        contentType: "image/png",
      });
      const saved = await saveDrawing({
        orgSlug,
        inspirationId,
        name: name.trim() || "Drawing inspiration",
        description: describeDrawing(docRef.current),
        previewUrl,
        drawing: serializeDrawing(docRef.current),
      });
      savedRef.current = serializeDrawing(docRef.current);
      savedNameRef.current = name.trim() || "Drawing inspiration";
      toast.success(inspirationId ? "Drawing updated" : "Inspiration created");
      void navigate({
        to: `/orgs/${orgSlug}/inspirations/${saved.id}`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save the drawing";
      setSaveError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    if (editingRef.current) commitTextEdit();
    const point = canvasPoint(event);
    const activeTool = toolRef.current;
    try {
      svgRef.current?.setPointerCapture(event.pointerId);
    } catch {
      // Some environments cannot capture the pointer. Dragging still tracks move events.
    }

    if (activeTool === "select") {
      const only = selectionRef.current.length === 1
        ? docRef.current.objects.find((object) => object.id === selectionRef.current[0])
        : undefined;
      if (only) {
        const handle = hitTestHandle(only, point, handleRadius);
        if (handle === "rotate") {
          dragRef.current = {
            kind: "rotate",
            snapshot: only,
            startPoint: point,
            startDoc: docRef.current,
          };
          return;
        }
        if (handle) {
          dragRef.current = {
            kind: "resize",
            handle,
            snapshot: only,
            startDoc: docRef.current,
          };
          return;
        }
      }

      const hit = hitTest(docRef.current.objects, point);
      let nextSelection = selectionRef.current;
      if (event.shiftKey && hit) {
        nextSelection = nextSelection.includes(hit.id)
          ? nextSelection.filter((id) => id !== hit.id)
          : [...nextSelection, hit.id];
      } else if (hit) {
        nextSelection = nextSelection.includes(hit.id) ? nextSelection : [hit.id];
      } else {
        nextSelection = [];
      }
      setSelection(nextSelection);
      const snapshots = docRef.current.objects.filter((object) =>
        nextSelection.includes(object.id),
      );
      if (hit && snapshots.length > 0) {
        dragRef.current = {
          kind: "move",
          origin: point,
          snapshots,
          startDoc: docRef.current,
          moved: false,
        };
      }
      return;
    }

    if (activeTool === "text") {
      const object = createText(point, styleRef.current);
      updateDocument((current) => ({
        ...current,
        objects: [...current.objects, object],
      }));
      setSelection([object.id]);
      setEditingText({ id: object.id, text: object.text, startDoc: docRef.current });
      setTool("select");
      return;
    }

    if (activeTool === "pencil") {
      dragRef.current = {
        kind: "pencil",
        points: [point],
        startDoc: docRef.current,
      };
      setDraft(
        pencilFromPoints(nanoid(10), [point], styleRef.current.stroke, styleRef.current.strokeWidth),
      );
      return;
    }

    if (activeTool === "person") {
      const object = createPerson(point, styleRef.current, 300, 420);
      dragRef.current = {
        kind: "person",
        origin: point,
        object,
        startDoc: docRef.current,
        moved: false,
      };
      setDraft(object);
      return;
    }

    const object = createShape(activeTool, point, point, false, styleRef.current);
    dragRef.current = {
      kind: "shape",
      tool: activeTool,
      origin: point,
      object,
      startDoc: docRef.current,
    };
    setDraft(object);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = canvasPoint(event);

    if (drag.kind === "move") {
      const dx = point.x - drag.origin.x;
      const dy = point.y - drag.origin.y;
      if (Math.hypot(dx, dy) < 2 && !drag.moved) return;
      drag.moved = true;
      setLive(
        replaceObjects(
          drag.startDoc,
          drag.snapshots.map((object) => translateObject(object, dx, dy)),
        ),
      );
      return;
    }

    if (drag.kind === "resize") {
      setLive(
        replaceObjects(drag.startDoc, [
          resizeObject(drag.snapshot, drag.handle, point, event.shiftKey),
        ]),
      );
      return;
    }

    if (drag.kind === "rotate") {
      setLive(
        replaceObjects(drag.startDoc, [
          rotateObject(drag.snapshot, point, drag.startPoint, event.shiftKey),
        ]),
      );
      return;
    }

    if (drag.kind === "shape") {
      const object = createShape(
        drag.tool,
        drag.origin,
        point,
        event.shiftKey,
        styleRef.current,
        drag.object.id,
      );
      drag.object = object;
      setDraft(object);
      return;
    }

    if (drag.kind === "pencil") {
      const last = drag.points[drag.points.length - 1];
      if (!last || Math.hypot(point.x - last.x, point.y - last.y) > 1.5) {
        drag.points.push(point);
      }
      setDraft(
        pencilFromPoints(
          "draft-pencil",
          drag.points,
          styleRef.current.stroke,
          styleRef.current.strokeWidth,
        ),
      );
      return;
    }

    const distance = Math.hypot(point.x - drag.origin.x, point.y - drag.origin.y);
    if (distance < 6) return;
    drag.moved = true;
    const box = boxFromPoints(drag.origin, point, event.shiftKey);
    const object = {
      ...drag.object,
      ...box,
    };
    drag.object = object;
    setDraft(object);
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;

    if (drag.kind === "move" || drag.kind === "resize" || drag.kind === "rotate") {
      finishGesture(drag.startDoc);
      return;
    }

    if (drag.kind === "pencil") {
      const object = pencilFromPoints(
        nanoid(10),
        drag.points,
        styleRef.current.stroke,
        styleRef.current.strokeWidth,
      );
      setDraft(null);
      if (!object || drag.points.length < 2) return;
      updateDocument((current) => ({
        ...current,
        objects: [...current.objects, object],
      }));
      setSelection([object.id]);
      return;
    }

    if (drag.kind === "person") {
      setDraft(null);
      const id = nanoid(10);
      const object = drag.moved
        ? {
            ...drag.object,
            id,
            width: Math.max(80, drag.object.width),
            height: Math.max(100, drag.object.height),
          }
        : { ...createPerson(drag.origin, styleRef.current, 300, 420), id };
      updateDocument((current) => ({
        ...current,
        objects: [...current.objects, object],
      }));
      setSelection([id]);
      setTool("select");
      return;
    }

    setDraft(null);
    if (drag.object.width < 6 || drag.object.height < 6) return;
    updateDocument((current) => ({
      ...current,
      objects: [...current.objects, drag.object],
    }));
    setSelection([drag.object.id]);
  };

  const onDoubleClick = (event: ReactPointerEvent<SVGSVGElement>) => {
    const hit = hitTest(docRef.current.objects, canvasPoint(event));
    if (!hit || hit.type !== "text") return;
    setSelection([hit.id]);
    setEditingText({ id: hit.id, text: hit.text, startDoc: docRef.current });
  };

  const commitTextEdit = () => {
    const editing = editingRef.current;
    if (!editing) return;
    editingRef.current = null;
    setEditingText(null);
    if (serializeDrawing(editing.startDoc) === serializeDrawing(docRef.current)) return;
    pastRef.current.push(editing.startDoc);
    if (pastRef.current.length > 80) pastRef.current.shift();
    futureRef.current = [];
    setHistoryTick((tick) => tick + 1);
  };

  const updateTextDraft = (text: string) => {
    setEditingText((current) => (current ? { ...current, text } : current));
    setLive({
      ...docRef.current,
      objects: docRef.current.objects.map((object) =>
        object.id === editingRef.current?.id && object.type === "text"
          ? { ...object, text }
          : object,
      ),
    });
  };

  const applyStyle = (partial: Partial<ShapeStyle>) => {
    const nextStyle = { ...styleRef.current, ...partial };
    setStyle(nextStyle);
    if (selectionRef.current.length === 0) return;
    updateDocument((current) => ({
      ...current,
      objects: current.objects.map((object) =>
        selectionRef.current.includes(object.id)
          ? applyStyleToObject(object, partial)
          : object,
      ),
    }));
  };

  const insertTemplate = (templateId: string) => {
    const created = documentFromTemplate(templateId);
    if (!created) return;
    updateDocument((current) =>
      current.objects.length === 0
        ? created
        : { ...current, objects: [...current.objects, ...created.objects] },
    );
    setSelection(created.objects.map((object) => object.id));
    setTool("select");
  };

  const insertImageFile = async (file: File) => {
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
      toast.error("Use a PNG, JPG, or WebP image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or smaller");
      return;
    }
    setUploading(true);
    try {
      const bitmap = await createImageBitmap(file);
      const fitted = fitImageSize(bitmap.width, bitmap.height);
      const url = await uploadImage({
        orgSlug,
        bytes: await file.arrayBuffer(),
        fileName: file.name,
        contentType: file.type || "image/png",
      });
      const object: ImageObject = {
        id: nanoid(10),
        type: "image",
        x: (DRAWING_WIDTH - fitted.width) / 2,
        y: (DRAWING_HEIGHT - fitted.height) / 2,
        width: fitted.width,
        height: fitted.height,
        rotation: 0,
        src: url,
      };
      updateDocument((current) => ({
        ...current,
        objects: [...current.objects, object],
      }));
      setSelection([object.id]);
      setTool("select");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  function updateDocument(recipe: (current: DrawingDocument) => DrawingDocument) {
    const current = docRef.current;
    const next = recipe(current);
    if (serializeDrawing(current) === serializeDrawing(next)) return;
    pastRef.current.push(structuredClone(current));
    if (pastRef.current.length > 80) pastRef.current.shift();
    futureRef.current = [];
    setLive(next);
    setHistoryTick((tick) => tick + 1);
  }

  function undo() {
    const previous = pastRef.current.pop();
    if (!previous) return;
    futureRef.current.push(structuredClone(docRef.current));
    setEditingText(null);
    setSelection([]);
    setLive(previous);
    setHistoryTick((tick) => tick + 1);
  }

  function redo() {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(structuredClone(docRef.current));
    setEditingText(null);
    setSelection([]);
    setLive(next);
    setHistoryTick((tick) => tick + 1);
  }

  function copySelection() {
    const objects = docRef.current.objects.filter((object) =>
      selectionRef.current.includes(object.id),
    );
    clipboardRef.current = objects.map((object) => structuredClone(object));
    pasteCountRef.current = 0;
  }

  function pasteClipboard() {
    if (clipboardRef.current.length === 0) return;
    pasteCountRef.current += 1;
    const offset = 24 * pasteCountRef.current;
    const clones = clipboardRef.current.map((object) => ({
      ...structuredClone(object),
      id: nanoid(10),
      x: object.x + offset,
      y: object.y + offset,
    }));
    updateDocument((current) => ({
      ...current,
      objects: [...current.objects, ...clones],
    }));
    setSelection(clones.map((object) => object.id));
  }

  function duplicateSelection() {
    copySelection();
    pasteClipboard();
  }

  function deleteSelection() {
    if (selectionRef.current.length === 0) return;
    const ids = new Set(selectionRef.current);
    updateDocument((current) => ({
      ...current,
      objects: current.objects.filter((object) => !ids.has(object.id)),
    }));
    setSelection([]);
  }

  function setLive(next: DrawingDocument) {
    docRef.current = next;
    setDocument(next);
  }

  function finishGesture(startDoc: DrawingDocument) {
    if (serializeDrawing(startDoc) === serializeDrawing(docRef.current)) return;
    pastRef.current.push(startDoc);
    if (pastRef.current.length > 80) pastRef.current.shift();
    futureRef.current = [];
    setHistoryTick((tick) => tick + 1);
  }

  function canvasPoint(event: ReactPointerEvent<SVGSVGElement>): Point {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0 || bounds.height === 0) {
      return { x: 0, y: 0 };
    }
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * DRAWING_WIDTH,
      y: ((event.clientY - bounds.top) / bounds.height) * DRAWING_HEIGHT,
    };
  }

  return (
    <div className="flex h-dvh flex-col bg-[#eceae4] text-[#1c1917]">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-black/10 bg-[#f7f6f3] px-3">
        <Button variant="ghost" onClick={requestLeave}>
          Cancel
        </Button>
        <h1 className="px-2 text-lg font-semibold tracking-tight">Grok 4.7</h1>
        <input
          aria-label="Inspiration name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          className="h-9 min-w-0 flex-1 rounded-md border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#1971c2]"
          placeholder="Inspiration name"
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Undo"
          disabled={!canUndo}
          onClick={undo}
        >
          <Undo2 />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Redo"
          disabled={!canRedo}
          onClick={redo}
        >
          <Redo2 />
        </Button>
        <Button onClick={() => void save()} disabled={saving || uploading}>
          {saving ? <Loader2 className="animate-spin" /> : null}
          {saving ? "Saving..." : "Save inspiration"}
        </Button>
      </header>

      <div className="relative min-h-0 flex-1">
        <div className="absolute top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-black/10 bg-white p-1 shadow-sm">
          {TOOLS.map((item) => (
            <button
              key={item.id}
              type="button"
              title={`${item.label} (${item.shortcut})`}
              aria-label={item.label}
              aria-pressed={tool === item.id}
              onClick={() => setTool(item.id)}
              className={cn(
                "flex size-9 items-center justify-center rounded-lg text-[#44403c]",
                tool === item.id && "bg-[#1c1917] text-white",
              )}
            >
              <ToolIcon tool={item.id} />
            </button>
          ))}
          <span className="mx-1 h-6 w-px bg-black/10" />
          <button
            type="button"
            title="Insert image"
            aria-label="Insert image"
            onClick={() => fileRef.current?.click()}
            className="flex size-9 items-center justify-center rounded-lg text-[#44403c] hover:bg-black/5"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Templates"
                aria-label="Templates"
                className="flex size-9 items-center justify-center rounded-lg text-[#44403c] hover:bg-black/5"
              >
                <LayoutTemplate className="size-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="center" className="w-64 p-1">
              {DRAWING_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => insertTemplate(template.id)}
                  className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left hover:bg-black/5"
                >
                  <span className="text-sm font-medium">{template.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {template.description}
                  </span>
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void insertImageFile(file);
            }}
          />
        </div>

        {single ? (
          <div className="absolute top-16 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-black/10 bg-white px-2 py-1.5 shadow-sm">
            {DRAWING_STROKES.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Stroke ${color}`}
                onClick={() => applyStyle({ stroke: color })}
                className={cn(
                  "size-5 rounded-full border border-black/20",
                  style.stroke === color && "ring-2 ring-[#1971c2] ring-offset-1",
                )}
                style={{ backgroundColor: color }}
              />
            ))}
            {single.type !== "arrow" &&
            single.type !== "pencil" &&
            single.type !== "text" &&
            single.type !== "image" ? (
              <>
                <span className="mx-1 h-5 w-px bg-black/10" />
                {DRAWING_FILLS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Fill ${color}`}
                    onClick={() => applyStyle({ fill: color })}
                    className={cn(
                      "size-5 rounded-md border border-black/20",
                      style.fill === color && "ring-2 ring-[#1971c2] ring-offset-1",
                    )}
                    style={{ backgroundColor: color === "transparent" ? "#fff" : color }}
                  />
                ))}
              </>
            ) : null}
            {single.type !== "text" && single.type !== "image" ? (
              <>
                <span className="mx-1 h-5 w-px bg-black/10" />
                {DRAWING_STROKE_WIDTHS.map((width) => (
                  <button
                    key={width}
                    type="button"
                    aria-label={`Stroke width ${width}`}
                    onClick={() => applyStyle({ strokeWidth: width })}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md",
                      style.strokeWidth === width && "bg-black/10",
                    )}
                  >
                    <span
                      className="block w-4 rounded-full bg-[#1c1917]"
                      style={{ height: width }}
                    />
                  </button>
                ))}
              </>
            ) : null}
            <span className="mx-1 h-5 w-px bg-black/10" />
            <button
              type="button"
              className="rounded-md px-2 py-1 text-xs font-medium hover:bg-black/5"
              onClick={duplicateSelection}
            >
              Duplicate
            </button>
          </div>
        ) : null}

        <div className="flex h-full items-center justify-center p-4 pt-16">
          <div className="aspect-video h-auto max-h-full w-full max-w-[calc((100dvh-7.5rem)*16/9)] overflow-hidden rounded-md border border-black/10 bg-[#fffef9] shadow-sm">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${DRAWING_WIDTH} ${DRAWING_HEIGHT}`}
              className="h-full w-full touch-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onDoubleClick={onDoubleClick}
            >
              <rect width={DRAWING_WIDTH} height={DRAWING_HEIGHT} fill="#fffef9" />
              {document.objects.map((object) => (
                <SceneObject
                  key={object.id}
                  object={object}
                  editing={editingText?.id === object.id}
                  editingText={editingText?.text ?? ""}
                  onTextChange={updateTextDraft}
                  onTextCommit={commitTextEdit}
                />
              ))}
              {draft ? <SceneObject object={draft} /> : null}
              {selected.map((object) => {
                const center = centerOf(object);
                return (
                  <g
                    key={`selection-${object.id}`}
                    transform={`rotate(${object.rotation} ${center.x} ${center.y})`}
                  >
                    <rect
                      x={object.x}
                      y={object.y}
                      width={object.width}
                      height={object.height}
                      fill="none"
                      stroke="#1971c2"
                      strokeWidth={2}
                      strokeDasharray="7 5"
                    />
                  </g>
                );
              })}
              {single
                ? (["nw", "n", "ne", "e", "se", "s", "sw", "w", "rotate"] as Handle[]).map(
                    (handle) => {
                      const point = handlePointSafe(single, handle);
                      return (
                        <circle
                          key={handle}
                          cx={point.x}
                          cy={point.y}
                          r={handle === "rotate" ? handleRadius * 0.7 : handleRadius * 0.55}
                          fill={handle === "rotate" ? "#1971c2" : "#ffffff"}
                          stroke="#1971c2"
                          strokeWidth={2}
                        />
                      );
                    },
                  )
                : null}
            </svg>
          </div>
        </div>
        {saveError ? (
          <p className="absolute right-4 bottom-3 text-sm text-[#e03131]">{saveError}</p>
        ) : null}
      </div>
    </div>
  );
}

function SceneObject({
  object,
  editing = false,
  editingText = "",
  onTextChange,
  onTextCommit,
}: {
  object: DrawingObject;
  editing?: boolean;
  editingText?: string;
  onTextChange?: (text: string) => void;
  onTextCommit?: () => void;
}) {
  const center = centerOf(object);
  return (
    <g transform={`rotate(${object.rotation} ${center.x} ${center.y})`}>
      {object.type === "rect" ? (
        <path
          d={roughRectPath(object.x, object.y, object.width, object.height, object.id)}
          fill={object.fill}
          stroke={object.stroke}
          strokeWidth={object.strokeWidth}
          strokeLinejoin="round"
        />
      ) : null}
      {object.type === "ellipse" ? (
        <path
          d={roughEllipsePath(object.x, object.y, object.width, object.height, object.id)}
          fill={object.fill}
          stroke={object.stroke}
          strokeWidth={object.strokeWidth}
        />
      ) : null}
      {object.type === "arrow" ? <ArrowShape object={object} /> : null}
      {object.type === "pencil" ? (
        <path
          d={pencilPolyline(object)}
          fill="none"
          stroke={object.stroke}
          strokeWidth={object.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {object.type === "image" ? (
        <image
          href={object.src}
          x={object.x}
          y={object.y}
          width={object.width}
          height={object.height}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : null}
      {object.type === "person" ? <PersonShape object={object} /> : null}
      {object.type === "text" ? (
        <foreignObject
          x={object.x}
          y={object.y}
          width={object.width}
          height={object.height}
        >
          {editing ? (
            <textarea
              aria-label="Edit text"
              autoFocus
              value={editingText}
              onChange={(event) => onTextChange?.(event.target.value)}
              onBlur={() => onTextCommit?.()}
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  event.currentTarget.blur();
                }
              }}
              className="h-full w-full resize-none border-0 bg-transparent p-0 outline-none"
              style={{
                color: object.color,
                fontSize: object.fontSize,
                fontFamily: DRAWING_FONT,
                lineHeight: 1.15,
              }}
            />
          ) : (
            <div
              className="pointer-events-none h-full w-full overflow-hidden whitespace-pre-wrap"
              style={{
                color: object.color,
                fontSize: object.fontSize,
                fontFamily: DRAWING_FONT,
                lineHeight: 1.15,
              }}
            >
              {object.text}
            </div>
          )}
        </foreignObject>
      ) : null}
    </g>
  );
}

function ArrowShape({ object }: { object: ArrowObject }) {
  const geometry = arrowGeometry(object);
  return (
    <g
      fill="none"
      stroke={object.stroke}
      strokeWidth={object.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={geometry.shaft} />
      <path d={geometry.head} />
    </g>
  );
}

function PersonShape({ object }: { object: PersonObject }) {
  const geometry = personGeometry(object);
  return (
    <g
      fill={object.fill}
      stroke={object.stroke}
      strokeWidth={object.strokeWidth}
      strokeLinejoin="round"
    >
      <ellipse
        cx={geometry.cx}
        cy={geometry.headCy}
        rx={geometry.headRadius}
        ry={geometry.headRadius * 1.05}
      />
      <path d={geometry.shoulders} />
      <text
        x={geometry.cx}
        y={geometry.labelY}
        textAnchor="middle"
        fill={object.stroke}
        stroke="none"
        fontFamily={DRAWING_FONT}
        fontSize={Math.max(18, object.width * 0.08)}
      >
        {object.label}
      </text>
    </g>
  );
}

function ToolIcon({ tool }: { tool: DrawingTool }) {
  const className = "size-4";
  if (tool === "select") return <MousePointer2 className={className} />;
  if (tool === "text") return <Type className={className} />;
  if (tool === "arrow") return <ArrowUpRight className={className} />;
  if (tool === "rect") return <Square className={className} />;
  if (tool === "ellipse") return <Circle className={className} />;
  if (tool === "pencil") return <Pencil className={className} />;
  return <UserRound className={className} />;
}

function createShape(
  tool: "rect" | "ellipse" | "arrow",
  start: Point,
  end: Point,
  shift: boolean,
  shapeStyle: ShapeStyle,
  id = nanoid(10),
): RectObject | EllipseObject | ArrowObject {
  if (tool === "arrow") {
    return {
      id,
      type: "arrow",
      ...arrowBoxFromPoints(start, end, shift),
      stroke: shapeStyle.stroke,
      strokeWidth: shapeStyle.strokeWidth,
    };
  }
  const box = boxFromPoints(start, end, shift);
  if (tool === "ellipse") {
    return {
      id,
      type: "ellipse",
      ...box,
      stroke: shapeStyle.stroke,
      fill: shapeStyle.fill,
      strokeWidth: shapeStyle.strokeWidth,
    };
  }
  return {
    id,
    type: "rect",
    ...box,
    stroke: shapeStyle.stroke,
    fill: shapeStyle.fill,
    strokeWidth: shapeStyle.strokeWidth,
  };
}

function createText(point: Point, shapeStyle: ShapeStyle): TextObject {
  const width = 320;
  const height = 90;
  return {
    id: nanoid(10),
    type: "text",
    x: clamp(point.x, 0, DRAWING_WIDTH - width),
    y: clamp(point.y, 0, DRAWING_HEIGHT - height),
    width,
    height,
    rotation: 0,
    text: "Text",
    fontSize: 64,
    color: shapeStyle.stroke,
  };
}

function createPerson(
  point: Point,
  shapeStyle: ShapeStyle,
  width: number,
  height: number,
): PersonObject {
  return {
    id: nanoid(10),
    type: "person",
    x: clamp(point.x - width / 2, 0, Math.max(0, DRAWING_WIDTH - width)),
    y: clamp(point.y - height / 2, 0, Math.max(0, DRAWING_HEIGHT - height)),
    width,
    height,
    rotation: 0,
    label: "Subject",
    stroke: shapeStyle.stroke,
    fill: shapeStyle.fill === "transparent" ? "#fffef9" : shapeStyle.fill,
    strokeWidth: shapeStyle.strokeWidth,
  };
}

function applyStyleToObject(
  object: DrawingObject,
  partial: Partial<ShapeStyle>,
): DrawingObject {
  if (object.type === "image") return object;
  if (object.type === "text") {
    return partial.stroke ? { ...object, color: partial.stroke } : object;
  }
  if (object.type === "arrow" || object.type === "pencil") {
    return {
      ...object,
      stroke: partial.stroke ?? object.stroke,
      strokeWidth: partial.strokeWidth ?? object.strokeWidth,
    };
  }
  return {
    ...object,
    stroke: partial.stroke ?? object.stroke,
    fill: partial.fill ?? object.fill,
    strokeWidth: partial.strokeWidth ?? object.strokeWidth,
  };
}

function replaceObjects(document: DrawingDocument, objects: DrawingObject[]) {
  const byId = new Map(objects.map((object) => [object.id, object]));
  return {
    ...document,
    objects: document.objects.map((object) => byId.get(object.id) ?? object),
  };
}

function fitImageSize(width: number, height: number) {
  const scale = Math.min(520 / width, 420 / height, 1);
  return {
    width: Math.max(80, width * scale),
    height: Math.max(80, height * scale),
  };
}

function handlePointSafe(object: DrawingObject, handle: Handle) {
  const center = centerOf(object);
  const local = (() => {
    if (handle === "rotate") return { x: center.x, y: object.y - 36 };
    if (handle === "nw") return { x: object.x, y: object.y };
    if (handle === "n") return { x: center.x, y: object.y };
    if (handle === "ne") return { x: object.x + object.width, y: object.y };
    if (handle === "e") return { x: object.x + object.width, y: center.y };
    if (handle === "se") return { x: object.x + object.width, y: object.y + object.height };
    if (handle === "s") return { x: center.x, y: object.y + object.height };
    if (handle === "sw") return { x: object.x, y: object.y + object.height };
    return { x: object.x, y: center.y };
  })();
  const rad = (object.rotation * Math.PI) / 180;
  const dx = local.x - center.x;
  const dy = local.y - center.y;
  return {
    x: center.x + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: center.y + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
