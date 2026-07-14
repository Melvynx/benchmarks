import { Fragment } from 'react';
import { cx } from '../lib/cx';
import { formatClock, formatHourShort } from '../lib/format';
import { HOURS } from '../lib/overlap';
import { formatUtcOffset } from '../lib/time';
import type { GridProps } from './grid-shared';
import { HourCell } from './HourCell';
import { XIcon } from './icons';

/** Mobile (<768px): hours as rows, cities as columns. */
export function MobileGrid({ lanes, settings, now, nowHour, onPromote, onRemove }: GridProps) {
  return (
    <div className="grid-mobile">
      <div className="m-scroll">
        <div
          className="m-grid"
          style={{ gridTemplateColumns: `44px repeat(${lanes.length}, minmax(82px, 1fr))` }}
        >
          <div className="m-corner" />
          {lanes.map((lane, index) => {
            const isRef = index === 0;
            return (
              <div key={lane.city.id} className={cx('m-cityhead', isRef && 'is-ref')}>
                <div className="m-cityhead-top">
                  {isRef ? (
                    <span className="lane-name">{lane.city.name}</span>
                  ) : (
                    <button
                      type="button"
                      className="lane-name lane-name--btn"
                      onClick={() => onPromote(lane.city.id)}
                      title={`Make ${lane.city.name} the reference city`}
                    >
                      {lane.city.name}
                    </button>
                  )}
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => onRemove(lane.city.id)}
                    aria-label={`Remove ${lane.city.name}`}
                  >
                    <XIcon size={11} />
                  </button>
                </div>
                <div className="m-cityhead-meta">
                  {isRef && <span className="ref-badge">REF</span>}
                  <span className="offset-chip">{formatUtcOffset(lane.offsetMinutes)}</span>
                </div>
                <span className="lane-clock">{formatClock(now, lane.city.timeZone, settings.format)}</span>
              </div>
            );
          })}

          {HOURS.map((hour) => (
            <Fragment key={hour}>
              <div className={cx('m-hour', hour === nowHour && 'is-now')}>
                {formatHourShort(hour, settings.format)}
              </div>
              {lanes.map((lane) => (
                <HourCell
                  key={lane.city.id}
                  cell={lane.cells[hour]}
                  format={settings.format}
                  cityName={lane.city.name}
                  nowMarker="row"
                  isNow={hour === nowHour}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
