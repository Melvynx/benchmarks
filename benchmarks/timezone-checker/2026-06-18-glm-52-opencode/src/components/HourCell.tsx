interface HourCellProps {
  localMinutes: number;
  dayShift: number;
  awake: boolean;
  overlap: boolean;
  format: '12h' | '24h';
  label?: string;
}

import { formatCellTime } from '../lib/format';

export function HourCell({
  localMinutes,
  dayShift,
  awake,
  overlap,
  format,
  label,
}: HourCellProps) {
  const text = label ?? formatCellTime(localMinutes, format);

  let state: 'overlap' | 'awake' | 'sleep';
  if (overlap) state = 'overlap';
  else if (awake) state = 'awake';
  else state = 'sleep';

  const base =
    'relative flex h-9 min-w-9 items-center justify-center rounded-md text-[11px] leading-none tabular-nums transition-colors select-none';

  const stateClasses = {
    overlap:
      'bg-gradient-to-b from-accent-500/35 to-accent-500/20 text-emerald-50 font-semibold ring-1 ring-inset ring-accent-400/50 shadow-[0_0_14px_-2px_rgba(16,185,129,0.55)]',
    awake: 'bg-ink-800/70 text-slate-200 ring-1 ring-inset ring-ink-700/60',
    sleep: 'bg-ink-900/40 text-ink-500/50 ring-1 ring-inset ring-ink-800/40',
  } as const;

  return (
    <div className={`${base} ${stateClasses[state]}`} title={text}>
      <span>{text}</span>
      {dayShift !== 0 && (
        <span
          className="pointer-events-none absolute -top-1 -right-0.5 text-[8px] font-medium tabular-nums text-ink-500/80"
          aria-hidden
        >
          {dayShift > 0 ? `+${dayShift}` : dayShift}
        </span>
      )}
    </div>
  );
}
