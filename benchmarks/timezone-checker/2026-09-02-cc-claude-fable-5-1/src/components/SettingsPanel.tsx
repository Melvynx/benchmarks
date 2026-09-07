import type { Settings } from '../lib/overlap'
import { formatHour } from '../lib/time'

interface Props {
  settings: Settings
  onChange: (settings: Settings) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function HourSelect({
  id,
  label,
  value,
  format,
  onChange,
}: {
  id: string
  label: string
  value: number
  format: Settings['timeFormat']
  onChange: (hour: number) => void
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium tracking-wider text-ink-400 uppercase">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="tabular h-9 min-w-24 cursor-pointer rounded-lg border border-ink-700 bg-ink-800 px-3 text-sm text-white transition-colors hover:border-ink-600 focus-visible:border-glow-400 focus-visible:outline-none"
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {formatHour(h, format)}
          </option>
        ))}
      </select>
    </label>
  )
}

export function SettingsPanel({ settings, onChange }: Props) {
  const overnight = settings.wakeHour > settings.sleepHour
  const awakeHours = settings.wakeHour === settings.sleepHour ? 24 : (settings.sleepHour - settings.wakeHour + 24) % 24

  return (
    <section
      aria-label="Availability settings"
      className="flex flex-wrap items-end gap-x-6 gap-y-4 rounded-2xl border border-ink-700 bg-ink-900/70 p-4 backdrop-blur"
    >
      <HourSelect
        id="wake-hour"
        label="Wake up"
        value={settings.wakeHour}
        format={settings.timeFormat}
        onChange={(wakeHour) => onChange({ ...settings, wakeHour })}
      />
      <HourSelect
        id="sleep-hour"
        label="Sleep"
        value={settings.sleepHour}
        format={settings.timeFormat}
        onChange={(sleepHour) => onChange({ ...settings, sleepHour })}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium tracking-wider text-ink-400 uppercase">Format</span>
        <div role="radiogroup" aria-label="Time format" className="inline-flex h-9 rounded-lg border border-ink-700 bg-ink-800 p-0.5">
          {(['12h', '24h'] as const).map((f) => {
            const active = settings.timeFormat === f
            return (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange({ ...settings, timeFormat: f })}
                className={[
                  'rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-glow-400',
                  active ? 'bg-ink-600 text-white' : 'text-ink-300 hover:text-white',
                ].join(' ')}
              >
                {f}
              </button>
            )
          })}
        </div>
      </div>

      <p className="tabular ml-auto self-center text-xs text-ink-400">
        Awake <span className="font-medium text-ink-100">{awakeHours}h</span> a day
        {overnight && <span className="ml-2 rounded-md bg-ink-700 px-1.5 py-0.5 text-[10px] font-medium text-ink-300 uppercase">overnight</span>}
      </p>
    </section>
  )
}
