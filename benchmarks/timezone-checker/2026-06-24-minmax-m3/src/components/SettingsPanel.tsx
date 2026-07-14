import type { Settings } from '../types'
import { SunIcon, MoonIcon } from './icons'

interface Props {
  settings: Settings
  onChange: (next: Settings) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function HourSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (h: number) => void
}) {
  const pct = (value / 23) * 100
  return (
    <label className="flex flex-1 flex-col gap-1.5 min-w-[180px]">
      <span className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-ink-400">
        <span className="flex items-center gap-1.5">
          {label === 'Wake' ? <SunIcon width={12} height={12} /> : <MoonIcon width={12} height={12} />}
          {label} hour
        </span>
        <span className="font-mono text-ink-100 text-sm normal-case tracking-normal">
          {value.toString().padStart(2, '0')}:00
        </span>
      </span>
      <input
        type="range"
        min={0}
        max={23}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--value' as never]: `${pct}%` }}
        aria-label={`${label} hour`}
      />
      <div className="flex justify-between font-mono text-[10px] text-ink-500">
        {HOURS.filter((h) => h % 6 === 0).map((h) => (
          <span key={h}>{h.toString().padStart(2, '0')}</span>
        ))}
      </div>
    </label>
  )
}

export function SettingsPanel({ settings, onChange }: Props) {
  return (
    <section className="rounded-2xl border border-ink-750 bg-ink-850/70 p-4 backdrop-blur">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <HourSelect
          label="Wake"
          value={settings.wakeHour}
          onChange={(h) => onChange({ ...settings, wakeHour: h })}
        />
        <HourSelect
          label="Sleep"
          value={settings.sleepHour}
          onChange={(h) => onChange({ ...settings, sleepHour: h })}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-400">Time format</span>
          <div className="inline-flex rounded-lg border border-ink-700 bg-ink-900 p-0.5">
            <button
              type="button"
              onClick={() => onChange({ ...settings, timeFormat: '12h' })}
              className={[
                'rounded-md px-3 py-1 text-sm font-medium transition',
                settings.timeFormat === '12h'
                  ? 'bg-ink-100 text-ink-900'
                  : 'text-ink-300 hover:text-white',
              ].join(' ')}
              aria-pressed={settings.timeFormat === '12h'}
            >
              12h
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...settings, timeFormat: '24h' })}
              className={[
                'rounded-md px-3 py-1 text-sm font-medium transition',
                settings.timeFormat === '24h'
                  ? 'bg-ink-100 text-ink-900'
                  : 'text-ink-300 hover:text-white',
              ].join(' ')}
              aria-pressed={settings.timeFormat === '24h'}
            >
              24h
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}