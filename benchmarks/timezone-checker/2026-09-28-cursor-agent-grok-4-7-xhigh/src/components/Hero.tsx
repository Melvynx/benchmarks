import type { Mode } from '../types';

const MODES: Array<{ id: Mode; name: string; sub: string }> = [
  { id: 'meeting', name: 'Meeting', sub: 'One shared window' },
  { id: 'base', name: 'Base', sub: 'Each city vs reference' },
];

export function Hero({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <header className="hero">
      <div className="shell hero-inner">
        <h1>Grok 4.7</h1>
        <div
          className="modes"
          role="radiogroup"
          aria-label="Overlap mode"
          onKeyDown={(event) => {
            if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
            event.preventDefault();
            onChange(mode === 'meeting' ? 'base' : 'meeting');
          }}
        >
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={mode === item.id}
              className="mode"
              onClick={() => onChange(item.id)}
            >
              <span className="mode-name">{item.name}</span>
              <span className="mode-sub">{item.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
