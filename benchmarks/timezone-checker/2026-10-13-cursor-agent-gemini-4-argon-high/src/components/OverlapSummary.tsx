import React from 'react';
import { Users, GitCompare, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { City } from '../data/cities';
import { AppMode, CityOverlapSummary, TimeRangeBadge } from '../utils/timezone';

interface OverlapSummaryProps {
  cities: City[];
  mode: AppMode;
  meetingOverlapCount: number;
  meetingRanges: TimeRangeBadge[];
  baseSummaries: CityOverlapSummary[];
}

export const OverlapSummary: React.FC<OverlapSummaryProps> = ({
  cities,
  mode,
  meetingOverlapCount,
  meetingRanges,
  baseSummaries,
}) => {
  if (cities.length < 2) {
    return null;
  }

  const refCity = cities[0];

  if (mode === 'meeting') {
    const hasOverlap = meetingOverlapCount > 0;
    return (
      <section
        aria-label="Overlap Summary"
        data-testid="overlap-summary"
        className={`rounded-xl border p-4 transition-colors ${
          hasOverlap
            ? 'border-emerald-500/30 bg-emerald-950/20'
            : 'border-amber-500/35 bg-amber-950/20'
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                hasOverlap
                  ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/15 text-amber-300'
              }`}
            >
              {hasOverlap ? (
                <Users className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-100">
                  Meeting Overlap
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs font-bold border ${
                    hasOverlap
                      ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-200'
                      : 'border-amber-500/40 bg-amber-500/20 text-amber-200'
                  }`}
                >
                  {meetingOverlapCount}{' '}
                  {meetingOverlapCount === 1 ? 'hour' : 'hours'} ({meetingOverlapCount}h)
                </span>
                <span className="text-xs text-slate-400">
                  in <strong className="font-medium text-slate-200">{refCity.name}</strong> time
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                {hasOverlap
                  ? `Simultaneous awake hours across all ${cities.length} selected cities`
                  : `Warning: Zero simultaneous awake hours across all ${cities.length} cities. Adjust awake window or switch to Base Mode.`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasOverlap ? (
              meetingRanges.map((range) => (
                <span
                  key={`${range.startHour}-${range.endHour}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-1.5 font-mono text-xs font-semibold text-emerald-100 shadow-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{range.label}</span>
                </span>
              ))
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <span>No common meeting window available</span>
              </span>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Base Mode: one line per non-reference city
  return (
    <section
      aria-label="Overlap Summary"
      data-testid="overlap-summary"
      className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-4"
    >
      <div className="mb-3 flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-semibold text-slate-100">
            Base Overlap vs. {refCity.name}
          </span>
          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-300 border border-emerald-500/30">
            REF
          </span>
        </div>
        <span className="text-xs text-slate-400">
          Ranges shown in {refCity.name} local time
        </span>
      </div>

      <div className="divide-y divide-slate-800/60">
        {baseSummaries.map(({ city, totalHours, ranges }) => {
          const hasOverlap = totalHours > 0;
          return (
            <div
              key={city.id}
              data-testid={`base-summary-${city.id}`}
              className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-medium text-slate-400">
                  {refCity.name}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-sm font-semibold text-slate-100">
                  {city.name}
                </span>
                <span className="text-xs text-slate-500">({city.country})</span>
                <span
                  className={`ml-1 rounded-md px-2 py-0.5 font-mono text-xs font-bold border ${
                    hasOverlap
                      ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300'
                      : 'border-amber-500/35 bg-amber-500/15 text-amber-300'
                  }`}
                >
                  {totalHours} {totalHours === 1 ? 'hour' : 'hours'} ({totalHours}h)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {hasOverlap ? (
                  ranges.map((range) => (
                    <span
                      key={`${range.startHour}-${range.endHour}`}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-100"
                    >
                      {range.label}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-200">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    <span>Warning: No overlapping awake hours with {refCity.name}</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
