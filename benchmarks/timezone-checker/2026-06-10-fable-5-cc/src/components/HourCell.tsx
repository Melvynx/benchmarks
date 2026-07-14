import type { TimeFormat } from '../lib/appState';
import { cx } from '../lib/cx';
import { formatCellLabel } from '../lib/format';
import type { Cell } from '../lib/overlap';

interface HourCellProps {
  cell: Cell;
  format: TimeFormat;
  cityName: string;
  /** Direction of the "current hour" guide — an underline for columns, a left bar for rows. */
  nowMarker?: 'column' | 'row';
  isNow?: boolean;
  hovered?: boolean;
  onHover?: (refHour: number) => void;
}

export function HourCell({
  cell,
  format,
  cityName,
  nowMarker = 'column',
  isNow = false,
  hovered = false,
  onHover,
}: HourCellProps) {
  const label = formatCellLabel(cell.localMinutes, format);
  const state = cell.overlap ? 'overlap' : cell.awake ? 'awake' : 'sleeping';
  const dayNote = cell.dayOffset === 0 ? '' : cell.dayOffset > 0 ? ' (+1 day)' : ' (−1 day)';

  return (
    <div
      className={cx(
        'cell',
        `cell--${state}`,
        cell.localMinutes < 60 && 'cell--midnight',
        label.time.includes(':') && 'cell--fractional',
        hovered && 'cell--hovered',
        isNow && (nowMarker === 'column' ? 'cell--now-col' : 'cell--now-row'),
      )}
      title={`${cityName} — ${label.time}${label.meridiem ?? ''}${dayNote} · ${state}`}
      onMouseEnter={onHover ? () => onHover(cell.refHour) : undefined}
    >
      <span className="cell-time">{label.time}</span>
      {label.meridiem && <span className="cell-mer">{label.meridiem}</span>}
    </div>
  );
}
