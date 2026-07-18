import type { City } from "../data/cities";
import {
  countHours,
  formatRange,
  rangesFromHours,
  type Mode,
  type TimeFormat,
} from "../lib/timezone";
import { LinkIcon, UsersIcon, WarningIcon } from "./Icons";

type OverlapSummaryProps = {
  cities: City[];
  mode: Mode;
  timeFormat: TimeFormat;
  meetingOverlap: boolean[];
  baseOverlaps: boolean[][];
};

function RangeBadges({ hours, timeFormat }: { hours: boolean[]; timeFormat: TimeFormat }) {
  const ranges = rangesFromHours(hours);
  if (ranges.length === 0) return null;
  return (
    <div className="range-list">
      {ranges.map((range) => (
        <span className="range-badge" key={`${range.start}-${range.end}`}>
          {formatRange(range, timeFormat)}
        </span>
      ))}
    </div>
  );
}

function CountLabel({ count }: { count: number }) {
  return <><strong>{count}</strong> {count === 1 ? "hour" : "hours"}</>;
}

export function OverlapSummary({
  cities,
  mode,
  timeFormat,
  meetingOverlap,
  baseOverlaps,
}: OverlapSummaryProps) {
  if (cities.length < 2) return null;
  const reference = cities[0];

  if (mode === "meeting") {
    const count = countHours(meetingOverlap);
    return (
      <section className={`overlap-summary meeting-summary ${count === 0 ? "zero" : ""}`} aria-live="polite">
        <div className="summary-icon" aria-hidden="true">{count === 0 ? <WarningIcon /> : <UsersIcon />}</div>
        <div className="summary-copy">
          <span className="summary-label">Everyone awake</span>
          {count === 0 ? (
            <div className="zero-copy">
              <strong>No common awake hours</strong>
              <span>Widen the awake window or compare fewer cities.</span>
            </div>
          ) : (
            <div className="summary-result">
              <span className="summary-count"><CountLabel count={count} /></span>
              <RangeBadges hours={meetingOverlap} timeFormat={timeFormat} />
            </div>
          )}
        </div>
        <span className="summary-timezone">{reference.name} time</span>
      </section>
    );
  }

  return (
    <section className="overlap-summary base-summary" aria-live="polite">
      <div className="base-summary-heading">
        <div className="summary-icon" aria-hidden="true"><LinkIcon /></div>
        <div>
          <span className="summary-label">Pairwise availability</span>
          <strong>Compared with {reference.name}</strong>
        </div>
        <span className="summary-timezone">{reference.name} time</span>
      </div>
      <div className="base-summary-list">
        {cities.slice(1).map((city, listIndex) => {
          const cityIndex = listIndex + 1;
          const overlap = baseOverlaps[cityIndex];
          const count = countHours(overlap);
          return (
            <div className={`base-summary-row ${count === 0 ? "zero" : ""}`} key={city.id}>
              <span className="base-city-name">{city.name}</span>
              {count === 0 ? (
                <span className="pair-warning"><WarningIcon /> No shared hours</span>
              ) : (
                <>
                  <span className="base-count"><CountLabel count={count} /></span>
                  <RangeBadges hours={overlap} timeFormat={timeFormat} />
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
