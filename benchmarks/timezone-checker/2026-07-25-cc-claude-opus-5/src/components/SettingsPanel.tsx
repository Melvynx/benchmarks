import { useCallback, useId, useState } from 'react'
import { useDismiss } from '../hooks/use-dismiss'
import { formatHour, mod, type TimeFormat } from '../lib/time'
import { cx } from './cell-style'

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

export type SettingsPanelProps = {
  wakeHour: number
  sleepHour: number
  timeFormat: TimeFormat
  onWakeChange: (hour: number) => void
  onSleepChange: (hour: number) => void
  onFormatChange: (format: TimeFormat) => void
  onReset: () => void
}

export function SettingsPanel(props: SettingsPanelProps) {
  const { wakeHour, sleepHour, timeFormat } = props
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss<HTMLDivElement>(open, close)
  const wakeId = useId()
  const sleepId = useId()

  const awakeLength = mod(sleepHour - wakeHour, 24)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cx(
          'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
          open
            ? 'border-line-strong bg-raised text-ink'
            : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
        )}
      >
        <GearIcon />
        <span className="tnum">
          {formatHour(wakeHour, timeFormat)} — {formatHour(sleepHour, timeFormat)}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[19rem] rounded-xl border border-line-strong bg-surface p-4 shadow-2xl shadow-black/60">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-ink">Your awake window</h2>
            <span className="text-xs text-ink-faint">applies to every city</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <HourSelect
              id={wakeId}
              label="Wake up"
              value={wakeHour}
              timeFormat={timeFormat}
              onChange={props.onWakeChange}
            />
            <HourSelect
              id={sleepId}
              label="Sleep"
              value={sleepHour}
              timeFormat={timeFormat}
              onChange={props.onSleepChange}
            />
          </div>

          <p className={cx('mt-2 text-xs', awakeLength === 0 ? 'text-warn' : 'text-ink-faint')}>
            {awakeLength === 0
              ? 'Wake and sleep are identical — nobody is ever awake.'
              : `${awakeLength} awake hours${sleepHour < wakeHour ? ' · overnight window' : ''}`}
          </p>

          <div className="my-4 h-px bg-line" />

          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-muted">Time format</span>
            <div className="inline-flex rounded-lg border border-line bg-canvas p-0.5">
              {(['12h', '24h'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => props.onFormatChange(format)}
                  aria-pressed={timeFormat === format}
                  className={cx(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    timeFormat === format
                      ? 'bg-raised text-ink'
                      : 'text-ink-faint hover:text-ink-muted',
                  )}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>

          <div className="my-4 h-px bg-line" />

          <button
            onClick={() => {
              props.onReset()
              close()
            }}
            className="text-xs text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-warn"
          >
            Reset everything to defaults
          </button>
        </div>
      )}
    </div>
  )
}

function HourSelect({
  id,
  label,
  value,
  timeFormat,
  onChange,
}: {
  id: string
  label: string
  value: number
  timeFormat: TimeFormat
  onChange: (hour: number) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-faint">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="tnum w-full appearance-none rounded-lg border border-line bg-canvas px-2.5 py-2 text-sm text-ink transition-colors hover:border-line-strong"
      >
        {HOURS.map((hour) => (
          <option key={hour} value={hour} className="bg-surface">
            {formatHour(hour, timeFormat)}
          </option>
        ))}
      </select>
    </div>
  )
}

function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M8 1.4v1.6M8 13v1.6M14.6 8H13M3 8H1.4M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1M12.7 12.7l-1.1-1.1M4.4 4.4L3.3 3.3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}
