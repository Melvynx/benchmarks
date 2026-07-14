import type { City, Mode, TimeFormat } from '../types';
import type { ScheduleModel } from '../lib/schedule';
import { formatRange } from '../lib/format';
import { WarnIcon } from './icons';

interface OverlapSummaryProps {
  schedule: ScheduleModel;
  mode: Mode;
  timeFormat: TimeFormat;
  refCity: City | null;
}

export function OverlapSummary({ schedule, mode, timeFormat, refCity }: OverlapSummaryProps) {
  if (!refCity || schedule.rows.length === 0) return null;

  if (schedule.rows.length === 1) {
    return (
      <section className="summary">
        <span className="summary-kicker">Overlap</span>
        <p className="summary-info">Add a second city to see shared awake hours and meeting windows.</p>
      </section>
    );
  }

  const refLabel = `${refCity.name} time (${schedule.rows[0].offsetLabel})`;

  if (mode === 'meeting' && schedule.meeting) {
    const { count, ranges } = schedule.meeting;
    return (
      <section className="summary" aria-live="polite">
        <span className="summary-kicker">Common window · {schedule.rows.length} cities</span>
        {count === 0 ? (
          <div className="summary-warn">
            <WarnIcon />
            <span>
              No hour of the day works for all {schedule.rows.length} cities with the current awake window. Try
              widening it, or switch to Base mode for per-city windows.
            </span>
          </div>
        ) : (
          <>
            <div className="summary-line">
              <span className="count-num">
                {count}
                <span className="count-unit">h</span>
              </span>
              <div className="range-badges">
                {ranges.map((range) => (
                  <span key={range.start} className="range-badge">
                    {formatRange(range, timeFormat)}
                  </span>
                ))}
              </div>
            </div>
            <p className="summary-caption">Hours when everyone is awake, shown in {refLabel}.</p>
          </>
        )}
      </section>
    );
  }

  if (mode === 'base' && schedule.base) {
    const base = schedule.base;
    return (
      <section className="summary" aria-live="polite">
        <span className="summary-kicker">Overlap with {refCity.name} · city by city</span>
        <ul className="base-list">
          {schedule.rows.slice(1).map((row) => {
            const info = base.get(row.city.id);
            if (!info) return null;
            return (
              <li key={row.city.id} className="base-line">
                <span className="base-city">{row.city.name}</span>
                {info.count === 0 ? (
                  <span className="base-warn">
                    <WarnIcon /> No overlap with {refCity.name}
                  </span>
                ) : (
                  <>
                    <span className="base-count">{info.count}h</span>
                    <span className="range-badges">
                      {info.ranges.map((range) => (
                        <span key={range.start} className="range-badge">
                          {formatRange(range, timeFormat)}
                        </span>
                      ))}
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
        <p className="summary-caption">Each city compared only against {refLabel}.</p>
      </section>
    );
  }

  return null;
}
