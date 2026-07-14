import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

import { getFlagEmoji } from '../data/cities';
import { formatTimeRange, groupHoursIntoRanges } from '../lib/timezone';
import type { AppMode, ComparisonModel, TimeFormat } from '../types';

interface OverlapSummaryProps {
  model: ComparisonModel;
  mode: AppMode;
  timeFormat: TimeFormat;
}

function HourCount({ count }: { count: number }) {
  return <span className="hour-count"><strong>{count}</strong> {count === 1 ? 'hour' : 'hours'}</span>;
}

function RangeBadges({ hours, timeFormat }: { hours: number[]; timeFormat: TimeFormat }) {
  const ranges = groupHoursIntoRanges(hours);
  if (ranges.length === 0) {
    return (
      <span className="no-overlap-message">
        <AlertTriangle size={14} aria-hidden="true" />
        No shared time
      </span>
    );
  }

  return (
    <div className="range-badges" aria-label="Available time ranges">
      {ranges.map((range) => (
        <span className="range-badge" key={`${range.startHour}-${range.endHour}`}>
          {formatTimeRange(range, timeFormat)}
        </span>
      ))}
    </div>
  );
}

function MeetingSummary({ model, timeFormat }: Omit<OverlapSummaryProps, 'mode'>) {
  const count = model.meetingHours.length;
  const hasOverlap = count > 0;

  return (
    <section className="summary-card summary-card--meeting" data-warning={!hasOverlap} aria-live="polite">
      <div className="summary-card__icon" aria-hidden="true">
        {hasOverlap ? <CheckCircle2 size={21} /> : <AlertTriangle size={21} />}
      </div>
      <div className="summary-card__body">
        <p className="summary-card__eyebrow">Common window · {model.referenceCity.name} time</p>
        <div className="summary-card__headline">
          <HourCount count={count} />
          {hasOverlap ? <span>when everyone is awake</span> : <span>of shared availability</span>}
        </div>
        {hasOverlap ? (
          <RangeBadges hours={model.meetingHours} timeFormat={timeFormat} />
        ) : (
          <p className="summary-card__warning-copy">Try a wider awake window or remove a distant city.</p>
        )}
      </div>
    </section>
  );
}

function BaseSummary({ model, timeFormat }: Omit<OverlapSummaryProps, 'mode'>) {
  return (
    <section className="summary-card summary-card--base" aria-live="polite">
      <div className="base-summary__header">
        <div>
          <p className="summary-card__eyebrow">Pairwise windows · {model.referenceCity.name} time</p>
          <h2>Availability with your base</h2>
        </div>
        <p>Each city is compared independently.</p>
      </div>
      <div className="base-summary__rows">
        {model.timelines.slice(1).map(({ city }) => {
          const hours = model.baseHoursByCityId[city.id];
          return (
            <div className="base-summary__row" key={city.id}>
              <div className="base-summary__route">
                <span aria-hidden="true">{getFlagEmoji(model.referenceCity.countryCode)}</span>
                <ArrowRight size={13} aria-hidden="true" />
                <span aria-hidden="true">{getFlagEmoji(city.countryCode)}</span>
                <strong>{city.name}</strong>
              </div>
              <HourCount count={hours.length} />
              <RangeBadges hours={hours} timeFormat={timeFormat} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function OverlapSummary({ model, mode, timeFormat }: OverlapSummaryProps) {
  if (model.timelines.length < 2) return null;
  return mode === 'meeting'
    ? <MeetingSummary model={model} timeFormat={timeFormat} />
    : <BaseSummary model={model} timeFormat={timeFormat} />;
}
