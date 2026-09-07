import type { Mode } from '../lib/overlap'

const SWATCHES = [
  { className: 'border-line/70 bg-surface/50', label: 'Sleeping' },
  { className: 'border-line-strong/60 bg-raised', label: 'Awake' },
  { className: 'cell-overlap', label: 'Overlap' },
]

export function Legend({ mode, referenceName }: { mode: Mode; referenceName?: string }) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-xs text-ink-faint">
      <ul className="flex items-center gap-4">
        {SWATCHES.map((swatch) => (
          <li key={swatch.label} className="flex items-center gap-2">
            <span className={`h-3.5 w-5 rounded-[3px] border ${swatch.className}`} />
            {swatch.label}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span className="h-3.5 w-0.5 rounded-full bg-ref/70" />
          Day rolls over
        </li>
      </ul>
      <p className="text-ink-muted">
        {mode === 'meeting'
          ? 'Green cells = everyone awake'
          : `Green cells = awake at the same time as ${referenceName ?? 'the reference city'}`}
      </p>
    </footer>
  )
}
