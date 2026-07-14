import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { Dispatch } from 'react'
import { getCityById } from '../data/cities'
import { buildGridRows } from '../lib/gridModel'
import type { Action, PersistedState } from '../state/appState'
import { ModeToggle } from '../components/ModeToggle'
import { OverlapSummary } from '../components/OverlapSummary'
import { AddCitySearch } from '../components/AddCitySearch'
import { ScheduleGrid } from '../components/ScheduleGrid'
import styles from '../App.module.css'

interface Props {
  state: PersistedState
  dispatch: Dispatch<Action>
}

export function HomePage({ state, dispatch }: Props) {
  const cities = useMemo(
    () => state.cityIds.map((id) => getCityById(id)).filter(Boolean),
    [state.cityIds],
  ) as NonNullable<ReturnType<typeof getCityById>>[]

  const refCity = cities[0]
  const selectedIds = useMemo(() => new Set(state.cityIds), [state.cityIds])

  const gridRows = useMemo(
    () =>
      buildGridRows(cities, state.settings.wakeHour, state.settings.sleepHour, state.mode),
    [cities, state.settings.wakeHour, state.settings.sleepHour, state.mode],
  )

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>Composer</h1>
            <p className={styles.tagline}>Timezone overlap for distributed teams</p>
          </div>
          <div className={styles.headerActions}>
            <ModeToggle mode={state.mode} onChange={(mode) => dispatch({ type: 'SET_MODE', mode })} />
            <Link to="/settings" className={styles.settingsNav}>
              <span className={styles.settingsNavIcon} aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              </span>
              Settings
            </Link>
          </div>
        </div>
        <div className={styles.toolbar}>
          <AddCitySearch
            selectedIds={selectedIds}
            onAdd={(id) => dispatch({ type: 'ADD_CITY', id })}
          />
        </div>
      </header>

      <main className={styles.main}>
        {refCity && (
          <p className={styles.refLine}>
            Grid columns are hours in <strong>{refCity.name}</strong> today — each cell shows the
            local hour there.
          </p>
        )}

        <OverlapSummary
          cities={cities}
          mode={state.mode}
          wakeHour={state.settings.wakeHour}
          sleepHour={state.settings.sleepHour}
          use24h={state.settings.use24h}
          refCityName={refCity?.name ?? 'reference'}
        />

        <ScheduleGrid
          rows={gridRows}
          use24h={state.settings.use24h}
          isReference={(id) => cities[0]?.id === id}
          onPromote={(id) => dispatch({ type: 'PROMOTE_CITY', id })}
          onRemove={(id) => dispatch({ type: 'REMOVE_CITY', id })}
        />

        <footer className={styles.hint}>
          <span className={styles.hintDot} aria-hidden />
          Green cells = everyone awake
          {state.mode === 'base' && ' (vs reference row)'}
        </footer>
      </main>
    </div>
  )
}
