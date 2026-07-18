import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  Circle,
  CopyPlus,
  ImagePlus,
  LayoutTemplate,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
  UserRoundPlus,
} from "lucide-react";
import type { ComponentType } from "react";
import { STARTER_TEMPLATES, type DrawingTool } from "./drawing-document";

type DrawingToolbarProps = {
  tool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  templatesOpen: boolean;
  onTemplatesOpenChange: (open: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddImage: () => void;
  onAddPerson: () => void;
  onInsertTemplate: (
    templateId: (typeof STARTER_TEMPLATES)[number]["id"],
  ) => void;
};

const TOOLS: {
  id: DrawingTool;
  label: string;
  shortcut: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { id: "select", label: "Select", shortcut: "V", icon: MousePointer2 },
  { id: "text", label: "Text", shortcut: "T", icon: Type },
  { id: "arrow", label: "Arrow", shortcut: "A", icon: ArrowUpRight },
  { id: "rectangle", label: "Rectangle", shortcut: "R", icon: Square },
  { id: "ellipse", label: "Ellipse", shortcut: "O", icon: Circle },
  { id: "pencil", label: "Pencil", shortcut: "P", icon: Pencil },
];

function Divider() {
  return <span className="mx-0.5 h-6 w-px bg-slate-200" aria-hidden />;
}

export function DrawingToolbar(props: DrawingToolbarProps) {
  return (
    <div className="relative flex max-w-[calc(100vw-2rem)] items-center gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-0.5">
        {TOOLS.map((item) => {
          const Icon = item.icon;
          const active = props.tool === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={`${item.label} (${item.shortcut})`}
              aria-pressed={active}
              title={`${item.label} · ${item.shortcut}`}
              onClick={() => props.onToolChange(item.id)}
              className={cn(
                "relative flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors outline-none hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-red-500/40",
                active &&
                  "bg-red-50 text-red-600 hover:bg-red-50 hover:text-red-600",
              )}
            >
              <Icon className="size-[17px]" />
              <span className="absolute right-1 bottom-0.5 text-[8px] font-semibold opacity-45">
                {item.shortcut}
              </span>
            </button>
          );
        })}
      </div>

      <Divider />

      <button
        type="button"
        onClick={props.onAddImage}
        className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        aria-label="Insert image"
        title="Insert image"
      >
        <ImagePlus className="size-[17px]" />
      </button>
      <button
        type="button"
        onClick={props.onAddPerson}
        className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        aria-label="Insert person placeholder"
        title="Insert person placeholder"
      >
        <UserRoundPlus className="size-[17px]" />
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => props.onTemplatesOpenChange(!props.templatesOpen)}
          className={cn(
            "flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900",
            props.templatesOpen && "bg-slate-100 text-slate-900",
          )}
          aria-label="Starter templates"
          aria-expanded={props.templatesOpen}
          title="Starter templates"
        >
          <LayoutTemplate className="size-[17px]" />
        </button>
        {props.templatesOpen ? (
          <div className="absolute top-12 right-0 z-30 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_60px_rgba(15,23,42,0.16)] sm:left-0">
            <p className="px-2 pt-1 pb-2 text-xs font-semibold text-slate-500">
              Starter layouts
            </p>
            <div className="grid gap-1">
              {STARTER_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => props.onInsertTemplate(template.id)}
                  className="rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-slate-50"
                >
                  <span className="block text-sm font-semibold text-slate-900">
                    {template.name}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {template.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <Divider />

      <button
        type="button"
        onClick={props.onUndo}
        disabled={!props.canUndo}
        className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30"
        aria-label="Undo"
        title="Undo · Cmd/Ctrl+Z"
      >
        <Undo2 className="size-[17px]" />
      </button>
      <button
        type="button"
        onClick={props.onRedo}
        disabled={!props.canRedo}
        className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30"
        aria-label="Redo"
        title="Redo · Cmd/Ctrl+Shift+Z"
      >
        <Redo2 className="size-[17px]" />
      </button>

      <Divider />

      <button
        type="button"
        onClick={props.onDuplicate}
        disabled={!props.hasSelection}
        className="hidden size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30 sm:flex"
        aria-label="Duplicate selection"
        title="Duplicate · Cmd/Ctrl+D"
      >
        <CopyPlus className="size-[17px]" />
      </button>
      <button
        type="button"
        onClick={props.onDelete}
        disabled={!props.hasSelection}
        className="hidden size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-30 sm:flex"
        aria-label="Delete selection"
        title="Delete selection"
      >
        <Trash2 className="size-[17px]" />
      </button>
    </div>
  );
}
