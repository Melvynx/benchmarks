import { X } from "lucide-react";
import { type UIEvent, useMemo, useRef } from "react";
import { RefBadge } from "@/components/ui/ref-badge";
import { useCityActions } from "@/hooks/use-city-actions";
import { cn } from "@/lib/cn";
import { formatCellLabel, formatClock, formatUtcOffset, type TimeFormat } from "@/lib/format";
import type { HourCell, ScheduleRow } from "@/lib/overlap";
import type { WallClock } from "@/lib/timezone";
import { useFocus } from "@/state/focus";
import { cellAriaLabel, cellClasses, focusBands, type Segment, toSegments, weekdayOf } from "./cells";

interface GridProps {
  rows: readonly ScheduleRow[];
  referenceClock: WallClock | null;
  format: TimeFormat;
}

const pct = (hours: number) => `${(hours / 24) * 100}%`;

export function MobileGrid({ rows, referenceClock, format }: GridProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const focused = useFocus((state) => state.hours);
  const focus = useFocus((state) => state.focus);
  const clear = useFocus((state) => state.clear);

  const columns = { gridTemplateColumns: `repeat(${rows.length}, minmax(4.75rem, 1fr))` };
  const syncHeader = (event: UIEvent<HTMLDivElement>) => {
    if (headerRef.current) headerRef.current.scrollLeft = event.currentTarget.scrollLeft;
  };
  const toggleHour = (hour: number) => (focused.size === 1 && focused.has(hour) ? clear() : focus([hour]));

  if (!rows.length) return null;
  const nowHours = referenceClock ? referenceClock.minutesOfDay / 60 : null;

  return (
    <div>
      <div
        ref={headerRef}
        className="sticky top-0 z-30 -mx-4 overflow-hidden border-b border-line bg-surface/90 px-4 backdrop-blur-md sm:-mx-5 sm:px-5"
      >
        <div className="grid gap-x-1.5 py-2.5" style={columns}>
          {rows.map((row) => (
            <MobileCityHeader key={row.city.id} row={row} />
          ))}
        </div>
      </div>

      <div
        onScroll={syncHeader}
        className="-mx-4 overflow-x-auto px-4 pt-3 pb-1 [scrollbar-width:none] sm:-mx-5 sm:px-5"
      >
        <div className="relative grid gap-x-1.5" style={columns}>
          {rows.map((row) => (
            <MobileColumn
              key={row.city.id}
              row={row}
              referenceClock={referenceClock}
              format={format}
              onTapHour={toggleHour}
            />
          ))}

          <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
            {focusBands(focused).map((band) => (
              <div
                key={band.start}
                className="absolute -inset-x-1 rounded-xl bg-focus/[0.035] ring-2 ring-focus/75"
                style={{ top: pct(band.start), height: pct(band.length) }}
              />
            ))}
            {nowHours !== null && referenceClock && (
              <div className="absolute -inset-x-1.5 h-0.5 -translate-y-1/2 bg-now" style={{ top: pct(nowHours) }}>
                <span className="absolute top-1/2 -left-0.5 -translate-y-1/2 rounded-full bg-now px-1 py-px font-mono text-[9px] font-semibold text-white tabular shadow-[0_0_0_2px_var(--surface)]">
                  {formatClock(referenceClock.minutesOfDay, format, true)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileCityHeader({ row }: { row: ScheduleRow }) {
  const { makeReference, remove } = useCityActions();

  return (
    <div
      className="flex min-w-0 flex-col items-center gap-1 text-center"
      style={{ viewTransitionName: `head-${row.city.id}` }}
    >
      {row.isReference ? (
        <span className="line-clamp-2 min-h-[2lh] text-[13px] leading-tight font-semibold break-words hyphens-auto text-ink">
          {row.city.name}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => makeReference(row.city.id)}
          aria-label={`Make ${row.city.name} the reference city`}
          className="line-clamp-2 min-h-[2lh] rounded-sm text-[13px] leading-tight font-semibold break-words hyphens-auto text-ink decoration-ink-3 decoration-dotted underline-offset-4 active:underline"
        >
          {row.city.name}
        </button>
      )}
      <div className="flex h-[18px] items-center gap-1">
        {row.isReference && <RefBadge />}
        <span className="font-mono text-[10.5px] text-ink-3">{formatUtcOffset(row.offsetMinutes)}</span>
      </div>
      <button
        type="button"
        onClick={() => remove(row.city.id)}
        aria-label={`Remove ${row.city.name}`}
        className="flex h-6 w-9 items-center justify-center rounded-md text-ink-3 active:bg-sleep active:text-ink"
      >
        <X aria-hidden className="size-3.5" />
      </button>
    </div>
  );
}

function MobileColumn({
  row,
  referenceClock,
  format,
  onTapHour,
}: {
  row: ScheduleRow;
  referenceClock: WallClock | null;
  format: TimeFormat;
  onTapHour: (hour: number) => void;
}) {
  const segments = useMemo(() => toSegments(row.cells), [row.cells]);

  return (
    <div
      role="list"
      aria-label={`${row.city.name}${row.isReference ? " (reference)" : ""}`}
      className="flex flex-col"
      style={{ viewTransitionName: `col-${row.city.id}` }}
    >
      {row.cells.map((cell, index) => (
        <MobileCell
          key={cell.refHour}
          row={row}
          cell={cell}
          segment={segments[index]!}
          referenceClock={referenceClock}
          format={format}
          onTap={() => onTapHour(cell.refHour)}
        />
      ))}
    </div>
  );
}

function MobileCell({
  row,
  cell,
  segment,
  referenceClock,
  format,
  onTap,
}: {
  row: ScheduleRow;
  cell: HourCell;
  segment: Segment;
  referenceClock: WallClock | null;
  format: TimeFormat;
  onTap: () => void;
}) {
  const classes = cellClasses(segment, "vertical", cell.startsNewDay);
  const label = formatCellLabel(cell.minutesOfDay, format);

  return (
    <div
      role="listitem"
      aria-label={cellAriaLabel(row, cell, segment.state, referenceClock, format)}
      onClick={onTap}
      className={cn("h-10", classes.wrapper)}
    >
      <div className={cn(classes.surface, "flex-col items-center justify-center leading-none")}>
        <span className="flex items-baseline gap-0.5">
          <span className="font-mono text-[13px] tabular">
            {label.hour}
            {label.minutes && <span className="opacity-70">:{label.minutes}</span>}
          </span>
          {label.meridiem && <span className="text-[10px] opacity-60">{label.meridiem}</span>}
        </span>
        {cell.startsNewDay && (
          <span className="mt-0.5 text-[8.5px] font-semibold tracking-[0.08em] uppercase">
            {weekdayOf(referenceClock, cell.dayOffset)}
          </span>
        )}
      </div>
    </div>
  );
}
