import type { Mode } from '../lib/types'

const SWATCH = 'inline-block size-4 rounded-[5px]'

interface LegendProps {
  mode: Mode
  referenceName: string | null
}

export function Legend({ mode, referenceName }: LegendProps) {
  const hint =
    mode === 'meeting' || !referenceName
      ? 'Green cells = everyone awake'
      : `Green cells = awake at the same time as ${referenceName}`

  return (
    <footer className="flex flex-col gap-3 text-sm text-ink-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-medium text-ink" data-testid="hint">
        {hint}
      </p>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <li className="flex items-center gap-1.5">
          <span className={`${SWATCH} bg-overlap`} aria-hidden="true" />
          Overlap
        </li>
        <li className="flex items-center gap-1.5">
          <span className={`${SWATCH} bg-awake`} aria-hidden="true" />
          Awake
        </li>
        <li className="flex items-center gap-1.5">
          <span
            className={`${SWATCH} border border-line`}
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, transparent 0 3px, var(--sleep-stripe) 3px 4px)',
            }}
            aria-hidden="true"
          />
          Sleeping
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-0.5 rounded-full bg-accent" aria-hidden="true" />
          Local midnight
        </li>
      </ul>
    </footer>
  )
}
