import { formatHourFull } from '../utils/timezone'

interface SettingsProps {
  wakeHour: number
  sleepHour: number
  timeFormat: '12h' | '24h'
  onWakeChange: (h: number) => void
  onSleepChange: (h: number) => void
  onFormatChange: (f: '12h' | '24h') => void
}

export function Settings({
  wakeHour,
  sleepHour,
  timeFormat,
  onWakeChange,
  onSleepChange,
  onFormatChange,
}: SettingsProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="border-b border-slate-800 bg-slate-900/50">
      <div className="max-w-[1400px] mx-auto px-4 py-4 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Wake up</label>
          <select
            value={wakeHour}
            onChange={(e) => onWakeChange(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {hours.map((h) => (
              <option key={h} value={h}>
                {formatHourFull(h, timeFormat)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Sleep at</label>
          <select
            value={sleepHour}
            onChange={(e) => onSleepChange(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {hours.map((h) => (
              <option key={h} value={h}>
                {formatHourFull(h, timeFormat)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Format</label>
          <div className="flex bg-slate-800 rounded-md p-0.5 border border-slate-700">
            <button
              onClick={() => onFormatChange('12h')}
              className={`px-2 py-0.5 text-sm rounded transition-all ${
                timeFormat === '12h'
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              12h
            </button>
            <button
              onClick={() => onFormatChange('24h')}
              className={`px-2 py-0.5 text-sm rounded transition-all ${
                timeFormat === '24h'
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              24h
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
