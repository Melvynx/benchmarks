import { useRef, type CSSProperties } from 'react';
import { clockParts, formatOffset } from '../lib/format';
import { cx } from '../lib/cx';
import { HourCell } from './HourCell';
import { IconClose } from './icons';
import type { GridProps } from './gridProps';

const GUTTER = 52;
const COL = 76;
const GAP = 4;

export function MobileGrid({
  rows,
  format,
  nowHour,
  hoverHour,
  onHover,
  onPromote,
  onRemove,
  referenceDateLabel,
}: GridProps) {
  const headRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  if (rows.length === 0) {
    return <p className="empty">No cities yet. Search above to add one.</p>;
  }

  const width = GUTTER + rows.length * COL + rows.length * GAP;
  const trackStyle = { '--track': `${width}px` } as CSSProperties;
  const rowStyle = {
    gridTemplateColumns: `${GUTTER}px repeat(${rows.length}, minmax(0, 1fr))`,
    columnGap: GAP,
  };

  function sync(source: HTMLDivElement, target: HTMLDivElement | null) {
    if (!target || syncing.current) return;
    if (target.scrollLeft === source.scrollLeft) return;
    syncing.current = true;
    target.scrollLeft = source.scrollLeft;
    syncing.current = false;
  }

  return (
    <div className="board mobile-board" role="table" aria-label="Local hours by city" onMouseLeave={() => onHover(null)}>
      <div className="m-head-scroll" ref={headRef} onScroll={(event) => sync(event.currentTarget, bodyRef.current)}>
        <div className="m-track" style={trackStyle}>
          <div className="m-row m-head" style={rowStyle} role="row">
            <div className="corner" role="columnheader">
              <span>{referenceDateLabel}</span>
            </div>
            {rows.map((row, index) => {
              const isRef = index === 0;
              return (
                <div key={row.city.id} className={cx('m-city', isRef && 'is-ref')} role="columnheader">
                  <button
                    type="button"
                    className="city-name"
                    onClick={() => onPromote(row.city.id)}
                    aria-label={isRef ? `${row.city.city}, reference city` : `Make ${row.city.city} the reference city`}
                  >
                    <span>{row.city.city}</span>
                    {isRef ? <span className="ref-badge">REF</span> : null}
                  </button>
                  <span className="offset">{formatOffset(row.offsetMinutes)}</span>
                  <button type="button" className="remove" aria-label={`Remove ${row.city.city}`} onClick={() => onRemove(row.city.id)}>
                    <IconClose />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="m-body-scroll" ref={bodyRef} onScroll={(event) => sync(event.currentTarget, headRef.current)}>
        <div className="m-body-inner m-track" style={trackStyle}>
          {Array.from({ length: 24 }, (_, hour) => {
            const parts = clockParts(hour, 0, format);
            return (
              <div key={hour} className="m-row" style={rowStyle} role="row">
                <div
                  className={cx('m-hour', hour === nowHour && 'is-now', hour === hoverHour && 'is-col-hover')}
                  role="rowheader"
                  onMouseEnter={() => onHover(hour)}
                  aria-current={hour === nowHour ? 'time' : undefined}
                >
                  <span className="cell-main">{parts.main}</span>
                  {parts.suffix ? <span className="cell-suffix">{parts.suffix}</span> : null}
                </div>
                {rows.map((row) => (
                  <HourCell
                    key={row.city.id}
                    cell={row.cells[hour]}
                    cityId={row.city.id}
                    cityName={row.city.city}
                    format={format}
                    hovered={hoverHour === hour}
                    isNow={nowHour === hour}
                    onHover={onHover}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
