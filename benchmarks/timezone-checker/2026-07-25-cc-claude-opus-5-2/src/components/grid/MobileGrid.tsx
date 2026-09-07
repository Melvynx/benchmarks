import { Fragment } from "react";
import { HOURS } from "../../lib/availability";
import { cx } from "../../lib/cx";
import { formatClock, formatHourLabel, type TimeFormat } from "../../lib/format";
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

/** Mobile layout: hours run down the page, cities across — a separate grid, not a reflow. */
export function MobileGrid({ schedule, format, onPromote, onRemove }: Props) {
  const gridTemplateColumns = `48px repeat(${schedule.rows.length}, minmax(74px, 1fr))`;

  return (
    <div className="scroll-quiet overflow-x-auto rounded-2xl border border-line bg-panel p-2.5">
      <div className="relative w-full" style={{ minWidth: 48 + schedule.rows.length * 77 }}>
        <div className="relative grid gap-[3px]" style={{ gridTemplateColumns }}>
          <div className="sticky left-0 z-20 flex flex-col justify-end bg-panel pb-1.5 text-[9px] leading-tight text-faint after:absolute after:inset-y-0 after:left-full after:w-[3px] after:bg-panel">
            {schedule.referenceDayLabel}
          </div>

          {schedule.rows.map((row) => (
            <CityHeader key={row.city.id} row={row} onPromote={onPromote} onRemove={onRemove} />
          ))}

          {HOURS.map((hour) => {
            const isNow = schedule.nowRefHour === hour;
            return (
              <Fragment key={hour}>
                <div
                  className={cx(
                    "tnum sticky left-0 z-20 flex h-9 items-center bg-panel pr-1 text-[10.5px] after:absolute after:inset-y-0 after:left-full after:w-[3px] after:bg-panel",
                    isNow ? "font-medium text-ink" : "text-faint",
                  )}
                >
                  {formatHourLabel(hour, format)}
                </div>
                {schedule.rows.map((row) => (
                  <Cell
                    key={row.city.id}
                    row={row}
                    cell={row.cells[hour]!}
                    format={format}
                    now={isNow}
                  />
                ))}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CityHeader({
  row,
  onPromote,
  onRemove,
}: {
  row: CityRow;
  onPromote: (cityId: string) => void;
  onRemove: (cityId: string) => void;
}) {
  return (
    <div
      className={cx(
        "relative z-10 flex flex-col items-center gap-1 rounded-lg px-1 pt-2 pb-2",
        row.isReference ? "bg-ref/[0.07] ring-1 ring-ref/20" : "bg-white/[0.03]",
      )}
    >
      <button
        type="button"
        onClick={() => onPromote(row.city.id)}
        disabled={row.isReference}
        title={row.isReference ? row.city.name : `Make ${row.city.name} the reference city`}
        className="max-w-full truncate px-3 text-[11.5px] font-medium text-ink disabled:cursor-default"
      >
        {row.city.name}
      </button>
      <div className="flex items-center gap-1">
        {row.isReference && <RefBadge compact />}
        <span className="tnum text-[9px] text-faint">{formatUtcOffset(row.offsetMinutes)}</span>
      </div>
      <button
        type="button"
        onClick={() => onRemove(row.city.id)}
        aria-label={`Remove ${row.city.name}`}
        className="absolute top-0.5 right-0.5 rounded p-1 text-faint transition-colors active:text-alert"
      >
        <CloseIcon className="h-3 w-3" />
      </button>
    </div>
  );
}

function Cell({
  row,
  cell,
  format,
  now,
}: {
  row: CityRow;
  cell: HourCell;
  format: TimeFormat;
  now: boolean;
}) {
  const label = formatClock(cell.localHour, cell.localMinute, format);
  const description = describeCell(row.city, cell, format);

  return (
    <div
      title={description}
      aria-label={description}
      className={cx(
        "relative z-10 flex h-9 items-baseline justify-center gap-[3px] rounded-md",
        CELL_STATE_CLASS[cell.state],
        now && "outline outline-white/20",
      )}
    >
      {cell.localHour === 0 && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-0 w-[2px] rounded-full bg-white/25"
        />
      )}
      <span className="tnum text-[12.5px] leading-none">{label.value}</span>
      {label.meridiem && (
        <span className="text-[8.5px] leading-none font-medium opacity-60">{label.meridiem}</span>
      )}
    </div>
  );
}
