import { ArrowRight, CircleCheck, Clock3, Info } from 'lucide-react';
import {
  formatTime,
  rangesFromHours,
  type CitySchedule,
  type Mode,
  type TimeFormat,
} from '../lib/time';

interface Props {
  schedules: CitySchedule[];
  mode: Mode;
  format: TimeFormat;
}

function Ranges({ overlap, format }: { overlap: boolean[]; format: TimeFormat }) {
  return (
    <div className="range-badges">
      {rangesFromHours(overlap).map((range) => (
        <span className="range-badge" key={range.start}>
          {formatTime(range.start * 60, format)}
          <ArrowRight size={12} />
          {formatTime(range.end * 60, format)}
          {range.end === 24 && <span className="next-day">+1</span>}
        </span>
      ))}
    </div>
  );
}

export default function OverlapSummary({ schedules, mode, format }: Props) {
  if (schedules.length < 2) return null;
  const reference = schedules[0].city.name;
  if (mode === 'base')
    return (
      <div className="base-summaries" aria-live="polite">
        {schedules.slice(1).map((schedule) => {
          const count = schedule.overlap.filter(Boolean).length;
          return (
            <div className={`base-summary ${count ? '' : 'no-overlap'}`} key={schedule.city.id}>
              <span className="summary-icon">
                {count ? <Clock3 size={19} /> : <Info size={19} />}
              </span>
              <div className="base-summary-text">
                <strong>
                  {schedule.city.name}
                  <span className="base-summary-count">
                    {count} {count === 1 ? 'hour' : 'hours'} together
                  </span>
                </strong>
                <span>
                  {count
                    ? `Shared availability with ${reference}`
                    : `No shared waking hours with ${reference}`}
                </span>
              </div>
              {count > 0 && <Ranges overlap={schedule.overlap} format={format} />}
            </div>
          );
        })}
        <span className="base-timezone-note">All windows shown in {reference} time</span>
      </div>
    );
  const count = schedules[0].overlap.filter(Boolean).length;
  return (
    <div className={`meeting-summary ${count ? '' : 'no-overlap'}`} aria-live="polite">
      <div className="summary-main">
        <span className="summary-icon">
          {count ? <CircleCheck size={22} /> : <Info size={22} />}
        </span>
        <div>
          <strong>
            {count ? (
              <>
                <span className="summary-count">
                  {count} {count === 1 ? 'hour' : 'hours'}
                </span>{' '}
                of common ground
              </>
            ) : (
              'No common waking hours'
            )}
          </strong>
          <p>
            {count
              ? `Everyone is awake. A good time to get together.`
              : 'Try a wider awake window or compare cities in Base mode.'}
          </p>
        </div>
      </div>
      {count > 0 && (
        <div className="summary-windows">
          <Ranges overlap={schedules[0].overlap} format={format} />
          <span>{reference} time</span>
        </div>
      )}
    </div>
  );
}
