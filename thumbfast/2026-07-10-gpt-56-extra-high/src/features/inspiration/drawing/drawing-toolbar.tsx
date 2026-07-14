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
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  Circle,
  ImagePlus,
  LayoutTemplate,
  Loader2,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  Type,
  Undo2,
  UserRoundPlus,
  type LucideIcon,
} from "lucide-react";
import {
  DRAWING_TEMPLATES,
  type DrawingTemplateId,
  type DrawingTool,
} from "./drawing-document";

type DrawingToolbarProps = {
  tool: DrawingTool;
  canUndo: boolean;
  canRedo: boolean;
  isUploadingImage: boolean;
  disabled?: boolean;
  onToolChange: (tool: DrawingTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onInsertImage: () => void;
  onInsertPerson: () => void;
  onApplyTemplate: (templateId: DrawingTemplateId) => void;
};

const tools: readonly {
  id: DrawingTool;
  label: string;
  shortcut: string;
  icon: LucideIcon;
}[] = [
  { id: "select", label: "Select", shortcut: "V", icon: MousePointer2 },
  { id: "text", label: "Text", shortcut: "T", icon: Type },
  { id: "arrow", label: "Arrow", shortcut: "A", icon: ArrowUpRight },
  { id: "rectangle", label: "Rectangle", shortcut: "R", icon: Square },
  { id: "ellipse", label: "Ellipse", shortcut: "O", icon: Circle },
  { id: "pencil", label: "Pencil", shortcut: "P", icon: Pencil },
];

function ToolbarButton({
  label,
  shortcut,
  icon: Icon,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  shortcut?: string;
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant={active ? "secondary" : "ghost"}
          disabled={disabled}
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          className={cn(
            "size-11 rounded-lg sm:size-10",
            active && "bg-neutral-200 text-neutral-950 dark:bg-neutral-700",
          )}
        >
          <Icon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8}>
        <span>{label}</span>
        {shortcut ? <span className="ml-2 opacity-60">{shortcut}</span> : null}
      </TooltipContent>
    </Tooltip>
  );
}

export function DrawingToolbar({
  tool,
  canUndo,
  canRedo,
  isUploadingImage,
  disabled = false,
  onToolChange,
  onUndo,
  onRedo,
  onInsertImage,
  onInsertPerson,
  onApplyTemplate,
}: DrawingToolbarProps) {
  return (
    <div className="flex max-w-[calc(100vw-2rem)] items-center gap-1 overflow-x-auto rounded-xl border border-black/10 bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-neutral-900">
      <ToolbarButton
        label="Undo"
        shortcut="⌘Z"
        icon={Undo2}
        disabled={disabled || !canUndo}
        onClick={onUndo}
      />
      <ToolbarButton
        label="Redo"
        shortcut="⇧⌘Z"
        icon={Redo2}
        disabled={disabled || !canRedo}
        onClick={onRedo}
      />

      <div className="mx-1 h-6 w-px shrink-0 bg-neutral-200 dark:bg-neutral-700" />

      {tools.map((item) => (
        <ToolbarButton
          key={item.id}
          label={item.label}
          shortcut={item.shortcut}
          icon={item.icon}
          active={tool === item.id}
          disabled={disabled}
          onClick={() => onToolChange(item.id)}
        />
      ))}

      <div className="mx-1 h-6 w-px shrink-0 bg-neutral-200 dark:bg-neutral-700" />

      <ToolbarButton
        label="Insert image"
        shortcut="I"
        icon={isUploadingImage ? Loader2 : ImagePlus}
        disabled={disabled || isUploadingImage}
        onClick={onInsertImage}
      />
      <ToolbarButton
        label="Insert person placeholder"
        shortcut="S"
        icon={UserRoundPlus}
        disabled={disabled}
        onClick={onInsertPerson}
      />

      <DropdownMenu>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={disabled}
                aria-label="Starter templates"
                className="size-11 rounded-lg sm:size-10"
              >
                <LayoutTemplate className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={8}>
            Starter templates
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Starter templates</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {DRAWING_TEMPLATES.map((template) => (
            <DropdownMenuItem
              key={template.id}
              onSelect={() => onApplyTemplate(template.id)}
              className="flex cursor-pointer flex-col items-start gap-0.5 py-2"
            >
              <span className="font-medium">{template.name}</span>
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
