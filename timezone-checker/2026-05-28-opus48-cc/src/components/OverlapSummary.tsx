import { formatHour, type TimeFormat } from "../lib/format";
import type { Computation, Mode, Range } from "../lib/overlap";

interface Props {
  computation: Computation;
  mode: Mode;
  timeFormat: TimeFormat;
  referenceName: string;
}

function RangeBadges({ ranges, format }: { ranges: Range[]; format: TimeFormat }) {
  return (
    <div className="ranges">
      {ranges.map((r, i) => (
        <span className="range-badge" key={i}>
          {formatHour(r.start, 0, format)} <span className="range-badge__arrow">→</span>{" "}
          {formatHour(r.end, 0, format)}
        </span>
      ))}
    </div>
  );
}

export function OverlapSummary({ computation, mode, timeFormat, referenceName }: Props) {
  if (mode === "meeting") {
    const { hours, ranges } = computation.meeting;
    return (
      <section className="summary" aria-live="polite">
        <div className="summary__head">
          <h2 className="summary__title">Common availability</h2>
          <span className="summary__sub">All cities awake · {referenceName} time</span>
        </div>
        {hours === 0 ? (
          <p className="summary__warn">
            <WarnIcon /> No shared window. Everyone is never awake at the same time.
          </p>
        ) : (
          <div className="summary__row">
            <span className="count-pill">
              <strong>{hours}</strong> {hours === 1 ? "hour" : "hours"}
            </span>
            <RangeBadges ranges={ranges} format={timeFormat} />
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="summary" aria-live="polite">
      <div className="summary__head">
        <h2 className="summary__title">Availability vs {referenceName}</h2>
        <span className="summary__sub">Per-city overlap · {referenceName} time</span>
      </div>
      <ul className="summary__list">
        {computation.base.map((row) => (
          <li className="summary__item" key={row.cityId}>
            <span className="summary__city">{row.cityName}</span>
            {row.hours === 0 ? (
              <span className="summary__warn summary__warn--inline">
                <WarnIcon /> No overlap
              </span>
            ) : (
              <div className="summary__row">
                <span className="count-pill count-pill--sm">
                  <strong>{row.hours}</strong> {row.hours === 1 ? "hr" : "hrs"}
                </span>
                <RangeBadges ranges={row.ranges} format={timeFormat} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function WarnIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" className="warn-icon">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
      />
    </svg>
  );
}
