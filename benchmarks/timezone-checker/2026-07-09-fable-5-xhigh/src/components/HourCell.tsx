import type { TimeFormat } from '../types';
import type { CellModel } from '../lib/schedule';
import { cellParts, localTimeLong } from '../lib/format';
import { cx } from '../lib/cx';

interface HourCellProps {
  cell: CellModel;
  cityName: string;
  timeFormat: TimeFormat;
  /** This cell sits on the reference city's current hour. */
  isNow: boolean;
}

export function HourCell({ cell, cityName, timeFormat, isNow }: HourCellProps) {
  const parts = cellParts(cell.localMinutes, timeFormat);
  const state = cell.overlap ? 'overlap' : cell.awake ? 'awake' : 'sleep';
  const dayNote = cell.dayDelta === 1 ? ' (next day)' : cell.dayDelta === -1 ? ' (previous day)' : '';
  const title = `${cityName} · ${localTimeLong(cell.localMinutes, timeFormat)}${dayNote} · ${
    cell.overlap ? 'overlap' : cell.awake ? 'awake' : 'sleeping'
  }`;

  return (
    <div
      className={cx('cell', state, isNow && 'nowmark', cell.localMinutes < 60 && 'daybreak')}
      title={title}
    >
      <span className="cell-h">{parts.hour}</span>
      {parts.minute !== null && <span className="cell-m">{parts.minute}</span>}
      {parts.meridiem !== null && <span className="cell-ap">{parts.meridiem}</span>}
    </div>
  );
}
