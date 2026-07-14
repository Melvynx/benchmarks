import type { TimeFormat } from '../types';
import type { ScheduleModel } from '../lib/schedule';
import { HOURS } from '../lib/schedule';
import { formatLocalClock } from '../lib/time';
import { hourShort } from '../lib/format';
import { cx } from '../lib/cx';
import { HourCell } from './HourCell';
import { XIcon } from './icons';

export interface GridProps {
  schedule: ScheduleModel;
  timeFormat: TimeFormat;
  now: Date;
  onRemove: (cityId: string) => void;
  onSetReference: (cityId: string) => void;
}

/** Desktop (≥768px): cities as rows, the reference city's 24 hours as columns. */
export function DesktopGrid({ schedule, timeFormat, now, onRemove, onSetReference }: GridProps) {
  const refName = schedule.rows[0]?.city.name ?? '';

  return (
    <section className="board board-desktop" aria-label="Hour-by-hour overlap grid">
      <div className="board-scroll">
        <div className="tz-table">
          <div className="tz-row tz-head">
            <div className="citycell sticky-l corner">
              <span className="corner-label">Hours in {refName} time</span>
            </div>
            {HOURS.map((hour) => (
              <div key={hour} className={cx('hcell', hour === schedule.nowRefHour && 'now')}>
                <span>{hourShort(hour, timeFormat)}</span>
              </div>
            ))}
            <div className="actioncell sticky-r" aria-hidden="true" />
          </div>

          {schedule.rows.map((row) => (
            <div key={row.city.id} className="tz-row">
              <div className="citycell sticky-l">
                <div className="city-top">
                  <button
                    type="button"
                    className="city-name"
                    onClick={() => onSetReference(row.city.id)}
                    disabled={row.isRef}
                    title={
                      row.isRef
                        ? `${row.city.name} is the reference city`
                        : `Make ${row.city.name} the reference city`
                    }
                  >
                    {row.city.name}
                  </button>
                  {row.isRef && <span className="ref-badge">REF</span>}
                </div>
                <div className="city-meta">
                  <span>{row.city.country}</span>
                  <span className="offset">{row.offsetLabel}</span>
                  <span className="clock">{formatLocalClock(row.city.timeZone, now, timeFormat)}</span>
                </div>
              </div>
              {row.cells.map((cell) => (
                <HourCell
                  key={cell.refHour}
                  cell={cell}
                  cityName={row.city.name}
                  timeFormat={timeFormat}
                  isNow={cell.refHour === schedule.nowRefHour}
                />
              ))}
              <div className="actioncell sticky-r">
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => onRemove(row.city.id)}
                  aria-label={`Remove ${row.city.name}`}
                  title={`Remove ${row.city.name}`}
                >
                  <XIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
