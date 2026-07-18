import { cn } from "@/lib/utils";
import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import type { DrawingObject } from "./drawing-document";

type DrawingPropertiesProps = {
  object: DrawingObject | null;
  onChange: (updater: (object: DrawingObject) => DrawingObject) => void;
};

const COLORS = ["#172033", "#ef4444", "#f59e0b", "#3b82f6", "#ffffff"];

export function DrawingProperties({
  object,
  onChange,
}: DrawingPropertiesProps) {
  if (!object || object.type === "image" || object.type === "person") {
    return null;
  }

  const usesFill =
    object.type === "text" ||
    object.type === "rectangle" ||
    object.type === "ellipse";
  const currentColor = object.type === "text" ? object.fill : object.stroke;

  return (
    <div className="flex max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.07)]">
      <span className="px-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
        {object.type}
      </span>
      <span className="h-5 w-px bg-slate-200" />

      <div className="flex items-center gap-1" aria-label="Color">
        {COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Use ${color}`}
            onClick={() =>
              onChange((current) => ({
                ...current,
                ...(current.type === "text"
                  ? { fill: color }
                  : { stroke: color }),
              }))
            }
            className={cn(
              "size-6 rounded-full border border-slate-200 shadow-sm transition-transform outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-red-500/40",
              currentColor === color && "ring-2 ring-red-500 ring-offset-2",
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {usesFill && object.type !== "text" ? (
        <>
          <span className="h-5 w-px bg-slate-200" />
          <button
            type="button"
            onClick={() =>
              onChange((current) => ({
                ...current,
                fill:
                  current.fill === "transparent" ? "#fff7df" : "transparent",
              }))
            }
            className="h-7 rounded-md bg-slate-50 px-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            {object.fill === "transparent" ? "Add fill" : "No fill"}
          </button>
        </>
      ) : null}

      {object.type === "text" ? (
        <>
          <span className="h-5 w-px bg-slate-200" />
          <select
            aria-label="Text size"
            value={object.fontSize}
            onChange={(event) => {
              const fontSize = Number(event.target.value);
              onChange((current) =>
                current.type === "text" ? { ...current, fontSize } : current,
              );
            }}
            className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-red-500/30"
          >
            {[44, 64, 82, 112, 144].map((size) => (
              <option key={size} value={size}>
                {size}px
              </option>
            ))}
          </select>
          <div className="flex rounded-md bg-slate-50 p-0.5">
            {(
              [
                ["left", AlignLeft],
                ["center", AlignCenter],
                ["right", AlignRight],
              ] as const
            ).map(([align, Icon]) => (
              <button
                key={align}
                type="button"
                aria-label={`Align ${align}`}
                onClick={() =>
                  onChange((current) =>
                    current.type === "text"
                      ? { ...current, textAlign: align }
                      : current,
                  )
                }
                className={cn(
                  "flex size-7 items-center justify-center rounded text-slate-500",
                  object.textAlign === align &&
                    "bg-white text-slate-900 shadow-sm",
                )}
              >
                <Icon className="size-3.5" />
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <span className="h-5 w-px bg-slate-200" />
          <div className="flex rounded-md bg-slate-50 p-0.5">
            {[3, 6, 10].map((width) => (
              <button
                key={width}
                type="button"
                aria-label={`Stroke width ${width}`}
                onClick={() =>
                  onChange((current) => ({ ...current, strokeWidth: width }))
                }
                className={cn(
                  "flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-[11px] font-semibold text-slate-500",
                  object.strokeWidth === width &&
                    "bg-white text-slate-900 shadow-sm",
                )}
              >
                {width}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
