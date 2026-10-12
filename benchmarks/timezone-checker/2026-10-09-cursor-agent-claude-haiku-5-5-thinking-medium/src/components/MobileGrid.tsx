import { formatClock, formatOffset, type TimeFormat } from '../lib/time';
import type { CityRow } from '../types';
import { CityHeader } from './CityHeader';

interface MobileGridProps {
  rows: CityRow[];
  format: TimeFormat;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

/**
 * Vertical layout (<768px): one column per city, 24 hour rows.
 * Separate from DesktopGrid by design, not a restyled version of it.
 */
export function MobileGrid({ rows, format, onPromote, onRemove }: MobileGridProps) {
  const ref = rows[0];

  return (
    <div
      className="mobile-grid"
      role="table"
      aria-label="Hourly availability by city"
      style={{ ['--cols' as string]: rows.length }}
    >
      <div className="mg-corner" role="columnheader">
        {ref.city.name} time
      </div>
      {rows.map((row, i) => (
        <div key={row.city.id} className="mg-head" role="columnheader">
          <CityHeader
            name={row.city.name}
            isRef={i === 0}
            offsetLabel={formatOffset(row.offset)}
            onPromote={() => onPromote(row.city.id)}
            onRemove={() => onRemove(row.city.id)}
          />
        </div>
      ))}

      {HOURS.map((col) => (
        <div key={col} className="mg-hour-block" role="row">
          <div className={`mg-time${rows[0].overlap[col] ? ' is-overlap' : ''}`} role="rowheader">
            {formatClock(col * 60, format)}
          </div>
          {rows.map((row) => {
            const slot = row.slots[col];
            const state = !slot.awake ? 'is-asleep' : row.overlap[col] ? 'is-overlap' : 'is-awake';
            return (
              <div key={row.city.id} role="cell" className={`mg-cell ${state}`}>
                {formatClock(slot.minute, format)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
