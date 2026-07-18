import { Button } from "@/components/ui/button";
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
import {
  ArrowUpRight,
  Circle,
  ImagePlus,
  LayoutTemplate,
  MousePointer2,
  Pencil,
  RectangleHorizontal,
  Type,
  UserRoundPlus,
} from "lucide-react";
import type { ComponentType } from "react";

export type DrawingTool =
  | "select"
  | "text"
  | "arrow"
  | "rect"
  | "ellipse"
  | "pencil";

type ToolItem = {
  id: DrawingTool;
  label: string;
  shortcut: string;
  icon: ComponentType<{ className?: string }>;
};

const toolItems: ToolItem[] = [
  {
    id: "select",
    label: "Select and move",
    shortcut: "V",
    icon: MousePointer2,
  },
  { id: "text", label: "Text", shortcut: "T", icon: Type },
  { id: "arrow", label: "Arrow", shortcut: "A", icon: ArrowUpRight },
  {
    id: "rect",
    label: "Rectangle",
    shortcut: "R",
    icon: RectangleHorizontal,
  },
  { id: "ellipse", label: "Ellipse", shortcut: "O", icon: Circle },
  { id: "pencil", label: "Pencil", shortcut: "P", icon: Pencil },
];

type TemplateOption = {
  id: string;
  name: string;
  description: string;
};

type DrawingToolbarProps = {
  tool: DrawingTool;
  templates: TemplateOption[];
  disabled?: boolean;
  onToolChange: (tool: DrawingTool) => void;
  onInsertImage: () => void;
  onInsertPerson: () => void;
  onApplyTemplate: (templateId: string) => void;
};

export function DrawingToolbar({
  tool,
  templates,
  disabled = false,
  onToolChange,
  onInsertImage,
  onInsertPerson,
  onApplyTemplate,
}: DrawingToolbarProps) {
  return (
    <div className="bg-background/95 flex items-center gap-1 rounded-xl p-1.5 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]">
      {toolItems.map((item) => {
        const Icon = item.icon;
        const selected = tool === item.id;

        return (
          <Tooltip key={item.id} delayDuration={350}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant={selected ? "secondary" : "ghost"}
                className="size-10 rounded-lg transition-transform active:scale-[0.96]"
                aria-label={`${item.label} (${item.shortcut})`}
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => onToolChange(item.id)}
              >
                <Icon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="flex items-center gap-2">
              <span>{item.label}</span>
              <kbd className="text-muted-foreground text-[10px]">
                {item.shortcut}
              </kbd>
            </TooltipContent>
          </Tooltip>
        );
      })}

      <span className="bg-border mx-0.5 h-6 w-px" aria-hidden="true" />

      <ToolbarAction
        label="Insert image"
        icon={ImagePlus}
        onClick={onInsertImage}
        disabled={disabled}
      />
      <ToolbarAction
        label="Insert person placeholder"
        icon={UserRoundPlus}
        onClick={onInsertPerson}
        disabled={disabled}
      />

      <DropdownMenu>
        <Tooltip delayDuration={350}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-10 rounded-lg transition-transform active:scale-[0.96]"
                aria-label="Starter templates"
                disabled={disabled}
              >
                <LayoutTemplate className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Starter templates</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Start with a layout</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {templates.map((template) => (
            <DropdownMenuItem
              key={template.id}
              className="flex cursor-pointer flex-col items-start gap-0.5 py-2"
              onClick={() => onApplyTemplate(template.id)}
            >
              <span className="text-sm font-medium">{template.name}</span>
              <span className="text-muted-foreground text-xs font-normal">
                {template.description}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ToolbarAction({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <Tooltip delayDuration={350}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-10 rounded-lg transition-transform active:scale-[0.96]"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          <Icon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
