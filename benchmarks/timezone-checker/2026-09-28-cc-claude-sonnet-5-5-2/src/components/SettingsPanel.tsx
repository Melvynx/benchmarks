import { useId } from 'react'
import { HOURS, awakeHoursPerDay } from '../lib/overlap'
import { formatHour } from '../lib/time'
import type { Action } from '../state/reducer'
import type { Settings, TimeFormat } from '../types'
import { ChevronIcon } from './Icons'
import styles from './Panel.module.css'
import settingsStyles from './SettingsPanel.module.css'
import { SegmentedControl } from './SegmentedControl'

const FORMAT_OPTIONS = [
  { value: '12h', label: '12h' },
  { value: '24h', label: '24h' },
] as const

interface Props {
  settings: Settings
  dispatch: (action: Action) => void
}

interface HourSelectProps {
  id: string
  label: string
  value: number
  format: TimeFormat
  onChange: (hour: number) => void
}

function HourSelect({ id, label, value, format, onChange }: HourSelectProps) {
  return (
    <div className={settingsStyles.field}>
      <label htmlFor={id} className={settingsStyles.label}>
        {label}
      </label>
      <div className={settingsStyles.selectWrap}>
        <select
          id={id}
          className={settingsStyles.select}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        >
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>
              {formatHour(hour, format)}
            </option>
          ))}
        </select>
        <ChevronIcon className={settingsStyles.chevron} size={16} />
      </div>
    </div>
  )
}

export function SettingsPanel({ settings, dispatch }: Props) {
  const wakeId = useId()
  const sleepId = useId()
  const { wake, sleep, timeFormat } = settings
  const awake = awakeHoursPerDay(settings)

  return (
    <section className={styles.panel} aria-labelledby="settings-heading">
      <h2 id="settings-heading" className={styles.heading}>
        Awake window
      </h2>
      <div className={settingsStyles.fields}>
        <HourSelect
          id={wakeId}
          label="Wake-up hour"
          value={wake}
          format={timeFormat}
          onChange={(hour) => dispatch({ type: 'setWake', hour })}
        />
        <HourSelect
          id={sleepId}
          label="Sleep hour"
          value={sleep}
          format={timeFormat}
          onChange={(hour) => dispatch({ type: 'setSleep', hour })}
        />
        <div className={settingsStyles.field}>
          <span className={settingsStyles.label} id="time-format-label">
            Time format
          </span>
          <SegmentedControl
            name="time-format"
            label="Time format"
            options={FORMAT_OPTIONS}
            value={timeFormat}
            onChange={(format) => dispatch({ type: 'setTimeFormat', format })}
          />
        </div>
      </div>
      <p className={styles.description}>
        Applies to every city. Awake {awake === 24 ? 'all day' : `${awake} hours a day`}
        {wake > sleep ? ', overnight' : ''}.
      </p>
    </section>
  )
}
