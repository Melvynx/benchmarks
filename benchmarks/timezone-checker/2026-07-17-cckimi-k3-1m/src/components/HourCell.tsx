import type { CellInfo } from '../lib/overlap';
import { formatCellHour, formatHourLabel, formatLocalTime } from '../lib/time';

interface Props {
  cell: CellInfo;
  hour12: boolean;
  compact?: boolean;
  delay?: number;
  refName: string;
  cityName: string;
  isNow?: boolean;
  highlighted?: boolean;
  onHover?: (refHour: number) => void;
}

/**
 * One grid cell: the local hour in `cityName` when it is `refHour` in the
 * reference city. Fractional-offset minutes render as a superscript.
 */
export function HourCell({
  cell,
  hour12,
  compact = false,
  delay,
  refName,
  cityName,
  isNow = false,
  highlighted = false,
  onHover,
}: Props) {
  const state = !cell.awake ? 'cell-asleep' : cell.overlap ? 'cell-overlap' : 'cell-awake';
  const title = `${refName} ${formatHourLabel(cell.refHour, hour12)} → ${cityName} ${formatLocalTime(cell.localHour, cell.localMinute, hour12)}`;

  return (
    <div
      className={`cell ${state} cell-in ${compact ? 'cell-sm' : ''} ${isNow ? 'cell-now' : ''} ${highlighted ? 'cell-hl' : ''}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      title={title}
      onMouseEnter={onHover ? () => onHover(cell.refHour) : undefined}
    >
      <span>{formatCellHour(cell.localHour, hour12, compact)}</span>
      {cell.localMinute !== 0 && <sup>{String(cell.localMinute).padStart(2, '0')}</sup>}
    </div>
  );
}
