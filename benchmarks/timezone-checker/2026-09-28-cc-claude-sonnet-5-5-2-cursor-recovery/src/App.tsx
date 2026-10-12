import styles from './App.module.css'
import { Board } from './components/Board'
import { CityPicker } from './components/CityPicker'
import { Header } from './components/Header'
import { Legend } from './components/Legend'
import { ModeToggle } from './components/ModeToggle'
import { OverlapSummary } from './components/OverlapSummary'
import { SettingsPanel } from './components/SettingsPanel'
import { useAppState } from './hooks/useAppState'
import { useBoard } from './hooks/useBoard'
import { useNow } from './hooks/useNow'

export default function App() {
  const [state, dispatch] = useAppState()
  const now = useNow()
  const { cities, board, nowHour } = useBoard(state, now)
  const { mode, settings } = state
  const referenceName = cities[0]?.city.name

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.controls}>
          <ModeToggle mode={mode} referenceName={referenceName} onChange={(next) => dispatch({ type: 'setMode', mode: next })} />
          <SettingsPanel settings={settings} dispatch={dispatch} />
        </div>

        <section className={styles.board} aria-labelledby="cities-heading">
          <div className={styles.boardHeader}>
            <h2 id="cities-heading" className={styles.boardTitle}>
              Cities <span className={styles.count}>{cities.length}</span>
            </h2>
            <CityPicker addedIds={state.cityIds} now={now} onAdd={(id) => dispatch({ type: 'addCity', id })} />
          </div>

          <OverlapSummary mode={mode} views={cities} summaries={board.summaries} format={settings.timeFormat} />

          <Board
            views={cities}
            board={board}
            nowHour={nowHour}
            format={settings.timeFormat}
            onPromote={(id) => dispatch({ type: 'promoteCity', id })}
            onRemove={(id) => dispatch({ type: 'removeCity', id })}
          />

          <Legend mode={mode} referenceName={referenceName} />
        </section>
      </main>

      <p className={styles.footnote}>
        Hours follow the first city&rsquo;s clock. Offsets use today&rsquo;s date, so daylight saving is included.
      </p>
    </div>
  )
}
