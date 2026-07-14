import { AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';

import { countHours, formatHour, getHourRanges } from '../lib/timezone';
import type { City, PlannerMode, TimeFormat } from '../types';

interface OverlapSummaryProps {
  cities: City[];
  mode: PlannerMode;
  timeFormat: TimeFormat;
  meetingMask: boolean[];
  baseMasks: Map<string, boolean[]>;
}

export function OverlapSummary({
  cities,
  mode,
  timeFormat,
  meetingMask,
  baseMasks,
}: OverlapSummaryProps) {
  const referenceCity = cities[0];
  if (!referenceCity || cities.length < 2) return null;

  if (mode === 'meeting') {
    const overlapCount = countHours(meetingMask);

    return (
      <section className={overlapCount === 0 ? 'overlap-summary has-warning' : 'overlap-summary'} aria-live="polite">
        <div className="summary-icon" aria-hidden="true">
          {overlapCount > 0 ? <Sparkles size={18} /> : <AlertTriangle size={18} />}
        </div>
        <div className="summary-copy">
          <span className="summary-kicker">Everyone awake · {referenceCity.name} time</span>
          <strong>
            {overlapCount > 0
              ? `${overlapCount} good ${overlapCount === 1 ? 'hour' : 'hours'}`
              : 'No shared awake hours'}
          </strong>
        </div>
        <RangeList mask={meetingMask} timeFormat={timeFormat} />
      </section>
    );
  }

  return (
    <section className="base-summary" aria-live="polite">
      <div className="base-summary-heading">
        <span>One-to-one windows</span>
        <strong>{referenceCity.name} as your base</strong>
      </div>
      <div className="base-summary-lines">
        {cities.slice(1).map((city) => {
          const mask = baseMasks.get(city.id) ?? [];
          const overlapCount = countHours(mask);

          return (
            <div className={overlapCount === 0 ? 'base-summary-line has-warning' : 'base-summary-line'} key={city.id}>
              <div className="base-city-pair">
                <span>{referenceCity.name}</span><ArrowRight size={14} /><strong>{city.name}</strong>
              </div>
              <span className="base-count">
                {overlapCount > 0 ? `${overlapCount}h overlap` : 'No overlap'}
              </span>
              <RangeList mask={mask} timeFormat={timeFormat} compact />
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface RangeListProps {
  mask: boolean[];
  timeFormat: TimeFormat;
  compact?: boolean;
}

function RangeList({ mask, timeFormat, compact = false }: RangeListProps) {
  const ranges = getHourRanges(mask);
  if (ranges.length === 0) return null;

  return (
    <div className={compact ? 'range-list is-compact' : 'range-list'}>
      {ranges.map((range) => (
        <span className="range-badge" key={`${range.start}-${range.end}`}>
          {formatHour(range.start, timeFormat)} <span>—</span> {formatHour(range.end, timeFormat)}
        </span>
      ))}
    </div>
  );
}
