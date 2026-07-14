import {
  BorderedDialogBody,
  BorderedDialogContent,
  BorderedDialogFooter,
  BorderedDialogHeader,
  DialogEscClose,
} from "@/components/bordered-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Circle,
  Copy,
  Group,
  ImageIcon,
  Layers,
  Lock,
  MousePointer2,
  Move,
  Palette,
  PenLine,
  Redo2,
  RotateCcw,
  Save,
  Shapes,
  Square,
  Trash2,
  Type,
  Ungroup,
  Unlock,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import {
  createDocumentFromTemplate,
  drawingTemplates,
} from "./drawing-templates";
import { DrawingScene, exportDrawingDocumentToBlob } from "./drawing-renderer";
import {
  DRAWING_CANVAS,
  createDrawingId,
  createEmptyDrawingDocument,
  drawingToolMap,
  hasDrawingPlaceholders,
  isDrawingDocument,
  type DrawingDocument,
  type DrawingObject,
  type DrawingTool,
} from "./drawing-types";

type DrawingEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDocument?: unknown;
  title?: string;
  mode: "create" | "edit";
  onSave: (input: {
    title: string;
    document: DrawingDocument;
    previewBlob: Blob;
    hasPlaceholder: boolean;
  }) => Promise<void>;
  onUploadImage: (file: File) => Promise<string>;
};

type DragState =
  | {
      mode: "move";
      pointerId: number;
      start: { x: number; y: number };
      originalObjects: DrawingObject[];
      ids: string[];
    }
  | {
      mode: "create";
      pointerId: number;
      start: { x: number; y: number };
      object: DrawingObject;
    }
  | {
      mode: "pen";
      pointerId: number;
      object: DrawingObject & { type: "freehand" };
    }
  | {
      mode: "resize";
      pointerId: number;
      start: { x: number; y: number };
      object: DrawingObject;
      handle: string;
    }
  | {
      mode: "rotate";
      pointerId: number;
      object: DrawingObject;
      center: { x: number; y: number };
      startAngle: number;
      startRotation: number;
    }
  | {
      mode: "pan";
      pointerId: number;
      startClient: { x: number; y: number };
      originalViewBox: ViewBox;
    };

type ViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const toolButtons: {
  tool: DrawingTool;
  label: string;
  icon: typeof MousePointer2;
}[] = [
  { tool: "select", label: "Select", icon: MousePointer2 },
  { tool: "pan", label: "Pan", icon: Move },
  { tool: "pen", label: "Pen", icon: PenLine },
  { tool: "rect", label: "Rectangle", icon: Square },
  { tool: "roundRect", label: "Rounded rectangle", icon: Square },
  { tool: "ellipse", label: "Ellipse", icon: Circle },
  { tool: "line", label: "Line", icon: PenLine },
  { tool: "arrow", label: "Arrow", icon: ArrowUp },
  { tool: "text", label: "Text", icon: Type },
  { tool: "placeholder", label: "Placeholder", icon: Shapes },
  { tool: "image", label: "Image", icon: ImageIcon },
];

const defaultObjectStyle = {
  fill: "#ffffff",
  stroke: "#111827",
  strokeWidth: 5,
  opacity: 1,
};

function cloneDocument(document: DrawingDocument): DrawingDocument {
  return JSON.parse(JSON.stringify(document)) as DrawingDocument;
}

function normalizeDocument(value: unknown): DrawingDocument {
  if (isDrawingDocument(value)) return cloneDocument(value);
  return createEmptyDrawingDocument();
}

function updateDocument(
  document: DrawingDocument,
  updater: (draft: DrawingDocument) => void,
) {
  const next = cloneDocument(document);
  updater(next);
  next.updatedAt = new Date().toISOString();
  return next;
}

function getObjectBounds(object: DrawingObject) {
  if (object.type === "line" || object.type === "arrow") {
    return {
      x: Math.min(object.x, object.x + object.width),
      y: Math.min(object.y, object.y + object.height),
      width: Math.abs(object.width),
      height: Math.abs(object.height),
    };
  }
  return {
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
  };
}

function snap(value: number, guides: number[]) {
  const threshold = 8;
  for (const guide of guides) {
    if (Math.abs(value - guide) <= threshold) return guide;
  }
  return value;
}

function snapPoint(x: number, y: number) {
  const xGuides = [
    0,
    64,
    DRAWING_CANVAS.width / 2,
    DRAWING_CANVAS.width - 64,
    DRAWING_CANVAS.width,
  ];
  const yGuides = [
    0,
    64,
    DRAWING_CANVAS.height / 2,
    DRAWING_CANVAS.height - 64,
    DRAWING_CANVAS.height,
  ];
  return {
    x: snap(x, xGuides),
    y: snap(y, yGuides),
  };
}

function createObjectForTool(
  tool: DrawingTool,
  point: { x: number; y: number },
) {
  const snapped = snapPoint(point.x, point.y);
  const common = {
    id: createDrawingId(tool),
    x: snapped.x,
    y: snapped.y,
    width: 260,
    height: 150,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    style: { ...defaultObjectStyle },
  };

  if (tool === "rect" || tool === "roundRect") {
    return {
      ...common,
      type: "rect" as const,
      name: tool === "roundRect" ? "Rounded rectangle" : "Rectangle",
      style: { ...common.style, radius: tool === "roundRect" ? 32 : 0 },
    };
  }
  if (tool === "ellipse") {
    return { ...common, type: "ellipse" as const, name: "Ellipse" };
  }
  if (tool === "line" || tool === "arrow") {
    return {
      ...common,
      type: tool as "line" | "arrow",
      name: tool === "arrow" ? "Arrow" : "Line",
      width: 260,
      height: 0,
      style: { stroke: "#111827", strokeWidth: 8, arrowHead: tool === "arrow" },
    };
  }
  if (tool === "text") {
    return {
      ...common,
      type: "text" as const,
      name: "Text block",
      text: "BIG IDEA",
      width: 430,
      height: 110,
      style: {
        fill: "#111827",
        stroke: "#ffffff",
        strokeWidth: 8,
        fontSize: 72,
        fontWeight: 900,
        align: "center" as const,
        outline: true,
        shadow: true,
      },
    };
  }
  if (tool === "placeholder") {
    return {
      ...common,
      type: "placeholder" as const,
      name: "Person placeholder",
      variant: "person" as const,
      width: 260,
      height: 360,
      style: { ...common.style, fill: "#d1d5db", stroke: "#374151" },
    };
  }
  return null;
}

function duplicateObjects(objects: DrawingObject[], selectedIds: string[]) {
  const selected = new Set(selectedIds);
  const copies = objects
    .filter((object) => selected.has(object.id))
    .map((object) => ({
      ...cloneDocument({
        version: 1,
        canvas: {
          width: DRAWING_CANVAS.width,
          height: DRAWING_CANVAS.height,
          aspectRatio: DRAWING_CANVAS.aspectRatio,
          background: "#ffffff",
        },
        objects: [object],
        updatedAt: new Date().toISOString(),
      }).objects[0],
      id: createDrawingId(object.type),
      name: `${object.name} copy`,
      x: object.x + 28,
      y: object.y + 28,
      groupId: undefined,
    }));
  return [...objects, ...copies];
}

function moveInArray<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (!item) return items;
  next.splice(to, 0, item);
  return next;
}

export function DrawingEditorDialog({
  open,
  onOpenChange,
  initialDocument,
  title,
  mode,
  onSave,
  onUploadImage,
}: DrawingEditorDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const svgHostRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [name, setName] = useState(title ?? "Drawn inspiration");
  const [tool, setTool] = useState<DrawingTool>("select");
  const [history, setHistory] = useState<DrawingDocument[]>([
    normalizeDocument(initialDocument),
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [placeholderVariant, setPlaceholderVariant] = useState("person");
  const [panel, setPanel] = useState<"style" | "layers">("style");
  const [viewBox, setViewBox] = useState<ViewBox>({
    x: 0,
    y: 0,
    width: DRAWING_CANVAS.width,
    height: DRAWING_CANVAS.height,
  });

  const document = history[historyIndex] ?? createEmptyDrawingDocument();
  const selectedObjects = useMemo(
    () => document.objects.filter((object) => selectedIds.includes(object.id)),
    [document.objects, selectedIds],
  );
  const primarySelection = selectedObjects[0] ?? null;
  const zoom = DRAWING_CANVAS.width / viewBox.width;

  useEffect(() => {
    if (!open) return;
    const normalized = normalizeDocument(initialDocument);
    setHistory([normalized]);
    setHistoryIndex(0);
    setSelectedIds([]);
    setName(title ?? (mode === "create" ? "Drawn inspiration" : "Drawing"));
    setTool("select");
    setPanel("style");
    setViewBox({
      x: 0,
      y: 0,
      width: DRAWING_CANVAS.width,
      height: DRAWING_CANVAS.height,
    });
  }, [initialDocument, mode, open, title]);

  const pushHistory = (next: DrawingDocument) => {
    setHistory((current) => [...current.slice(0, historyIndex + 1), next]);
    setHistoryIndex((current) => current + 1);
  };

  const patchDocument = (updater: (draft: DrawingDocument) => void) => {
    pushHistory(updateDocument(document, updater));
  };

  const undo = () => {
    setHistoryIndex((index) => Math.max(0, index - 1));
  };

  const redo = () => {
    setHistoryIndex((index) => Math.min(history.length - 1, index + 1));
  };

  useHotkeys("meta+z, ctrl+z", undo, {
    enabled: open && historyIndex > 0,
    enableOnFormTags: false,
    preventDefault: true,
  });
  useHotkeys("meta+shift+z, ctrl+shift+z, meta+y, ctrl+y", redo, {
    enabled: open && historyIndex < history.length - 1,
    enableOnFormTags: false,
    preventDefault: true,
  });
  useHotkeys("backspace, delete", () => deleteSelected(), {
    enabled: open && selectedIds.length > 0,
    enableOnFormTags: false,
    preventDefault: true,
  });
  useHotkeys("meta+d, ctrl+d", () => duplicateSelected(), {
    enabled: open && selectedIds.length > 0,
    enableOnFormTags: false,
    preventDefault: true,
  });
  useHotkeys("v", () => setTool("select"), { enabled: open });
  useHotkeys("h", () => setTool("pan"), { enabled: open });
  useHotkeys("p", () => setTool("pen"), { enabled: open });
  useHotkeys("r", () => setTool("rect"), { enabled: open });
  useHotkeys("t", () => setTool("text"), { enabled: open });

  const screenToCanvas = (event: React.PointerEvent | PointerEvent) => {
    const host = svgHostRef.current;
    if (!host) return { x: 0, y: 0 };
    const rect = host.getBoundingClientRect();
    return {
      x: viewBox.x + ((event.clientX - rect.left) / rect.width) * viewBox.width,
      y:
        viewBox.y + ((event.clientY - rect.top) / rect.height) * viewBox.height,
    };
  };

  const setZoom = (nextZoom: number) => {
    const clamped = Math.max(0.5, Math.min(nextZoom, 4));
    const center = {
      x: viewBox.x + viewBox.width / 2,
      y: viewBox.y + viewBox.height / 2,
    };
    const width = DRAWING_CANVAS.width / clamped;
    const height = DRAWING_CANVAS.height / clamped;
    setViewBox({
      x: center.x - width / 2,
      y: center.y - height / 2,
      width,
      height,
    });
  };

  const startObjectPointer = (
    event: React.PointerEvent<SVGGraphicsElement>,
    object: DrawingObject,
  ) => {
    if (tool !== "select" || object.locked) return;
    event.stopPropagation();
    const point = screenToCanvas(event);
    const nextSelectedIds = event.shiftKey
      ? selectedIds.includes(object.id)
        ? selectedIds.filter((id) => id !== object.id)
        : [...selectedIds, object.id]
      : selectedIds.includes(object.id)
        ? selectedIds
        : [object.id];
    setSelectedIds(nextSelectedIds);
    dragRef.current = {
      mode: "move",
      pointerId: event.pointerId,
      start: point,
      ids: nextSelectedIds,
      originalObjects: document.objects,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startResize = (
    event: React.PointerEvent<SVGRectElement>,
    object: DrawingObject,
    handle: string,
  ) => {
    event.stopPropagation();
    dragRef.current = {
      mode: "resize",
      pointerId: event.pointerId,
      start: screenToCanvas(event),
      object,
      handle,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startRotate = (
    event: React.PointerEvent<SVGCircleElement>,
    object: DrawingObject,
  ) => {
    event.stopPropagation();
    const center = {
      x: object.x + object.width / 2,
      y: object.y + object.height / 2,
    };
    const point = screenToCanvas(event);
    dragRef.current = {
      mode: "rotate",
      pointerId: event.pointerId,
      object,
      center,
      startAngle: Math.atan2(point.y - center.y, point.x - center.x),
      startRotation: object.rotation,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleCanvasPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const point = screenToCanvas(event);
    if (tool === "pan" || event.button === 1 || event.altKey) {
      dragRef.current = {
        mode: "pan",
        pointerId: event.pointerId,
        startClient: { x: event.clientX, y: event.clientY },
        originalViewBox: viewBox,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (tool === "select") {
      setSelectedIds([]);
      return;
    }

    if (tool === "image") {
      fileInputRef.current?.click();
      return;
    }

    if (tool === "pen") {
      const object: DrawingObject & { type: "freehand" } = {
        id: createDrawingId("freehand"),
        type: "freehand",
        name: "Pen stroke",
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        points: [point],
        style: { stroke: "#111827", strokeWidth: 5, opacity: 1 },
      };
      pushHistory(
        updateDocument(document, (draft) => draft.objects.push(object)),
      );
      setSelectedIds([object.id]);
      dragRef.current = { mode: "pen", pointerId: event.pointerId, object };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    const object = createObjectForTool(tool, point);
    if (!object) return;
    const finalObject =
      object.type === "placeholder"
        ? { ...object, variant: placeholderVariant as never }
        : object;
    pushHistory(
      updateDocument(document, (draft) => draft.objects.push(finalObject)),
    );
    setSelectedIds([finalObject.id]);
    dragRef.current = {
      mode: "create",
      pointerId: event.pointerId,
      start: point,
      object: finalObject,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setTool("select");
  };

  const handleCanvasPointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (drag.mode === "pan") {
      const host = svgHostRef.current;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const dx =
        ((event.clientX - drag.startClient.x) / rect.width) *
        drag.originalViewBox.width;
      const dy =
        ((event.clientY - drag.startClient.y) / rect.height) *
        drag.originalViewBox.height;
      setViewBox({
        ...drag.originalViewBox,
        x: drag.originalViewBox.x - dx,
        y: drag.originalViewBox.y - dy,
      });
      return;
    }

    const point = screenToCanvas(event);
    const next = updateDocument(document, (draft) => {
      if (drag.mode === "move") {
        const dx = point.x - drag.start.x;
        const dy = point.y - drag.start.y;
        const selected = new Set(drag.ids);
        draft.objects = drag.originalObjects.map((object) => {
          if (!selected.has(object.id) || object.locked) return object;
          const snapped = snapPoint(object.x + dx, object.y + dy);
          return { ...object, x: snapped.x, y: snapped.y };
        });
      } else if (drag.mode === "create") {
        draft.objects = draft.objects.map((object) =>
          object.id === drag.object.id
            ? {
                ...object,
                width: point.x - drag.start.x,
                height: point.y - drag.start.y,
              }
            : object,
        );
      } else if (drag.mode === "pen") {
        draft.objects = draft.objects.map((object) =>
          object.id === drag.object.id && object.type === "freehand"
            ? {
                ...object,
                points: [...object.points, point],
                width: point.x - object.x,
                height: point.y - object.y,
              }
            : object,
        );
      } else if (drag.mode === "resize") {
        draft.objects = draft.objects.map((object) => {
          if (object.id !== drag.object.id) return object;
          const nextObject = { ...object };
          if (drag.handle.includes("e")) nextObject.width = point.x - object.x;
          if (drag.handle.includes("s")) nextObject.height = point.y - object.y;
          if (drag.handle.includes("w")) {
            nextObject.width = object.x + object.width - point.x;
            nextObject.x = point.x;
          }
          if (drag.handle.includes("n")) {
            nextObject.height = object.y + object.height - point.y;
            nextObject.y = point.y;
          }
          return nextObject;
        });
      } else if (drag.mode === "rotate") {
        const angle = Math.atan2(
          point.y - drag.center.y,
          point.x - drag.center.x,
        );
        const delta = ((angle - drag.startAngle) * 180) / Math.PI;
        draft.objects = draft.objects.map((object) =>
          object.id === drag.object.id
            ? { ...object, rotation: Math.round(drag.startRotation + delta) }
            : object,
        );
      }
    });

    setHistory((current) => {
      const nextHistory = [...current];
      nextHistory[historyIndex] = next;
      return nextHistory;
    });
  };

  const handleCanvasPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
  };

  const applyTemplate = (templateId: string) => {
    const next = createDocumentFromTemplate(templateId);
    pushHistory(next);
    setSelectedIds([]);
  };

  const updateSelected = (
    updater: (object: DrawingObject) => DrawingObject,
  ) => {
    const selected = new Set(selectedIds);
    patchDocument((draft) => {
      draft.objects = draft.objects.map((object) =>
        selected.has(object.id) ? updater(object) : object,
      );
    });
  };

  const deleteSelected = () => {
    const selected = new Set(selectedIds);
    patchDocument((draft) => {
      draft.objects = draft.objects.filter(
        (object) => !selected.has(object.id),
      );
    });
    setSelectedIds([]);
  };

  const duplicateSelected = () => {
    patchDocument((draft) => {
      draft.objects = duplicateObjects(draft.objects, selectedIds);
    });
  };

  const reorderSelected = (direction: "front" | "back" | "up" | "down") => {
    if (!primarySelection) return;
    patchDocument((draft) => {
      const index = draft.objects.findIndex(
        (object) => object.id === primarySelection.id,
      );
      if (index < 0) return;
      if (direction === "front") {
        draft.objects = moveInArray(
          draft.objects,
          index,
          draft.objects.length - 1,
        );
      } else if (direction === "back") {
        draft.objects = moveInArray(draft.objects, index, 0);
      } else if (direction === "up") {
        draft.objects = moveInArray(
          draft.objects,
          index,
          Math.min(draft.objects.length - 1, index + 1),
        );
      } else {
        draft.objects = moveInArray(
          draft.objects,
          index,
          Math.max(0, index - 1),
        );
      }
    });
  };

  const groupSelected = () => {
    if (selectedIds.length < 2) return;
    const groupId = createDrawingId("group");
    updateSelected((object) => ({ ...object, groupId }));
  };

  const ungroupSelected = () => {
    updateSelected((object) => ({ ...object, groupId: undefined }));
  };

  const handleUploadImage = async (file: File) => {
    setIsUploadingImage(true);
    try {
      const src = await onUploadImage(file);
      const imageObject: DrawingObject = {
        id: createDrawingId("image"),
        type: "image",
        name: file.name.replace(/\.[^.]+$/, "") || "Uploaded image",
        x: 320,
        y: 160,
        width: 420,
        height: 260,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        src,
        style: { opacity: 1 },
      };
      patchDocument((draft) => {
        draft.objects.push(imageObject);
      });
      setSelectedIds([imageObject.id]);
      toast.success("Image added to drawing");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Image upload failed",
      );
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveDrawing = async () => {
    setIsSaving(true);
    try {
      const exportDocument = updateDocument(document, () => {});
      const previewBlob = await exportDrawingDocumentToBlob(exportDocument);
      await onSave({
        title: name.trim() || "Drawn inspiration",
        document: exportDocument,
        previewBlob,
        hasPlaceholder: hasDrawingPlaceholders(exportDocument),
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save drawing",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const selectedType = primarySelection?.type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BorderedDialogContent
        maxWidth="sm:max-w-[min(96vw,1500px)]"
        className="max-h-[92vh] pb-10"
      >
        <BorderedDialogHeader title="">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold">
                {mode === "create" ? "Create from drawing" : "Edit drawing"}
              </h2>
              <p className="text-muted-foreground text-sm">
                Build a structured thumbnail layout template.
              </p>
            </div>
            <div className="flex min-w-64 items-center gap-2">
              <Label htmlFor="drawing-title" className="sr-only">
                Inspiration name
              </Label>
              <Input
                id="drawing-title"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Inspiration name"
                className="h-9"
              />
            </div>
          </div>
        </BorderedDialogHeader>

        <BorderedDialogBody className="grid min-h-0 grid-cols-1 gap-0 p-0 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
          <aside className="border-b p-3 lg:border-r lg:border-b-0">
            <div className="grid grid-cols-4 gap-1 lg:grid-cols-2">
              {toolButtons.map((item) => {
                const Icon = item.icon;
                const active = tool === item.tool;
                return (
                  <Button
                    key={item.tool}
                    type="button"
                    variant={active ? "default" : "ghost"}
                    size="icon-sm"
                    title={item.label}
                    aria-label={item.label}
                    onClick={() => {
                      if (item.tool === "image") fileInputRef.current?.click();
                      else setTool(item.tool);
                    }}
                  >
                    <Icon className="size-4" />
                  </Button>
                );
              })}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUploadImage(file);
              }}
            />

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-xs uppercase">
                  Template
                </Label>
                <Badge variant="outline" className="text-[10px]">
                  16:9
                </Badge>
              </div>
              <Select
                value={document.templateId ?? "blank"}
                onValueChange={applyTemplate}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {drawingTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {drawingTemplates.find(
                  (template) => template.id === document.templateId,
                )?.description ?? "Blank drawing frame."}
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <Label className="text-muted-foreground text-xs uppercase">
                Placeholder
              </Label>
              <Select
                value={placeholderVariant}
                onValueChange={setPlaceholderVariant}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "person",
                    "face",
                    "reaction",
                    "badge",
                    "burst",
                    "callout",
                    "emoji",
                  ].map((variant) => (
                    <SelectItem key={variant} value={variant}>
                      {variant}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-1 lg:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                title="Undo"
                aria-label="Undo"
                onClick={undo}
                disabled={historyIndex === 0}
              >
                <RotateCcw className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                title="Redo"
                aria-label="Redo"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
              >
                <Redo2 className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                title="Duplicate"
                aria-label="Duplicate selected objects"
                onClick={duplicateSelected}
                disabled={selectedIds.length === 0}
              >
                <Copy className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                title="Delete"
                aria-label="Delete selected objects"
                onClick={deleteSelected}
                disabled={selectedIds.length === 0}
              >
                <Trash2 className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                title="Zoom in"
                aria-label="Zoom in"
                onClick={() => setZoom(zoom + 0.25)}
              >
                <ZoomIn className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                title="Zoom out"
                aria-label="Zoom out"
                onClick={() => setZoom(zoom - 0.25)}
              >
                <ZoomOut className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                title="Upload image"
                aria-label="Upload image"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
              >
                <Upload className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                title="Reset view"
                aria-label="Reset view"
                onClick={() =>
                  setViewBox({
                    x: 0,
                    y: 0,
                    width: DRAWING_CANVAS.width,
                    height: DRAWING_CANVAS.height,
                  })
                }
              >
                <Palette className="size-4" />
              </Button>
            </div>
          </aside>

          <main className="min-h-[420px] bg-neutral-100 p-4 dark:bg-neutral-950/70">
            <div className="text-muted-foreground mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span>
                {tool === "select"
                  ? "Drag objects, Shift-click for multi-select."
                  : tool === "pan"
                    ? "Drag the frame to pan."
                    : "Click or drag inside the frame to create."}
              </span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <div
              ref={svgHostRef}
              className={cn(
                "mx-auto aspect-video max-h-[64vh] w-full max-w-5xl overflow-hidden rounded-lg border bg-white shadow-sm",
                tool === "pan" ? "cursor-grab" : "cursor-crosshair",
              )}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerCancel={handleCanvasPointerUp}
            >
              <DrawingScene
                document={document}
                selectedIds={selectedIds}
                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
                onObjectPointerDown={startObjectPointer}
                onResizePointerDown={startResize}
                onRotatePointerDown={startRotate}
              />
            </div>
          </main>

          <aside className="min-h-0 border-t p-3 lg:border-t-0 lg:border-l">
            <Tabs
              value={panel}
              onValueChange={(value) => setPanel(value as "style" | "layers")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="style">
                  <Palette className="size-3.5" />
                  Style
                </TabsTrigger>
                <TabsTrigger value="layers">
                  <Layers className="size-3.5" />
                  Layers
                </TabsTrigger>
              </TabsList>

              {panel === "style" ? (
                <div className="mt-3">
                  {primarySelection ? (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-muted-foreground text-xs uppercase">
                          Object
                        </Label>
                        <Input
                          className="mt-1 h-8"
                          value={primarySelection.name}
                          onChange={(event) =>
                            updateSelected((object) =>
                              object.id === primarySelection.id
                                ? { ...object, name: event.target.value }
                                : object,
                            )
                          }
                        />
                      </div>

                      {selectedType === "text" ? (
                        <div>
                          <Label className="text-muted-foreground text-xs uppercase">
                            Text
                          </Label>
                          <Input
                            className="mt-1 h-8"
                            value={
                              primarySelection.type === "text"
                                ? primarySelection.text
                                : ""
                            }
                            onChange={(event) =>
                              updateSelected((object) =>
                                object.type === "text"
                                  ? { ...object, text: event.target.value }
                                  : object,
                              )
                            }
                          />
                        </div>
                      ) : null}

                      {selectedType === "placeholder" ? (
                        <div>
                          <Label className="text-muted-foreground text-xs uppercase">
                            Placeholder type
                          </Label>
                          <Select
                            value={
                              primarySelection.type === "placeholder"
                                ? primarySelection.variant
                                : "person"
                            }
                            onValueChange={(value) =>
                              updateSelected((object) =>
                                object.type === "placeholder"
                                  ? { ...object, variant: value as never }
                                  : object,
                              )
                            }
                          >
                            <SelectTrigger className="mt-1 h-8 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[
                                "person",
                                "face",
                                "reaction",
                                "badge",
                                "burst",
                                "callout",
                                "emoji",
                              ].map((variant) => (
                                <SelectItem key={variant} value={variant}>
                                  {variant}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}

                      <div className="grid grid-cols-2 gap-3">
                        <label className="space-y-1">
                          <span className="text-muted-foreground text-xs uppercase">
                            Fill
                          </span>
                          <input
                            type="color"
                            value={primarySelection.style.fill ?? "#ffffff"}
                            onChange={(event) =>
                              updateSelected((object) => ({
                                ...object,
                                style: {
                                  ...object.style,
                                  fill: event.target.value,
                                },
                              }))
                            }
                            className="h-9 w-full rounded border bg-transparent"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-muted-foreground text-xs uppercase">
                            Stroke
                          </span>
                          <input
                            type="color"
                            value={primarySelection.style.stroke ?? "#111827"}
                            onChange={(event) =>
                              updateSelected((object) => ({
                                ...object,
                                style: {
                                  ...object.style,
                                  stroke: event.target.value,
                                },
                              }))
                            }
                            className="h-9 w-full rounded border bg-transparent"
                          />
                        </label>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-xs uppercase">
                          Stroke width
                        </Label>
                        <Slider
                          value={[primarySelection.style.strokeWidth ?? 0]}
                          min={0}
                          max={32}
                          step={1}
                          onValueChange={([value]) =>
                            updateSelected((object) => ({
                              ...object,
                              style: { ...object.style, strokeWidth: value },
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-xs uppercase">
                          Opacity
                        </Label>
                        <Slider
                          value={[
                            Math.round((primarySelection.opacity ?? 1) * 100),
                          ]}
                          min={10}
                          max={100}
                          step={1}
                          onValueChange={([value]) =>
                            updateSelected((object) => ({
                              ...object,
                              opacity: value / 100,
                            }))
                          }
                        />
                      </div>

                      {selectedType === "text" ? (
                        <>
                          <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs uppercase">
                              Font size
                            </Label>
                            <Slider
                              value={[primarySelection.style.fontSize ?? 56]}
                              min={18}
                              max={140}
                              step={1}
                              onValueChange={([value]) =>
                                updateSelected((object) => ({
                                  ...object,
                                  style: { ...object.style, fontSize: value },
                                }))
                              }
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            {[
                              ["left", AlignLeft],
                              ["center", AlignCenter],
                              ["right", AlignRight],
                            ].map(([align, Icon]) => (
                              <Button
                                key={align as string}
                                type="button"
                                variant={
                                  primarySelection.style.align === align
                                    ? "default"
                                    : "outline"
                                }
                                size="icon-sm"
                                onClick={() =>
                                  updateSelected((object) => ({
                                    ...object,
                                    style: {
                                      ...object.style,
                                      align: align as never,
                                    },
                                  }))
                                }
                              >
                                <Icon className="size-4" />
                              </Button>
                            ))}
                            <div className="ml-auto flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">
                                Shadow
                              </span>
                              <Switch
                                checked={Boolean(primarySelection.style.shadow)}
                                onCheckedChange={(checked) =>
                                  updateSelected((object) => ({
                                    ...object,
                                    style: { ...object.style, shadow: checked },
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </>
                      ) : null}

                      <div className="grid grid-cols-4 gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          title="Send backward"
                          onClick={() => reorderSelected("down")}
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          title="Bring forward"
                          onClick={() => reorderSelected("up")}
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          title="Group"
                          onClick={groupSelected}
                          disabled={selectedIds.length < 2}
                        >
                          <Group className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          title="Ungroup"
                          onClick={ungroupSelected}
                        >
                          <Ungroup className="size-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => reorderSelected("back")}
                        >
                          Back
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => reorderSelected("front")}
                        >
                          Front
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                      Select an object to edit position, color, text, opacity,
                      order, lock state, and grouping.
                    </div>
                  )}
                </div>
              ) : null}

              {panel === "layers" ? (
                <div className="mt-4 max-h-[45vh] space-y-1 overflow-auto">
                  {[...document.objects].reverse().map((object) => {
                    const isSelected = selectedIds.includes(object.id);
                    const index = document.objects.findIndex(
                      (item) => item.id === object.id,
                    );
                    return (
                      <div
                        key={object.id}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "hover:bg-muted border-transparent",
                        )}
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate text-left"
                          onClick={() => setSelectedIds([object.id])}
                        >
                          {object.name}
                        </button>
                        <button
                          type="button"
                          aria-label={
                            object.locked ? "Unlock layer" : "Lock layer"
                          }
                          className="text-muted-foreground hover:text-foreground"
                          onClick={(event) => {
                            event.stopPropagation();
                            patchDocument((draft) => {
                              draft.objects[index] = {
                                ...draft.objects[index],
                                locked: !object.locked,
                              };
                            });
                          }}
                        >
                          {object.locked ? (
                            <Lock className="size-3.5" />
                          ) : (
                            <Unlock className="size-3.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </Tabs>
          </aside>
        </BorderedDialogBody>

        <BorderedDialogFooter>
          <div className="flex items-center gap-4">
            <DialogEscClose />
            <span>{document.objects.length} objects</span>
          </div>
          <Button
            size="sm"
            onClick={saveDrawing}
            disabled={isSaving || isUploadingImage}
          >
            <Save className="size-3.5" />
            {isSaving ? "Saving..." : "Save drawing"}
          </Button>
        </BorderedDialogFooter>
      </BorderedDialogContent>
    </Dialog>
  );
}

export { drawingToolMap };
