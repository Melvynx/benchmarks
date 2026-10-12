import type { Mode } from '../types'
import styles from './Legend.module.css'

interface Props {
  mode: Mode
  referenceName: string | undefined
}

export function Legend({ mode, referenceName }: Props) {
  const hint =
    mode === 'meeting' || !referenceName
      ? 'Green cells = everyone awake'
      : `Green cells = awake at the same time as ${referenceName}`

  return (
    <footer className={styles.legend}>
      <p className={styles.hint}>{hint}</p>
      <ul className={styles.keys} aria-label="Legend">
        <li>
          <span className={`${styles.swatch} ${styles.overlap}`} /> Overlap
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.awake}`} /> Awake
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.sleeping}`} /> Sleeping
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.now}`} /> Now
        </li>
        <li>
          <span className={styles.midnight} /> New day
        </li>
      </ul>
    </footer>
  )
}
