import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlignCenter, AlignLeft, AlignRight, Bold } from "lucide-react";

import {
  DRAWING_COLORS,
  type DrawingObject,
} from "./drawing-document";

type DrawingPropertiesProps = {
  object: DrawingObject;
  onChange: (patch: Partial<DrawingObject>) => void;
};

function getColorProperty(object: DrawingObject) {
  return object.type === "arrow" || object.type === "pencil"
    ? "stroke"
    : "fill";
}

export function DrawingProperties({
  object,
  onChange,
}: DrawingPropertiesProps) {
  const colorProperty = getColorProperty(object);
  const selectedColor = object[colorProperty];

  return (
    <aside className="bg-background w-64 rounded-2xl p-3 shadow-[0_10px_35px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium capitalize">{object.type}</p>
        <span className="text-muted-foreground text-xs">Selected</span>
      </div>

      {object.type !== "image" ? (
        <div>
          <p className="text-muted-foreground mb-2 text-xs">Color</p>
          <div className="flex flex-wrap gap-1.5">
            {DRAWING_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className="relative size-8 rounded-lg outline outline-black/10 transition-transform active:scale-[0.96] dark:outline-white/10"
                style={{ backgroundColor: color }}
                aria-label={`Use ${color}`}
                aria-pressed={selectedColor === color}
                onClick={() => onChange({ [colorProperty]: color })}
              >
                {selectedColor === color ? (
                  <span className="absolute inset-1 rounded-md border-2 border-blue-500" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {object.type === "text" ? (
        <div className="border-border mt-3 space-y-3 border-t pt-3">
          <div className="flex items-center gap-2">
            <label htmlFor="drawing-font-size" className="text-muted-foreground text-xs">
              Size
            </label>
            <Input
              id="drawing-font-size"
              type="number"
              min={16}
              max={180}
              value={Math.round(object.fontSize)}
              className="h-9 w-20 tabular-nums"
              onChange={(event) => {
                const fontSize = Number(event.target.value);
                if (Number.isFinite(fontSize) && fontSize >= 16 && fontSize <= 180) {
                  onChange({ fontSize });
                }
              }}
            />
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              variant={object.fontWeight === "bold" ? "secondary" : "ghost"}
              size="icon"
              className="size-9"
              aria-label="Bold text"
              aria-pressed={object.fontWeight === "bold"}
              onClick={() =>
                onChange({
                  fontWeight: object.fontWeight === "bold" ? "normal" : "bold",
                })
              }
            >
              <Bold className="size-4" />
            </Button>
            {([
              { value: "left", label: "Align left", icon: AlignLeft },
              { value: "center", label: "Align center", icon: AlignCenter },
              { value: "right", label: "Align right", icon: AlignRight },
            ] as const).map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                type="button"
                variant={object.textAlign === value ? "secondary" : "ghost"}
                size="icon"
                className="size-9"
                aria-label={label}
                aria-pressed={object.textAlign === value}
                onClick={() => onChange({ textAlign: value })}
              >
                <Icon className="size-4" />
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
