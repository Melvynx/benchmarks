import { formatRange, hoursLabel } from '../lib/format';
import { toRanges, type CityRow } from '../lib/schedule';
import { cx } from '../lib/cx';
import type { Mode, TimeFormat } from '../types';

type Props = {
  mode: Mode;
  format: TimeFormat;
  rows: CityRow[];
  meetingHours: number[];
};

export function OverlapSummary({ mode, format, rows, meetingHours }: Props) {
  if (rows.length < 2) return null;
  const reference = rows[0].city;

  if (mode === 'meeting') {
    const ranges = toRanges(meetingHours);
    const empty = meetingHours.length === 0;
    return (
      <section className={cx('summary', empty && 'is-empty')} data-testid="overlap-summary" aria-live="polite">
        <p className="summary-kicker">In {reference.city} time</p>
        {empty ? (
          <p className="warning">No shared awake hours</p>
        ) : (
          <div className="summary-main">
            <strong className="summary-count">{hoursLabel(meetingHours.length)} in common</strong>
            <div className="badges">
              {ranges.map((range) => (
                <span className="badge" key={`${range.start}-${range.end}`}>
                  {formatRange(range, format)}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }

  const others = rows.slice(1);
  const allEmpty = others.every((row) => row.overlapRefHours.length === 0);

  return (
    <section className={cx('summary', allEmpty && 'is-empty')} data-testid="overlap-summary" aria-live="polite">
      <p className="summary-kicker">Each city against {reference.city}</p>
      <ul className="base-list">
        {others.map((row) => {
          const ranges = toRanges(row.overlapRefHours);
          return (
            <li key={row.city.id} className="base-line" data-testid={`summary-${row.city.id}`}>
              <span className="who">{row.city.city}</span>
              {row.overlapRefHours.length === 0 ? (
                <span className="warning">No overlap with {reference.city}</span>
              ) : (
                <>
                  <span className="base-count">{hoursLabel(row.overlapRefHours.length)}</span>
                  <span className="badges">
                    {ranges.map((range) => (
                      <span className="badge" key={`${row.city.id}-${range.start}-${range.end}`}>
                        {formatRange(range, format)}
                      </span>
                    ))}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
