import { formatHour, type TimeFormat } from '../lib/time';

interface Props {
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
  onWakeHour: (h: number) => void;
  onSleepHour: (h: number) => void;
  onTimeFormat: (f: TimeFormat) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function HourSelect({
  id,
  label,
  value,
  format,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  format: TimeFormat;
  onChange: (h: number) => void;
}) {
  return (
    <label className="settings__field" htmlFor={id}>
      <span className="settings__label">{label}</span>
      <select
        id={id}
        className="settings__select"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {formatHour(h, format)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SettingsPanel({
  wakeHour,
  sleepHour,
  timeFormat,
  onWakeHour,
  onSleepHour,
  onTimeFormat,
}: Props) {
  return (
    <div className="settings">
      <HourSelect id="wake-hour" label="Wake up" value={wakeHour} format={timeFormat} onChange={onWakeHour} />
      <HourSelect id="sleep-hour" label="Sleep" value={sleepHour} format={timeFormat} onChange={onSleepHour} />
      <div className="settings__field">
        <span className="settings__label">Time format</span>
        <div className="segmented" role="group" aria-label="Time format">
          {(['12h', '24h'] as const).map((f) => (
            <button
              key={f}
              type="button"
              className="segmented__button"
              aria-pressed={timeFormat === f}
              onClick={() => onTimeFormat(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
