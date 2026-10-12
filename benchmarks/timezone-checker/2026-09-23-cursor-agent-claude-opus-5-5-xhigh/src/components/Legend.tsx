import type { Mode } from '../domain/schedule'
import { cn } from '../lib/cn'

interface LegendProps {
  mode: Mode
  referenceName: string
  /** At least two cities, so green cells can appear. */
  comparing: boolean
  touch: boolean
}

export function Legend({ mode, referenceName, comparing, touch }: LegendProps) {
  return (
    <footer className="flex flex-col gap-3 px-1 text-sm lg:flex-row lg:items-center lg:justify-between">
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-ink-2" aria-label="Legend">
        <Swatch label="Overlap" className="bg-overlap shadow-[inset_0_0_0_1px_var(--overlap-edge)]" />
        <Swatch label="Awake" className="bg-surface-2 shadow-[inset_0_0_0_1px_var(--line-strong)]" />
        <Swatch label="Asleep" className="bg-hatch shadow-[inset_0_0_0_1px_var(--line)]" />
      </ul>
      <p className="text-pretty text-ink-3">
        {comparing && (
          <>
            <strong className="font-semibold text-ink">
              {mode === 'meeting' ? 'Green cells = everyone awake' : `Green cells = awake at the same time as ${referenceName}`}
            </strong>
            <span aria-hidden> · </span>
          </>
        )}
        {touch ? 'Tap' : 'Click'} a city name to make it the reference.
      </p>
    </footer>
  )
}

function Swatch({ label, className }: { label: string; className: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden className={cn('size-3.5 rounded-[4px]', className)} />
      {label}
    </li>
  )
}
