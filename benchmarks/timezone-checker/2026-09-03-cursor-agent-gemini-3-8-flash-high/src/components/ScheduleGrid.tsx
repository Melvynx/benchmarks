import React from 'react'
import { DesktopGrid } from './DesktopGrid'
import { MobileGrid } from './MobileGrid'
import { CityPicker } from './CityPicker'
import { useTimezone } from '@/context/TimezoneContext'

export const ScheduleGrid: React.FC = () => {
  const { schedule, mode } = useTimezone()
  const reference = schedule.rows[0]

  const hintText =
    mode === 'meeting'
      ? 'Green cells = everyone awake'
      : reference
        ? `Green cells = awake at the same time as ${reference.city.name}`
        : 'Green cells = overlap'

  return (
    <section
      aria-label="Interactive Timezone Schedule Grid"
      className="bg-ink-900 border border-ink-800 rounded-2xl p-4 sm:p-6 shadow-xl relative"
    >
      {/* City search & stats bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-ink-800">
        <CityPicker />

        <div className="flex items-center gap-3 text-xs text-ink-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-medium text-ink-300">
              {schedule.rows.length} {schedule.rows.length === 1 ? 'City' : 'Cities'}
            </span>
          </span>
          <span>•</span>
          <span className="hidden sm:inline">Click city name to set as reference</span>
        </div>
      </div>

      {schedule.rows.length === 0 ? (
        <div className="text-center py-16 px-4">
          <p className="text-sm font-semibold text-ink-300">No cities selected.</p>
          <p className="text-xs text-ink-500 mt-1 max-w-sm mx-auto">
            Use the searchable dropdown above to select cities from the predefined 34-city catalog.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Horizontal Grid (>= 768px) */}
          <div className="hidden md:block">
            <DesktopGrid />
          </div>

          {/* Mobile Vertical Grid (< 768px) */}
          <div className="md:hidden">
            <MobileGrid />
          </div>

          {/* Legend and Footer Hint */}
          <footer className="mt-6 pt-4 border-t border-ink-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-ink-400">
            {/* Primary Hint required by specification */}
            <div className="flex items-center gap-2 font-medium text-emerald-400">
              <span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-400 shrink-0 shadow-sm shadow-emerald-500/30" />
              <span>{hintText}</span>
            </div>

            {/* Visual Legend */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-ink-800 border border-ink-700/60 shrink-0" />
                <span className="text-ink-300">Awake</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-ink-950/80 border border-ink-900/50 opacity-50 shrink-0" />
                <span className="text-ink-400">Sleeping</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-ink-300">Current Hour</span>
              </div>
            </div>
          </footer>
        </>
      )}
    </section>
  )
}
