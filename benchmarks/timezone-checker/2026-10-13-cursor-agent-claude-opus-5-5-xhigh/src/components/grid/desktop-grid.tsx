import { X } from "lucide-react";
import { type PointerEvent, useMemo } from "react";
import { RefBadge } from "@/components/ui/ref-badge";
import { useCityActions } from "@/hooks/use-city-actions";
import { cn } from "@/lib/cn";
import {
  formatCellLabel,
  formatClock,
  formatHour,
  formatOffsetDiff,
  formatShortDate,
  formatUtcOffset,
  type TimeFormat,
} from "@/lib/format";
import type { HourCell, ScheduleRow } from "@/lib/overlap";
import { getWallClock, type WallClock } from "@/lib/timezone";
import { useFocus } from "@/state/focus";
import { cellAriaLabel, cellClasses, focusBands, type Segment, toSegments, weekdayOf } from "./cells";

interface GridProps {
  rows: readonly ScheduleRow[];
  referenceClock: WallClock | null;
  now: Date;
  format: TimeFormat;
}

const COLUMNS = "minmax(10.5rem, 17rem) repeat(24, minmax(1.875rem, 1fr)) 2.25rem";
const AXIS_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

const pct = (hours: number) => `${(hours / 24) * 100}%`;

export function DesktopGrid({ rows, referenceClock, now, format }: GridProps) {
  const focused = useFocus((state) => state.hours);
  const focus = useFocus((state) => state.focus);
  const clear = useFocus((state) => state.clear);
  const reference = rows[0];

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-hour]");
    if (!target) return clear();
    const hour = Number(target.dataset.hour);
    if (focused.size !== 1 || !focused.has(hour)) focus([hour]);
  };

  if (!reference) return null;

  const hoveredHour = focused.size === 1 ? [...focused][0] : undefined;
  const nowHours = referenceClock ? referenceClock.minutesOfDay / 60 : null;

  return (
    <div className="-mx-5 overflow-x-auto px-5 pt-1 pb-3 [scrollbar-width:thin]">
      <div
        role="table"
        aria-label={`Hours of the day in ${reference.city.name}, compared across cities`}
        className="grid gap-y-1.5"
        style={{ gridTemplateColumns: COLUMNS }}
        onPointerMove={onPointerMove}
        onPointerLeave={clear}
      >
        <div aria-hidden className="col-span-full row-start-1 grid h-8 grid-cols-subgrid">
          <div className="sticky left-0 z-20 flex items-end bg-surface pr-4 pb-1.5 text-[11px] font-medium text-ink-3">
            <span className="truncate">
              {reference.city.name} time
              {referenceClock && ` · ${weekdayOf(referenceClock, 0)} ${formatShortDate(referenceClock.month, referenceClock.day)}`}
            </span>
          </div>
          <div className="relative col-span-24">
            {AXIS_HOURS.map((hour) => (
              <span
                key={hour}
                className={cn(
                  "absolute bottom-1.5 -translate-x-1/2 font-mono text-[10.5px] text-ink-3 transition-opacity tabular",
                  hoveredHour !== undefined && Math.abs(hoveredHour - hour) < 2 && "opacity-0",
                )}
                style={{ left: pct(hour + 0.5) }}
              >
                {formatHour(hour, format)}
              </span>
            ))}
            {hoveredHour !== undefined && (
              <span
                className="absolute bottom-1 z-10 -translate-x-1/2 rounded-md bg-ink px-1.5 py-0.5 font-mono text-[10.5px] font-medium whitespace-nowrap text-canvas tabular"
                style={{ left: pct(hoveredHour + 0.5) }}
              >
                {formatHour(hoveredHour, format)}
              </span>
            )}
            {nowHours !== null && referenceClock && (
              <span
                className="absolute -bottom-0.5 z-20 -translate-x-1/2 rounded-full bg-now px-1.5 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap text-white tabular shadow-[0_0_0_2px_var(--surface)]"
                style={{ left: pct(nowHours) }}
              >
                {formatClock(referenceClock.minutesOfDay, format, true)}
              </span>
            )}
          </div>
          <div />
        </div>

        {/* Explicit rows: the overlay below is explicitly placed and would otherwise displace auto-placed rows. */}
        {rows.map((row, index) => (
          <DesktopRow
            key={row.city.id}
            row={row}
            gridRow={index + 2}
            referenceClock={referenceClock}
            now={now}
            format={format}
          />
        ))}

        <div
          aria-hidden
          className="pointer-events-none relative z-10"
          style={{ gridColumn: "2 / span 24", gridRow: `2 / span ${rows.length}` }}
        >
          {focusBands(focused).map((band) => (
            <div
              key={band.start}
              className="absolute -inset-y-1 rounded-xl bg-focus/[0.035] ring-2 ring-focus/75"
              style={{ left: pct(band.start), width: pct(band.length) }}
            />
          ))}
          {nowHours !== null && (
            <div
              className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-now shadow-[0_0_0_1.5px_var(--surface)]"
              style={{ left: pct(nowHours) }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DesktopRow({
  row,
  gridRow,
  referenceClock,
  now,
  format,
}: {
  row: ScheduleRow;
  gridRow: number;
  referenceClock: WallClock | null;
  now: Date;
  format: TimeFormat;
}) {
  const segments = useMemo(() => toSegments(row.cells), [row.cells]);
  const { makeReference, remove } = useCityActions();
  const local = getWallClock(now, row.offsetMinutes);

  return (
    <div
      role="row"
      className="group/row col-span-full grid grid-cols-subgrid"
      style={{ gridRow, viewTransitionName: `row-${row.city.id}` }}
    >
      <div role="rowheader" className="sticky left-0 z-20 flex min-w-0 items-center gap-3 bg-surface pr-4">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            {row.isReference ? (
              <span className="truncate text-[15px] font-semibold text-ink">{row.city.name}</span>
            ) : (
              <button
                type="button"
                onClick={() => makeReference(row.city.id)}
                aria-label={`Make ${row.city.name} the reference city`}
                title={`Make ${row.city.name} the reference city`}
                className="truncate rounded-sm text-left text-[15px] font-semibold text-ink decoration-ink-3 decoration-dotted underline-offset-4 hover:underline"
              >
                {row.city.name}
              </button>
            )}
            {row.isReference && <RefBadge />}
          </div>
          <p className="truncate text-xs text-ink-3">
            {row.city.country} · <span className="font-mono">{formatUtcOffset(row.offsetMinutes)}</span>
          </p>
        </div>
        <div className="hidden shrink-0 text-right leading-tight xl:block">
          <p className="font-mono text-[13px] text-ink tabular">{formatClock(local.minutesOfDay, format, true)}</p>
          <p className="font-mono text-[11px] text-ink-3">
            {weekdayOf(local, 0)}
            {!row.isReference && ` · ${formatOffsetDiff(row.diffMinutes)}`}
          </p>
        </div>
      </div>

      {row.cells.map((cell, index) => (
        <DesktopCell
          key={cell.refHour}
          row={row}
          cell={cell}
          segment={segments[index]!}
          referenceClock={referenceClock}
          format={format}
        />
      ))}

      <div role="cell" className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => remove(row.city.id)}
          aria-label={`Remove ${row.city.name}`}
          title={`Remove ${row.city.name}`}
          className="flex size-8 items-center justify-center rounded-lg text-ink-3 opacity-50 transition hover:bg-sleep hover:text-ink hover:opacity-100 focus-visible:opacity-100 group-hover/row:opacity-100"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}

function DesktopCell({
  row,
  cell,
  segment,
  referenceClock,
  format,
}: {
  row: ScheduleRow;
  cell: HourCell;
  segment: Segment;
  referenceClock: WallClock | null;
  format: TimeFormat;
}) {
  const classes = cellClasses(segment, "horizontal", cell.startsNewDay);
  const label = formatCellLabel(cell.minutesOfDay, format);
  const caption = cell.startsNewDay ? weekdayOf(referenceClock, cell.dayOffset) : label.meridiem;

  return (
    <div
      role="cell"
      data-hour={cell.refHour}
      aria-label={cellAriaLabel(row, cell, segment.state, referenceClock, format)}
      className={cn("h-12 min-w-0", classes.wrapper)}
    >
      <div className={cn(classes.surface, "flex-col items-center justify-center gap-1 leading-none")}>
        <span
          className={cn(
            "flex items-start font-mono text-[13px] tabular",
            label.minutes ? "tracking-[-0.07em]" : "tracking-[-0.02em]",
          )}
        >
          {label.hour}
          {label.minutes && <span className="text-[8.5px] leading-none tracking-normal opacity-80">{label.minutes}</span>}
        </span>
        {caption && (
          <span
            className={cn(
              "text-[9.5px] font-medium tracking-[0.06em] uppercase",
              cell.startsNewDay ? "font-semibold opacity-100" : "opacity-60",
            )}
          >
            {caption}
          </span>
        )}
      </div>
    </div>
  );
}
