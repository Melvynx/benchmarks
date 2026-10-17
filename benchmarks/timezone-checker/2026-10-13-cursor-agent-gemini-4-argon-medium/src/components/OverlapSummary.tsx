import React from 'react';
import { CheckCircle2, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import { AppMode, City, CityOverlapSummary, TimeRange } from '../types';

interface OverlapSummaryProps {
  cities: City[];
  mode: AppMode;
  meetingOverlapHours: number[];
  meetingRanges: TimeRange[];
  baseSummaries: CityOverlapSummary[];
}

export const OverlapSummary: React.FC<OverlapSummaryProps> = ({
  cities,
  mode,
  meetingOverlapHours,
  meetingRanges,
  baseSummaries,
}) => {
  // Displayed above the grid when 2+ cities are present
  if (cities.length < 2) {
    return (
      <section
        aria-label="Overlap summary"
        className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between text-sm text-slate-400"
      >
        <span>
          Add at least <strong className="text-slate-200">2 cities</strong> to calculate overlapping awake hours.
        </span>
      </section>
    );
  }

  const refCity = cities[0];

  if (mode === 'meeting') {
    const totalHours = meetingOverlapHours.length;
    const hasOverlap = totalHours > 0;

    return (
      <section
        aria-label="Meeting mode overlap summary"
        className={`rounded-2xl p-4 sm:p-5 border transition-colors ${
          hasOverlap
            ? 'bg-emerald-950/25 border-emerald-500/35 shadow-lg shadow-emerald-950/20'
            : 'bg-amber-950/25 border-amber-500/40 shadow-lg shadow-amber-950/20'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            {hasOverlap ? (
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-semibold text-white">
                  {hasOverlap ? (
                    <>
                      <span className="text-emerald-400 font-mono font-bold">
                        {totalHours} {totalHours === 1 ? 'hour' : 'hours'}
                      </span>{' '}
                      of common overlap across all {cities.length} cities
                    </>
                  ) : (
                    <span className="text-amber-300">
                      No common awake hours across all {cities.length} cities
                    </span>
                  )}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 border border-slate-700/70">
                  Anchored to <strong className="text-white">{refCity.name}</strong> (REF)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {hasOverlap
                  ? `Simultaneous availability window(s) shown in ${refCity.name} local time:`
                  : 'Try expanding the awake window or switching to Base Mode to inspect 1-on-1 overlap with each city.'}
              </p>
            </div>
          </div>

          {/* Range Badges */}
          {hasOverlap && (
            <div className="flex items-center gap-2 flex-wrap">
              {meetingRanges.map((range, i) => (
                <div
                  key={`${range.startHour}-${range.endHour}-${i}`}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-mono text-xs sm:text-sm font-semibold shadow-sm"
                >
                  <span>{range.formatted}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 font-normal">
                    {range.hoursCount}h
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // Base Mode: one line per non-reference city, each with its own overlap count + time range(s)
  return (
    <section
      aria-label="Base mode overlap summary"
      className="rounded-2xl p-4 sm:p-5 bg-slate-900/85 border border-slate-800/90 shadow-lg shadow-black/20"
    >
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3 pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm sm:text-base font-semibold text-white">
            1-on-1 Overlap with Base City:{' '}
            <span className="text-emerald-400">{refCity.name}</span>
          </h2>
        </div>
        <span className="text-xs text-slate-400">
          All time ranges shown in <strong className="text-slate-200">{refCity.name}</strong> time
        </span>
      </div>

      <div className="divide-y divide-slate-800/60">
        {baseSummaries.map(({ city, totalHours, ranges }) => {
          const hasOverlap = totalHours > 0;
          return (
            <div
              key={city.id}
              className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-medium text-slate-400">{refCity.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-sm font-semibold text-white">{city.name}</span>
                <span className="text-xs text-slate-500">({city.country})</span>
                {hasOverlap ? (
                  <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {totalHours} {totalHours === 1 ? 'hr' : 'hrs'}
                  </span>
                ) : (
                  <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <AlertTriangle className="w-3 h-3" />0 hrs overlap
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {hasOverlap ? (
                  ranges.map((range, i) => (
                    <span
                      key={`${range.startHour}-${range.endHour}-${i}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-200 font-mono text-xs font-semibold"
                    >
                      {range.formatted}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-amber-300/90">
                    No overlapping awake hours with {refCity.name}
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
