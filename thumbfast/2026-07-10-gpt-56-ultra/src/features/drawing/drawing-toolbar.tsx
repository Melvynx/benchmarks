import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Circle,
  CopyPlus,
  ImagePlus,
  LayoutTemplate,
  MousePointer2,
  MoveRight,
  Pencil,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
  UserRound,
} from "lucide-react";

import {
  DRAWING_TEMPLATES,
  DRAWING_TOOL,
  type DrawingTemplate,
  type DrawingTool,
} from "./drawing-document";

type DrawingToolbarProps = {
  activeTool: DrawingTool;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  isUploadingImage: boolean;
  onToolChange: (tool: DrawingTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onInsertImage: () => void;
  onApplyTemplate: (template: DrawingTemplate) => void;
};

const TOOL_OPTIONS = [
  { tool: DRAWING_TOOL.SELECT, label: "Select", icon: MousePointer2 },
  { tool: DRAWING_TOOL.TEXT, label: "Text", icon: Type },
  { tool: DRAWING_TOOL.ARROW, label: "Arrow", icon: MoveRight },
  { tool: DRAWING_TOOL.RECTANGLE, label: "Rectangle", icon: Square },
  { tool: DRAWING_TOOL.ELLIPSE, label: "Ellipse", icon: Circle },
  { tool: DRAWING_TOOL.PENCIL, label: "Pencil", icon: Pencil },
  { tool: DRAWING_TOOL.PERSON, label: "Person placeholder", icon: UserRound },
] as const;

function ToolbarSeparator() {
  return <div className="bg-border mx-1 h-6 w-px shrink-0" />;
}

export function DrawingToolbar({
  activeTool,
  canUndo,
  canRedo,
  hasSelection,
  isUploadingImage,
  onToolChange,
  onUndo,
  onRedo,
  onDuplicate,
  onDelete,
  onInsertImage,
  onApplyTemplate,
}: DrawingToolbarProps) {
  return (
    <div className="bg-background flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08)]">
      {TOOL_OPTIONS.map(({ tool, label, icon: Icon }) => (
        <Button
          key={tool}
          type="button"
          variant={activeTool === tool ? "secondary" : "ghost"}
          size="icon"
          className="size-10 shrink-0 rounded-xl active:scale-[0.96]"
          title={label}
          aria-label={label}
          aria-pressed={activeTool === tool}
          onClick={() => onToolChange(tool)}
        >
          <Icon className="size-4" />
        </Button>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10 shrink-0 rounded-xl active:scale-[0.96]"
        title="Insert image"
        aria-label="Insert image"
        disabled={isUploadingImage}
        onClick={onInsertImage}
      >
        <ImagePlus className={isUploadingImage ? "size-4 animate-pulse" : "size-4"} />
      </Button>

      <ToolbarSeparator />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-10 shrink-0 rounded-xl px-3 active:scale-[0.96]"
          >
            <LayoutTemplate className="size-4" />
            Templates
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-72">
          {DRAWING_TEMPLATES.map((template) => (
            <DropdownMenuItem
              key={template.id}
              className="flex cursor-pointer flex-col items-start gap-0.5 py-2.5"
              onClick={() => onApplyTemplate(template)}
            >
              <span className="font-medium">{template.name}</span>
              <span className="text-muted-foreground text-xs">
                {template.description}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolbarSeparator />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10 shrink-0 rounded-xl active:scale-[0.96]"
        title="Undo"
        aria-label="Undo"
        disabled={!canUndo}
        onClick={onUndo}
      >
        <Undo2 className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10 shrink-0 rounded-xl active:scale-[0.96]"
        title="Redo"
        aria-label="Redo"
        disabled={!canRedo}
        onClick={onRedo}
      >
        <Redo2 className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10 shrink-0 rounded-xl active:scale-[0.96]"
        title="Duplicate"
        aria-label="Duplicate selected object"
        disabled={!hasSelection}
        onClick={onDuplicate}
      >
        <CopyPlus className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive size-10 shrink-0 rounded-xl active:scale-[0.96]"
        title="Delete"
        aria-label="Delete selected object"
        disabled={!hasSelection}
        onClick={onDelete}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
