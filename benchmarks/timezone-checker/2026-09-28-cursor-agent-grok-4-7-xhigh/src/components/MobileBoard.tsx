import { Fragment, useState } from 'react';
import type { BoardModel } from '../lib/board';
import { cx } from '../lib/cx';
import { RemoveButton, promoteLabel } from './CityFacts';
import { Tick, TimeCell } from './TimeCell';

type Props = {
  board: BoardModel;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
};

export function MobileBoard({ board, onPromote, onRemove }: Props) {
  const [hot, setHot] = useState<number | null>(null);
  const ref = board.rows[0]?.city;
  if (!ref) return null;

  return (
    <div
      className="m-board"
      data-layout="mobile"
      aria-label={`Hours in ${ref.name}`}
      style={{
        gridTemplateColumns: `58px repeat(${board.rows.length}, minmax(${board.rows.length > 3 ? 108 : 0}px, 1fr))`,
      }}
      onMouseLeave={() => setHot(null)}
    >
      <div className="m-corner">
        <span className="kicker">Hour</span>
      </div>
      {board.rows.map((row) => (
        <div key={row.city.id} className="m-city" data-city={row.city.id} data-ref={row.isReference ? 'true' : 'false'}>
          <div className="m-top">
            {row.isReference ? <span className="ref-badge">REF</span> : null}
            <RemoveButton name={row.city.name} onClick={() => onRemove(row.city.id)} />
          </div>
          <button type="button" className="city-hit" aria-label={promoteLabel(row)} onClick={() => onPromote(row.city.id)}>
            <span className="city-name">{row.city.name}</span>
            <span className="city-sub">{row.city.country}</span>
            <span className="city-sub">{row.abbrev ? `${row.abbrev} · ${row.offsetLabel}` : row.offsetLabel}</span>
            <span className="city-now">{row.nowLabel}</span>
          </button>
        </div>
      ))}
      {board.axis.map((col) => (
        <Fragment key={col.hour}>
          <div
            className={cx('m-hour', `axis-${col.state}`, col.isNow && 'is-now', hot === col.hour && 'is-hot')}
            data-hour={col.hour}
            data-state={col.state}
            aria-current={col.isNow ? 'time' : undefined}
            onMouseEnter={() => setHot(col.hour)}
            onClick={() => setHot((current) => (current === col.hour ? null : col.hour))}
          >
            <Tick hour={col.hour} minute={0} format={board.format} />
          </div>
          {board.rows.map((row) => {
            const cell = row.cells[col.hour];
            if (!cell) return null;
            return (
              <TimeCell
                key={row.city.id}
                cell={cell}
                cityName={row.city.name}
                format={board.format}
                hot={hot === col.hour}
                onHot={setHot}
              />
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
