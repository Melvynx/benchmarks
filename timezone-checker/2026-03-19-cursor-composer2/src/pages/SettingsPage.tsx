import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Dispatch } from 'react'
import type { Action, PersistedState } from '../state/appState'
import { SettingsPanel } from '../components/SettingsPanel'
import styles from './SettingsPage.module.css'

interface Props {
  state: PersistedState
  dispatch: Dispatch<Action>
}

export function SettingsPage({ state, dispatch }: Props) {
  useEffect(() => {
    const prev = document.title
    document.title = 'Composer · Settings'
    return () => {
      document.title = prev
    }
  }, [])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>
          <span aria-hidden>←</span> Back to overlap grid
        </Link>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.lead}>
          Your awake window applies to every city on the grid. Night shift? Set wake after sleep.
        </p>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Awake window</h2>
          <p className={styles.cardHint}>Changes apply as soon as you adjust them.</p>
          <SettingsPanel
            settings={state.settings}
            onChange={(partial) => dispatch({ type: 'SET_SETTINGS', partial })}
          />
        </div>
      </main>
    </div>
  )
}
