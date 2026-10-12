import { formatCell, formatClock, formatOffset, type TimeFormat } from '../lib/time';
import type { CityRow } from '../types';
import { CityHeader } from './CityHeader';

interface DesktopGridProps {
  rows: CityRow[];
  format: TimeFormat;
  /** Meeting mode: every row shares one overlap, so the header can flag it too. */
  highlightHeader: boolean;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

/**
 * Horizontal layout (≥768px): one row per city, 24 hour columns.
 * The whole table is a single CSS grid, so every row shares the same column tracks.
 */
export function DesktopGrid({ rows, format, highlightHeader, onPromote, onRemove }: DesktopGridProps) {
  const ref = rows[0];

  return (
    <div className="desktop-grid" role="table" aria-label="Hourly availability by city">
      <div className="dg-corner" role="columnheader">
        Reference: {ref.city.name}
      </div>
      {HOURS.map((col) => (
        <div
          key={col}
          role="columnheader"
          className={`dg-hour${highlightHeader && ref.overlap[col] ? ' is-overlap' : ''}`}
        >
          {formatCell(col * 60, format)}
        </div>
      ))}
      {rows.map((row, i) => (
        <div key={row.city.id} className="dg-row" role="row">
          <div className="dg-info" role="rowheader">
            <CityHeader
              name={row.city.name}
              isRef={i === 0}
              offsetLabel={formatOffset(row.offset)}
              onPromote={() => onPromote(row.city.id)}
              onRemove={() => onRemove(row.city.id)}
            />
          </div>
          {HOURS.map((col) => {
            const slot = row.slots[col];
            const state = !slot.awake ? 'is-asleep' : row.overlap[col] ? 'is-overlap' : 'is-awake';
            return (
              <div
                key={col}
                role="cell"
                className={`dg-cell ${state}`}
                title={`${row.city.name}: ${formatClock(slot.minute, format)}`}
              >
                {formatCell(slot.minute, format)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
