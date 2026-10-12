import { formatRange, toRanges, type TimeFormat } from '../lib/time';
import type { CityRow } from '../types';
import type { Mode } from '../lib/storage';

interface OverlapSummaryProps {
  rows: CityRow[];
  mode: Mode;
  format: TimeFormat;
}

function RangeChips({ flags, format }: { flags: boolean[]; format: TimeFormat }) {
  return (
    <div className="chips">
      {toRanges(flags).map((range) => (
        <span key={range.start} className="chip">
          {formatRange(range, format)}
        </span>
      ))}
    </div>
  );
}

function hoursLabel(count: number): string {
  return `${count} hour${count === 1 ? '' : 's'}`;
}

export function OverlapSummary({ rows, mode, format }: OverlapSummaryProps) {
  if (rows.length < 2) {
    return <p className="summary-empty">Add at least one more city to see overlaps.</p>;
  }

  const ref = rows[0];

  if (mode === 'meeting') {
    const shared = ref.overlap;
    const count = shared.filter(Boolean).length;
    return (
      <section className="summary" aria-live="polite">
        <div className="summary-head">
          <span className="summary-count">{count === 0 ? 'No shared hours' : `${hoursLabel(count)} shared`}</span>
          <span className="summary-note">everyone awake · {ref.city.name} time</span>
        </div>
        {count === 0 ? (
          <p className="warning">
            No hour where everyone is awake. Widen the awake window or remove a city.
          </p>
        ) : (
          <RangeChips flags={shared} format={format} />
        )}
      </section>
    );
  }

  return (
    <section className="summary" aria-live="polite">
      <div className="summary-head">
        <span className="summary-count">Overlap with {ref.city.name}</span>
        <span className="summary-note">{ref.city.name} time</span>
      </div>
      <ul className="base-list">
        {rows.slice(1).map((row) => {
          const count = row.overlap.filter(Boolean).length;
          return (
            <li key={row.city.id} className="base-item">
              <div className="base-title">
                <span className="base-name">{row.city.name}</span>
                <span className="base-count">{count === 0 ? 'none' : hoursLabel(count)}</span>
              </div>
              {count === 0 ? (
                <p className="warning">No overlap with {ref.city.name}.</p>
              ) : (
                <RangeChips flags={row.overlap} format={format} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
