import { clockParts, formatClock } from '../lib/format';
import { cx } from '../lib/cx';
import type { Cell } from '../lib/schedule';
import type { TimeFormat } from '../types';

type Props = {
  cell: Cell;
  cityId: string;
  cityName: string;
  format: TimeFormat;
  hovered: boolean;
  isNow: boolean;
  onHover: (hour: number) => void;
};

function dayPhrase(dayDiff: number): string {
  if (dayDiff === 0) return '';
  if (dayDiff === 1) return ', next day';
  if (dayDiff === -1) return ', previous day';
  return `, ${dayDiff > 0 ? '+' : ''}${dayDiff} days`;
}

export function HourCell({ cell, cityId, cityName, format, hovered, isNow, onHover }: Props) {
  const parts = clockParts(cell.hour, cell.minute, format);
  const day = cell.dayDiff === 0 ? '' : cell.dayDiff > 0 ? `+${cell.dayDiff}` : `\u2212${Math.abs(cell.dayDiff)}`;
  const status = cell.state === 'sleep' ? 'sleeping' : cell.state === 'overlap' ? 'overlap' : 'awake';
  const label = `${cityName}, ${formatClock(cell.hour, cell.minute, format)}${dayPhrase(cell.dayDiff)}, ${status}`;

  return (
    <div
      role="cell"
      className={cx('cell', cell.state, hovered && 'is-col-hover', isNow && 'is-now')}
      data-city={cityId}
      data-hour={cell.refHour}
      data-state={cell.state}
      aria-label={label}
      title={label}
      onMouseEnter={() => onHover(cell.refHour)}
    >
      <span className="cell-main">{parts.main}</span>
      {parts.suffix || day ? (
        <span className="cell-suffix">
          {parts.suffix ? <span>{parts.suffix}</span> : null}
          {day ? <span className="day-diff">{day}</span> : null}
        </span>
      ) : null}
    </div>
  );
}
