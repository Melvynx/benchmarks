import type { Mode } from '../types'
import { UsersIcon, PinIcon } from './icons'

interface Props {
  mode: Mode
  onChange: (mode: Mode) => void
}

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="inline-flex rounded-xl border border-ink-700 bg-ink-850 p-1 text-sm shadow-inner shadow-black/40">
      <button
        type="button"
        onClick={() => onChange('meeting')}
        className={[
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition',
          mode === 'meeting'
            ? 'bg-accent-500 text-white shadow-md shadow-accent-500/30'
            : 'text-ink-300 hover:text-white',
        ].join(' ')}
        aria-pressed={mode === 'meeting'}
      >
        <UsersIcon width={14} height={14} />
        Meeting
      </button>
      <button
        type="button"
        onClick={() => onChange('base')}
        className={[
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition',
          mode === 'base'
            ? 'bg-accent-500 text-white shadow-md shadow-accent-500/30'
            : 'text-ink-300 hover:text-white',
        ].join(' ')}
        aria-pressed={mode === 'base'}
      >
        <PinIcon width={14} height={14} />
        Base
      </button>
    </div>
  )
}