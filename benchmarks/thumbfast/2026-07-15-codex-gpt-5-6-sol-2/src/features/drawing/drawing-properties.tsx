import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlignCenter, AlignLeft, AlignRight, Copy, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type { DrawingObject } from "./drawing-document";

const drawingColors = ["#111827", "#ffffff", "#ef4444", "#facc15", "#3b82f6"];

type DrawingPropertiesProps = {
  object: DrawingObject;
  disabled?: boolean;
  onChange: (object: DrawingObject) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export function DrawingProperties({
  object,
  disabled = false,
  onChange,
  onDuplicate,
  onDelete,
}: DrawingPropertiesProps) {
  const setOpacity = (opacity: number) => {
    onChange({ ...object, opacity } as DrawingObject);
  };

  const setColor = (color: string) => {
    if (object.type === "text") {
      onChange({ ...object, color });
    } else if (object.type === "arrow" || object.type === "pencil") {
      onChange({ ...object, stroke: color });
    } else if (
      object.type === "rect" ||
      object.type === "ellipse" ||
      object.type === "person"
    ) {
      onChange({ ...object, fill: color });
    }
  };

  const activeColor =
    object.type === "text"
      ? object.color
      : object.type === "arrow" || object.type === "pencil"
        ? object.stroke
        : object.type === "rect" ||
            object.type === "ellipse" ||
            object.type === "person"
          ? object.fill
          : null;

  return (
    <aside className="bg-background/95 w-60 rounded-xl p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_12px_32px_rgba(0,0,0,0.1)] backdrop-blur-md dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium capitalize">
            {object.type === "rect" ? "Rectangle" : object.type}
          </p>
          <p className="text-muted-foreground text-[11px]">Selected object</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-9 transition-transform active:scale-[0.96]"
            aria-label="Duplicate selected object"
            disabled={disabled}
            onClick={onDuplicate}
          >
            <Copy className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-destructive hover:text-destructive size-9 transition-transform active:scale-[0.96]"
            aria-label="Delete selected object"
            disabled={disabled}
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {activeColor ? (
        <PropertyGroup label={object.type === "text" ? "Text color" : "Color"}>
          <div className="flex items-center gap-2">
            {drawingColors.map((color) => (
              <button
                key={color}
                type="button"
                className={cn(
                  "relative size-7 rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.14)] after:absolute after:-inset-1.5 after:rounded-full",
                  activeColor === color &&
                    "ring-primary ring-offset-background ring-2 ring-offset-2",
                )}
                style={{ backgroundColor: color }}
                aria-label={`Use ${color}`}
                aria-pressed={activeColor === color}
                disabled={disabled}
                onClick={() => setColor(color)}
              />
            ))}
          </div>
        </PropertyGroup>
      ) : null}

      {object.type === "text" ? (
        <>
          <PropertyGroup label="Size">
            <div className="flex items-center gap-3">
              <input
                type="range"
                aria-label="Text size"
                min={24}
                max={128}
                step={2}
                value={object.fontSize}
                disabled={disabled}
                className="accent-primary min-w-0 flex-1"
                onChange={(event) =>
                  onChange({
                    ...object,
                    fontSize: Number(event.target.value),
                  })
                }
              />
              <span className="text-muted-foreground w-8 text-right text-xs tabular-nums">
                {object.fontSize}
              </span>
            </div>
          </PropertyGroup>
          <PropertyGroup label="Align">
            <div className="bg-muted grid grid-cols-3 rounded-lg p-1">
              {(
                [
                  ["left", AlignLeft],
                  ["center", AlignCenter],
                  ["right", AlignRight],
                ] as const
              ).map(([align, Icon]) => (
                <Button
                  key={align}
                  type="button"
                  size="icon"
                  variant={object.align === align ? "secondary" : "ghost"}
                  className="h-8 w-full rounded-md"
                  aria-label={`Align ${align}`}
                  aria-pressed={object.align === align}
                  disabled={disabled}
                  onClick={() => onChange({ ...object, align })}
                >
                  <Icon className="size-3.5" />
                </Button>
              ))}
            </div>
          </PropertyGroup>
        </>
      ) : null}

      {object.type === "image" ? (
        <PropertyGroup label="Image fit">
          <div className="bg-muted grid grid-cols-2 rounded-lg p-1">
            {(["cover", "contain"] as const).map((fit) => (
              <Button
                key={fit}
                type="button"
                size="sm"
                variant={object.fit === fit ? "secondary" : "ghost"}
                className="h-8 capitalize"
                aria-label={`Use ${fit} image fit`}
                aria-pressed={object.fit === fit}
                disabled={disabled}
                onClick={() => onChange({ ...object, fit })}
              >
                {fit}
              </Button>
            ))}
          </div>
        </PropertyGroup>
      ) : null}

      <PropertyGroup label="Opacity">
        <div className="flex items-center gap-3">
          <input
            type="range"
            aria-label="Object opacity"
            min={0.1}
            max={1}
            step={0.05}
            value={object.opacity}
            disabled={disabled}
            className="accent-primary min-w-0 flex-1"
            onChange={(event) => setOpacity(Number(event.target.value))}
          />
          <span className="text-muted-foreground w-9 text-right text-xs tabular-nums">
            {Math.round(object.opacity * 100)}%
          </span>
        </div>
      </PropertyGroup>
    </aside>
  );
}

function PropertyGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-border border-t py-3 first:border-t-0">
      <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
        {label}
      </p>
      {children}
    </div>
  );
}
