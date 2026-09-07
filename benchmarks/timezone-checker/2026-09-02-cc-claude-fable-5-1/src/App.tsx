import { useCallback, useEffect, useMemo, useState } from 'react'
import { CityPicker } from './components/CityPicker'
import { DesktopGrid } from './components/DesktopGrid'
import { Header } from './components/Header'
import { MobileGrid } from './components/MobileGrid'
import { OverlapSummary } from './components/OverlapSummary'
import { SettingsPanel } from './components/SettingsPanel'
import { useMediaQuery } from './hooks/useMediaQuery'
import { usePersistentState } from './hooks/usePersistentState'
import { type City, getCity } from './lib/cities'
import { buildSchedule, type Mode, type Settings } from './lib/overlap'

const LEGEND = [
  { label: 'Sleeping', className: 'bg-ink-800/40 border border-ink-700' },
  { label: 'Awake', className: 'bg-ink-700/70' },
  { label: 'Overlap', className: 'bg-glow-500/90' },
]

export default function App() {
  const [state, setState] = usePersistentState()
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // Re-evaluate offsets every minute so DST transitions and the current date stay accurate without a reload.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const cities = useMemo(() => state.cityIds.map(getCity).filter((c): c is City => !!c), [state.cityIds])
  const schedule = useMemo(() => buildSchedule(cities, state.settings, state.mode, now), [cities, state.settings, state.mode, now])

  const setMode = useCallback((mode: Mode) => setState((s) => ({ ...s, mode })), [setState])
  const setSettings = useCallback((settings: Settings) => setState((s) => ({ ...s, settings })), [setState])
  const addCity = useCallback(
    (city: City) => setState((s) => (s.cityIds.includes(city.id) ? s : { ...s, cityIds: [...s.cityIds, city.id] })),
    [setState],
  )
  const removeCity = useCallback((id: string) => setState((s) => ({ ...s, cityIds: s.cityIds.filter((c) => c !== id) })), [setState])
  const promoteCity = useCallback(
    (id: string) => setState((s) => ({ ...s, cityIds: [id, ...s.cityIds.filter((c) => c !== id)] })),
    [setState],
  )

  const gridProps = { schedule, format: state.settings.timeFormat, onPromote: promoteCity, onRemove: removeCity }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <Header mode={state.mode} onModeChange={setMode} />
      <SettingsPanel settings={state.settings} onChange={setSettings} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CityPicker selectedIds={state.cityIds} onAdd={addCity} />
        <ul aria-label="Legend" className="flex items-center gap-4 text-xs text-ink-300">
          {LEGEND.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5">
              <span className={['inline-block size-3 rounded-[3px]', l.className].join(' ')} />
              {l.label}
            </li>
          ))}
        </ul>
      </div>

      <OverlapSummary schedule={schedule} mode={state.mode} format={state.settings.timeFormat} />

      {cities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-600 px-6 py-16 text-center text-sm text-ink-400">
          No cities yet. Add one above to get started.
        </div>
      ) : isDesktop ? (
        <DesktopGrid {...gridProps} />
      ) : (
        <MobileGrid {...gridProps} />
      )}

      <footer className="flex flex-col items-center gap-1 pt-4 text-center text-xs text-ink-400">
        <p>
          <span className="mr-1.5 inline-block size-2.5 translate-y-px rounded-[3px] bg-glow-500" />
          {state.mode === 'meeting' ? 'Green cells = everyone awake' : 'Green cells = awake at the same time as the reference city'}
        </p>
        <p className="text-ink-400/70">Offsets reflect today&apos;s date, so daylight saving time is handled automatically.</p>
      </footer>
    </main>
  )
}
