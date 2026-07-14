// Compact floating toolbar: tools on the left, history + insert actions on the
// right. Kept deliberately simple — a single row of obvious buttons.

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  Circle,
  ImagePlus,
  LayoutTemplate,
  Loader2,
  MousePointer2,
  Pencil,
  PersonStanding,
  Redo2,
  Square,
  Type,
  Undo2,
} from "lucide-react";
import { useRef } from "react";
import type { DrawingTool } from "./drawing-document";
import { DRAWING_TEMPLATES } from "./drawing-templates";
import { useDrawingStore } from "./drawing-store";

type ToolConfig = {
  tool: DrawingTool;
  icon: typeof Square;
  label: string;
  shortcut: string;
};

const TOOLS: ToolConfig[] = [
  { tool: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
  { tool: "rectangle", icon: Square, label: "Rectangle", shortcut: "R" },
  { tool: "ellipse", icon: Circle, label: "Ellipse", shortcut: "O" },
  { tool: "arrow", icon: ArrowUpRight, label: "Arrow", shortcut: "A" },
  { tool: "text", icon: Type, label: "Text", shortcut: "T" },
  { tool: "freedraw", icon: Pencil, label: "Draw", shortcut: "P" },
  {
    tool: "placeholder",
    icon: PersonStanding,
    label: "Subject placeholder",
    shortcut: "S",
  },
];

export function DrawingToolbar({
  onImageFile,
  isUploadingImage,
}: {
  onImageFile: (file: File) => void;
  isUploadingImage: boolean;
}) {
  const tool = useDrawingStore((state) => state.tool);
  const setTool = useDrawingStore((state) => state.setTool);
  const undo = useDrawingStore((state) => state.undo);
  const redo = useDrawingStore((state) => state.redo);
  const past = useDrawingStore((state) => state.past.length);
  const future = useDrawingStore((state) => state.future.length);
  const addElements = useDrawingStore((state) => state.addElements);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertTemplate = (templateId: string) => {
    const template = DRAWING_TEMPLATES.find((item) => item.id === templateId);
    if (template) addElements(template.build());
  };

  return (
    <div className="border-border bg-background/95 flex items-center gap-1 rounded-xl border p-1.5 shadow-lg backdrop-blur">
      {TOOLS.map(({ tool: toolId, icon: Icon, label, shortcut }) => (
        <Tooltip key={toolId} delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-pressed={tool === toolId}
              onClick={() => setTool(toolId)}
              className={cn(
                "size-9",
                tool === toolId &&
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              )}
            >
              <Icon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {label}
            <span className="text-muted-foreground ml-1.5 text-xs">
              {shortcut}
            </span>
          </TooltipContent>
        </Tooltip>
      ))}

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage}
          >
            {isUploadingImage ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Insert image</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9"
              >
                <LayoutTemplate className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Templates</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="center" className="w-64">
          <DropdownMenuLabel>Starter layouts</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {DRAWING_TEMPLATES.map((template) => (
            <DropdownMenuItem
              key={template.id}
              onClick={() => insertTemplate(template.id)}
              className="flex flex-col items-start gap-0.5"
            >
              <span className="text-sm font-medium">{template.name}</span>
              <span className="text-muted-foreground text-xs">
                {template.description}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={undo}
            disabled={past === 0}
          >
            <Undo2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Undo</TooltipContent>
      </Tooltip>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={redo}
            disabled={future === 0}
          >
            <Redo2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Redo</TooltipContent>
      </Tooltip>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onImageFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
