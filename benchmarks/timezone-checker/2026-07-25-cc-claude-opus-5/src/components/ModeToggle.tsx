import type { Mode } from '../lib/overlap'
import { cx } from './cell-style'

const MODES: Array<{ id: Mode; label: string; hint: string }> = [
  { id: 'meeting', label: 'Meeting', hint: 'Hours when every city is awake at once' },
  { id: 'base', label: 'Base', hint: 'Each city measured against the reference alone' },
]

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode
  onChange: (mode: Mode) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Overlap mode"
      className="inline-flex rounded-lg border border-line bg-surface p-0.5"
    >
      {MODES.map((option) => {
        const active = option.id === mode
        return (
          <button
            key={option.id}
            role="radio"
            aria-checked={active}
            title={option.hint}
            onClick={() => onChange(option.id)}
            className={cx(
              'rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors duration-150',
              active
                ? 'bg-raised text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                : 'text-ink-faint hover:text-ink-muted',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
