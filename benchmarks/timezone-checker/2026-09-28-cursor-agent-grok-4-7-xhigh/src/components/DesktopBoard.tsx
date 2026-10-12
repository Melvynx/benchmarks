import { Fragment, useState } from 'react';
import type { BoardModel } from '../lib/board';
import { cx } from '../lib/cx';
import { formatClock } from '../lib/time';
import { CityFacts, RemoveButton, promoteLabel } from './CityFacts';
import { Tick, TimeCell } from './TimeCell';

type Props = {
  board: BoardModel;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
};

export function DesktopBoard({ board, onPromote, onRemove }: Props) {
  const [hot, setHot] = useState<number | null>(null);
  const ref = board.rows[0]?.city;
  if (!ref) return null;

  return (
    <div className="d-board" data-layout="desktop" aria-label={`Hours in ${ref.name}`} onMouseLeave={() => setHot(null)}>
      <div className="d-corner">
        <span className="kicker">Reference hours</span>
        <span className="corner-city">{ref.name}</span>
      </div>
      {board.axis.map((col) => (
        <div
          key={col.hour}
          className={cx('d-hour', `axis-${col.state}`, col.isNow && 'is-now', hot === col.hour && 'is-hot')}
          data-hour={col.hour}
          data-state={col.state}
          aria-current={col.isNow ? 'time' : undefined}
          title={`${formatClock(col.hour, 0, board.format)} in ${ref.name}`}
          onMouseEnter={() => setHot(col.hour)}
        >
          <Tick hour={col.hour} minute={0} format={board.format} />
        </div>
      ))}
      <div className="d-end" aria-hidden="true" />
      {board.rows.map((row) => (
        <Fragment key={row.city.id}>
          <button
            type="button"
            className="d-city"
            data-city={row.city.id}
            data-ref={row.isReference ? 'true' : 'false'}
            aria-label={promoteLabel(row)}
            onClick={() => onPromote(row.city.id)}
          >
            <CityFacts row={row} />
          </button>
          {row.cells.map((cell) => (
            <TimeCell
              key={cell.refHour}
              cell={cell}
              cityName={row.city.name}
              format={board.format}
              hot={hot === cell.refHour}
              onHot={setHot}
            />
          ))}
          <div className="d-remove">
            <RemoveButton name={row.city.name} onClick={() => onRemove(row.city.id)} />
          </div>
        </Fragment>
      ))}
    </div>
  );
}
