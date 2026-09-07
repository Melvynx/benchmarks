import { formatTimeOfDay, type TimeFormat } from "../../lib/format";
import type { CellState, HourCell } from "../../lib/schedule";
import type { City } from "../../data/cities";

/**
 * The three cell states, and the only place their look is defined — the desktop
 * and mobile layouts differ in geometry, never in meaning.
 */
export const CELL_STATE_CLASS: Record<CellState, string> = {
  sleeping: "bg-white/[0.018] text-faint",
  awake: "bg-white/[0.06] text-ink/75",
  overlap:
    "bg-overlap/[0.16] text-overlap font-semibold ring-1 ring-inset ring-overlap/40 " +
    "shadow-[0_0_18px_-8px_var(--color-overlap)]",
};

/** Human-readable description used for tooltips and screen readers. */
export function describeCell(city: City, cell: HourCell, format: TimeFormat): string {
  const time = formatTimeOfDay(cell.localHour, cell.localMinute, format);
  const day = cell.dayDelta > 0 ? " (next day)" : cell.dayDelta < 0 ? " (previous day)" : "";
  const state =
    cell.state === "overlap" ? "overlap" : cell.state === "awake" ? "awake" : "asleep";
  return `${city.name} · ${time}${day} · ${state}`;
}
