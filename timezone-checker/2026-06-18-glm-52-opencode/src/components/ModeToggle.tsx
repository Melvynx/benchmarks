import type { Mode } from '../lib/types';

interface ModeToggleProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

const OPTIONS: { value: Mode; label: string; hint: string }[] = [
  { value: 'meeting', label: 'Meeting', hint: 'Everyone awake at once' },
  { value: 'base', label: 'Base', hint: 'Each city vs. the reference' },
];

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div
      className="inline-flex rounded-xl bg-ink-900/80 p-1 ring-1 ring-inset ring-ink-700"
      role="tablist"
      aria-label="Overlap mode"
    >
      {OPTIONS.map((opt) => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            title={opt.hint}
            className={[
              'relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all sm:px-4',
              active
                ? 'bg-gradient-to-b from-ink-700 to-ink-800 text-white shadow-sm ring-1 ring-inset ring-ink-600'
                : 'text-slate-400 hover:text-slate-200',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
