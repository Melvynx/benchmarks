import { cn } from "@/lib/cn";
import type { Mode } from "@/lib/schedule";

const ITEMS = [
  { label: "Overlap", swatch: "bg-overlap" },
  { label: "Awake", swatch: "bg-awake ring-1 ring-inset ring-line-strong" },
  { label: "Asleep", swatch: "border border-dashed border-ink-3/60" },
  { label: "Now", swatch: "w-0.5 bg-now" },
] as const;

export function Legend({ mode, referenceName }: { mode: Mode; referenceName: string | undefined }) {
  return (
    <footer className="flex flex-col items-center gap-3 text-xs text-ink-2 sm:flex-row sm:justify-between">
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <span aria-hidden className="size-3 rounded-[4px] bg-overlap" />
        {mode === "meeting" || !referenceName
          ? "Green cells = everyone awake"
          : `Green cells = awake at the same time as ${referenceName}`}
      </p>
      <ul className="flex items-center gap-4" aria-label="Legend">
        {ITEMS.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("h-3 w-4 rounded-[4px]", item.swatch)} />
            {item.label}
          </li>
        ))}
      </ul>
    </footer>
  );
}
