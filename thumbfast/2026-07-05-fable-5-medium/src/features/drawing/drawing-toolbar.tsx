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
import { cn } from "@/lib/utils";
import {
  Circle,
  Copy,
  ImagePlus,
  LayoutTemplate,
  MousePointer2,
  MoveDown,
  MoveUp,
  MoveUpRight,
  Pencil,
  Square,
  Trash2,
  Type,
  User,
} from "lucide-react";
import type { DrawingTool } from "./drawing-state";
import type { DrawingTemplate } from "./drawing-templates";
import { DRAWING_TEMPLATES } from "./drawing-templates";
import {
  DRAWING_FILL_COLORS,
  DRAWING_FONT_SIZES,
  DRAWING_STROKE_COLORS,
  DRAWING_STROKE_WIDTHS,
} from "./drawing.schema";

const TOOL_BUTTONS: {
  tool: DrawingTool;
  label: string;
  shortcut: string;
  icon: typeof MousePointer2;
}[] = [
  { tool: "select", label: "Select", shortcut: "V", icon: MousePointer2 },
  { tool: "rectangle", label: "Rectangle", shortcut: "R", icon: Square },
  { tool: "ellipse", label: "Ellipse", shortcut: "O", icon: Circle },
  { tool: "arrow", label: "Arrow", shortcut: "A", icon: MoveUpRight },
  { tool: "freedraw", label: "Draw", shortcut: "P", icon: Pencil },
  { tool: "text", label: "Text", shortcut: "T", icon: Type },
];

type DrawingToolbarProps = {
  tool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onInsertImage: () => void;
  onInsertPerson: () => void;
  onInsertTemplate: (template: DrawingTemplate) => void;
};

function ToolButton({
  label,
  shortcut,
  active,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          className={cn(
            "size-9 rounded-lg",
            active &&
              "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary",
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="flex items-center gap-1.5">
        {label}
        {shortcut ? (
          <span className="text-muted-foreground text-[10px]">{shortcut}</span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

export function DrawingToolbar({
  tool,
  onToolChange,
  onInsertImage,
  onInsertPerson,
  onInsertTemplate,
}: DrawingToolbarProps) {
  return (
    <div className="bg-background pointer-events-auto flex items-center gap-0.5 rounded-xl border p-1 shadow-sm">
      {TOOL_BUTTONS.map(({ tool: itemTool, label, shortcut, icon: Icon }) => (
        <ToolButton
          key={itemTool}
          label={label}
          shortcut={shortcut}
          active={tool === itemTool}
          onClick={() => onToolChange(itemTool)}
        >
          <Icon className="size-4" />
        </ToolButton>
      ))}
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolButton label="Insert image" onClick={onInsertImage}>
        <ImagePlus className="size-4" />
      </ToolButton>
      <ToolButton label="Person placeholder" onClick={onInsertPerson}>
        <User className="size-4" />
      </ToolButton>
      <DropdownMenu>
        <Tooltip delayDuration={400}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Templates"
                className="size-9 rounded-lg"
              >
                <LayoutTemplate className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Templates</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="center" className="w-64">
          {DRAWING_TEMPLATES.map((template) => (
            <DropdownMenuItem
              key={template.key}
              onClick={() => onInsertTemplate(template)}
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
    </div>
  );
}

type DrawingPropertiesProps = {
  stroke: string;
  fill: string;
  strokeWidth: number;
  fontSize: number;
  showFill: boolean;
  showStrokeWidth: boolean;
  showFontSize: boolean;
  hasSelection: boolean;
  onStrokeChange: (stroke: string) => void;
  onFillChange: (fill: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onFontSizeChange: (size: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
};

function ColorSwatch({
  color,
  active,
  onClick,
  label,
}: {
  color: string;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  const isTransparent = color === "transparent";
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "size-6 rounded-md border transition-transform",
        active
          ? "border-primary ring-primary/40 scale-110 ring-2"
          : "border-border hover:scale-105",
      )}
      style={
        isTransparent
          ? {
              backgroundImage:
                "linear-gradient(45deg, #d0d0d0 25%, transparent 25%, transparent 75%, #d0d0d0 75%), linear-gradient(45deg, #d0d0d0 25%, #fff 25%, #fff 75%, #d0d0d0 75%)",
              backgroundSize: "8px 8px",
              backgroundPosition: "0 0, 4px 4px",
            }
          : { backgroundColor: color }
      }
    />
  );
}

function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-muted-foreground text-[11px] font-medium">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

export function DrawingProperties({
  stroke,
  fill,
  strokeWidth,
  fontSize,
  showFill,
  showStrokeWidth,
  showFontSize,
  hasSelection,
  onStrokeChange,
  onFillChange,
  onStrokeWidthChange,
  onFontSizeChange,
  onDuplicate,
  onDelete,
  onBringForward,
  onSendBackward,
}: DrawingPropertiesProps) {
  const sizeLabels = ["S", "M", "L"];
  return (
    <div className="bg-background pointer-events-auto flex w-44 flex-col gap-3 rounded-xl border p-3 shadow-sm">
      <PropertyRow label="Stroke">
        {DRAWING_STROKE_COLORS.map((color) => (
          <ColorSwatch
            key={color}
            color={color}
            label={`Stroke ${color}`}
            active={stroke === color}
            onClick={() => onStrokeChange(color)}
          />
        ))}
      </PropertyRow>

      {showFill ? (
        <PropertyRow label="Fill">
          {DRAWING_FILL_COLORS.map((color) => (
            <ColorSwatch
              key={color}
              color={color}
              label={`Fill ${color}`}
              active={fill === color}
              onClick={() => onFillChange(color)}
            />
          ))}
        </PropertyRow>
      ) : null}

      {showStrokeWidth ? (
        <PropertyRow label="Stroke width">
          {DRAWING_STROKE_WIDTHS.map((width, index) => (
            <Button
              key={width}
              variant={strokeWidth === width ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-9 px-0 text-xs"
              onClick={() => onStrokeWidthChange(width)}
            >
              {sizeLabels[index]}
            </Button>
          ))}
        </PropertyRow>
      ) : null}

      {showFontSize ? (
        <PropertyRow label="Font size">
          {DRAWING_FONT_SIZES.map((size, index) => (
            <Button
              key={size}
              variant={fontSize === size ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-9 px-0 text-xs"
              onClick={() => onFontSizeChange(size)}
            >
              {sizeLabels[index]}
            </Button>
          ))}
        </PropertyRow>
      ) : null}

      {hasSelection ? (
        <>
          <Separator />
          <div className="flex items-center gap-1">
            <Tooltip delayDuration={400}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Duplicate"
                  onClick={onDuplicate}
                >
                  <Copy className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Duplicate</TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={400}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Bring forward"
                  onClick={onBringForward}
                >
                  <MoveUp className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Bring forward</TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={400}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Send backward"
                  onClick={onSendBackward}
                >
                  <MoveDown className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Send backward</TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={400}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive size-7"
                  aria-label="Delete"
                  onClick={onDelete}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Delete</TooltipContent>
            </Tooltip>
          </div>
        </>
      ) : null}
    </div>
  );
}
