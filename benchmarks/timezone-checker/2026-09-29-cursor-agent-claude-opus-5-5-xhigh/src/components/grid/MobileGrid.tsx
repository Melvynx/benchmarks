import { X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { formatDiff, formatOffset, type TimeFormat } from '../../lib/format';
import { HOURS_PER_DAY, MINUTES_PER_DAY } from '../../lib/math';
import { contiguousRuns, type GridRow, HOURS, joinsAt, type OverlapModel } from '../../lib/overlap';
import { removeCityWithUndo } from '../../store/actions';
import { useAppStore } from '../../store/app-store';
import { RefBadge } from '../ui/RefBadge';
import { HourCell } from './HourCell';

interface GridProps {
  model: OverlapModel;
  reference: GridRow;
  format: TimeFormat;
}

const toPercent = (hours: number) => `${(hours / HOURS_PER_DAY) * 100}%`;

/** Cities as columns, the reference city's 24 hours as rows. */
export function MobileGrid({ model, reference, format }: GridProps) {
  const columns: CSSProperties = { gridTemplateColumns: `repeat(${model.rows.length}, minmax(0, 1fr))` };
  const nowHours = (model.referenceNowMinutes / MINUTES_PER_DAY) * HOURS_PER_DAY;
  const bands = model.mode === 'meeting' ? contiguousRuns(model.sharedHours) : [];

  return (
    <div role="table" aria-label={`Hour-by-hour availability. Rows are hours in ${reference.city.name}.`}>
      <div
        role="row"
        className="sticky top-0 z-20 -mx-3 grid rounded-t-[1.25rem] border-b border-line bg-surface/95 px-3 pt-1 pb-2 backdrop-blur-md"
        style={columns}
      >
        {model.rows.map((row) => (
          <MobileCityHeader key={row.city.id} row={row} />
        ))}
      </div>

      <div className="relative mt-2">
        {bands.map((band) => (
          <div
            key={band.start}
            aria-hidden
            className="pointer-events-none absolute -inset-x-1 rounded-xl bg-overlap-soft"
            style={{ top: toPercent(band.start), height: toPercent(band.length) }}
          />
        ))}

        {HOURS.map((hour) => (
          <div key={hour} role="row" className="relative grid h-10" style={columns}>
            {model.rows.map((row) => (
              <HourCell
                key={row.city.id}
                cell={row.cells[hour]}
                cityName={row.city.name}
                format={format}
                orientation="column"
                {...joinsAt(row.cells, hour)}
              />
            ))}
          </div>
        ))}

        <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10" style={{ top: toPercent(nowHours) }}>
          <div className="now-line inset-x-0 h-0.5 -translate-y-1/2" />
          <div className="absolute top-0 -left-1 size-2.5 -translate-y-1/2 rounded-full bg-now ring-2 ring-surface" />
        </div>
      </div>
    </div>
  );
}

function MobileCityHeader({ row }: { row: GridRow }) {
  const setReference = useAppStore((state) => state.setReference);
  const { city, isReference } = row;

  return (
    <div role="columnheader" className="flex min-w-0 flex-col items-center px-0.5 text-center">
      <button
        type="button"
        onClick={() => setReference(city.id)}
        disabled={isReference}
        aria-label={isReference ? `${city.name}, reference city` : `Make ${city.name} the reference city`}
        className="flex w-full min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1.5 transition-colors enabled:active:bg-sunken"
      >
        {isReference ? (
          <RefBadge />
        ) : (
          <span className="h-[1.125rem] max-w-full truncate font-mono text-[0.625rem] leading-[1.125rem] text-ink-3">
            {formatDiff(row.diffMinutes)}
          </span>
        )}
        <span className="flex h-8 items-center">
          <span className="line-clamp-2 text-[0.8125rem] leading-tight font-semibold break-words text-ink">
            {city.name}
          </span>
        </span>
        <span className="max-w-full truncate font-mono text-[0.625rem] text-ink-3">{formatOffset(row.offsetMinutes)}</span>
      </button>
      <button
        type="button"
        aria-label={`Remove ${city.name}`}
        onClick={() => removeCityWithUndo(city.id)}
        className="grid size-7 place-items-center rounded-md text-ink-3 transition-colors active:bg-danger-soft active:text-danger"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
