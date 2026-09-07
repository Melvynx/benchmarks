import React from 'react'
import { X, Moon, Sun, Clock, Sparkles } from 'lucide-react'
import { useTimezone } from '@/context/TimezoneContext'
import { formatWholeHour } from '@/lib/timezone'
import { HOURS } from '@/lib/overlap'
import { cn } from '@/lib/cn'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useTimezone()

  if (!isOpen) return null

  const isOvernight = settings.wakeHour > settings.sleepHour
  const awakeHoursCount = isOvernight
    ? 24 - settings.wakeHour + settings.sleepHour
    : settings.sleepHour === settings.wakeHour
      ? 24
      : settings.sleepHour - settings.wakeHour

  const setPreset = (wake: number, sleep: number) => {
    updateSettings({ wakeHour: wake, sleepHour: sleep })
  }

  return (
    <section
      aria-label="Availability and Schedule Settings"
      className="mb-6 bg-ink-900 border border-ink-700/80 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden"
    >
      <div className="flex items-center justify-between pb-4 border-b border-ink-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Schedule Settings</h2>
            <p className="text-xs text-ink-400">
              Configure universal awake window and display format. Changes apply immediately.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-ink-400 hover:text-white hover:bg-ink-800 rounded-lg transition-colors cursor-pointer"
          aria-label="Close settings panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
        {/* Wake-up hour */}
        <div>
          <label
            htmlFor="wake-hour-select"
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-300 mb-2"
          >
            <Sun className="w-4 h-4 text-amber-400" />
            <span>Wake-up Hour</span>
          </label>
          <select
            id="wake-hour-select"
            value={settings.wakeHour}
            onChange={(e) => updateSettings({ wakeHour: Number(e.target.value) })}
            className="w-full bg-ink-950 border border-ink-700 rounded-xl px-3.5 py-2 text-sm text-ink-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer"
          >
            {HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {formatWholeHour(hour, settings.timeFormat)} ({hour}:00)
              </option>
            ))}
          </select>
          <span className="text-[11px] text-ink-400 mt-1.5 block">
            Start of day (inclusive)
          </span>
        </div>

        {/* Sleep hour */}
        <div>
          <label
            htmlFor="sleep-hour-select"
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-300 mb-2"
          >
            <Moon className="w-4 h-4 text-indigo-400" />
            <span>Sleep Hour</span>
          </label>
          <select
            id="sleep-hour-select"
            value={settings.sleepHour}
            onChange={(e) => updateSettings({ sleepHour: Number(e.target.value) })}
            className="w-full bg-ink-950 border border-ink-700 rounded-xl px-3.5 py-2 text-sm text-ink-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer"
          >
            {HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {formatWholeHour(hour, settings.timeFormat)} ({hour}:00)
              </option>
            ))}
          </select>
          <span className="text-[11px] text-ink-400 mt-1.5 block">
            End of day (exclusive)
          </span>
        </div>

        {/* Time format */}
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-ink-300 mb-2">
            Time Format
          </span>
          <div className="grid grid-cols-2 gap-2 p-1 bg-ink-950 border border-ink-700 rounded-xl">
            <button
              type="button"
              onClick={() => updateSettings({ timeFormat: '12h' })}
              className={cn(
                'py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center',
                settings.timeFormat === '12h'
                  ? 'bg-emerald-500 text-ink-950 font-bold shadow'
                  : 'text-ink-400 hover:text-ink-200'
              )}
            >
              12-hour (9am)
            </button>
            <button
              type="button"
              onClick={() => updateSettings({ timeFormat: '24h' })}
              className={cn(
                'py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center',
                settings.timeFormat === '24h'
                  ? 'bg-emerald-500 text-ink-950 font-bold shadow'
                  : 'text-ink-400 hover:text-ink-200'
              )}
            >
              24-hour (09:00)
            </button>
          </div>
          <span className="text-[11px] text-ink-400 mt-1.5 block">
            Controls all labels and ranges
          </span>
        </div>
      </div>

      {/* Schedule visual representation & Quick presets */}
      <div className="mt-5 pt-4 border-t border-ink-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-ink-400 flex items-center gap-1 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Presets:
          </span>
          <button
            type="button"
            onClick={() => setPreset(7, 23)}
            className="px-2.5 py-1 rounded-lg bg-ink-800 text-ink-200 hover:bg-ink-750 hover:text-white border border-ink-700 transition-colors cursor-pointer"
          >
            Default (7am – 11pm)
          </button>
          <button
            type="button"
            onClick={() => setPreset(6, 22)}
            className="px-2.5 py-1 rounded-lg bg-ink-800 text-ink-200 hover:bg-ink-750 hover:text-white border border-ink-700 transition-colors cursor-pointer"
          >
            Early Bird (6am – 10pm)
          </button>
          <button
            type="button"
            onClick={() => setPreset(9, 23)}
            className="px-2.5 py-1 rounded-lg bg-ink-800 text-ink-200 hover:bg-ink-750 hover:text-white border border-ink-700 transition-colors cursor-pointer"
          >
            9-to-11 (9am – 11pm)
          </button>
          <button
            type="button"
            onClick={() => setPreset(22, 6)}
            className="px-2.5 py-1 rounded-lg bg-ink-800 text-ink-200 hover:bg-ink-750 hover:text-white border border-ink-700 transition-colors cursor-pointer"
          >
            Night Shift (10pm – 6am)
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isOvernight && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-medium">
              Overnight range active
            </span>
          )}
          <span className="text-ink-400 font-mono text-[11px]">
            {awakeHoursCount}h awake / {24 - awakeHoursCount}h sleep
          </span>
        </div>
      </div>
    </section>
  )
}
