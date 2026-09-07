import type { Mode } from "../lib/schedule";

const SWATCHES = [
  { label: "Sleeping", className: "bg-white/[0.05] ring-1 ring-inset ring-white/5" },
  { label: "Awake", className: "bg-white/[0.14] ring-1 ring-inset ring-white/10" },
  { label: "Overlap", className: "bg-overlap/40 ring-1 ring-inset ring-overlap/60" },
];

export function Legend({ mode, referenceName }: { mode: Mode; referenceName: string | null }) {
  const hint =
    mode === "meeting"
      ? "Green cells = everyone awake"
      : `Green cells = awake at the same time as ${referenceName ?? "the reference city"}`;

  return (
    <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {SWATCHES.map((swatch) => (
          <span key={swatch.label} className="flex items-center gap-1.5 text-[11.5px] text-mute">
            <span className={`h-3 w-4 rounded-[3px] ${swatch.className}`} />
            {swatch.label}
          </span>
        ))}
      </div>
      <p className="text-[11.5px] text-mute">
        <span className="text-overlap">{hint}</span>
        <span className="mx-2 text-line">|</span>
        Click a city name to make it the reference
      </p>
    </div>
  );
}
