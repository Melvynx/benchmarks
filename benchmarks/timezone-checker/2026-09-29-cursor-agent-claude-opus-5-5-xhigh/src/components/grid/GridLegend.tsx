import type { CellState, OverlapModel } from '../../lib/overlap';

const LEGEND: ReadonlyArray<{ state: CellState; label: string }> = [
  { state: 'overlap', label: 'Overlap' },
  { state: 'awake', label: 'Awake' },
  { state: 'asleep', label: 'Asleep' },
];

export function GridLegend({ model, isDesktop }: { model: OverlapModel; isDesktop: boolean }) {
  const hint = !model.isComparing
    ? 'Add another city to find overlapping hours'
    : model.mode === 'meeting'
      ? 'Green cells = everyone awake'
      : `Green cells = awake at the same time as ${model.reference?.city.name}`;

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 md:flex-row md:items-center md:justify-between">
      <ul aria-label="Legend" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-2">
        {LEGEND.map(({ state, label }) => (
          <li key={state} className="flex items-center gap-2">
            <span className="swatch" data-availability={state} aria-hidden />
            {label}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span className="h-3.5 w-0.5 rounded-full bg-now" aria-hidden />
          Now
        </li>
        <li className="flex items-center gap-2">
          <span className="font-mono text-[0.625rem] font-bold text-day" aria-hidden>
            MON
          </span>
          Local midnight
        </li>
      </ul>
      <div className="flex flex-col gap-0.5 md:items-end">
        <p className="text-sm font-medium text-ink">{hint}</p>
        {model.rows.length > 1 && (
          <p className="text-xs text-ink-3">{isDesktop ? 'Click' : 'Tap'} a city name to make it the reference</p>
        )}
      </div>
    </div>
  );
}
