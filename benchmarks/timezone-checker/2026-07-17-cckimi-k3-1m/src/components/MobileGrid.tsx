import { Fragment } from 'react';
import type { GridData } from '../lib/overlap';
import { HOURS, formatHourCompact, formatOffset } from '../lib/time';
import { HourCell } from './HourCell';

interface Props {
  grid: GridData;
  hour12: boolean;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
}

/**
 * Mobile layout (<768px): a separate transposed view — cities as columns,
 * the reference day's hours as rows. The hour gutter stays pinned while
 * scrolling horizontally through cities.
 */
export function MobileGrid({ grid, hour12, onPromote, onRemove }: Props) {
  return (
    <div className="m-scroll px-2 pb-3 md:hidden">
      <div
        className="grid w-full gap-[2px]"
        style={{ gridTemplateColumns: `44px repeat(${grid.rows.length}, minmax(64px, 1fr))` }}
      >
        <div className="m-corner" />
        {grid.rows.map((row) => (
          <div key={row.city.id} className="m-head">
            <button
              type="button"
              className="m-remove"
              aria-label={`Remove ${row.city.name}`}
              title={`Remove ${row.city.name}`}
              onClick={() => onRemove(row.city.id)}
            >
              ×
            </button>
            <button
              type="button"
              className="m-name"
              title="Set as reference city"
              onClick={() => onPromote(row.city.id)}
            >
              {row.city.name}
            </button>
            {row.isRef && <span className="ref-badge">REF</span>}
            <span className="m-offset">{formatOffset(row.offsetMinutes)}</span>
          </div>
        ))}

        {HOURS.map((h) => (
          <Fragment key={h}>
            <div className={`m-gutter ${h === grid.currentRefHour ? 'hour-now' : ''}`}>
              {formatHourCompact(h, hour12)}
            </div>
            {grid.rows.map((row) => (
              <HourCell
                key={row.city.id}
                cell={row.cells[h]}
                hour12={hour12}
                compact
                refName={grid.refCity.name}
                cityName={row.city.name}
              />
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
