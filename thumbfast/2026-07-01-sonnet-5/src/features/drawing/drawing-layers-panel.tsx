import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Canvas } from "fabric";
import {
  ArrowRight,
  Award,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ImageIcon,
  Layers,
  Lock,
  MessageSquare,
  PenLine,
  Sparkles,
  Square,
  Trash2,
  Type,
  Unlock,
  Users,
} from "lucide-react";
import { useState } from "react";
import { deleteSelection } from "./drawing-canvas-actions";
import {
  getObjectData,
  renameObject,
  setObjectLocked,
} from "./drawing-object-factory";
import type { DrawingObjectKind } from "./drawing.types";

const KIND_ICONS: Record<DrawingObjectKind, typeof Square> = {
  shape: Square,
  text: Type,
  image: ImageIcon,
  arrow: ArrowRight,
  freehand: PenLine,
  "placeholder-person": Users,
  badge: Award,
  explosion: Sparkles,
  callout: MessageSquare,
  group: Layers,
};

type DrawingLayersPanelProps = {
  canvas: Canvas | null;
  canvasVersion: number;
  onChange: () => void;
};

export function DrawingLayersPanel({
  canvas,
  canvasVersion,
  onChange,
}: DrawingLayersPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  if (!canvas) return null;

  // canvasVersion forces this component to re-read fabric's imperative
  // object list on every structural/selection change (fabric mutations
  // don't trigger React re-renders on their own).
  void canvasVersion;

  const objects = canvas
    .getObjects()
    .filter((object) => object.excludeFromExport !== true)
    .slice()
    .reverse();
  const activeIds = new Set(
    canvas
      .getActiveObjects()
      .map((object) => getObjectData(object)?.id)
      .filter(Boolean),
  );

  const select = (object: (typeof objects)[number]) => {
    canvas.discardActiveObject();
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
  };

  const toggleLock = (object: (typeof objects)[number]) => {
    const data = getObjectData(object);
    setObjectLocked(object, !data?.locked);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    onChange();
  };

  const toggleVisible = (object: (typeof objects)[number]) => {
    object.set("visible", !object.visible);
    canvas.requestRenderAll();
    onChange();
  };

  const moveUp = (object: (typeof objects)[number]) => {
    canvas.bringObjectForward(object);
    canvas.requestRenderAll();
    onChange();
  };

  const moveDown = (object: (typeof objects)[number]) => {
    canvas.sendObjectBackwards(object);
    canvas.requestRenderAll();
    onChange();
  };

  const remove = (object: (typeof objects)[number]) => {
    canvas.discardActiveObject();
    canvas.setActiveObject(object);
    deleteSelection(canvas);
  };

  const startRename = (object: (typeof objects)[number]) => {
    const data = getObjectData(object);
    setEditingId(data?.id ?? null);
    setEditingName(data?.name ?? "");
  };

  const commitRename = (object: (typeof objects)[number]) => {
    const name = editingName.trim();
    if (name) {
      renameObject(object, name);
      onChange();
    }
    setEditingId(null);
  };

  if (objects.length === 0) {
    return (
      <p className="text-muted-foreground px-2 py-6 text-center text-xs">
        No objects yet
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {objects.map((object, index) => {
        const data = getObjectData(object);
        const Icon = data ? KIND_ICONS[data.kind] : Square;
        const isSelected = data ? activeIds.has(data.id) : false;
        const isLocked = Boolean(data?.locked);
        const isVisible = object.visible !== false;

        return (
          <div
            key={data?.id ?? index}
            className={cn(
              "group flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs",
              isSelected ? "bg-accent" : "hover:bg-accent/50",
            )}
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
              onClick={() => select(object)}
            >
              <Icon className="text-muted-foreground size-3.5 shrink-0" />
              {editingId === data?.id ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => commitRename(object)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(object);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-input h-5 min-w-0 flex-1 rounded px-1 outline-none"
                />
              ) : (
                <span
                  className="min-w-0 flex-1 truncate"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startRename(object);
                  }}
                >
                  {data?.name ?? "Object"}
                </span>
              )}
            </button>

            <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-6"
                onClick={() => moveUp(object)}
              >
                <ChevronUp className="size-3" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-6"
                onClick={() => moveDown(object)}
              >
                <ChevronDown className="size-3" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-6"
                onClick={() => toggleVisible(object)}
              >
                {isVisible ? (
                  <Eye className="size-3" />
                ) : (
                  <EyeOff className="size-3" />
                )}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-6"
                onClick={() => toggleLock(object)}
              >
                {isLocked ? (
                  <Lock className="size-3" />
                ) : (
                  <Unlock className="size-3" />
                )}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-destructive size-6"
                onClick={() => remove(object)}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
