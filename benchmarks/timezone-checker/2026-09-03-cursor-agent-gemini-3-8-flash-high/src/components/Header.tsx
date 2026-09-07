import React from 'react'
import { Sliders, RotateCcw, Globe } from 'lucide-react'
import { useTimezone } from '@/context/TimezoneContext'
import { ModeToggle } from './ModeToggle'
import { formatWholeHour } from '@/lib/timezone'

interface HeaderProps {
  isSettingsOpen: boolean
  onToggleSettings: () => void
}

export const Header: React.FC<HeaderProps> = ({ isSettingsOpen, onToggleSettings }) => {
  const { settings, resetToDefaults } = useTimezone()

  const wakeStr = formatWholeHour(settings.wakeHour, settings.timeFormat)
  const sleepStr = formatWholeHour(settings.sleepHour, settings.timeFormat)

  return (
    <header className="border-b border-ink-800 bg-ink-900/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Primary Page Heading */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-ink-950 rounded-[10px] flex items-center justify-center text-emerald-400">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Gemini 3.8 Flash
            </h1>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
          <ModeToggle />

          <button
            type="button"
            onClick={onToggleSettings}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              isSettingsOpen
                ? 'bg-ink-800 text-emerald-400 border-emerald-500/50 shadow-sm shadow-emerald-500/10'
                : 'bg-ink-900/90 text-ink-200 border-ink-700/80 hover:bg-ink-800 hover:text-white hover:border-ink-600'
            }`}
            title="Configure wake/sleep hours and time format"
          >
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Awake:</span>
            <span className="font-mono text-emerald-400 text-xs font-semibold">
              {wakeStr}–{sleepStr}
            </span>
          </button>

          <button
            type="button"
            onClick={resetToDefaults}
            className="p-2 text-ink-400 hover:text-ink-200 bg-ink-900/90 hover:bg-ink-800 border border-ink-700/80 rounded-xl transition-all cursor-pointer"
            title="Reset to default settings & cities"
            aria-label="Reset to default settings and cities"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
