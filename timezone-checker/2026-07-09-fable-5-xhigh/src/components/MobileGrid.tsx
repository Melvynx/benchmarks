import { HOURS } from '../lib/schedule';
import { hourShort } from '../lib/format';
import { cx } from '../lib/cx';
import { HourCell } from './HourCell';
import { XIcon } from './icons';
import type { GridProps } from './DesktopGrid';

/** Mobile (<768px): transposed layout — hours as rows, cities as columns. */
export function MobileGrid({ schedule, timeFormat, onRemove, onSetReference }: GridProps) {
  const refName = schedule.rows[0]?.city.name ?? '';

  return (
    <section className="board board-mobile" aria-label="Hour-by-hour overlap grid">
      <div className="board-scroll">
        <div className="tz-table">
          <div className="tz-row m-head">
            <div className="mhour sticky-l corner">
              <span className="corner-label">{refName} time</span>
            </div>
            {schedule.rows.map((row) => (
              <div key={row.city.id} className="mcity">
                <button
                  type="button"
                  className="mcity-x"
                  onClick={() => onRemove(row.city.id)}
                  aria-label={`Remove ${row.city.name}`}
                >
                  <XIcon size={12} />
                </button>
                {row.isRef && <span className="ref-badge">REF</span>}
                <button
                  type="button"
                  className="mcity-name"
                  disabled={row.isRef}
                  onClick={() => onSetReference(row.city.id)}
                  title={
                    row.isRef
                      ? `${row.city.name} is the reference city`
                      : `Make ${row.city.name} the reference city`
                  }
                >
                  {row.city.name}
                </button>
                <span className="mcity-offset">{row.offsetLabel}</span>
              </div>
            ))}
          </div>

          {HOURS.map((hour) => (
            <div key={hour} className="tz-row">
              <div className={cx('mhour', 'sticky-l', hour === schedule.nowRefHour && 'now')}>
                <span>{hourShort(hour, timeFormat)}</span>
              </div>
              {schedule.rows.map((row) => (
                <HourCell
                  key={row.city.id}
                  cell={row.cells[hour]}
                  cityName={row.city.name}
                  timeFormat={timeFormat}
                  isNow={hour === schedule.nowRefHour}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
