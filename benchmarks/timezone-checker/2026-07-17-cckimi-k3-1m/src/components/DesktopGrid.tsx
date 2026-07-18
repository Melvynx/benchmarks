import { Fragment, useState } from 'react';
import type { GridData } from '../lib/overlap';
import {
  HOURS,
  formatClock,
  formatHourCompact,
  formatOffset,
  getZonedParts,
} from '../lib/time';
import { HourCell } from './HourCell';
import { XIcon } from './Icons';

interface Props {
  grid: GridData;
  hour12: boolean;
  now: number;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
}

/**
 * Desktop layout (≥768px): cities as rows, the reference day's 24 hours as
 * columns. City info on the left, remove button on the right. Hovering any
 * cell or hour header highlights the whole column, so a single reference
 * hour can be read vertically across every city.
 */
export function DesktopGrid({ grid, hour12, now, onPromote, onRemove }: Props) {
  const [hoverHour, setHoverHour] = useState<number | null>(null);

  return (
    <div className="hidden overflow-x-auto px-3 pb-3 md:block">
      <div
        className="grid gap-[2px]"
        style={{
          gridTemplateColumns: 'minmax(180px, 220px) repeat(24, minmax(0, 1fr)) 34px',
          minWidth: 1050,
        }}
        onMouseLeave={() => setHoverHour(null)}
      >
        <div className="flex items-end px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-fog">
          City · local time
        </div>
        {HOURS.map((h) => (
          <div
            key={h}
            className={`hour-head ${h === grid.currentRefHour ? 'hour-now' : ''} ${h === hoverHour ? 'hour-hl' : ''}`}
            onMouseEnter={() => setHoverHour(h)}
          >
            {h === grid.currentRefHour && <span className="now-dot" />}
            {formatHourCompact(h, hour12)}
          </div>
        ))}
        <div />

        {grid.rows.map((row, ri) => {
          const localNow = getZonedParts(row.city.tz, now);
          return (
            <Fragment key={row.city.id}>
              <div
                className="cell-in flex min-w-0 flex-col justify-center gap-[3px] px-2 py-1.5"
                style={{ animationDelay: `${ri * 45}ms` }}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="city-name"
                    title="Set as reference city"
                    onClick={() => onPromote(row.city.id)}
                  >
                    {row.city.name}
                  </button>
                  {row.isRef && <span className="ref-badge">REF</span>}
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="truncate text-fog">{row.city.country}</span>
                  <span className="font-mono text-paper/70">{formatClock(localNow, hour12)}</span>
                </div>
                <div>
                  <span className="offset-pill">{formatOffset(row.offsetMinutes)}</span>
                </div>
              </div>

              {row.cells.map((cell) => (
                <HourCell
                  key={cell.refHour}
                  cell={cell}
                  hour12={hour12}
                  delay={ri * 45}
                  refName={grid.refCity.name}
                  cityName={row.city.name}
                  isNow={cell.refHour === grid.currentRefHour}
                  highlighted={cell.refHour === hoverHour}
                  onHover={setHoverHour}
                />
              ))}

              <div className="flex items-center justify-center">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Remove ${row.city.name}`}
                  title={`Remove ${row.city.name}`}
                  onClick={() => onRemove(row.city.id)}
                >
                  <XIcon size={14} />
                </button>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
