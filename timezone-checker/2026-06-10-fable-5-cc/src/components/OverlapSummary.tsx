import type { City } from '../data/cities';
import type { Mode, Settings } from '../lib/appState';
import { formatRange, hoursToRanges } from '../lib/format';
import type { Schedule } from '../lib/overlap';
import { WarnIcon } from './icons';

interface OverlapSummaryProps {
  schedule: Schedule;
  mode: Mode;
  settings: Settings;
  cities: City[];
}

export function OverlapSummary({ schedule, mode, settings, cities }: OverlapSummaryProps) {
  if (cities.length < 2) {
    return (
      <section className="card summary summary--empty">
        <p>
          {cities.length === 0
            ? 'Add cities to compare availability across timezones.'
            : `Add one more city to find shared hours with ${cities[0].name}.`}
        </p>
      </section>
    );
  }

  const ref = cities[0];

  if (mode === 'meeting') {
    const hours = schedule.meetingHours;
    const ranges = hoursToRanges(hours);
    return (
      <section className="card summary">
        <div className="summary-head">
          <h2>Everyone’s awake</h2>
          <p>
            common window across all {cities.length} cities · shown in {ref.name} time
          </p>
        </div>
        {hours.length > 0 ? (
          <div className="summary-row">
            <span className="count-chip">
              {hours.length} {hours.length === 1 ? 'hour' : 'hours'}
            </span>
            <div className="range-badges">
              {ranges.map((range) => (
                <span key={range.start} className="range-badge">
                  {formatRange(range, settings.format)}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="warning">
            <WarnIcon /> No hour when all {cities.length} cities are awake — widen the awake window
            or drop a city.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="card summary">
      <div className="summary-head">
        <h2>One-on-one with {ref.name}</h2>
        <p>each city’s own overlap with the reference · shown in {ref.name} time</p>
      </div>
      <ul className="summary-list">
        {schedule.lanes.slice(1).map((lane) => {
          const count = lane.overlapHours.length;
          const ranges = hoursToRanges(lane.overlapHours);
          return (
            <li key={lane.city.id}>
              <span className="summary-city">{lane.city.name}</span>
              {count > 0 ? (
                <>
                  <span className="count-chip">{count}h</span>
                  <div className="range-badges">
                    {ranges.map((range) => (
                      <span key={range.start} className="range-badge">
                        {formatRange(range, settings.format)}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <span className="warning warning--inline">
                  <WarnIcon /> no overlap
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
