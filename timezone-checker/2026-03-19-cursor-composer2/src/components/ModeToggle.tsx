import type { AppMode } from '../lib/gridModel'
import styles from './ModeToggle.module.css'

interface Props {
  mode: AppMode
  onChange: (mode: AppMode) => void
}

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className={styles.wrap} role="group" aria-label="Overlap mode">
      <button
        type="button"
        className={mode === 'meeting' ? styles.active : styles.btn}
        onClick={() => onChange('meeting')}
        aria-pressed={mode === 'meeting'}
      >
        Meeting
        <span className={styles.hint}>everyone at once</span>
      </button>
      <button
        type="button"
        className={mode === 'base' ? styles.active : styles.btn}
        onClick={() => onChange('base')}
        aria-pressed={mode === 'base'}
      >
        Base
        <span className={styles.hint}>vs reference only</span>
      </button>
    </div>
  )
}
