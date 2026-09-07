import { useMemo } from 'react'
import { CityPicker } from './components/CityPicker'
import { DesktopGrid } from './components/DesktopGrid'
import { MobileGrid } from './components/MobileGrid'
import { ModeToggle } from './components/ModeToggle'
import { OverlapSummary } from './components/OverlapSummary'
import { SettingsPanel } from './components/SettingsPanel'
import { useNow, usePersistedApp } from './hooks/usePersistedApp'
import { buildBoard } from './lib/overlap'
import { localMinutesNow } from './lib/time'

export default function App() {
  const app = usePersistedApp()
  const now = useNow()

  const board = useMemo(
    () =>
      buildBoard(
        app.cities,
        { wakeHour: app.wakeHour, sleepHour: app.sleepHour },
        app.mode,
        now,
      ),
    [app.cities, app.wakeHour, app.sleepHour, app.mode, now],
  )

  const nowHour = useMemo(() => {
    const reference = app.cities[0]
    if (!reference) return null
    return Math.floor(localMinutesNow(reference.timeZone, now) / 60)
  }, [app.cities, now])

  const referenceName = app.cities[0]?.name ?? 'reference'

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-title">
          <h1>Cursor Grok 4.6</h1>
          <CityPicker selectedIds={app.cityIds} onAdd={app.addCity} />
        </div>
        <div className="topbar-tools">
          <ModeToggle mode={app.mode} onChange={app.setMode} />
          <SettingsPanel
            wakeHour={app.wakeHour}
            sleepHour={app.sleepHour}
            timeFormat={app.timeFormat}
            onWake={app.setWakeHour}
            onSleep={app.setSleepHour}
            onFormat={app.setTimeFormat}
          />
        </div>
      </header>

      <main className="main">
        <OverlapSummary
          board={board}
          mode={app.mode}
          format={app.timeFormat}
          referenceName={referenceName}
        />

        {board.rows.length === 0 ? (
          <p className="empty">Add a city to start comparing hours.</p>
        ) : (
          <>
            <DesktopGrid
              board={board}
              format={app.timeFormat}
              nowHour={nowHour}
              onSetReference={app.setReference}
              onRemove={app.removeCity}
            />
            <MobileGrid
              board={board}
              format={app.timeFormat}
              nowHour={nowHour}
              onSetReference={app.setReference}
              onRemove={app.removeCity}
            />
          </>
        )}
      </main>

      <p className="hint">Green cells = everyone awake</p>
    </div>
  )
}
