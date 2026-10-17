import { cn } from "@/lib/cn";
import type { Mode } from "@/lib/overlap";

const SWATCHES = [
  { label: "Asleep", className: "bg-sleep ring-1 ring-line-strong/60 ring-inset" },
  { label: "Awake", className: "bg-awake ring-1 ring-awake-line ring-inset" },
  { label: "Overlap", className: "bg-overlap" },
] as const;

export function Legend({ mode, referenceName }: { mode: Mode; referenceName: string | undefined }) {
  const hint =
    mode === "meeting"
      ? "Green cells = everyone awake"
      : `Green cells = awake at the same time as ${referenceName ?? "the reference city"}`;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <span aria-hidden className="size-3 rounded-[4px] bg-overlap" />
        {hint}
      </p>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-2" aria-label="Legend">
        {SWATCHES.map((swatch) => (
          <li key={swatch.label} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("h-3 w-5 rounded-[4px]", swatch.className)} />
            {swatch.label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-0.5 rounded-full bg-now" />
          Now
        </li>
      </ul>
    </div>
  );
}
