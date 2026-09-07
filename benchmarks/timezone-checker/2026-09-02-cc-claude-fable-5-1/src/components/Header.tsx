import type { Mode } from '../lib/overlap'

interface Props {
  mode: Mode
  onModeChange: (mode: Mode) => void
}

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'meeting', label: 'Meeting', hint: 'Everyone awake at once' },
  { id: 'base', label: 'Base', hint: 'Each city vs. the reference' },
]

export function Header({ mode, onModeChange }: Props) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2 text-[11px] font-medium tracking-[0.2em] text-glow-400 uppercase">
          <span className="inline-block size-1.5 rounded-full bg-glow-400 shadow-[0_0_12px_2px_rgba(74,222,128,0.6)]" />
          Timezone overlap
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Claude Fable 5.1</h1>
        <p className="mt-2 max-w-md text-sm text-ink-300">
          Find the hours when a distributed team is awake together. Every column is anchored to the reference city.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Mode"
        className="inline-flex shrink-0 self-start rounded-xl border border-ink-700 bg-ink-900/80 p-1 backdrop-blur sm:self-auto"
      >
        {MODES.map((m) => {
          const active = m.id === mode
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={active}
              title={m.hint}
              onClick={() => onModeChange(m.id)}
              className={[
                'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow-400',
                active ? 'bg-ink-700 text-white shadow-sm' : 'text-ink-300 hover:text-white',
              ].join(' ')}
            >
              {m.label}
              <span className="ml-1.5 hidden text-xs font-normal text-ink-400 sm:inline">{m.hint}</span>
            </button>
          )
        })}
      </div>
    </header>
  )
}
