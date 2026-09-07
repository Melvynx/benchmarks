import React from 'react';
import { useTimezone } from '../context/TimezoneContext';
import { Users, Compass, AlertTriangle, CheckCircle2, Clock, Sparkles } from 'lucide-react';

export const OverlapSummary: React.FC = () => {
  const {
    cities,
    referenceCity,
    mode,
    meetingOverlapHours,
    meetingOverlapRanges,
    baseModeOverlaps,
  } = useTimezone();

  if (cities.length < 2) {
    return (
      <div className="mb-6 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400 text-sm flex items-center gap-3">
        <Clock className="w-5 h-5 text-emerald-400 shrink-0" />
        <span>
          Add at least 2 cities to compute and visualize timezone overlap windows.
        </span>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {mode === 'meeting' ? (
        /* Meeting Mode Summary */
        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            meetingOverlapHours.length > 0
              ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-slate-900/90 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
              : 'bg-gradient-to-r from-amber-950/30 via-slate-900/90 to-slate-900/90 border-amber-500/40'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  meetingOverlapHours.length > 0
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {meetingOverlapHours.length > 0 ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    Meeting Overlap Window
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ({cities.length} cities)
                  </span>
                </div>

                {meetingOverlapHours.length > 0 ? (
                  <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    <span className="text-lg sm:text-xl font-extrabold text-white">
                      {meetingOverlapHours.length}{' '}
                      {meetingOverlapHours.length === 1 ? 'hour' : 'hours'} overlap
                    </span>
                    <span className="text-xs text-slate-400">
                      anchored to {referenceCity.name} time
                    </span>
                  </div>
                ) : (
                  <div className="mt-1">
                    <span className="text-sm font-semibold text-amber-300">
                      No common overlap window
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No single hour exists where all {cities.length} cities are simultaneously awake.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Overlap Range Badges */}
            {meetingOverlapHours.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {meetingOverlapRanges.map((range, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold text-xs sm:text-sm shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{range.formatted}</span>
                    <span className="text-[11px] text-emerald-400/70 font-normal">
                      ({range.hoursCount}h)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Base Mode Summary */
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Base Mode Availability
                </span>
                <p className="text-xs text-slate-400">
                  Per-city overlap relative to base:{' '}
                  <strong className="text-slate-200">
                    {referenceCity.name} ({referenceCity.country})
                  </strong>
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-400 hidden sm:inline">
              {baseModeOverlaps.length} comparisons
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {baseModeOverlaps.map((item) => (
              <div
                key={item.city.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                  item.hasOverlap
                    ? 'bg-slate-950/60 border-slate-800 hover:border-emerald-500/40'
                    : 'bg-amber-950/20 border-amber-500/30'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0">{item.city.flag}</span>
                  <div className="truncate">
                    <div className="text-xs sm:text-sm font-bold text-slate-200 truncate">
                      {item.city.name}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {item.city.country}
                    </div>
                  </div>
                </div>

                {item.hasOverlap ? (
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-emerald-400">
                        {item.overlapCount}h overlap
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {item.overlapRanges.map((r, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-md text-[11px] font-semibold"
                        >
                          {r.formatted}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      <AlertTriangle className="w-3 h-3" />
                      No overlap with {referenceCity.name}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
