import { Fragment } from "react";
import { HOURS } from "../../lib/availability";
import { cx } from "../../lib/cx";
import { formatClock, formatTimeOfDay, type TimeFormat } from "../../lib/format";
import type { CityRow, HourCell, Schedule } from "../../lib/schedule";
import { formatUtcOffset } from "../../lib/time";
import { CloseIcon } from "../icons";
import { RefBadge } from "../RefBadge";
import { CELL_STATE_CLASS, describeCell } from "./cell";

type Props = {
  schedule: Schedule;
  format: TimeFormat;
  onPromote: (cityId: string) => void;
  onRemove: (cityId: string) => void;
};

/** Header and every row share this template — that is what keeps columns aligned. */
const COLUMNS = "grid-cols-[184px_repeat(24,minmax(0,1fr))_34px]";

/** Below this the hours get too cramped to read, so the region scrolls instead. */
const MIN_WIDTH = "min-w-[1060px]";

/** Desktop layout: cities are rows, hours are columns. */
export function DesktopGrid({ schedule, format, onPromote, onRemove }: Props) {
  return (
    <div className="scroll-quiet overflow-x-auto rounded-2xl border border-line bg-panel p-3 shadow-[0_1px_0_0_rgb(255_255_255/0.04)_inset]">
      <div className={cx("relative w-full", MIN_WIDTH)}>
        <NowColumn hour={schedule.nowRefHour} />

        <div className={cx("relative grid gap-x-[3px] gap-y-1.5", COLUMNS)}>
          <div className="sticky left-0 z-20 flex flex-col justify-center bg-panel pr-2 after:absolute after:inset-y-0 after:left-full after:w-[3px] after:bg-panel">
            <span className="text-[12px] font-medium text-ink">{schedule.referenceDayLabel}</span>
            <span className="text-[10px] text-faint">{schedule.rows[0]?.city.name ?? ""} time</span>
          </div>

          {HOURS.map((hour) => (
            <HourHeading
              key={hour}
              hour={hour}
              format={format}
              overlap={schedule.overlap.hours[hour] === true}
              now={schedule.nowRefHour === hour}
            />
          ))}
          <div />

          {schedule.rows.map((row) => (
            <Fragment key={row.city.id}>
              <CityInfo row={row} format={format} onPromote={onPromote} />
              {row.cells.map((cell) => (
                <Cell key={cell.refHour} row={row} cell={cell} format={format} />
              ))}
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => onRemove(row.city.id)}
                  aria-label={`Remove ${row.city.name}`}
                  title={`Remove ${row.city.name}`}
                  className="rounded-md p-1.5 text-faint transition-colors hover:bg-white/5 hover:text-alert"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * The current hour, tinted from behind the whole column. It lives in its own
 * overlay grid: as a sibling item it would occupy a slot in the main grid and
 * push every cell after it out of alignment.
 */
function NowColumn({ hour }: { hour: number | null }) {
  if (hour === null) return null;
  return (
    <div
      aria-hidden="true"
      className={cx("pointer-events-none absolute inset-0 grid gap-x-[3px]", COLUMNS)}
    >
      <div className="-mx-[3px] rounded-xl bg-white/[0.05]" style={{ gridColumn: hour + 2 }} />
    </div>
  );
}

function HourHeading({
  hour,
  format,
  overlap,
  now,
}: {
  hour: number;
  format: TimeFormat;
  overlap: boolean;
  now: boolean;
}) {
  const label = formatClock(hour, 0, format);
  return (
    <div
      className={cx(
        "tnum relative z-10 flex h-7 items-baseline justify-center rounded-md text-[11px]",
        overlap ? "bg-overlap/10 font-semibold text-overlap" : now ? "text-ink" : "text-faint",
      )}
    >
      {label.value}
      {label.meridiem && (
        <span className="ml-[1px] text-[8px] opacity-70">
          {label.meridiem.charAt(0).toLowerCase()}
        </span>
      )}
    </div>
  );
}

function CityInfo({
  row,
  format,
  onPromote,
}: {
  row: CityRow;
  format: TimeFormat;
  onPromote: (cityId: string) => void;
}) {
  return (
    <div className="sticky left-0 z-20 flex flex-col justify-center bg-panel pr-2 after:absolute after:inset-y-0 after:left-full after:w-[3px] after:bg-panel">
      <div className="flex items-center gap-1.5">
        {row.isReference ? (
          <>
            <span className="truncate text-[13.5px] font-medium text-ink">{row.city.name}</span>
            <RefBadge />
          </>
        ) : (
          <button
            type="button"
            onClick={() => onPromote(row.city.id)}
            title={`Make ${row.city.name} the reference city`}
            className="truncate text-[13.5px] font-medium text-ink/90 underline-offset-4 transition-colors hover:text-ref hover:underline"
          >
            {row.city.name}
          </button>
        )}
      </div>
      <div className="tnum mt-0.5 flex items-center gap-1.5 text-[10.5px] text-faint">
        <span>{formatUtcOffset(row.offsetMinutes)}</span>
        <span aria-hidden="true" className="text-line">
          •
        </span>
        <span>{formatTimeOfDay(row.now.hour, row.now.minute, format)}</span>
      </div>
    </div>
  );
}

function Cell({ row, cell, format }: { row: CityRow; cell: HourCell; format: TimeFormat }) {
  const label = formatClock(cell.localHour, cell.localMinute, format);
  const description = describeCell(row.city, cell, format);

  return (
    <div
      title={description}
      aria-label={description}
      className={cx(
        "relative z-10 flex h-11 flex-col items-center justify-center rounded-md transition-colors duration-150",
        CELL_STATE_CLASS[cell.state],
      )}
    >
      {cell.localHour === 0 && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-white/25"
          title="Local day starts here"
        />
      )}
      <span
        className={cx("tnum leading-none", cell.localMinute === 0 ? "text-[12.5px]" : "text-[10.5px]")}
      >
        {label.value}
      </span>
      {label.meridiem && (
        <span className="mt-[3px] text-[8px] leading-none font-medium opacity-60">
          {label.meridiem}
        </span>
      )}
    </div>
  );
}
