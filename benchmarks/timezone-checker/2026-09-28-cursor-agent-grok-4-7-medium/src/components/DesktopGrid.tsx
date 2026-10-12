import { formatOffset, clockParts } from '../lib/format';
import { cx } from '../lib/cx';
import { HourCell } from './HourCell';
import { IconClose } from './icons';
import type { GridProps } from './gridProps';

export function DesktopGrid({
  rows,
  format,
  nowHour,
  hoverHour,
  onHover,
  onPromote,
  onRemove,
  referenceDateLabel,
}: GridProps) {
  if (rows.length === 0) {
    return <p className="empty">No cities yet. Search above to add one.</p>;
  }

  return (
    <div className="board" onMouseLeave={() => onHover(null)}>
      <div className="desktop-scroll">
        <div className="desktop-grid" role="table" aria-label="Local hours by city">
          <div className="grid-row grid-head" role="row">
            <div className="city-meta head-meta" role="columnheader">
              <span className="head-kicker">Reference day</span>
              <strong>{referenceDateLabel}</strong>
            </div>
            {Array.from({ length: 24 }, (_, hour) => {
              const parts = clockParts(hour, 0, format);
              return (
                <div
                  key={hour}
                  role="columnheader"
                  className={cx('hour-label', hour === nowHour && 'is-now', hour === hoverHour && 'is-col-hover')}
                  onMouseEnter={() => onHover(hour)}
                  aria-current={hour === nowHour ? 'time' : undefined}
                >
                  <span className="cell-main">{parts.main}</span>
                  {parts.suffix ? <span className="cell-suffix">{parts.suffix}</span> : null}
                  <span className="now-dot" />
                </div>
              );
            })}
            <div role="columnheader" className="remove-spacer">
              <span className="sr-only">Remove</span>
            </div>
          </div>
          {rows.map((row, index) => {
            const isRef = index === 0;
            return (
              <div
                key={row.city.id}
                className={cx('grid-row', isRef && 'is-ref')}
                role="row"
                data-testid="city-row"
                data-city={row.city.id}
              >
                <div className="city-meta" role="rowheader">
                  <button
                    type="button"
                    className="city-name"
                    onClick={() => onPromote(row.city.id)}
                    aria-label={isRef ? `${row.city.city}, reference city` : `Make ${row.city.city} the reference city`}
                  >
                    <span>{row.city.city}</span>
                    {isRef ? <span className="ref-badge">REF</span> : null}
                  </button>
                  <span className="country">{row.city.country}</span>
                  <span className="offset">{formatOffset(row.offsetMinutes)}</span>
                </div>
                {row.cells.map((cell) => (
                  <HourCell
                    key={cell.refHour}
                    cell={cell}
                    cityId={row.city.id}
                    cityName={row.city.city}
                    format={format}
                    hovered={hoverHour === cell.refHour}
                    isNow={nowHour === cell.refHour}
                    onHover={onHover}
                  />
                ))}
                <button
                  type="button"
                  className="remove"
                  aria-label={`Remove ${row.city.city}`}
                  onClick={() => onRemove(row.city.id)}
                >
                  <IconClose />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
