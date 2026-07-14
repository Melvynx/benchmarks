import type { TimeFormat } from '../types';
import { HOURS } from '../lib/schedule';
import { awakeHoursCount, hourLong } from '../lib/format';
import { cx } from '../lib/cx';

interface SettingsPanelProps {
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
  onWakeChange: (hour: number) => void;
  onSleepChange: (hour: number) => void;
  onFormatChange: (format: TimeFormat) => void;
}

export function SettingsPanel({
  wakeHour,
  sleepHour,
  timeFormat,
  onWakeChange,
  onSleepChange,
  onFormatChange,
}: SettingsPanelProps) {
  const span = awakeHoursCount(wakeHour, sleepHour);

  return (
    <section className="settings" aria-label="Availability settings">
      <label className="field">
        <span className="field-label">Wake up</span>
        <select
          className="hour-select"
          value={wakeHour}
          onChange={(event) => onWakeChange(Number(event.target.value))}
        >
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>
              {hourLong(hour, timeFormat)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field-label">Sleep</span>
        <select
          className="hour-select"
          value={sleepHour}
          onChange={(event) => onSleepChange(Number(event.target.value))}
        >
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>
              {hourLong(hour, timeFormat)}
            </option>
          ))}
        </select>
      </label>
      <div className="field">
        <span className="field-label">Time format</span>
        <div className="segmented" role="group" aria-label="Time format">
          <button
            type="button"
            className={cx('seg-btn', timeFormat === '12h' && 'active')}
            aria-pressed={timeFormat === '12h'}
            onClick={() => onFormatChange('12h')}
          >
            12h
          </button>
          <button
            type="button"
            className={cx('seg-btn', timeFormat === '24h' && 'active')}
            aria-pressed={timeFormat === '24h'}
            onClick={() => onFormatChange('24h')}
          >
            24h
          </button>
        </div>
      </div>
      <p className="settings-note">
        {wakeHour === sleepHour
          ? 'Wake and sleep are set to the same hour, so everyone counts as awake around the clock.'
          : `${span}-hour awake window${wakeHour > sleepHour ? ' (crosses midnight)' : ''}, applied to every city.`}
      </p>
    </section>
  );
}
