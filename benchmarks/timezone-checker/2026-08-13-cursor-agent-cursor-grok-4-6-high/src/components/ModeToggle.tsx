import type { Mode } from '../lib/overlap'

type Props = {
  mode: Mode
  onChange: (mode: Mode) => void
}

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="mode-toggle" role="radiogroup" aria-label="Overlap mode">
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'meeting'}
        className={mode === 'meeting' ? 'is-on' : undefined}
        onClick={() => onChange('meeting')}
      >
        Meeting
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'base'}
        className={mode === 'base' ? 'is-on' : undefined}
        onClick={() => onChange('base')}
      >
        Base
      </button>
    </div>
  )
}
