import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowUpRight,
  Circle,
  ImageIcon,
  LayoutTemplate,
  MousePointer2,
  Pencil,
  Square,
  Type,
  UserRound,
} from "lucide-react";

import { DRAWING_TEMPLATES, type DrawingTemplateId } from "./drawing.templates";
import type { DrawingTool } from "./drawing.schema";

const TOOLS: { id: DrawingTool; label: string; shortcut: string; icon: typeof Type }[] =
  [
    { id: "select", label: "Select", shortcut: "V", icon: MousePointer2 },
    { id: "text", label: "Text", shortcut: "T", icon: Type },
    { id: "arrow", label: "Arrow", shortcut: "A", icon: ArrowUpRight },
    { id: "rect", label: "Rectangle", shortcut: "R", icon: Square },
    { id: "ellipse", label: "Circle", shortcut: "O", icon: Circle },
    { id: "pencil", label: "Pencil", shortcut: "P", icon: Pencil },
  ];

type DrawingToolbarProps = {
  tool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onInsertPerson: () => void;
  onInsertImage: () => void;
  onInsertTemplate: (id: DrawingTemplateId) => void;
};

export function DrawingToolbar({
  tool,
  onToolChange,
  onInsertPerson,
  onInsertImage,
  onInsertTemplate,
}: DrawingToolbarProps) {
  return (
    <div className="bg-background/95 pointer-events-auto flex items-center gap-1 rounded-lg border px-1.5 py-1 shadow-sm">
      <ToggleGroup
        type="single"
        value={tool}
        onValueChange={(value) => {
          if (value) onToolChange(value as DrawingTool);
        }}
        variant="outline"
        size="sm"
        className="gap-0.5 border-none shadow-none"
      >
        {TOOLS.map((item) => (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value={item.id}
                aria-label={item.label}
                className="size-8 p-0"
              >
                <item.icon className="size-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>
              {item.label} {item.shortcut}
            </TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon-sm"
            variant={tool === "person" ? "secondary" : "ghost"}
            onClick={onInsertPerson}
            aria-label="Insert person placeholder"
          >
            <UserRound className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Person placeholder</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onInsertImage}
            aria-label="Insert image"
          >
            <ImageIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Insert image</TooltipContent>
      </Tooltip>

      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Insert template"
              >
                <LayoutTemplate className="size-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Templates</TooltipContent>
        </Tooltip>
        <PopoverContent align="center" className="w-64 p-2">
          <div className="flex flex-col gap-1">
            {DRAWING_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onInsertTemplate(template.id)}
                className="hover:bg-accent rounded-md px-2 py-1.5 text-left"
              >
                <div className="text-sm font-medium">{template.label}</div>
                <div className="text-muted-foreground text-xs">
                  {template.description}
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
