import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FabricImage, type Canvas } from "fabric";
import {
  ArrowRight,
  Award,
  Circle,
  Hand,
  ImagePlus,
  Loader2,
  type LucideIcon,
  MessageSquare,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  RectangleHorizontal,
  Sparkles,
  Square,
  Type,
  Undo2,
  Users,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useRef, useState } from "react";
import { useDrawingEditorStore } from "./drawing-editor.store";
import { tagObject } from "./drawing-object-factory";
import {
  createBadge,
  createCallout,
  createExplosion,
  createPlaceholderPerson,
} from "./drawing-placeholders";
import type { DrawingTool } from "./drawing.types";

type ToolDefinition = {
  tool: DrawingTool;
  label: string;
  shortcut: string;
  icon: LucideIcon;
};

const TOOLS: ToolDefinition[] = [
  { tool: "select", label: "Select", shortcut: "V", icon: MousePointer2 },
  { tool: "pan", label: "Pan", shortcut: "H", icon: Hand },
  { tool: "rect", label: "Rectangle", shortcut: "R", icon: Square },
  {
    tool: "roundedRect",
    label: "Rounded rectangle",
    shortcut: "Shift+R",
    icon: RectangleHorizontal,
  },
  { tool: "ellipse", label: "Ellipse", shortcut: "O", icon: Circle },
  { tool: "line", label: "Line", shortcut: "L", icon: Minus },
  { tool: "arrow", label: "Arrow", shortcut: "A", icon: ArrowRight },
  { tool: "text", label: "Text", shortcut: "T", icon: Type },
  { tool: "freehand", label: "Pen", shortcut: "P", icon: Pencil },
];

type DrawingToolbarProps = {
  canvas: Canvas | null;
  canvasSize: { width: number; height: number };
  onUploadImage: (file: File) => Promise<string>;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
};

export function DrawingToolbar({
  canvas,
  canvasSize,
  onUploadImage,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: DrawingToolbarProps) {
  const tool = useDrawingEditorStore((s) => s.tool);
  const setTool = useDrawingEditorStore((s) => s.setTool);
  const canUndo = useDrawingEditorStore((s) => s.canUndo());
  const canRedo = useDrawingEditorStore((s) => s.canRedo());
  const zoom = useDrawingEditorStore((s) => s.zoom);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const insertAtCenter = (build: (x: number, y: number) => void) => {
    if (!canvas) return;
    build(canvasSize.width / 2, canvasSize.height / 2);
    setTool("select");
  };

  const handleFilePicked = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !canvas) return;

    setIsUploading(true);
    try {
      const url = await onUploadImage(file);
      const image = await FabricImage.fromURL(
        `/api/proxy-image?url=${encodeURIComponent(url)}`,
        { crossOrigin: "anonymous" },
      );
      const maxDimension = Math.min(canvasSize.width, canvasSize.height) * 0.6;
      const scale = Math.min(
        1,
        maxDimension / Math.max(image.width, image.height),
      );
      image.set({
        left: (canvasSize.width - image.width * scale) / 2,
        top: (canvasSize.height - image.height * scale) / 2,
        scaleX: scale,
        scaleY: scale,
      });
      tagObject(image, { kind: "image" });
      canvas.add(image);
      canvas.setActiveObject(image);
      canvas.requestRenderAll();
      setTool("select");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-background flex flex-col items-center gap-1 rounded-lg border p-1.5 shadow-sm">
      {TOOLS.map(({ tool: toolId, label, shortcut, icon: Icon }) => (
        <Tooltip key={toolId} delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant={tool === toolId ? "default" : "ghost"}
              className="size-9"
              onClick={() => setTool(toolId)}
            >
              <Icon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {label}{" "}
            <span className="text-muted-foreground ml-1">{shortcut}</span>
          </TooltipContent>
        </Tooltip>
      ))}

      <Separator className="my-1" />

      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-9"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Insert image</TooltipContent>
      </Tooltip>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={(event) => void handleFilePicked(event)}
      />

      <DropdownMenu>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-9"
              >
                <Users className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">Insert placeholder</TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItem
            onClick={() =>
              insertAtCenter((x, y) => {
                const object = createPlaceholderPerson(x, y);
                canvas?.add(object);
                canvas?.setActiveObject(object);
                canvas?.requestRenderAll();
              })
            }
          >
            <Users className="size-4" />
            Placeholder character
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              insertAtCenter((x, y) => {
                const object = createBadge(x, y);
                canvas?.add(object);
                canvas?.setActiveObject(object);
                canvas?.requestRenderAll();
              })
            }
          >
            <Award className="size-4" />
            Badge
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              insertAtCenter((x, y) => {
                const object = createExplosion(x, y, "WOW");
                canvas?.add(object);
                canvas?.setActiveObject(object);
                canvas?.requestRenderAll();
              })
            }
          >
            <Sparkles className="size-4" />
            Explosion
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              insertAtCenter((x, y) => {
                const object = createCallout(x, y, "Callout");
                canvas?.add(object);
                canvas?.setActiveObject(object);
                canvas?.requestRenderAll();
              })
            }
          >
            <MessageSquare className="size-4" />
            Callout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator className="my-1" />

      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-9"
            disabled={!canUndo}
            onClick={onUndo}
          >
            <Undo2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          Undo <span className="text-muted-foreground ml-1">Ctrl+Z</span>
        </TooltipContent>
      </Tooltip>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-9"
            disabled={!canRedo}
            onClick={onRedo}
          >
            <Redo2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          Redo <span className="text-muted-foreground ml-1">Ctrl+Shift+Z</span>
        </TooltipContent>
      </Tooltip>

      <Separator className="my-1" />

      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-9"
            onClick={onZoomIn}
          >
            <ZoomIn className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Zoom in</TooltipContent>
      </Tooltip>
      <button
        type="button"
        onClick={onZoomReset}
        className="text-muted-foreground hover:text-foreground w-9 py-1 text-center text-[11px] tabular-nums"
      >
        {Math.round(zoom * 100)}%
      </button>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-9"
            onClick={onZoomOut}
          >
            <ZoomOut className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Zoom out</TooltipContent>
      </Tooltip>
    </div>
  );
}
