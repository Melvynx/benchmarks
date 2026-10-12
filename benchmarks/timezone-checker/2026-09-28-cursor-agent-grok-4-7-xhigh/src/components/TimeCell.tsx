import type { TimeFormat } from '../types';
import type { CellModel } from '../lib/board';
import { cx } from '../lib/cx';
import { clockParts, formatClock } from '../lib/time';

export function Tick({
  hour,
  minute,
  format,
  dayDelta = 0,
}: {
  hour: number;
  minute: number;
  format: TimeFormat;
  dayDelta?: number;
}) {
  const parts = clockParts(hour, minute, format);
  const delta = dayDelta === 0 ? null : dayDelta > 0 ? `+${dayDelta}` : `−${Math.abs(dayDelta)}`;
  return (
    <span className="tick">
      <span className="tick-main">
        {parts.main}
        {delta ? <sup className="day-delta">{delta}</sup> : null}
      </span>
      {parts.sub ? <span className="tick-sub">{parts.sub}</span> : null}
    </span>
  );
}

function cellLabel(cityName: string, cell: CellModel, format: TimeFormat): string {
  const clock = formatClock(cell.hour, cell.minute, format);
  const day =
    cell.dayDelta === 0 ? '' : cell.dayDelta > 0 ? `, +${cell.dayDelta} day` : `, −${Math.abs(cell.dayDelta)} day`;
  const status = cell.state === 'sleep' ? 'asleep' : cell.state === 'overlap' ? 'overlap' : 'awake';
  return `${cityName}, ${clock}${day}, ${status}`;
}

export function TimeCell({
  cell,
  cityName,
  format,
  hot,
  onHot,
}: {
  cell: CellModel;
  cityName: string;
  format: TimeFormat;
  hot: boolean;
  onHot: (hour: number) => void;
}) {
  const label = cellLabel(cityName, cell, format);
  return (
    <div
      className={cx('cell', hot && 'is-hot', cell.isNow && 'is-now')}
      data-state={cell.state}
      data-hour={cell.refHour}
      data-city={cell.cityId}
      data-minute={cell.minute}
      data-now={cell.isNow ? 'true' : 'false'}
      title={label}
      aria-label={label}
      onMouseEnter={() => onHot(cell.refHour)}
      onClick={() => onHot(cell.refHour)}
    >
      <Tick hour={cell.hour} minute={cell.minute} format={format} dayDelta={cell.dayDelta} />
    </div>
  );
}
