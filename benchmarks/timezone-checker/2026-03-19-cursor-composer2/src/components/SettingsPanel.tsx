import type { Settings } from '../state/appState'
import { formatHourLabel } from '../lib/formatHour'
import styles from './SettingsPanel.module.css'

interface Props {
  settings: Settings
  onChange: (partial: Partial<Settings>) => void
}

export function SettingsPanel({ settings, onChange }: Props) {
  const { wakeHour, sleepHour, use24h } = settings

  return (
    <div>
      <p className={styles.help}>
        Same schedule for every city (night shifts: wake hour after sleep hour).
      </p>
      <div className={styles.row}>
        <label className={styles.field} htmlFor="wake">
          Wake
          <span className={styles.preview}>{formatHourLabel(wakeHour, use24h)}</span>
          <input
            id="wake"
            type="range"
            min={0}
            max={23}
            value={wakeHour}
            onChange={(e) => onChange({ wakeHour: Number(e.target.value) })}
          />
        </label>
        <label className={styles.field} htmlFor="sleep">
          Sleep
          <span className={styles.preview}>{formatHourLabel(sleepHour, use24h)}</span>
          <input
            id="sleep"
            type="range"
            min={0}
            max={23}
            value={sleepHour}
            onChange={(e) => onChange({ sleepHour: Number(e.target.value) })}
          />
        </label>
      </div>
      <fieldset className={styles.format}>
        <legend>Time format</legend>
        <label className={styles.radio}>
          <input
            type="radio"
            name="tf"
            checked={!use24h}
            onChange={() => onChange({ use24h: false })}
          />
          12-hour
        </label>
        <label className={styles.radio}>
          <input
            type="radio"
            name="tf"
            checked={use24h}
            onChange={() => onChange({ use24h: true })}
          />
          24-hour
        </label>
      </fieldset>
    </div>
  )
}

