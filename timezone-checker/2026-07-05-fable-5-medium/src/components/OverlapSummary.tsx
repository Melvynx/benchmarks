import type { Mode, OverlapModel } from '../lib/overlap';
import { formatRange, type HourRange, type TimeFormat } from '../lib/time';

interface Props {
  model: OverlapModel;
  mode: Mode;
  timeFormat: TimeFormat;
}

function RangeBadges({ ranges, format }: { ranges: HourRange[]; format: TimeFormat }) {
  return (
    <span className="summary__badges">
      {ranges.map((r) => (
        <span key={r.start} className="summary__badge">
          {formatRange(r, format)}
        </span>
      ))}
    </span>
  );
}

export function OverlapSummary({ model, mode, timeFormat }: Props) {
  if (model.rows.length < 2) return null;

  const refName = model.rows[0].city.name;

  if (mode === 'meeting') {
    const count = model.meetingHours.length;
    return (
      <section className="summary" aria-live="polite">
        {count === 0 ? (
          <p className="summary__warning">
            <span aria-hidden="true">⚠</span> No hour when everyone is awake. Try widening the
            awake window or removing a city.
          </p>
        ) : (
          <div className="summary__row">
            <span className="summary__count">
              <strong>{count}</strong> overlap {count === 1 ? 'hour' : 'hours'}
            </span>
            <span className="summary__context">everyone awake, in {refName} time</span>
            <RangeBadges ranges={model.meetingRanges} format={timeFormat} />
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="summary" aria-live="polite">
      {model.rows.slice(1).map((row) => {
        const count = row.ranges.reduce((n, r) => n + (r.end - r.start), 0);
        return (
          <div key={row.city.id} className="summary__row">
            <span className="summary__city">{row.city.name}</span>
            {count === 0 ? (
              <span className="summary__warning summary__warning--inline">
                <span aria-hidden="true">⚠</span> no overlap with {refName}
              </span>
            ) : (
              <>
                <span className="summary__count">
                  <strong>{count}</strong> {count === 1 ? 'hour' : 'hours'}
                </span>
                <RangeBadges ranges={row.ranges} format={timeFormat} />
              </>
            )}
          </div>
        );
      })}
      <p className="summary__context summary__context--footer">
        Overlap with {refName}, shown in {refName} time
      </p>
    </section>
  );
}
