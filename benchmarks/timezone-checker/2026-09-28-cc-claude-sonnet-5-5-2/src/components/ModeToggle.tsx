import type { Mode } from '../types'
import styles from './Panel.module.css'
import { SegmentedControl } from './SegmentedControl'

const OPTIONS = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'base', label: 'Base' },
] as const

interface Props {
  mode: Mode
  referenceName: string | undefined
  onChange: (mode: Mode) => void
}

export function ModeToggle({ mode, referenceName, onChange }: Props) {
  const base = referenceName ?? 'the first city'
  return (
    <section className={styles.panel} aria-labelledby="mode-heading">
      <h2 id="mode-heading" className={styles.heading}>
        Mode
      </h2>
      <SegmentedControl name="mode" label="Mode" options={OPTIONS} value={mode} onChange={onChange} />
      <p className={styles.description}>
        {mode === 'meeting'
          ? 'One shared window: the hours when every city is awake at once.'
          : `Each city is compared only against ${base}, so every row can highlight different hours.`}
      </p>
    </section>
  )
}
