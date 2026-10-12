import { ArrowUpRight, Moon, Sun, X } from 'lucide-react';
import {
  formatOffset,
  formatTime,
  HOURS,
  timeParts,
  type CitySchedule,
  type Mode,
  type TimeFormat,
} from '../lib/time';

interface Props {
  schedules: CitySchedule[];
  format: TimeFormat;
  mode: Mode;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
  now: Date;
}

function HourCell({
  schedule,
  hour,
  format,
  reference,
  mode,
}: {
  schedule: CitySchedule;
  hour: number;
  format: TimeFormat;
  reference: string;
  mode: Mode;
}) {
  const parts = timeParts(schedule.minutes[hour], format);
  const state = schedule.overlap[hour] ? 'overlap' : schedule.awake[hour] ? 'awake' : 'sleeping';
  return (
    <div
      className={`hour-cell ${state}`}
      data-hour={hour}
      data-state={state}
      title={`${schedule.city.name}: ${formatTime(schedule.minutes[hour], format)} · ${state === 'overlap' ? (mode === 'meeting' ? 'Everyone is awake' : 'Shared availability with the base') : state === 'awake' ? 'Awake, no shared availability' : 'Sleeping'}\n${reference}: ${formatTime(hour * 60, format)}`}
    >
      <span className="hour-number">{parts.number}</span>
      <span className="hour-period">{parts.period || '·'}</span>
    </div>
  );
}

function CityInfo({
  schedule,
  isReference,
  onPromote,
  now,
  format,
}: {
  schedule: CitySchedule;
  isReference: boolean;
  onPromote: (id: string) => void;
  now: Date;
  format: TimeFormat;
}) {
  const currentTime = new Intl.DateTimeFormat('en-US', {
    timeZone: schedule.city.timezone,
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: format === '12h' ? 'h12' : 'h23',
  }).format(now);
  return (
    <div className="city-info">
      <span className="city-flag">{schedule.city.flag}</span>
      <div className="city-details">
        <div className="city-name-line">
          <button
            className="city-name"
            title={
              isReference ? 'Your reference city' : `Make ${schedule.city.name} the reference city`
            }
            aria-label={`Make ${schedule.city.name} reference city`}
            onClick={() => onPromote(schedule.city.id)}
          >
            {schedule.city.name}
          </button>
          {isReference && <span className="ref-badge">REF</span>}
        </div>
        <span className="city-metadata">
          {formatOffset(schedule.offset)}
          <span className="metadata-dot">·</span>
          {currentTime.replace(' AM', 'am').replace(' PM', 'pm')}
        </span>
      </div>
    </div>
  );
}

export default function TimeGrid({ schedules, format, mode, onPromote, onRemove, now }: Props) {
  if (!schedules.length) return null;
  const reference = schedules[0].city.name;
  return (
    <>
      <div className="desktop-grid">
        <div className="grid-scroll">
          <div className="grid-inner">
            <div className="day-period-row">
              <span className="city-column-label">CITY / LOCAL TIME</span>
              <span className="day-period">
                <Moon size={12} /> EARLY HOURS
              </span>
              <span className="day-period">
                <Sun size={12} /> MORNING
              </span>
              <span className="day-period">
                <Sun size={12} /> AFTERNOON
              </span>
              <span className="day-period">
                <Moon size={12} /> EVENING
              </span>
              <span />
            </div>
            <div className="reference-hours-row">
              <span className="reference-axis">
                {reference}
                <ArrowUpRight size={12} />
              </span>
              {HOURS.map((hour) => (
                <span
                  key={hour}
                  className={`reference-hour ${schedules[0].overlap[hour] ? 'reference-overlap' : ''}`}
                >
                  {timeParts(hour * 60, format).number}
                  <small>{timeParts(hour * 60, format).period}</small>
                </span>
              ))}
              <span />
            </div>
            {schedules.map((schedule, index) => (
              <div
                className={`city-grid-row ${index === 0 ? 'reference-row' : ''}`}
                key={schedule.city.id}
                data-city={schedule.city.id}
              >
                <CityInfo
                  schedule={schedule}
                  isReference={index === 0}
                  onPromote={onPromote}
                  now={now}
                  format={format}
                />
                {HOURS.map((hour) => (
                  <HourCell
                    key={hour}
                    schedule={schedule}
                    hour={hour}
                    format={format}
                    reference={reference}
                    mode={mode}
                  />
                ))}
                <button
                  className="remove-city icon-button"
                  aria-label={`Remove ${schedule.city.name}`}
                  onClick={() => onRemove(schedule.city.id)}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mobile-grid">
        <div className="mobile-scroll">
          <div
            className="mobile-grid-inner"
            style={{ gridTemplateColumns: `52px repeat(${schedules.length}, minmax(78px, 1fr))` }}
          >
            <div className="mobile-axis-heading">
              REF
              <br />
              TIME
            </div>
            {schedules.map((schedule, index) => (
              <div
                className={`mobile-city-header ${index === 0 ? 'is-reference' : ''}`}
                key={schedule.city.id}
              >
                <span className="city-flag">{schedule.city.flag}</span>
                <button
                  className="city-name"
                  onClick={() => onPromote(schedule.city.id)}
                  title={`Make ${schedule.city.name} the reference city`}
                >
                  {schedule.city.name}
                </button>
                <span className="city-metadata">{formatOffset(schedule.offset)}</span>
                <div className="mobile-city-actions">
                  {index === 0 && <span className="ref-badge">REF</span>}
                  <button
                    className="icon-button"
                    aria-label={`Remove ${schedule.city.name}`}
                    onClick={() => onRemove(schedule.city.id)}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
            {HOURS.map((hour) => (
              <div className="mobile-hour-row" key={hour}>
                <div
                  className={`mobile-reference-hour ${schedules[0].overlap[hour] ? 'reference-overlap' : ''}`}
                >
                  {timeParts(hour * 60, format).number}
                  <small>{timeParts(hour * 60, format).period}</small>
                </div>
                {schedules.map((schedule) => (
                  <HourCell
                    key={schedule.city.id}
                    schedule={schedule}
                    hour={hour}
                    format={format}
                    reference={reference}
                    mode={mode}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
