import type { TimeFormat } from '../types';
import { HOURS, formatClock, isAwake } from '../lib/time';

export function SettingsPanel({
  wake,
  sleep,
  format,
  windowLabel,
  onWake,
  onSleep,
  onFormat,
  onReset,
}: {
  wake: number;
  sleep: number;
  format: TimeFormat;
  windowLabel: string;
  onWake: (hour: number) => void;
  onSleep: (hour: number) => void;
  onFormat: (format: TimeFormat) => void;
  onReset: () => void;
}) {
  return (
    <fieldset className="settings">
      <legend>Awake window</legend>
      <p className="window-readout">{windowLabel}</p>
      <div className="setting-row">
        <label>
          <span>Wake</span>
          <select value={wake} onChange={(event) => onWake(Number(event.target.value))}>
            {HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {formatClock(hour, 0, format)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Sleep</span>
          <select value={sleep} onChange={(event) => onSleep(Number(event.target.value))}>
            {HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {formatClock(hour, 0, format)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="strip" aria-hidden="true">
        {HOURS.map((hour) => (
          <i key={hour} className={isAwake(hour, wake, sleep) ? 'on' : undefined} />
        ))}
      </div>
      <p className="fine">
        Shared by every city. Awake from wake-up until the sleep hour, not including it. An earlier sleep hour crosses midnight.
      </p>
      <div className="format-toggle" role="radiogroup" aria-label="Time format">
        <button type="button" role="radio" aria-checked={format === '12h'} onClick={() => onFormat('12h')}>
          12h
        </button>
        <button type="button" role="radio" aria-checked={format === '24h'} onClick={() => onFormat('24h')}>
          24h
        </button>
      </div>
      <button type="button" className="text-btn" onClick={onReset}>
        Reset to defaults
      </button>
    </fieldset>
  );
}
