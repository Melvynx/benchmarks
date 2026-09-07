import { Moon, RotateCcw, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from './ui/Card'
import { SegmentedControl } from './ui/SegmentedControl'
import { HOURS } from '@/lib/overlap'
import { formatHour, type TimeFormat } from '@/lib/timezone'
import { DEFAULT_SETTINGS, useAppStore } from '@/store/useAppStore'

const FORMATS = [
  { value: '12h', label: '12h' },
  { value: '24h', label: '24h' },
] as const satisfies readonly { value: TimeFormat; label: string }[]

export function SettingsPanel() {
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const { wakeHour, sleepHour, timeFormat } = settings

  const awakeHours = wakeHour === sleepHour ? 24 : (sleepHour - wakeHour + 24) % 24
  const overnight = sleepHour < wakeHour
  const isDefault =
    wakeHour === DEFAULT_SETTINGS.wakeHour &&
    sleepHour === DEFAULT_SETTINGS.sleepHour &&
    timeFormat === DEFAULT_SETTINGS.timeFormat

  return (
    <Card id="settings-panel" className="animate-fade-up p-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Wake up" icon={<Sun className="h-3.5 w-3.5 text-amber-400" aria-hidden />}>
            <HourSelect
              id="wake-hour"
              value={wakeHour}
              format={timeFormat}
              onChange={(value) => updateSettings({ wakeHour: value })}
            />
          </Field>
          <Field label="Sleep" icon={<Moon className="h-3.5 w-3.5 text-indigo-300" aria-hidden />}>
            <HourSelect
              id="sleep-hour"
              value={sleepHour}
              format={timeFormat}
              onChange={(value) => updateSettings({ sleepHour: value })}
            />
          </Field>
          <Field label="Time format">
            <SegmentedControl
              aria-label="Time format"
              value={timeFormat}
              options={FORMATS}
              onChange={(value) => updateSettings({ timeFormat: value })}
            />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
          <p className="text-sm text-ink-400">
            Awake{' '}
            <span className="tabular font-medium text-ink-200">
              {formatHour(wakeHour, timeFormat)} → {formatHour(sleepHour, timeFormat)}
            </span>{' '}
            <span className="text-ink-500">
              · {awakeHours}h{overnight ? ' · overnight' : ''}
            </span>
          </p>
          <button
            type="button"
            onClick={() => updateSettings({ ...DEFAULT_SETTINGS })}
            disabled={isDefault}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-400 transition-colors hover:text-ink-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-3 w-3" aria-hidden />
            Reset defaults
          </button>
        </div>
      </div>
    </Card>
  )
}

function Field({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink-400">
        {icon}
        {label}
      </span>
      {children}
    </div>
  )
}

interface HourSelectProps {
  id: string
  value: number
  format: TimeFormat
  onChange: (value: number) => void
}

function HourSelect({ id, value, format, onChange }: HourSelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="tabular h-9 min-w-28 rounded-xl border border-ink-700 bg-ink-900/70 px-3 text-sm text-ink-100 transition-colors hover:border-ink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400/60"
    >
      {HOURS.map((hour) => (
        <option key={hour} value={hour}>
          {formatHour(hour, format)}
        </option>
      ))}
    </select>
  )
}
