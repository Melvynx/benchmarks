import { useState } from 'react'
import { CityPicker } from './components/CityPicker'
import { Header } from './components/Header'
import { OverlapSummary } from './components/OverlapSummary'
import { SettingsPanel } from './components/SettingsPanel'
import { ScheduleGrid } from './components/grid/ScheduleGrid'
import { useSchedule } from './hooks/useSchedule'
import { formatHour } from './lib/timezone'
import { useAppStore } from './store/useAppStore'

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const schedule = useSchedule()
  const { wakeHour, sleepHour, timeFormat } = useAppStore((state) => state.settings)
  const cityCount = schedule.rows.length

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
      <Header settingsOpen={settingsOpen} onToggleSettings={() => setSettingsOpen((open) => !open)} />

      {settingsOpen && <SettingsPanel />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <CityPicker />
        <p className="text-xs text-ink-500">
          <span className="tabular font-medium text-ink-300">{cityCount}</span> {cityCount === 1 ? 'city' : 'cities'}
          <span className="mx-2 text-ink-700">|</span>
          Awake{' '}
          <span className="tabular font-medium text-ink-300">
            {formatHour(wakeHour, timeFormat)} – {formatHour(sleepHour, timeFormat)}
          </span>
          <span className="hidden sm:inline">
            <span className="mx-2 text-ink-700">|</span>
            Click a city name to make it the reference
          </span>
        </p>
      </div>

      <OverlapSummary schedule={schedule} />

      <ScheduleGrid schedule={schedule} />
    </div>
  )
}
