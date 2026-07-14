import type { OverlapModel } from '../lib/overlap';
import { formatCellLabel, type TimeFormat } from '../lib/time';
import { RemoveButton } from './CityLabel';
import { HourCell } from './HourCell';

interface Props {
  model: OverlapModel;
  timeFormat: TimeFormat;
  nowHour: number | null;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

/** Mobile layout: cities as columns, the 24 reference hours as rows. */
export function MobileGrid({ model, timeFormat, nowHour, onPromote, onRemove }: Props) {
  const canRemove = model.rows.length > 1;
  const columns = { gridTemplateColumns: `3.4rem repeat(${model.rows.length}, 1fr)` };

  return (
    <div className="grid-mobile" role="table" aria-label="Hour overlap grid">
      <div className="grid-mobile__row grid-mobile__row--head" style={columns}>
        <div className="grid-mobile__corner" />
        {model.rows.map((row) => (
          <div className="grid-mobile__city" key={row.city.id}>
            <button
              type="button"
              className="city-label__name"
              onClick={() => onPromote(row.city.id)}
              disabled={row.isReference}
            >
              {row.city.name}
            </button>
            {row.isReference && <span className="city-label__ref">REF</span>}
            <span className="city-label__offset">{row.offsetLabel}</span>
            {canRemove && (
              <RemoveButton cityName={row.city.name} onRemove={() => onRemove(row.city.id)} />
            )}
          </div>
        ))}
      </div>

      {HOURS.map((h) => (
        <div className="grid-mobile__row" key={h} style={columns}>
          <div
            className={`grid-mobile__hour${h === nowHour ? ' grid-mobile__hour--now' : ''}`}
          >
            {formatCellLabel(h * 60, timeFormat)}
          </div>
          {model.rows.map((row) => (
            <HourCell key={row.city.id} cell={row.cells[h]} cityName={row.city.name} format={timeFormat} />
          ))}
        </div>
      ))}
    </div>
  );
}
