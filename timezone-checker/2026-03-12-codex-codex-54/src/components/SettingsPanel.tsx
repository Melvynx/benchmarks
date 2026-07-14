import type { Mode, TimeFormat } from '../lib/types'
import { formatSelectHour } from '../lib/timezone'

interface SettingsPanelProps {
  mode: Mode
  wakeHour: number
  sleepHour: number
  timeFormat: TimeFormat
  onModeChange: (mode: Mode) => void
  onWakeHourChange: (hour: number) => void
  onSleepHourChange: (hour: number) => void
  onTimeFormatChange: (format: TimeFormat) => void
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

export function SettingsPanel({
  mode,
  wakeHour,
  sleepHour,
  timeFormat,
  onModeChange,
  onWakeHourChange,
  onSleepHourChange,
  onTimeFormatChange,
}: SettingsPanelProps) {
  return (
    <section className="panel">
      <div className="panel__heading">
        <p className="panel__eyebrow">Settings</p>
        <h2>Shared awake window</h2>
      </div>

      <div className="mode-toggle" role="tablist" aria-label="Overlap mode">
        <button
          type="button"
          className={mode === 'meeting' ? 'mode-toggle__button is-active' : 'mode-toggle__button'}
          onClick={() => onModeChange('meeting')}
        >
          <span>Meeting Mode</span>
          <small>Everyone must be awake</small>
        </button>

        <button
          type="button"
          className={mode === 'base' ? 'mode-toggle__button is-active' : 'mode-toggle__button'}
          onClick={() => onModeChange('base')}
        >
          <span>Base Mode</span>
          <small>Reference city vs each person</small>
        </button>
      </div>

      <div className="settings-grid">
        <label className="field">
          <span>Wake-up hour</span>
          <select
            value={wakeHour}
            onChange={(event) => onWakeHourChange(Number(event.target.value))}
          >
            {HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {formatSelectHour(hour, timeFormat)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Sleep hour</span>
          <select
            value={sleepHour}
            onChange={(event) => onSleepHourChange(Number(event.target.value))}
          >
            {HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {formatSelectHour(hour, timeFormat)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Time format</span>
          <select
            value={timeFormat}
            onChange={(event) =>
              onTimeFormatChange(Number(event.target.value) as TimeFormat)
            }
          >
            <option value={12}>12-hour</option>
            <option value={24}>24-hour</option>
          </select>
        </label>
      </div>

      <div className="panel__footer">
        <span>Overnight schedules are supported</span>
        <span>Changes apply instantly</span>
      </div>
    </section>
  )
}
