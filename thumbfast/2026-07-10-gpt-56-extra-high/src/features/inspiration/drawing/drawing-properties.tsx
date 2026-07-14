import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlignCenter, AlignLeft, AlignRight, Copy, Trash2 } from "lucide-react";
import type { DrawingObject } from "./drawing-document";

type DrawingPropertiesProps = {
  selectedObject: DrawingObject | null;
  background: string;
  disabled?: boolean;
  onObjectChange: (object: DrawingObject) => void;
  onObjectPreview: (object: DrawingObject) => void;
  onPropertyChangeStart: () => void;
  onPropertyChangeEnd: () => void;
  onBackgroundChange: (color: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

function objectLabel(object: DrawingObject) {
  switch (object.type) {
    case "rectangle":
      return "Rectangle";
    case "ellipse":
      return "Ellipse";
    case "arrow":
      return "Arrow";
    case "path":
      return "Pencil stroke";
    case "text":
      return "Text";
    case "image":
      return "Image";
    case "person":
      return "Person placeholder";
  }
}

function primaryColor(object: DrawingObject) {
  switch (object.type) {
    case "rectangle":
    case "ellipse":
      return object.stroke;
    case "arrow":
    case "path":
    case "text":
      return object.color;
    case "person":
      return object.stroke;
    case "image":
      return null;
  }
}

function updatePrimaryColor(
  object: DrawingObject,
  value: string,
): DrawingObject {
  switch (object.type) {
    case "rectangle":
    case "ellipse":
      return { ...object, stroke: value };
    case "arrow":
    case "path":
    case "text":
      return { ...object, color: value };
    case "person":
      return { ...object, stroke: value };
    case "image":
      return object;
  }
}

function objectHasFill(
  object: DrawingObject,
): object is Extract<DrawingObject, { type: "rectangle" | "ellipse" }> {
  return object.type === "rectangle" || object.type === "ellipse";
}

function objectHasStrokeWidth(
  object: DrawingObject,
): object is Extract<
  DrawingObject,
  { type: "rectangle" | "ellipse" | "arrow" | "path" }
> {
  return (
    object.type === "rectangle" ||
    object.type === "ellipse" ||
    object.type === "arrow" ||
    object.type === "path"
  );
}

function ColorControl({
  label,
  value,
  disabled,
  onChange,
  onChangeStart,
  onChangeEnd,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onChangeStart: () => void;
  onChangeEnd: () => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-medium">
      <span className="text-muted-foreground">{label}</span>
      <span className="relative size-7 overflow-hidden rounded-md border shadow-xs">
        <input
          type="color"
          value={value}
          disabled={disabled}
          aria-label={label}
          onFocus={onChangeStart}
          onPointerDown={onChangeStart}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onChangeEnd}
          className="absolute -inset-2 size-11 cursor-pointer border-0 bg-transparent p-0"
        />
      </span>
    </label>
  );
}

export function DrawingProperties({
  selectedObject,
  background,
  disabled = false,
  onObjectChange,
  onObjectPreview,
  onPropertyChangeStart,
  onPropertyChangeEnd,
  onBackgroundChange,
  onDuplicate,
  onDelete,
}: DrawingPropertiesProps) {
  if (!selectedObject) {
    return (
      <div className="flex h-11 items-center rounded-xl border border-black/10 bg-white px-3 shadow-sm dark:border-white/10 dark:bg-neutral-900">
        <ColorControl
          label="Canvas"
          value={background}
          disabled={disabled}
          onChange={onBackgroundChange}
          onChangeStart={onPropertyChangeStart}
          onChangeEnd={onPropertyChangeEnd}
        />
      </div>
    );
  }

  const color = primaryColor(selectedObject);
  const filledObject = objectHasFill(selectedObject) ? selectedObject : null;
  const strokedObject = objectHasStrokeWidth(selectedObject)
    ? selectedObject
    : null;

  return (
    <div className="flex max-w-[calc(100vw-2rem)] items-center gap-3 overflow-x-auto rounded-xl border border-black/10 bg-white p-1.5 pl-3 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <span className="shrink-0 text-xs font-semibold">
        {objectLabel(selectedObject)}
      </span>

      {color ? (
        <ColorControl
          label={selectedObject.type === "text" ? "Text" : "Stroke"}
          value={color}
          disabled={disabled}
          onChange={(value) =>
            onObjectPreview(updatePrimaryColor(selectedObject, value))
          }
          onChangeStart={onPropertyChangeStart}
          onChangeEnd={onPropertyChangeEnd}
        />
      ) : null}

      {filledObject ? (
        <ColorControl
          label="Fill"
          value={filledObject.fill}
          disabled={disabled}
          onChange={(value) =>
            onObjectPreview({ ...filledObject, fill: value })
          }
          onChangeStart={onPropertyChangeStart}
          onChangeEnd={onPropertyChangeEnd}
        />
      ) : null}

      {strokedObject ? (
        <label className="flex shrink-0 items-center gap-2 text-xs font-medium">
          <span className="text-muted-foreground">Width</span>
          <input
            type="range"
            min={2}
            max={24}
            step={1}
            disabled={disabled}
            value={strokedObject.strokeWidth}
            onFocus={onPropertyChangeStart}
            onPointerDown={onPropertyChangeStart}
            onChange={(event) =>
              onObjectPreview({
                ...strokedObject,
                strokeWidth: Number(event.target.value),
              })
            }
            onPointerUp={onPropertyChangeEnd}
            onPointerCancel={onPropertyChangeEnd}
            onBlur={onPropertyChangeEnd}
            className="w-20 accent-neutral-900 dark:accent-white"
          />
        </label>
      ) : null}

      {selectedObject.type === "text" ? (
        <>
          <label className="flex shrink-0 items-center gap-2 text-xs font-medium">
            <span className="text-muted-foreground">Size</span>
            <input
              type="range"
              min={12}
              max={240}
              step={2}
              aria-label="Font size"
              disabled={disabled}
              value={selectedObject.fontSize}
              onFocus={onPropertyChangeStart}
              onPointerDown={onPropertyChangeStart}
              onChange={(event) =>
                onObjectPreview({
                  ...selectedObject,
                  fontSize: Number(event.target.value),
                })
              }
              onPointerUp={onPropertyChangeEnd}
              onPointerCancel={onPropertyChangeEnd}
              onBlur={onPropertyChangeEnd}
              className="w-20 accent-neutral-900 dark:accent-white"
            />
            <span className="w-7 text-right tabular-nums">
              {selectedObject.fontSize}
            </span>
          </label>
          <div className="flex items-center rounded-md border p-0.5">
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
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                aria-label={`Align ${align}`}
                aria-pressed={selectedObject.align === align}
                onClick={() => onObjectChange({ ...selectedObject, align })}
                className={cn(
                  "size-7",
                  selectedObject.align === align && "bg-accent",
                )}
              >
                <Icon className="size-3.5" />
              </Button>
            ))}
          </div>
        </>
      ) : null}

      {selectedObject.type === "image" ? (
        <div className="flex items-center rounded-md border p-0.5">
          {(["cover", "contain"] as const).map((fit) => (
            <Button
              key={fit}
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              aria-pressed={selectedObject.fit === fit}
              onClick={() => onObjectChange({ ...selectedObject, fit })}
              className={cn(
                "h-7 px-2 text-xs capitalize",
                selectedObject.fit === fit && "bg-accent",
              )}
            >
              {fit}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-1 border-l pl-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label="Duplicate selected object"
          onClick={onDuplicate}
        >
          <Copy className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label="Delete selected object"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
