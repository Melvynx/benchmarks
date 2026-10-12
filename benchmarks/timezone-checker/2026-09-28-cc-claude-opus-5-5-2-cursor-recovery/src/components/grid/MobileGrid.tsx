import { CityName, OffsetLabel, RefBadge, RemoveCityButton } from "@/components/grid/CityControls";
import { GridCell, joins } from "@/components/grid/GridCell";
import { hourSegments } from "@/components/grid/segments";
import type { PlannerView } from "@/hooks/usePlannerView";
import { cn } from "@/lib/cn";
import { HOURS } from "@/lib/schedule";
import { formatHour, weekdayOf } from "@/lib/time";

const ROW_HEIGHT = 40;
/** Beyond this many cities, columns keep a readable width and the grid scrolls sideways. */
const MAX_FITTING_COLUMNS = 6;

/** Cities as columns, the reference city's 24 hours as rows. */
export function MobileGrid({ view }: { view: PlannerView }) {
  const { schedule, mode, settings, reference, referenceNow } = view;
  const { rows } = schedule;
  const format = settings.timeFormat;

  if (!reference || !referenceNow) return null;

  const compact = rows.length >= 4;
  const scrolls = rows.length > MAX_FITTING_COLUMNS;
  const bands = mode === "meeting" ? hourSegments(schedule.meetingOverlap) : [];
  const nowHour = referenceNow.hour;

  return (
    <div className={cn(scrolls && "-mx-4 overflow-x-auto px-4")}>
      <div
        role="table"
        aria-label={`Hours of the day in each city, aligned to ${reference.name}`}
        className={cn("relative grid", compact ? "gap-x-1" : "gap-x-1.5")}
        style={{
          gridTemplateColumns: `repeat(${rows.length}, minmax(${scrolls ? "64px" : "0"}, 1fr))`,
          gridTemplateRows: `auto repeat(24, ${ROW_HEIGHT}px)`,
        }}
      >
        {bands.map((band) => (
          <div
            key={band.start}
            aria-hidden
            className="pointer-events-none -mx-1 rounded-xl bg-overlap-soft ring-1 ring-overlap/25 ring-inset"
            style={{ gridRow: `${band.start + 2} / span ${band.length}`, gridColumn: "1 / -1" }}
          />
        ))}

        <div
          role="row"
          className={cn(
            "z-30 grid grid-cols-subgrid border-b border-line bg-surface",
            !scrolls && "sticky top-0",
          )}
          style={{ gridColumn: "1 / -1", gridRow: 1 }}
        >
          {rows.map((row) => (
            <div key={row.city.id} role="columnheader" className="flex min-w-0 flex-col gap-1 pt-2.5 pb-3">
              <div className="flex h-6 items-center justify-between gap-0.5">
                {row.isReference ? <RefBadge small={compact} /> : <span />}
                <RemoveCityButton row={row} className={compact ? "-mr-1 size-5" : "-mr-1 size-6"} />
              </div>
              <CityName row={row} className={compact ? "text-xs leading-tight" : "text-sm"} wrap={compact} />
              <OffsetLabel row={row} stacked={!compact} minimal={compact} className={compact ? "text-[10px]" : undefined} />
            </div>
          ))}
        </div>

        {HOURS.map((hour) => (
          <div
            key={hour}
            role="row"
            aria-label={`${formatHour(hour, format)} in ${reference.name}`}
            className="grid grid-cols-subgrid"
            style={{ gridColumn: "1 / -1", gridRow: hour + 2 }}
          >
            {rows.map((row) => {
              const cell = row.cells[hour];
              if (!cell) return null;
              return (
                <GridCell
                  key={row.city.id}
                  cell={cell}
                  cityName={row.city.name}
                  format={format}
                  weekday={weekdayOf(referenceNow, cell.dayOffset)}
                  orientation="vertical"
                  compact={compact}
                  {...joins(row.cells, hour)}
                />
              );
            })}
          </div>
        ))}

        <div aria-hidden className="pointer-events-none relative z-10" style={{ gridRow: nowHour + 2, gridColumn: "1 / -1" }}>
          <div className="absolute -right-1 -left-1 h-0.5 -translate-y-1/2 rounded-full bg-now" style={{ top: `${(referenceNow.minute / 60) * 100}%` }}>
            <span className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full bg-now" />
          </div>
        </div>
      </div>
    </div>
  );
}
