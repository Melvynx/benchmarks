import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DrawingElement, TextElement } from "./drawing.schema";

const COLORS = ["#1a1a1a", "#ffffff", "#dc2626", "#2563eb", "#16a34a", "transparent"];

type DrawingPropertiesProps = {
  elements: DrawingElement[];
  onChange: (patch: Partial<DrawingElement> & { fontSize?: number }) => void;
};

export function DrawingProperties({ elements, onChange }: DrawingPropertiesProps) {
  if (elements.length !== 1) return null;
  const element = elements[0];
  const isText = element.type === "text";

  return (
    <aside className="bg-background/95 pointer-events-auto w-52 rounded-lg border p-3 shadow-sm">
      <p className="mb-3 text-xs font-medium tracking-wide uppercase">
        {element.type}
      </p>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Stroke</Label>
          <div className="flex flex-wrap gap-1">
            {COLORS.map((color) => (
              <button
                key={`stroke-${color}`}
                type="button"
                aria-label={`Stroke ${color}`}
                onClick={() => onChange({ stroke: color })}
                className="size-5 rounded-full border"
                style={{
                  background:
                    color === "transparent"
                      ? "repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 8px 8px"
                      : color,
                  outline:
                    element.stroke === color ? "2px solid #2563eb" : undefined,
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Fill</Label>
          <div className="flex flex-wrap gap-1">
            {COLORS.map((color) => (
              <button
                key={`fill-${color}`}
                type="button"
                aria-label={`Fill ${color}`}
                onClick={() => onChange({ fill: color })}
                className="size-5 rounded-full border"
                style={{
                  background:
                    color === "transparent"
                      ? "repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 8px 8px"
                      : color,
                  outline:
                    element.fill === color ? "2px solid #2563eb" : undefined,
                }}
              />
            ))}
          </div>
        </div>
        {isText ? (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs" htmlFor="drawing-font-size">
              Size
            </Label>
            <Input
              id="drawing-font-size"
              type="number"
              min={12}
              max={200}
              value={Math.round((element as TextElement).fontSize)}
              onChange={(event) =>
                onChange({
                  fontSize: Number(event.target.value) || 12,
                } as Partial<TextElement>)
              }
              className="h-8"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs" htmlFor="drawing-stroke-width">
              Thickness
            </Label>
            <Input
              id="drawing-stroke-width"
              type="number"
              min={1}
              max={24}
              value={element.strokeWidth}
              onChange={(event) =>
                onChange({ strokeWidth: Number(event.target.value) || 1 })
              }
              className="h-8"
            />
          </div>
        )}
      </div>
    </aside>
  );
}
