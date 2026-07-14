import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Circle,
  Copy,
  Hand,
  ImageIcon,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
  User,
} from "lucide-react";
import { DRAWING_COLORS, type DrawingTool } from "../drawing.types";
import { DRAWING_TEMPLATES } from "../drawing.templates";
import type { DrawingEditorApi } from "../use-drawing-editor";

type DrawingToolbarProps = {
  editor: DrawingEditorApi;
  onInsertImage: () => void;
};

const TOOLS: {
  id: DrawingTool;
  label: string;
  icon: typeof MousePointer2;
  shortcut?: string;
}[] = [
  { id: "select", label: "Select", icon: MousePointer2, shortcut: "V" },
  { id: "text", label: "Text", icon: Type, shortcut: "T" },
  { id: "rectangle", label: "Rectangle", icon: Square, shortcut: "R" },
  { id: "ellipse", label: "Ellipse", icon: Circle, shortcut: "O" },
  { id: "arrow", label: "Arrow", icon: ArrowRight, shortcut: "A" },
  { id: "freehand", label: "Pencil", icon: Pencil, shortcut: "P" },
  { id: "person", label: "Person", icon: User, shortcut: "H" },
  { id: "image", label: "Image", icon: ImageIcon },
];

function ToolButton(props: {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant={props.active ? "default" : "ghost"}
          disabled={props.disabled}
          onClick={props.onClick}
          className="size-8"
          aria-label={props.label}
        >
          {props.children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {props.label}
        {props.shortcut ? ` (${props.shortcut})` : null}
      </TooltipContent>
    </Tooltip>
  );
}

export function DrawingToolbar({ editor, onInsertImage }: DrawingToolbarProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-3">
      <div className="bg-card/95 pointer-events-auto flex flex-wrap items-center gap-1 rounded-xl border p-1.5 shadow-md backdrop-blur">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <ToolButton
              key={tool.id}
              label={tool.label}
              shortcut={tool.shortcut}
              active={editor.tool === tool.id}
              onClick={() => {
                if (tool.id === "image") {
                  onInsertImage();
                  return;
                }
                if (tool.id === "person") {
                  editor.insertPerson();
                  return;
                }
                editor.setTool(tool.id);
              }}
            >
              <Icon className="size-4" />
            </ToolButton>
          );
        })}

        <div className="bg-border mx-1 h-6 w-px" />

        {DRAWING_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Color ${color}`}
            onClick={() => {
              editor.setStrokeColor(color);
              if (editor.selectedIds.length > 0) {
                editor.updateSelectedStyle({ strokeColor: color });
              }
            }}
            className={cn(
              "border-border size-6 rounded-full border",
              editor.strokeColor === color &&
                "ring-ring ring-offset-background ring-2 ring-offset-1",
            )}
            style={{ backgroundColor: color }}
          />
        ))}

        <div className="bg-border mx-1 h-6 w-px" />

        <ToolButton
          label="Undo"
          shortcut="⌘Z"
          disabled={!editor.canUndo}
          onClick={editor.undo}
        >
          <Undo2 className="size-4" />
        </ToolButton>
        <ToolButton
          label="Redo"
          shortcut="⌘⇧Z"
          disabled={!editor.canRedo}
          onClick={editor.redo}
        >
          <Redo2 className="size-4" />
        </ToolButton>
        <ToolButton
          label="Duplicate"
          shortcut="⌘D"
          disabled={editor.selectedIds.length === 0}
          onClick={editor.duplicateSelected}
        >
          <Copy className="size-4" />
        </ToolButton>
        <ToolButton
          label="Delete"
          disabled={editor.selectedIds.length === 0}
          onClick={editor.deleteSelected}
        >
          <Trash2 className="size-4" />
        </ToolButton>

        <div className="bg-border mx-1 h-6 w-px" />

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5 px-2">
              <Hand className="size-3.5" />
              Templates
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-2">
            <div className="flex flex-col gap-1">
              {DRAWING_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className="hover:bg-muted rounded-md px-3 py-2 text-left"
                  onClick={() => editor.applyTemplate(template.id)}
                >
                  <div className="text-sm font-medium">{template.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {template.description}
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
