import { useAppStore } from '../store/useAppStore'
import { formatHour } from '../lib/timezone'

const HOURS = Array.from({ length: 24 }, (_, h) => h)

export function SettingsPanel() {
  const open = useAppStore((s) => s.settingsOpen)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const wakeHour = useAppStore((s) => s.wakeHour)
  const sleepHour = useAppStore((s) => s.sleepHour)
  const timeFormat = useAppStore((s) => s.timeFormat)
  const setWakeHour = useAppStore((s) => s.setWakeHour)
  const setSleepHour = useAppStore((s) => s.setSleepHour)
  const setTimeFormat = useAppStore((s) => s.setTimeFormat)

  if (!open) return null

  return (
    <div className="settings-backdrop" onClick={() => setSettingsOpen(false)}>
      <aside
        className="settings-panel"
        role="dialog"
        aria-label="Availability settings"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-panel__header">
          <h2>Availability</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close settings"
            onClick={() => setSettingsOpen(false)}
          >
            ✕
          </button>
        </header>

        <p className="settings-panel__intro">
          Same awake window for every city. Overnight ranges work (e.g. 22 → 6).
        </p>

        <label className="field">
          <span className="field__label">Wake-up hour</span>
          <select
            value={wakeHour}
            onChange={(e) => setWakeHour(Number(e.target.value))}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {formatHour(h, timeFormat)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Sleep hour</span>
          <select
            value={sleepHour}
            onChange={(e) => setSleepHour(Number(e.target.value))}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {formatHour(h, timeFormat)}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="field field--segment">
          <legend className="field__label">Time format</legend>
          <div className="segment">
            <button
              type="button"
              className={timeFormat === '12h' ? 'is-active' : ''}
              onClick={() => setTimeFormat('12h')}
            >
              12h
            </button>
            <button
              type="button"
              className={timeFormat === '24h' ? 'is-active' : ''}
              onClick={() => setTimeFormat('24h')}
            >
              24h
            </button>
          </div>
        </fieldset>

        <p className="settings-panel__preview">
          Awake{' '}
          <strong>
            {formatHour(wakeHour, timeFormat)} → {formatHour(sleepHour, timeFormat)}
          </strong>
        </p>
      </aside>
    </div>
  )
}
