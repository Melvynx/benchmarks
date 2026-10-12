import { cellLabel, formatClock, type TimeFormat } from '../../lib/format';
import { MINUTES_PER_HOUR } from '../../lib/math';
import type { CellState, GridCell } from '../../lib/overlap';
import { WEEKDAYS } from '../../lib/time';

const STATE_DESCRIPTION: Record<CellState, string> = {
  asleep: 'asleep',
  awake: 'awake',
  overlap: 'awake, overlap',
};

interface HourCellProps {
  cell: GridCell;
  cityName: string;
  format: TimeFormat;
  orientation: 'row' | 'column';
  joinPrev: boolean;
  joinNext: boolean;
  onPointerEnter?: (refHour: number) => void;
}

export function HourCell({ cell, cityName, format, orientation, joinPrev, joinNext, onPointerEnter }: HourCellProps) {
  const label = cellLabel(cell.localMinutes, format);
  const startsNewDay = cell.localMinutes < MINUTES_PER_HOUR;
  const suffix = startsNewDay ? WEEKDAYS[cell.weekday] : label.meridiem;

  return (
    <div
      role="cell"
      aria-label={`${cityName}, ${WEEKDAYS[cell.weekday]} ${formatClock(cell.localMinutes, format)}: ${STATE_DESCRIPTION[cell.state]}`}
      className="hour-cell"
      data-availability={cell.state}
      data-orientation={orientation}
      data-join-prev={joinPrev || undefined}
      data-join-next={joinNext || undefined}
      onPointerEnter={onPointerEnter && (() => onPointerEnter(cell.refHour))}
    >
      <div className="hour-cell__box">
        <span className="hour-cell__content" aria-hidden>
          <span className="hour-cell__time">
            {label.hour}
            {label.minute && <sup>{label.minute}</sup>}
          </span>
          {suffix && (
            <span className="hour-cell__suffix" data-day={startsNewDay || undefined}>
              {suffix}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
