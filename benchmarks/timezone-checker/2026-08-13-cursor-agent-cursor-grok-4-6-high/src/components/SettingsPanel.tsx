import { formatHour, type TimeFormat } from '../lib/time'

type Props = {
  wakeHour: number
  sleepHour: number
  timeFormat: TimeFormat
  onWake: (hour: number) => void
  onSleep: (hour: number) => void
  onFormat: (format: TimeFormat) => void
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

export function SettingsPanel({
  wakeHour,
  sleepHour,
  timeFormat,
  onWake,
  onSleep,
  onFormat,
}: Props) {
  return (
    <section className="settings" aria-label="Awake window">
      <label className="field">
        <span>Wake</span>
        <select
          value={wakeHour}
          onChange={(event) => onWake(Number(event.target.value))}
        >
          {HOURS.map((hour) => (
            <option key={`wake-${hour}`} value={hour}>
              {formatHour(hour, timeFormat)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Sleep</span>
        <select
          value={sleepHour}
          onChange={(event) => onSleep(Number(event.target.value))}
        >
          {HOURS.map((hour) => (
            <option key={`sleep-${hour}`} value={hour}>
              {formatHour(hour, timeFormat)}
            </option>
          ))}
        </select>
      </label>
      <div className="mode-toggle format-toggle" role="radiogroup" aria-label="Time format">
        <button
          type="button"
          role="radio"
          aria-checked={timeFormat === '12h'}
          className={timeFormat === '12h' ? 'is-on' : undefined}
          onClick={() => onFormat('12h')}
        >
          12h
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={timeFormat === '24h'}
          className={timeFormat === '24h' ? 'is-on' : undefined}
          onClick={() => onFormat('24h')}
        >
          24h
        </button>
      </div>
    </section>
  )
}
