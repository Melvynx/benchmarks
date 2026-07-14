import { Fragment } from 'react';
import type { City, Mode, TimeFormat } from '../lib/types';
import { formatRanges } from '../lib/format';

interface OverlapSummaryProps {
  mode: Mode;
  cities: City[];
  meetingOverlapHours: number[];
  baseOverlap: Record<string, number[]>;
  format: TimeFormat;
}

export function OverlapSummary({
  mode,
  cities,
  meetingOverlapHours,
  baseOverlap,
  format,
}: OverlapSummaryProps) {
  if (cities.length < 2) {
    return (
      <div className="rounded-2xl border border-ink-800 bg-ink-900/50 px-4 py-3 text-sm text-slate-400">
        Add at least one more city to see overlap windows.
      </div>
    );
  }

  if (mode === 'meeting') {
    const count = meetingOverlapHours.length;
    const ranges = formatRanges(meetingOverlapHours, format);
    return (
      <SummaryShell
        label="Common availability"
        accent={count > 0}
        subtitle={`Hours where everyone in ${cities.length} cities is awake · in ${cities[0].name}`}
      >
        {count > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <CountPill count={count} />
            <div className="flex flex-wrap gap-1.5">
              {ranges.map((r, i) => (
                <RangeBadge key={i} text={r} />
              ))}
            </div>
          </div>
        ) : (
          <Warning>
            No common awake hours across all cities. Try widening the
            availability window or switching to Base mode.
          </Warning>
        )}
      </SummaryShell>
    );
  }

  // base mode: one line per non-reference city
  const others = cities.slice(1);
  return (
    <SummaryShell
      label="Per-city availability"
      accent={others.some((c) => (baseOverlap[c.id]?.length ?? 0) > 0)}
      subtitle={`Each city vs. the reference (${cities[0].name}) · times shown in ${cities[0].name}`}
    >
      <ul className="flex flex-col gap-2">
        {others.map((city) => {
          const hours = baseOverlap[city.id] ?? [];
          const ranges = formatRanges(hours, format);
          return (
            <li
              key={city.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl bg-ink-900/60 px-3 py-2 ring-1 ring-inset ring-ink-800"
            >
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-100">
                  {city.name}
                </span>
                {hours.length > 0 ? (
                  <CountPill count={hours.length} compact />
                ) : (
                  <span className="text-xs text-rose-300/80">no overlap</span>
                )}
              </span>
              {ranges.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {ranges.map((r, i) => (
                    <RangeBadge key={i} text={r} />
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-500">
                  No overlapping awake hours with the reference.
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </SummaryShell>
  );
}

function SummaryShell({
  label,
  subtitle,
  accent,
  children,
}: {
  label: string;
  subtitle: string;
  accent: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={[
        'rounded-2xl border px-4 py-3.5 backdrop-blur-sm transition-colors',
        accent
          ? 'border-accent-500/25 bg-accent-500/[0.06]'
          : 'border-ink-700 bg-ink-900/50',
      ].join(' ')}
      aria-live="polite"
    >
      <div className="mb-2 flex flex-col gap-0.5">
        <h2 className="text-sm font-semibold text-white">{label}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <Fragment>{children}</Fragment>
    </section>
  );
}

function CountPill({ count, compact }: { count: number; compact?: boolean }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full bg-accent-500/15 font-semibold text-accent-200 ring-1 ring-inset ring-accent-400/30',
        compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
      ].join(' ')}
    >
      {count}
      <span className="text-accent-300/70">{count === 1 ? 'hr' : 'hrs'}</span>
    </span>
  );
}

function RangeBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-ink-800 px-2 py-1 text-xs font-medium tabular-nums text-slate-200 ring-1 ring-inset ring-ink-700">
      {text}
    </span>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200 ring-1 ring-inset ring-rose-500/25">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 h-4 w-4 shrink-0"
        aria-hidden
      >
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      </svg>
      <span>{children}</span>
    </div>
  );
}
