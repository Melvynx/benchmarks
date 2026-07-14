import type { OverlapModel } from '../lib/overlap';
import { formatCellLabel, type TimeFormat } from '../lib/time';
import { CityLabel, RemoveButton } from './CityLabel';
import { HourCell } from './HourCell';

interface Props {
  model: OverlapModel;
  timeFormat: TimeFormat;
  nowHour: number | null;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

/** Desktop layout: cities as rows, the 24 reference hours as columns. */
export function DesktopGrid({ model, timeFormat, nowHour, onPromote, onRemove }: Props) {
  const canRemove = model.rows.length > 1;

  return (
    <div className="grid-desktop" role="table" aria-label="Hour overlap grid">
      <div className="grid-desktop__row grid-desktop__row--head">
        <div className="grid-desktop__corner" />
        {HOURS.map((h) => (
          <div
            key={h}
            className={`grid-desktop__hour${h === nowHour ? ' grid-desktop__hour--now' : ''}`}
            title={h === nowHour ? 'Current hour in the reference city' : undefined}
          >
            {formatCellLabel(h * 60, timeFormat)}
          </div>
        ))}
        <div className="grid-desktop__corner" />
      </div>

      {model.rows.map((row) => (
        <div className="grid-desktop__row" key={row.city.id}>
          <CityLabel row={row} onPromote={onPromote} />
          {row.cells.map((cell, h) => (
            <HourCell key={h} cell={cell} cityName={row.city.name} format={timeFormat} />
          ))}
          <div className="grid-desktop__actions">
            {canRemove && (
              <RemoveButton cityName={row.city.name} onRemove={() => onRemove(row.city.id)} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
