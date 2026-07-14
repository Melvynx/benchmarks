import type { AppMode } from '../lib/overlap'
import { useAppStore } from '../store/useAppStore'

const MODES: { id: AppMode; label: string; hint: string }[] = [
  { id: 'meeting', label: 'Meeting', hint: 'Everyone awake together' },
  { id: 'base', label: 'Base', hint: 'Each city vs reference' },
]

export function ModeToggle() {
  const mode = useAppStore((s) => s.mode)
  const setMode = useAppStore((s) => s.setMode)

  return (
    <div className="mode-toggle" role="tablist" aria-label="Overlap mode">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          role="tab"
          aria-selected={mode === m.id}
          className={`mode-toggle__btn${mode === m.id ? ' is-active' : ''}`}
          onClick={() => setMode(m.id)}
          title={m.hint}
        >
          <span className="mode-toggle__label">{m.label}</span>
          <span className="mode-toggle__hint">{m.hint}</span>
        </button>
      ))}
    </div>
  )
}
