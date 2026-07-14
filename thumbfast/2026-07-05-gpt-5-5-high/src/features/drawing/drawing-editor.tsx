import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowUpRight,
  Circle,
  Copy,
  ImagePlus,
  MousePointer2,
  Pencil,
  Redo2,
  Save,
  Square,
  StickyNote,
  Trash2,
  Type,
  Undo2,
  UserRound,
  X,
} from "lucide-react";
import {
  cloneDrawingObject,
  createDrawingObjectId,
  createEmptyDrawingDocument,
  getObjectBounds,
  getTemplateObjects,
  moveObject,
  pointInObject,
  resizeObject,
} from "./drawing-document";
import type {
  DrawingDocument,
  DrawingObject,
  DrawingPoint,
  DrawingTemplateId,
  DrawingTool,
} from "./drawing-types";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

type DrawingEditorProps = {
  initialDocument?: DrawingDocument | null;
  initialTitle?: string;
  mode: "create" | "edit";
  saving: boolean;
  onSave: (title: string, document: DrawingDocument) => Promise<void>;
  onCancel: () => void;
};

type HistoryState = {
  past: DrawingDocument[];
  current: DrawingDocument;
  future: DrawingDocument[];
};

type Interaction =
  | {
      type: "move";
      objectId: string;
      start: DrawingPoint;
      originDocument: DrawingDocument;
    }
  | {
      type: "resize";
      objectId: string;
      handle: "nw" | "ne" | "sw" | "se";
      originDocument: DrawingDocument;
    }
  | {
      type: "draw";
      objectId: string;
      tool: Exclude<DrawingTool, "select" | "text" | "placeholder" | "image">;
      start: DrawingPoint;
      originDocument: DrawingDocument;
    };

const TOOL_ITEMS: {
  tool: DrawingTool;
  label: string;
  icon: typeof MousePointer2;
}[] = [
  { tool: "select", label: "Select", icon: MousePointer2 },
  { tool: "text", label: "Text", icon: Type },
  { tool: "arrow", label: "Arrow", icon: ArrowUpRight },
  { tool: "rectangle", label: "Rectangle", icon: Square },
  { tool: "ellipse", label: "Circle", icon: Circle },
  { tool: "pencil", label: "Pencil", icon: Pencil },
  { tool: "placeholder", label: "Person", icon: UserRound },
  { tool: "image", label: "Image", icon: ImagePlus },
];

const TEMPLATE_ITEMS: { id: DrawingTemplateId; label: string }[] = [
  { id: "text-subject", label: "Text + subject" },
  { id: "reaction-arrow", label: "Reaction arrow" },
  { id: "versus", label: "Split versus" },
  { id: "tutorial-callout", label: "Tutorial callout" },
];

function cloneDocument(document: DrawingDocument): DrawingDocument {
  return JSON.parse(JSON.stringify(document)) as DrawingDocument;
}

function documentsEqual(a: DrawingDocument, b: DrawingDocument) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function normalizeDocument(document?: unknown): DrawingDocument {
  if (!document || typeof document !== "object") {
    return createEmptyDrawingDocument();
  }
  const candidate = document as Partial<DrawingDocument>;
  if (candidate.version !== 1) return createEmptyDrawingDocument();
  return {
    ...candidate,
    version: 1,
    width: 1280,
    height: 720,
    background:
      typeof candidate.background === "string"
        ? candidate.background
        : "#fffdf7",
    objects: Array.isArray(candidate.objects) ? candidate.objects : [],
  };
}

function updateObject(
  document: DrawingDocument,
  objectId: string,
  updater: (object: DrawingObject) => DrawingObject,
): DrawingDocument {
  return {
    ...document,
    objects: document.objects.map((object) =>
      object.id === objectId ? updater(object) : object,
    ),
  };
}

function getClientPoint(
  event: ReactPointerEvent<SVGSVGElement> | PointerEvent,
  svg: SVGSVGElement,
): DrawingPoint {
  const rect = svg.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 1280,
    y: ((event.clientY - rect.top) / rect.height) * 720,
  };
}

function constrainPoint(start: DrawingPoint, point: DrawingPoint) {
  const dx = point.x - start.x;
  const dy = point.y - start.y;
  const size = Math.max(Math.abs(dx), Math.abs(dy));
  return {
    x: start.x + Math.sign(dx || 1) * size,
    y: start.y + Math.sign(dy || 1) * size,
  };
}

async function readImageAsDataUrl(file: File) {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = source;
  });

  const maxWidth = 900;
  const scale = Math.min(1, maxWidth / image.width);
  const canvas = window.document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.86);
}

function renderObject(object: DrawingObject, selected: boolean) {
  const common = {
    "data-object-id": object.id,
    className: selected ? "cursor-move" : "cursor-pointer",
  };

  if (object.type === "rectangle") {
    return (
      <rect
        {...common}
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        rx={8}
        fill={object.fill}
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
        opacity={object.opacity ?? 1}
      />
    );
  }

  if (object.type === "ellipse") {
    return (
      <ellipse
        {...common}
        cx={object.x + object.width / 2}
        cy={object.y + object.height / 2}
        rx={object.width / 2}
        ry={object.height / 2}
        fill={object.fill}
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
        opacity={object.opacity ?? 1}
      />
    );
  }

  if (object.type === "arrow") {
    return (
      <line
        {...common}
        x1={object.x}
        y1={object.y}
        x2={object.endX}
        y2={object.endY}
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
        strokeLinecap="round"
        markerEnd="url(#drawing-arrow-head)"
        opacity={object.opacity ?? 1}
      />
    );
  }

  if (object.type === "text") {
    return (
      <foreignObject
        {...common}
        x={object.x}
        y={object.y}
        width={object.width}
        height={Math.max(object.height, object.fontSize * 2.4)}
        opacity={object.opacity ?? 1}
      >
        <div
          style={{
            color: object.stroke,
            fontSize: object.fontSize,
            fontWeight: object.fontWeight,
            lineHeight: 1.05,
            textAlign: object.align,
            whiteSpace: "pre-wrap",
            overflowWrap: "break-word",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {object.text}
        </div>
      </foreignObject>
    );
  }

  if (object.type === "pencil") {
    const d = object.points
      .map((point, index) =>
        index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
      )
      .join(" ");
    return (
      <path
        {...common}
        d={d}
        fill="none"
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={object.opacity ?? 1}
      />
    );
  }

  if (object.type === "image") {
    return (
      <image
        {...common}
        href={object.src}
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        preserveAspectRatio="xMidYMid slice"
        opacity={object.opacity ?? 1}
      />
    );
  }

  const headRadius = Math.min(object.width, object.height) * 0.16;
  const centerX = object.x + object.width / 2;
  const headY = object.y + object.height * 0.26;
  return (
    <g {...common} opacity={object.opacity ?? 1}>
      <rect
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        rx={16}
        fill={object.fill}
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
      />
      <circle
        cx={centerX}
        cy={headY}
        r={headRadius}
        fill="none"
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
      />
      <path
        d={[
          `M ${centerX} ${headY + headRadius}`,
          `L ${centerX} ${object.y + object.height * 0.68}`,
          `M ${centerX} ${object.y + object.height * 0.42}`,
          `L ${object.x + object.width * 0.25} ${object.y + object.height * 0.56}`,
          `M ${centerX} ${object.y + object.height * 0.42}`,
          `L ${object.x + object.width * 0.75} ${object.y + object.height * 0.5}`,
          `M ${centerX} ${object.y + object.height * 0.68}`,
          `L ${object.x + object.width * 0.32} ${object.y + object.height * 0.88}`,
          `M ${centerX} ${object.y + object.height * 0.68}`,
          `L ${object.x + object.width * 0.7} ${object.y + object.height * 0.88}`,
        ].join(" ")}
        fill="none"
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
        strokeLinecap="round"
      />
      <text
        x={centerX}
        y={object.y + object.height - 34}
        textAnchor="middle"
        fontSize="28"
        fontWeight="700"
        fill="#44403c"
      >
        {object.label}
      </text>
    </g>
  );
}

export function DrawingEditor({
  initialDocument,
  initialTitle,
  mode,
  saving,
  onSave,
  onCancel,
}: DrawingEditorProps) {
  const normalizedInitial = useMemo(
    () => normalizeDocument(initialDocument),
    [initialDocument],
  );
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    current: normalizedInitial,
    future: [],
  });
  const [title, setTitle] = useState(initialTitle || "Drawing inspiration");
  const [tool, setTool] = useState<DrawingTool>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [clipboardObject, setClipboardObject] = useState<DrawingObject | null>(
    null,
  );
  const [dirty, setDirty] = useState(false);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textEditOriginRef = useRef<DrawingDocument | null>(null);

  const document = history.current;
  const selectedObject =
    selectedId != null
      ? (document.objects.find((object) => object.id === selectedId) ?? null)
      : null;

  const replaceCurrent = useCallback((nextDocument: DrawingDocument) => {
    setHistory((current) => ({ ...current, current: nextDocument }));
  }, []);

  const commitDocument = useCallback((nextDocument: DrawingDocument) => {
    setHistory((current) => {
      if (documentsEqual(current.current, nextDocument)) return current;
      return {
        past: [...current.past, current.current].slice(-80),
        current: nextDocument,
        future: [],
      };
    });
    setDirty(true);
  }, []);

  const finishInteraction = useCallback((originDocument: DrawingDocument) => {
    setHistory((current) => {
      if (documentsEqual(originDocument, current.current)) return current;
      return {
        past: [...current.past, originDocument].slice(-80),
        current: current.current,
        future: [],
      };
    });
    setDirty(true);
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (!previous) return current;
      return {
        past: current.past.slice(0, -1),
        current: previous,
        future: [current.current, ...current.future],
      };
    });
    setEditingTextId(null);
    setSelectedId(null);
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      if (current.future.length === 0) return current;
      const next = current.future[0];
      return {
        past: [...current.past, current.current],
        current: next,
        future: current.future.slice(1),
      };
    });
    setEditingTextId(null);
    setSelectedId(null);
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    commitDocument({
      ...document,
      objects: document.objects.filter((object) => object.id !== selectedId),
    });
    setSelectedId(null);
  }, [commitDocument, document, selectedId]);

  const duplicateSelected = useCallback(() => {
    const object = selectedObject;
    if (!object) return;
    const copyObject = cloneDrawingObject(object);
    commitDocument({
      ...document,
      objects: [...document.objects, copyObject],
    });
    setSelectedId(copyObject.id);
  }, [commitDocument, document, selectedObject]);

  const finishTextEditing = useCallback(() => {
    const originDocument = textEditOriginRef.current;
    setEditingTextId(null);
    textEditOriginRef.current = null;
    if (originDocument) finishInteraction(originDocument);
  }, [finishInteraction]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isFormField =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      if (event.key === "Escape") {
        event.preventDefault();
        if (editingTextId) {
          finishTextEditing();
        } else if (selectedId) {
          setSelectedId(null);
        } else {
          target?.blur();
        }
        return;
      }

      if (isFormField || editingTextId) return;

      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (meta && event.key.toLowerCase() === "c") {
        if (selectedObject) {
          event.preventDefault();
          setClipboardObject(selectedObject);
        }
      } else if (meta && event.key.toLowerCase() === "v") {
        if (clipboardObject) {
          event.preventDefault();
          const copyObject = cloneDrawingObject(clipboardObject);
          commitDocument({
            ...document,
            objects: [...document.objects, copyObject],
          });
          setSelectedId(copyObject.id);
        }
      } else if (
        selectedId &&
        (event.key === "Delete" || event.key === "Backspace")
      ) {
        event.preventDefault();
        deleteSelected();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    clipboardObject,
    commitDocument,
    deleteSelected,
    document,
    editingTextId,
    finishTextEditing,
    redo,
    selectedId,
    selectedObject,
    undo,
  ]);

  const startTextEditing = (objectId: string) => {
    textEditOriginRef.current = cloneDocument(document);
    setSelectedId(objectId);
    setEditingTextId(objectId);
  };

  const addTextAt = (point: DrawingPoint) => {
    const object: DrawingObject = {
      id: createDrawingObjectId(),
      type: "text",
      x: point.x,
      y: point.y,
      width: 420,
      height: 70,
      stroke: "#191919",
      fill: "transparent",
      strokeWidth: 0,
      text: "New text",
      fontSize: 56,
      fontWeight: 800,
      align: "left",
    };
    commitDocument({ ...document, objects: [...document.objects, object] });
    setSelectedId(object.id);
    setTool("select");
    window.setTimeout(() => startTextEditing(object.id), 0);
  };

  const addPlaceholderAt = (point: DrawingPoint) => {
    const object: DrawingObject = {
      id: createDrawingObjectId(),
      type: "placeholder",
      x: Math.max(0, point.x - 150),
      y: Math.max(0, point.y - 230),
      width: 300,
      height: 460,
      stroke: "#191919",
      fill: "#f1efe6",
      strokeWidth: 4,
      label: "Person",
      pose: "front",
    };
    commitDocument({ ...document, objects: [...document.objects, object] });
    setSelectedId(object.id);
    setTool("select");
  };

  const createDraftObject = (
    draftTool: Exclude<
      DrawingTool,
      "select" | "text" | "placeholder" | "image"
    >,
    start: DrawingPoint,
  ): DrawingObject => {
    if (draftTool === "arrow") {
      return {
        id: createDrawingObjectId(),
        type: "arrow",
        x: start.x,
        y: start.y,
        width: 1,
        height: 1,
        endX: start.x + 1,
        endY: start.y + 1,
        stroke: "#e11d48",
        fill: "transparent",
        strokeWidth: 8,
      };
    }
    if (draftTool === "pencil") {
      return {
        id: createDrawingObjectId(),
        type: "pencil",
        x: start.x,
        y: start.y,
        width: 1,
        height: 1,
        points: [start],
        stroke: "#191919",
        fill: "transparent",
        strokeWidth: 5,
      };
    }
    return {
      id: createDrawingObjectId(),
      type: draftTool,
      x: start.x,
      y: start.y,
      width: 1,
      height: 1,
      stroke: "#191919",
      fill: draftTool === "rectangle" ? "transparent" : "transparent",
      strokeWidth: 4,
    };
  };

  const findObjectAt = (point: DrawingPoint) => {
    return document.objects
      .slice()
      .reverse()
      .find((object) => pointInObject(point, object));
  };

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || saving) return;
    const point = getClientPoint(event, svgRef.current);

    if (editingTextId) finishTextEditing();

    if (tool === "text") {
      addTextAt(point);
      return;
    }

    if (tool === "placeholder") {
      addPlaceholderAt(point);
      return;
    }

    if (tool === "image") {
      fileInputRef.current?.click();
      return;
    }

    if (tool === "select") {
      const targetObject = findObjectAt(point);
      if (!targetObject) {
        setSelectedId(null);
        return;
      }
      setSelectedId(targetObject.id);
      setInteraction({
        type: "move",
        objectId: targetObject.id,
        start: point,
        originDocument: cloneDocument(document),
      });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    const draftObject = createDraftObject(tool, point);
    replaceCurrent({
      ...document,
      objects: [...document.objects, draftObject],
    });
    setSelectedId(draftObject.id);
    setInteraction({
      type: "draw",
      objectId: draftObject.id,
      tool,
      start: point,
      originDocument: cloneDocument(document),
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!interaction || !svgRef.current) return;
    const rawPoint = getClientPoint(event, svgRef.current);

    if (interaction.type === "move") {
      const point = event.shiftKey
        ? constrainPoint(interaction.start, rawPoint)
        : rawPoint;
      const dx = point.x - interaction.start.x;
      const dy = point.y - interaction.start.y;
      replaceCurrent({
        ...interaction.originDocument,
        objects: interaction.originDocument.objects.map((object) =>
          object.id === interaction.objectId
            ? moveObject(object, dx, dy)
            : object,
        ),
      });
    } else if (interaction.type === "resize") {
      replaceCurrent(
        updateObject(
          interaction.originDocument,
          interaction.objectId,
          (object) =>
            resizeObject(object, interaction.handle, rawPoint, event.shiftKey),
        ),
      );
    } else {
      const point = event.shiftKey
        ? constrainPoint(interaction.start, rawPoint)
        : rawPoint;
      replaceCurrent(
        updateObject(document, interaction.objectId, (object) => {
          if (object.type === "arrow") {
            return {
              ...object,
              endX: point.x,
              endY: point.y,
              width: Math.abs(point.x - object.x),
              height: Math.abs(point.y - object.y),
            };
          }
          if (object.type === "pencil") {
            const points = [...object.points, rawPoint];
            const xs = points.map((p) => p.x);
            const ys = points.map((p) => p.y);
            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            return {
              ...object,
              x: minX,
              y: minY,
              width: Math.max(1, Math.max(...xs) - minX),
              height: Math.max(1, Math.max(...ys) - minY),
              points,
            };
          }
          const x = Math.min(interaction.start.x, point.x);
          const y = Math.min(interaction.start.y, point.y);
          return {
            ...object,
            x,
            y,
            width: Math.max(12, Math.abs(point.x - interaction.start.x)),
            height: Math.max(12, Math.abs(point.y - interaction.start.y)),
          };
        }),
      );
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!interaction) return;
    finishInteraction(interaction.originDocument);
    setInteraction(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (interaction.type === "draw") setTool("select");
  };

  const handleResizePointerDown = (
    event: ReactPointerEvent<SVGRectElement>,
    handle: "nw" | "ne" | "sw" | "se",
  ) => {
    if (!selectedId) return;
    event.preventDefault();
    event.stopPropagation();
    setInteraction({
      type: "resize",
      objectId: selectedId,
      handle,
      originDocument: cloneDocument(document),
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleTextChange = (value: string) => {
    if (!editingTextId) return;
    replaceCurrent(
      updateObject(document, editingTextId, (object) =>
        object.type === "text" ? { ...object, text: value } : object,
      ),
    );
  };

  const handleInsertImage = async (file: File | undefined) => {
    if (!file) return;
    setImageError(null);
    try {
      const src = await readImageAsDataUrl(file);
      const object: DrawingObject = {
        id: createDrawingObjectId(),
        type: "image",
        x: 370,
        y: 170,
        width: 540,
        height: 320,
        stroke: "#191919",
        fill: "transparent",
        strokeWidth: 0,
        src,
        fileName: file.name,
      };
      commitDocument({ ...document, objects: [...document.objects, object] });
      setSelectedId(object.id);
      setTool("select");
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Image failed");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const applyTemplate = (templateId: DrawingTemplateId) => {
    const objects = getTemplateObjects(templateId);
    commitDocument({ ...document, objects: [...document.objects, ...objects] });
    setSelectedId(objects.at(-1)?.id ?? null);
  };

  const updateSelectedStyle = (patch: Partial<DrawingObject>) => {
    if (!selectedId) return;
    commitDocument(
      updateObject(
        document,
        selectedId,
        (object) =>
          ({
            ...object,
            ...patch,
          }) as DrawingObject,
      ),
    );
  };

  const handleCancel = () => {
    if (dirty && !window.confirm("Discard unsaved drawing changes?")) return;
    onCancel();
  };

  const handleSave = async () => {
    if (editingTextId) finishTextEditing();
    await onSave(title, document);
    setDirty(false);
  };

  const selectedBounds = selectedObject
    ? getObjectBounds(selectedObject)
    : null;
  const editingText =
    editingTextId != null
      ? (document.objects.find(
          (object): object is Extract<DrawingObject, { type: "text" }> =>
            object.id === editingTextId && object.type === "text",
        ) ?? null)
      : null;

  return (
    <div className="bg-background flex min-h-screen flex-col overflow-hidden">
      <header className="border-border bg-background/95 sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b px-3 backdrop-blur">
        <Button size="icon" variant="ghost" onClick={handleCancel}>
          <X className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <Input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setDirty(true);
            }}
            className="focus-visible:border-input h-9 max-w-sm border-transparent bg-transparent px-1 text-sm font-semibold shadow-none"
            aria-label="Drawing title"
          />
        </div>
        <div className="hidden items-center gap-1 md:flex">
          <ToolbarButton
            label="Undo"
            onClick={undo}
            disabled={!history.past.length}
          >
            <Undo2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Redo"
            onClick={redo}
            disabled={!history.future.length}
          >
            <Redo2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Duplicate"
            onClick={duplicateSelected}
            disabled={!selectedObject}
          >
            <Copy className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Delete"
            onClick={deleteSelected}
            disabled={!selectedObject}
          >
            <Trash2 className="size-4" />
          </ToolbarButton>
        </div>
        <Button onClick={handleSave} disabled={saving} className="h-9">
          <Save className="size-4" />
          {saving
            ? "Saving"
            : mode === "edit"
              ? "Save drawing"
              : "Create inspiration"}
        </Button>
      </header>

      <main className="grid min-h-0 flex-1 grid-rows-[auto_1fr] bg-stone-100/80 md:grid-cols-[1fr_220px] md:grid-rows-1">
        <section className="flex min-h-0 flex-col">
          <div className="border-border bg-background/90 flex flex-wrap items-center justify-center gap-1 border-b px-2 py-2 md:justify-start">
            {TOOL_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = tool === item.tool;
              return (
                <ToolbarButton
                  key={item.tool}
                  label={item.label}
                  active={active}
                  onClick={() => {
                    if (item.tool === "image") fileInputRef.current?.click();
                    else setTool(item.tool);
                  }}
                >
                  <Icon className="size-4" />
                </ToolbarButton>
              );
            })}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) =>
                void handleInsertImage(event.target.files?.[0])
              }
            />
            <div className="bg-border mx-1 hidden h-6 w-px md:block" />
            <div className="flex items-center gap-1 overflow-x-auto">
              {TEMPLATE_ITEMS.map((template) => (
                <Button
                  key={template.id}
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0 px-2 text-xs"
                  onClick={() => applyTemplate(template.id)}
                >
                  <StickyNote className="size-3.5" />
                  {template.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center p-3 md:p-8">
            <div className="relative aspect-video w-full max-w-6xl rounded-lg border border-stone-300 bg-white shadow-sm">
              <svg
                ref={svgRef}
                viewBox="0 0 1280 720"
                className="size-full touch-none rounded-lg select-none"
                style={{ background: document.background }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onDoubleClick={(event) => {
                  const target = event.target as Element;
                  const objectId = target
                    .closest("[data-object-id]")
                    ?.getAttribute("data-object-id");
                  const object = document.objects.find(
                    (item) => item.id === objectId,
                  );
                  if (object?.type === "text") startTextEditing(object.id);
                }}
              >
                <defs>
                  <marker
                    id="drawing-arrow-head"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="4"
                    markerHeight="4"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#e11d48" />
                  </marker>
                </defs>
                {document.objects.map((object) => (
                  <g key={object.id}>
                    {renderObject(object, object.id === selectedId)}
                  </g>
                ))}
                {selectedBounds && (
                  <g className="pointer-events-none">
                    <rect
                      x={selectedBounds.x - 8}
                      y={selectedBounds.y - 8}
                      width={selectedBounds.width + 16}
                      height={selectedBounds.height + 16}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth={3}
                      strokeDasharray="10 8"
                    />
                    {(["nw", "ne", "sw", "se"] as const).map((handle) => {
                      const x =
                        handle === "nw" || handle === "sw"
                          ? selectedBounds.x - 15
                          : selectedBounds.x + selectedBounds.width + 1;
                      const y =
                        handle === "nw" || handle === "ne"
                          ? selectedBounds.y - 15
                          : selectedBounds.y + selectedBounds.height + 1;
                      return (
                        <rect
                          key={handle}
                          className="pointer-events-auto cursor-nwse-resize"
                          x={x}
                          y={y}
                          width={14}
                          height={14}
                          rx={3}
                          fill="#fff"
                          stroke="#2563eb"
                          strokeWidth={3}
                          onPointerDown={(event) =>
                            handleResizePointerDown(event, handle)
                          }
                        />
                      );
                    })}
                  </g>
                )}
              </svg>

              {editingText && (
                <textarea
                  value={editingText.text}
                  onChange={(event) => handleTextChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      finishTextEditing();
                    }
                  }}
                  onBlur={finishTextEditing}
                  autoFocus
                  className="absolute resize-none rounded border border-blue-500 bg-white/95 p-1 shadow-sm outline-none"
                  style={{
                    left: `${(editingText.x / 1280) * 100}%`,
                    top: `${(editingText.y / 720) * 100}%`,
                    width: `${(editingText.width / 1280) * 100}%`,
                    minHeight: `${(Math.max(90, editingText.height) / 720) * 100}%`,
                    color: editingText.stroke,
                    fontSize: `clamp(14px, ${(editingText.fontSize / 1280) * 100}vw, ${editingText.fontSize}px)`,
                    fontWeight: editingText.fontWeight,
                    lineHeight: 1.05,
                  }}
                />
              )}
            </div>
          </div>
        </section>

        <aside className="border-border bg-background flex min-h-0 flex-col gap-4 border-t p-3 md:border-t-0 md:border-l">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Properties</span>
              {dirty ? (
                <Badge variant="outline" className="text-[10px]">
                  Unsaved
                </Badge>
              ) : null}
            </div>
            {selectedObject ? (
              <div className="flex flex-col gap-3">
                <label className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">Stroke</span>
                  <input
                    type="color"
                    value={selectedObject.stroke}
                    onChange={(event) =>
                      updateSelectedStyle({ stroke: event.target.value })
                    }
                    className="h-7 w-10"
                  />
                </label>
                {"fill" in selectedObject && selectedObject.type !== "text" && (
                  <label className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">Fill</span>
                    <input
                      type="color"
                      value={
                        selectedObject.fill === "transparent"
                          ? "#ffffff"
                          : selectedObject.fill
                      }
                      onChange={(event) =>
                        updateSelectedStyle({ fill: event.target.value })
                      }
                      className="h-7 w-10"
                    />
                  </label>
                )}
                {selectedObject.type !== "image" &&
                  selectedObject.type !== "text" && (
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="text-muted-foreground">
                        Stroke width {selectedObject.strokeWidth}
                      </span>
                      <input
                        type="range"
                        min={1}
                        max={16}
                        value={selectedObject.strokeWidth}
                        onChange={(event) =>
                          updateSelectedStyle({
                            strokeWidth: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                  )}
                {selectedObject.type === "text" && (
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-muted-foreground">
                      Font size {selectedObject.fontSize}
                    </span>
                    <input
                      type="range"
                      min={24}
                      max={120}
                      value={selectedObject.fontSize}
                      onChange={(event) =>
                        updateSelectedStyle({
                          fontSize: Number(event.target.value),
                        } as Partial<DrawingObject>)
                      }
                    />
                  </label>
                )}
                {selectedObject.type === "placeholder" && (
                  <Input
                    value={selectedObject.label}
                    onChange={(event) =>
                      updateSelectedStyle({
                        label: event.target.value,
                      } as Partial<DrawingObject>)
                    }
                    className="h-8"
                    aria-label="Placeholder label"
                  />
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs leading-relaxed">
                Select an object to adjust color, size, or label.
              </p>
            )}
          </div>

          <div className="text-muted-foreground mt-auto flex flex-col gap-1 border-t pt-3 text-xs">
            <span>Escape clears editing or selection.</span>
            <span>Shift constrains drawing and resizing.</span>
            <span>Cmd/Ctrl+Z, C, V work on selected objects.</span>
            {imageError ? (
              <span className="text-destructive">{imageError}</span>
            ) : null}
          </div>
        </aside>
      </main>
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip delayDuration={250}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant={active ? "secondary" : "ghost"}
          className="size-8 shrink-0"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
