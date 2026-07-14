import { useState } from 'react';
import { cx } from '../lib/cx';
import { formatClock, formatHourShort } from '../lib/format';
import { HOURS } from '../lib/overlap';
import { formatUtcOffset } from '../lib/time';
import type { GridProps } from './grid-shared';
import { HourCell } from './HourCell';
import { XIcon } from './icons';

/** Desktop (≥768px): cities as rows, the reference city's 24 hours as columns. */
export function DesktopGrid({ lanes, settings, now, nowHour, onPromote, onRemove }: GridProps) {
  const [hoverHour, setHoverHour] = useState<number | null>(null);

  return (
    <div className="grid-scroll">
      <div
        className="grid-desktop"
        onMouseLeave={() => setHoverHour(null)}
        role="table"
        aria-label="Hour-by-hour availability per city"
      >
        <div className="grid-row grid-head">
          <div className="head-cities">
            {lanes.length} {lanes.length === 1 ? 'city' : 'cities'}
          </div>
          {HOURS.map((hour) => (
            <div
              key={hour}
              className={cx(
                'hour-label',
                hour === nowHour && 'is-now',
                hour === hoverHour && 'is-hovered',
              )}
              title={hour === nowHour ? 'Current hour in the reference city' : undefined}
            >
              {formatHourShort(hour, settings.format)}
            </div>
          ))}
          <div />
        </div>

        {lanes.map((lane, index) => {
          const { city } = lane;
          const isRef = index === 0;
          return (
            <div key={city.id} className="grid-row">
              <div className="lane-info">
                <div className="lane-title">
                  {isRef ? (
                    <span className="lane-name">{city.name}</span>
                  ) : (
                    <button
                      type="button"
                      className="lane-name lane-name--btn"
                      onClick={() => onPromote(city.id)}
                      title={`Make ${city.name} the reference city`}
                    >
                      {city.name}
                    </button>
                  )}
                  {isRef && <span className="ref-badge">REF</span>}
                </div>
                <div className="lane-meta">
                  <span className="lane-country">{city.country}</span>
                  <span className="offset-chip">{formatUtcOffset(lane.offsetMinutes)}</span>
                  <span className="lane-clock">{formatClock(now, city.timeZone, settings.format)}</span>
                </div>
              </div>
              {lane.cells.map((cell) => (
                <HourCell
                  key={cell.refHour}
                  cell={cell}
                  format={settings.format}
                  cityName={city.name}
                  isNow={cell.refHour === nowHour}
                  hovered={cell.refHour === hoverHour}
                  onHover={setHoverHour}
                />
              ))}
              <div className="lane-remove">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => onRemove(city.id)}
                  aria-label={`Remove ${city.name}`}
                >
                  <XIcon />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
