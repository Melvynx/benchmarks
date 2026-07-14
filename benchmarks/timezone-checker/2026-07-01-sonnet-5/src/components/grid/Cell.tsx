import type { CellState } from "../../lib/types";

const STATE_CLASSES: Record<CellState, string> = {
  sleeping: "bg-base-800/50 text-base-500",
  awake: "bg-base-700/60 text-base-200",
  overlap: "bg-overlap-500 text-base-950 font-semibold ring-1 ring-overlap-400/70",
};

export function Cell({ state, label }: { state: CellState; label: string }) {
  return (
    <div
      className={`tabular flex items-center justify-center rounded-md py-2 text-[11px] leading-none transition-colors ${STATE_CLASSES[state]}`}
    >
      {label}
    </div>
  );
}
