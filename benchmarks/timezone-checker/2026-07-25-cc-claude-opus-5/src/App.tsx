import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { CityPicker } from './components/CityPicker'
import { DesktopGrid } from './components/DesktopGrid'
import { Legend } from './components/Legend'
import { MobileGrid } from './components/MobileGrid'
import { ModeToggle } from './components/ModeToggle'
import { OverlapSummary } from './components/OverlapSummary'
import { SettingsPanel } from './components/SettingsPanel'
import { CITY_BY_ID } from './data/cities'
import { useMediaQuery } from './hooks/use-media-query'
import { useNow } from './hooks/use-now'
import { buildBoard } from './lib/overlap'
import { localMinutesNow } from './lib/time'
import { loadState, reducer, saveState } from './state/app-state'

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, loadState)
  const now = useNow()
  const isDesktop = useMediaQuery('(min-width: 768px)')

  useEffect(() => saveState(state), [state])

  const cities = useMemo(
    () => state.cityIds.map((id) => CITY_BY_ID.get(id)).filter((city) => city !== undefined),
    [state.cityIds],
  )

  const board = useMemo(
    () =>
      buildBoard(
        cities,
        { wakeHour: state.wakeHour, sleepHour: state.sleepHour },
        state.mode,
        now,
      ),
    [cities, state.wakeHour, state.sleepHour, state.mode, now],
  )

  const referenceCity = cities[0]
  const currentRefHour = referenceCity
    ? Math.floor(localMinutesNow(referenceCity.timeZone, now) / 60)
    : -1

  const promote = useCallback((cityId: string) => dispatch({ type: 'promote-city', cityId }), [])
  const remove = useCallback((cityId: string) => dispatch({ type: 'remove-city', cityId }), [])

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[76rem] flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-ink sm:text-4xl">
            Claude Opus 5
          </h1>
          <p className="mt-1 text-sm text-ink-faint">
            Timezone overlap for distributed teams — anchored to{' '}
            <span className="text-ink-muted">{referenceCity?.name ?? 'no city yet'}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ModeToggle mode={state.mode} onChange={(mode) => dispatch({ type: 'set-mode', mode })} />
          <SettingsPanel
            wakeHour={state.wakeHour}
            sleepHour={state.sleepHour}
            timeFormat={state.timeFormat}
            onWakeChange={(hour) => dispatch({ type: 'set-wake', hour })}
            onSleepChange={(hour) => dispatch({ type: 'set-sleep', hour })}
            onFormatChange={(format) => dispatch({ type: 'set-format', format })}
            onReset={() => dispatch({ type: 'reset' })}
          />
          <CityPicker
            selectedIds={state.cityIds}
            now={now}
            onAdd={(cityId) => dispatch({ type: 'add-city', cityId })}
          />
        </div>
      </header>

      {cities.length === 0 ? (
        <EmptyState />
      ) : (
        <main className="flex flex-col gap-5">
          {referenceCity && cities.length >= 2 ? (
            <OverlapSummary
              board={board}
              mode={state.mode}
              referenceCity={referenceCity}
              timeFormat={state.timeFormat}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-line bg-surface/40 px-4 py-3 text-sm text-ink-faint">
              Add a second city to see where your days overlap.
            </p>
          )}

          {isDesktop ? (
            <DesktopGrid
              board={board}
              timeFormat={state.timeFormat}
              currentRefHour={currentRefHour}
              onPromote={promote}
              onRemove={remove}
            />
          ) : (
            <MobileGrid
              board={board}
              timeFormat={state.timeFormat}
              currentRefHour={currentRefHour}
              onPromote={promote}
              onRemove={remove}
            />
          )}

          <Legend mode={state.mode} referenceName={referenceCity?.name} />
        </main>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface/40 px-6 py-20 text-center">
      <p className="text-base font-medium text-ink">No cities on the board</p>
      <p className="mt-1 max-w-sm text-sm text-ink-faint">
        Add a city to start comparing days. The first one you add becomes the reference every
        other city is measured against.
      </p>
    </div>
  )
}
