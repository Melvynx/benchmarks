import type { CellState } from '../lib/overlap';
import { formatCellLabel, type TimeFormat } from '../lib/time';

export function cellClass(cell: CellState): string {
  if (cell.overlap) return 'cell cell--overlap';
  if (cell.awake) return 'cell cell--awake';
  return 'cell cell--sleep';
}

export function cellTitle(cityName: string, cell: CellState, format: TimeFormat): string {
  const state = cell.overlap ? 'overlap' : cell.awake ? 'awake' : 'sleeping';
  return `${cityName} · ${formatCellLabel(cell.localMinutes, format)} · ${state}`;
}

export function HourCell({
  cell,
  cityName,
  format,
}: {
  cell: CellState;
  cityName: string;
  format: TimeFormat;
}) {
  return (
    <div className={cellClass(cell)} title={cellTitle(cityName, cell, format)}>
      {formatCellLabel(cell.localMinutes, format)}
    </div>
  );
}
