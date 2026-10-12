import type { PlannerView } from "@/hooks/usePlannerView";
import { cn } from "@/lib/cn";
import type { CellState } from "@/lib/schedule";
import { formatClock, formatHour, MINUTES_PER_DAY, weekdayOf } from "@/lib/time";

const DOT_CLASS: Record<CellState, string> = {
  overlap: "bg-overlap ring-overlap-strong/50",
  awake: "bg-ink-3 ring-ink-3",
  sleeping: "bg-transparent ring-ink-3/70",
};

/** Read-out of one column: what time it is in every city at the hovered (or current) hour. */
export function ColumnInspector({ view, hour, isNow }: { view: PlannerView; hour: number; isNow: boolean }) {
  const { schedule, settings, reference, referenceNow } = view;
  if (!reference || !referenceNow) return null;
  const format = settings.timeFormat;

  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 lg:flex-row lg:items-center lg:gap-5">
      <p className="shrink-0 text-sm whitespace-nowrap text-ink-2 lg:min-w-[196px]">
        {isNow ? <span className="mr-1.5 font-semibold text-now">Now</span> : null}
        <span className="font-mono font-semibold text-ink tabular-nums">
          {isNow ? formatClock(referenceNow.hour * 60 + referenceNow.minute, format) : formatHour(hour, format)}
        </span>{" "}
        in {reference.name}
      </p>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
        {schedule.rows.slice(1).map((row) => {
          const cell = row.cells[hour];
          if (!cell) return null;
          const minutes = isNow ? cell.localMinutes + referenceNow.minute : cell.localMinutes;
          const dayOffset = cell.dayOffset + Math.floor(minutes / MINUTES_PER_DAY);
          return (
            <li key={row.city.id} className="flex items-center gap-2 text-sm">
              <span aria-hidden className={cn("size-2.5 rounded-full ring-1", DOT_CLASS[cell.state])} />
              <span className="text-ink-2">{row.city.name}</span>
              <span className={cn("font-mono tabular-nums", cell.state === "sleeping" ? "text-ink-3" : "font-medium text-ink")}>
                {formatClock(minutes, format)}
              </span>
              {dayOffset !== 0 && (
                <span className="rounded bg-surface-2 px-1 text-[10px] font-semibold tracking-wider text-ink-2 uppercase">
                  {weekdayOf(referenceNow, dayOffset)}
                </span>
              )}
              <span className="sr-only">{cell.state === "sleeping" ? "asleep" : "awake"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
