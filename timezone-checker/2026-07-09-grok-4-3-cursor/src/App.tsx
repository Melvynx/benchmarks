import { useMemo } from 'react'
import { CityPicker } from './components/CityPicker'
import { ModeToggle } from './components/ModeToggle'
import { OverlapSummary } from './components/OverlapSummary'
import { SettingsPanel } from './components/SettingsPanel'
import { TimezoneGrid } from './components/TimezoneGrid'
import { CITY_BY_ID } from './data/cities'
import { buildGrid } from './lib/overlap'
import { formatHour } from './lib/timezone'
import { useAppStore } from './store/useAppStore'

export default function App() {
  const cityIds = useAppStore((s) => s.cityIds)
  const mode = useAppStore((s) => s.mode)
  const wakeHour = useAppStore((s) => s.wakeHour)
  const sleepHour = useAppStore((s) => s.sleepHour)
  const timeFormat = useAppStore((s) => s.timeFormat)
  const setReference = useAppStore((s) => s.setReference)
  const removeCity = useAppStore((s) => s.removeCity)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)

  const cities = useMemo(
    () => cityIds.map((id) => CITY_BY_ID[id]).filter(Boolean),
    [cityIds],
  )

  const { rows, summary } = useMemo(
    () => buildGrid(cities, mode, wakeHour, sleepHour),
    [cities, mode, wakeHour, sleepHour],
  )

  const referenceName = cities[0]?.name ?? '—'

  return (
    <div className="app">
      <div className="app__glow" aria-hidden />

      <header className="topbar">
        <div className="brand">
          <h1 className="brand__title">Grok 4.5</h1>
          <p className="brand__tag">Timezone overlap checker</p>
        </div>

        <div className="topbar__actions">
          <ModeToggle />
          <button
            type="button"
            className="settings-trigger"
            onClick={() => setSettingsOpen(true)}
          >
            <span aria-hidden>⚙</span>
            Settings
          </button>
        </div>
      </header>

      <main className="main">
        <section className="toolbar">
          <CityPicker />
          <p className="toolbar__awake">
            Awake{' '}
            <strong>
              {formatHour(wakeHour, timeFormat)} → {formatHour(sleepHour, timeFormat)}
            </strong>
          </p>
        </section>

        <OverlapSummary
          summary={summary}
          timeFormat={timeFormat}
          referenceName={referenceName}
        />

        <TimezoneGrid
          rows={rows}
          timeFormat={timeFormat}
          onSetReference={setReference}
          onRemove={removeCity}
        />

        <p className="hint">
          {mode === 'meeting'
            ? 'Green cells = everyone awake'
            : 'Green cells = overlap with the reference city'}
        </p>
      </main>

      <SettingsPanel />
    </div>
  )
}
