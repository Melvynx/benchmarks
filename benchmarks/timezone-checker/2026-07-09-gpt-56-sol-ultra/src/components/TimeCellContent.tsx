import { formatCellTime } from '../lib/timezone';
import type { HourCell, TimeFormat } from '../types';

interface TimeCellContentProps {
  cell: HourCell;
  timeFormat: TimeFormat;
}

export function TimeCellContent({ cell, timeFormat }: TimeCellContentProps) {
  return (
    <span className="time-cell__content">
      <span>{formatCellTime(cell.localMinute, timeFormat)}</span>
      {cell.dayDelta !== 0 && (
        <sup aria-hidden="true">{cell.dayDelta > 0 ? '+1' : '−1'}</sup>
      )}
    </span>
  );
}
