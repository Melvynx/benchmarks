import { ArrowUp, X } from 'lucide-react';
import type { CSSProperties } from 'react';

import { formatHour, formatLocalTime } from '../lib/timezone';
import type { City, LocalTime, TimeFormat } from '../types';

export interface CitySchedule {
  city: City;
  offsetLabel: string;
  localTimes: LocalTime[];
  awakeMask: boolean[];
  overlapMask: boolean[];
}

interface TimezoneScheduleProps {
  schedules: CitySchedule[];
  timeFormat: TimeFormat;
  referenceDateLabel: string;
  onPromoteCity: (cityId: string) => void;
  onRemoveCity: (cityId: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function TimezoneSchedule(props: TimezoneScheduleProps) {
  if (props.schedules.length === 0) {
    return (
      <section className="empty-schedule">
        <div className="empty-orbit" aria-hidden="true"><span /></div>
        <strong>Your world clock is empty</strong>
        <p>Add a city to start comparing awake hours.</p>
      </section>
    );
  }

  return (
    <section className="schedule-card" aria-label="Timezone comparison">
      <DesktopSchedule {...props} />
      <MobileSchedule {...props} />
    </section>
  );
}

function DesktopSchedule({
  schedules,
  timeFormat,
  referenceDateLabel,
  onPromoteCity,
  onRemoveCity,
}: TimezoneScheduleProps) {
  return (
    <div className="desktop-schedule">
      <div className="schedule-scroll">
        <div className="desktop-grid">
          <div className="desktop-grid-row desktop-hour-row">
            <div className="reference-heading">
              <span>Reference day</span>
              <strong>{referenceDateLabel}</strong>
            </div>
            {HOURS.map((hour) => (
              <div className="hour-heading" key={hour}>{formatHour(hour, timeFormat)}</div>
            ))}
            <div />
          </div>

          {schedules.map((schedule, cityIndex) => (
            <div className="desktop-grid-row city-time-row" key={schedule.city.id}>
              <CityIdentity
                schedule={schedule}
                isReference={cityIndex === 0}
                onPromoteCity={onPromoteCity}
              />
              {schedule.localTimes.map((localTime, hour) => (
                <TimeCell
                  key={hour}
                  city={schedule.city}
                  localTime={localTime}
                  timeFormat={timeFormat}
                  isAwake={schedule.awakeMask[hour] === true}
                  isOverlap={schedule.overlapMask[hour] === true}
                  isSegmentStart={isSegmentStart(schedule.overlapMask, hour)}
                  isSegmentEnd={isSegmentEnd(schedule.overlapMask, hour)}
                />
              ))}
              <RemoveButton city={schedule.city} onRemoveCity={onRemoveCity} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileSchedule({
  schedules,
  timeFormat,
  referenceDateLabel,
  onPromoteCity,
  onRemoveCity,
}: TimezoneScheduleProps) {
  const mobileGridStyle = { '--mobile-city-count': schedules.length } as CSSProperties;

  return (
    <div className="mobile-schedule">
      <div className="mobile-reference-date">Reference day · {referenceDateLabel}</div>
      <div className="mobile-grid-scroll">
        <div className="mobile-grid" style={mobileGridStyle}>
          <div className="mobile-corner">REF<br />TIME</div>
          {schedules.map((schedule, cityIndex) => (
            <div className="mobile-city-heading" key={schedule.city.id}>
              <button
                type="button"
                disabled={cityIndex === 0}
                title={cityIndex === 0 ? 'Reference city' : `Make ${schedule.city.name} the reference city`}
                onClick={() => onPromoteCity(schedule.city.id)}
              >
                <span>{schedule.city.name}</span>
                <small>{cityIndex === 0 ? 'REF' : schedule.offsetLabel}</small>
              </button>
              <button
                className="mobile-remove"
                type="button"
                aria-label={`Remove ${schedule.city.name}`}
                onClick={() => onRemoveCity(schedule.city.id)}
              >
                <X size={13} />
              </button>
            </div>
          ))}

          {HOURS.map((hour) => (
            <div className="mobile-hour-group" key={hour}>
              <div className="mobile-reference-hour">{formatHour(hour, timeFormat)}</div>
              {schedules.map((schedule) => {
                const localTime = schedule.localTimes[hour];
                if (!localTime) return null;

                return (
                  <TimeCell
                    key={schedule.city.id}
                    city={schedule.city}
                    localTime={localTime}
                    timeFormat={timeFormat}
                    isAwake={schedule.awakeMask[hour] === true}
                    isOverlap={schedule.overlapMask[hour] === true}
                    isSegmentStart={false}
                    isSegmentEnd={false}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface CityIdentityProps {
  schedule: CitySchedule;
  isReference: boolean;
  onPromoteCity: (cityId: string) => void;
}

function CityIdentity({ schedule, isReference, onPromoteCity }: CityIdentityProps) {
  return (
    <div className="city-identity">
      <button
        type="button"
        disabled={isReference}
        title={isReference ? 'Reference city' : `Make ${schedule.city.name} the reference city`}
        onClick={() => onPromoteCity(schedule.city.id)}
      >
        <span className="city-name-line">
          <strong>{schedule.city.name}</strong>
          {isReference && <span className="ref-badge">REF</span>}
          {!isReference && <ArrowUp className="promote-icon" size={12} aria-hidden="true" />}
        </span>
        <span className="city-meta">{schedule.city.country} · {schedule.offsetLabel}</span>
      </button>
    </div>
  );
}

interface TimeCellProps {
  city: City;
  localTime: LocalTime;
  timeFormat: TimeFormat;
  isAwake: boolean;
  isOverlap: boolean;
  isSegmentStart: boolean;
  isSegmentEnd: boolean;
}

function TimeCell({
  city,
  localTime,
  timeFormat,
  isAwake,
  isOverlap,
  isSegmentStart,
  isSegmentEnd,
}: TimeCellProps) {
  const stateLabel = isOverlap ? 'overlap' : isAwake ? 'awake' : 'sleeping';
  const classNames = [
    'time-cell',
    `is-${stateLabel}`,
    isSegmentStart ? 'is-segment-start' : '',
    isSegmentEnd ? 'is-segment-end' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classNames}
      title={`${city.name}: ${formatLocalTime(localTime, timeFormat)} · ${stateLabel}`}
    >
      {formatLocalTime(localTime, timeFormat)}
    </div>
  );
}

interface RemoveButtonProps {
  city: City;
  onRemoveCity: (cityId: string) => void;
}

function RemoveButton({ city, onRemoveCity }: RemoveButtonProps) {
  return (
    <button
      className="remove-city-button"
      type="button"
      aria-label={`Remove ${city.name}`}
      onClick={() => onRemoveCity(city.id)}
    >
      <X size={15} />
    </button>
  );
}

function isSegmentStart(mask: boolean[], hour: number): boolean {
  return mask[hour] === true && mask[hour - 1] !== true;
}

function isSegmentEnd(mask: boolean[], hour: number): boolean {
  return mask[hour] === true && mask[hour + 1] !== true;
}
