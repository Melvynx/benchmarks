import { ChevronDown, RotateCcw } from 'lucide-react'
import { useId } from 'react'
import { formatHourOption } from '../lib/format'
import { awakeHoursPerDay, HOURS_PER_DAY } from '../lib/overlap'
import type { Settings, TimeFormat } from '../lib/types'
import { SegmentedControl } from './ui/SegmentedControl'

interface SettingsPanelProps {
  id: string
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  onReset: () => void
}

const FORMAT_OPTIONS = [
  { value: '12h', label: '12h' },
  { value: '24h', label: '24h' },
] as const satisfies readonly { value: TimeFormat; label: string }[]

const HOUR_VALUES = Array.from({ length: HOURS_PER_DAY }, (_, hour) => hour)

function describeWindow({ wake, sleep }: Settings): string {
  if (wake === sleep) return 'Awake around the clock, so no city is ever asleep.'
  const hours = awakeHoursPerDay({ wake, sleep })
  return `${hours} hours awake per day${wake > sleep ? ', overnight schedule' : ''}. Applies to every city.`
}

interface HourSelectProps {
  label: string
  value: number
  format: TimeFormat
  onChange: (hour: number) => void
}

function HourSelect({ label, value, format, onChange }: HourSelectProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-ink-2">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-10 w-full appearance-none rounded-lg border border-line bg-surface pl-3 pr-9 text-sm font-medium hover:border-line-strong"
        >
          {HOUR_VALUES.map((hour) => (
            <option key={hour} value={hour}>
              {formatHourOption(hour, format)}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-3"
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

export function SettingsPanel({ id, settings, onChange, onReset }: SettingsPanelProps) {
  return (
    <section
      id={id}
      aria-label="Settings"
      className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <HourSelect
          label="Wake-up hour"
          value={settings.wake}
          format={settings.format}
          onChange={(wake) => onChange({ wake })}
        />
        <HourSelect
          label="Sleep hour"
          value={settings.sleep}
          format={settings.format}
          onChange={(sleep) => onChange({ sleep })}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-2">Time format</span>
          <SegmentedControl
            label="Time format"
            value={settings.format}
            options={FORMAT_OPTIONS}
            onChange={(format) => onChange({ format })}
            className="[&>button]:h-8"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-sm text-ink-2">{describeWindow(settings)}</p>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset to defaults
        </button>
      </div>
    </section>
  )
}
