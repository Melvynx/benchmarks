import React from 'react';
import { useTimezone } from '../context/TimezoneContext';
import { Trash2, Crown, ArrowUpCircle, Clock, Moon, Sun } from 'lucide-react';
import { formatRangeHour } from '../lib/timezone';

export const DesktopGrid: React.FC = () => {
  const {
    gridRows,
    referenceCity,
    settings,
    removeCity,
    setReferenceCity,
    activeHoverHour,
    setActiveHoverHour,
    cities,
  } = useTimezone();

  return (
    <div className="hidden md:block bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden mb-6">
      <div className="overflow-x-auto">
        <div className="min-w-[980px] p-4">
          {/* Header Row with 24 Hours */}
          <div className="grid grid-cols-[220px_repeat(24,minmax(0,1fr))_44px] gap-1.5 items-end pb-3 mb-2 border-b border-slate-800 text-xs">
            {/* Top Left Info */}
            <div className="text-slate-400 font-semibold px-2 flex items-center justify-between">
              <span className="uppercase tracking-wider text-[11px]">Cities / Timezones</span>
              <span className="text-[10px] text-slate-400">({settings.timeFormat})</span>
            </div>

            {/* 24 Hour Column Labels */}
            {Array.from({ length: 24 }, (_, hour) => {
              const formatted = formatRangeHour(hour, settings.timeFormat);
              const isHovered = activeHoverHour === hour;
              return (
                <div
                  key={hour}
                  onMouseEnter={() => setActiveHoverHour(hour)}
                  onMouseLeave={() => setActiveHoverHour(null)}
                  className={`text-center py-1.5 px-0.5 rounded-lg transition-all cursor-pointer select-none ${
                    isHovered
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold ring-1 ring-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                  title={`${referenceCity.name} Time: ${formatted}`}
                >
                  <div className="text-[11px] font-mono leading-none">{formatted}</div>
                </div>
              );
            })}

            {/* Empty space above action column */}
            <div className="text-center text-[10px] text-slate-400 font-mono">
              Action
            </div>
          </div>

          {/* City Rows */}
          <div className="space-y-2">
            {gridRows.map((row) => {
              const isRef = row.isReference;

              return (
                <div
                  key={row.city.id}
                  className={`grid grid-cols-[220px_repeat(24,minmax(0,1fr))_44px] gap-1.5 items-center p-1.5 rounded-xl border transition-all ${
                    isRef
                      ? 'bg-slate-950/80 border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/20'
                      : 'bg-slate-950/40 border-slate-800/70 hover:border-slate-700'
                  }`}
                >
                  {/* Left Column: City Info */}
                  <div className="px-2 py-1 flex flex-col justify-center min-w-0 pr-3">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base shrink-0">{row.city.flag}</span>
                      <button
                        type="button"
                        onClick={() => !isRef && setReferenceCity(row.city.id)}
                        className={`font-bold text-xs sm:text-sm truncate text-left transition-colors flex items-center gap-1.5 ${
                          isRef
                            ? 'text-emerald-400 cursor-default'
                            : 'text-slate-200 hover:text-emerald-300 group cursor-pointer'
                        }`}
                        title={isRef ? 'Current Reference Anchor' : 'Click to set as Reference Anchor'}
                      >
                        <span className="truncate">{row.city.name}</span>
                        {!isRef && (
                          <ArrowUpCircle className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:text-emerald-400 transition-opacity shrink-0" />
                        )}
                      </button>

                      {isRef && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-extrabold tracking-wider shrink-0">
                          <Crown className="w-2.5 h-2.5" />
                          REF
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                      <span className="truncate pr-1">{row.city.country}</span>
                      <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                        <span className="bg-slate-900 px-1 py-0.5 rounded text-slate-300 border border-slate-800">
                          {row.currentUtcOffset.formatted}
                        </span>
                        <span className="text-slate-400 font-semibold">
                          {row.currentLocalTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 24 Hour Cells */}
                  {row.cells.map((cell) => {
                    const isColHovered = activeHoverHour === cell.refHour;

                    // 3 visual states:
                    // 1. Sleeping: muted, faded
                    // 2. Awake, no overlap: neutral awake
                    // 3. Overlap: bright emerald green
                    let cellClasses = '';
                    if (cell.isOverlap) {
                      cellClasses =
                        'bg-emerald-500/25 border-emerald-500/70 text-emerald-200 font-bold shadow-sm ring-1 ring-emerald-500/30';
                    } else if (cell.isAwake) {
                      cellClasses =
                        'bg-slate-900 border-slate-700/80 text-slate-200 font-medium hover:border-slate-500';
                    } else {
                      // Sleeping
                      cellClasses =
                        'bg-slate-950/70 border-slate-900 text-slate-400 opacity-35 hover:opacity-75';
                    }

                    return (
                      <div
                        key={cell.refHour}
                        onMouseEnter={() => {
                          setActiveHoverHour(cell.refHour);
                        }}
                        onMouseLeave={() => {
                          setActiveHoverHour(null);
                        }}
                        className={`relative h-11 flex flex-col items-center justify-center rounded-lg border text-xs transition-all select-none cursor-pointer ${cellClasses} ${
                          isColHovered ? 'scale-[1.04] z-10 brightness-110 ring-2 ring-emerald-400/60' : ''
                        }`}
                        title={`${row.city.name} at ${formatRangeHour(cell.refHour, settings.timeFormat)} ${referenceCity.name} time: ${cell.formattedFull} (${
                          cell.isOverlap ? 'Overlap' : cell.isAwake ? 'Awake' : 'Sleeping'
                        })`}
                      >
                        {/* Day offset indicator */}
                        {cell.dayOffset !== 0 && (
                          <span
                            className={`absolute top-0.5 right-0.5 text-[8px] font-mono font-extrabold px-1 py-0.2 rounded leading-none ${
                              cell.dayOffset > 0
                                ? 'bg-indigo-500/30 text-indigo-300'
                                : 'bg-amber-500/30 text-amber-300'
                            }`}
                          >
                            {cell.dayOffset > 0 ? `+${cell.dayOffset}d` : `${cell.dayOffset}d`}
                          </span>
                        )}

                        {/* Local Time Label */}
                        <span className="text-[11px] font-mono leading-tight tracking-tight">
                          {cell.formattedShort}
                        </span>

                        {/* State Mini Dot */}
                        <span
                          className={`w-1 h-1 rounded-full mt-0.5 ${
                            cell.isOverlap
                              ? 'bg-emerald-400 animate-pulse'
                              : cell.isAwake
                              ? 'bg-slate-400'
                              : 'bg-slate-700'
                          }`}
                        />
                      </div>
                    );
                  })}

                  {/* Remove Button */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => removeCity(row.city.id)}
                      disabled={cities.length <= 1}
                      className={`p-1.5 rounded-lg transition-colors ${
                        cities.length <= 1
                          ? 'text-slate-700 cursor-not-allowed opacity-30'
                          : 'text-slate-500 hover:text-red-400 hover:bg-red-500/10'
                      }`}
                      title={cities.length <= 1 ? 'Keep at least 1 city' : `Remove ${row.city.name}`}
                      aria-label={`Remove ${row.city.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Hover Inspection Bar */}
          {activeHoverHour !== null && (
            <div className="mt-4 p-3 bg-slate-950/90 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 animate-in fade-in duration-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>
                  Anchored Hour:{' '}
                  <strong className="text-white font-mono text-sm">
                    {formatRangeHour(activeHoverHour, settings.timeFormat)}
                  </strong>{' '}
                  in {referenceCity.name}
                </span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {gridRows.map((r) => {
                  const cell = r.cells[activeHoverHour];
                  return (
                    <div
                      key={r.city.id}
                      className={`px-2 py-1 rounded-md border flex items-center gap-1.5 text-[11px] ${
                        cell.isOverlap
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-semibold'
                          : cell.isAwake
                          ? 'bg-slate-900 border-slate-800 text-slate-200'
                          : 'bg-slate-950 border-slate-900 text-slate-400'
                      }`}
                    >
                      <span>{r.city.flag}</span>
                      <span>{r.city.name}:</span>
                      <span className="font-mono">{cell.formattedFull}</span>
                      {cell.dayOffset !== 0 && (
                        <span className="text-[10px] text-indigo-400">
                          ({cell.dayOffset > 0 ? `+${cell.dayOffset}d` : `${cell.dayOffset}d`})
                        </span>
                      )}
                      {cell.isAwake ? (
                        <Sun className="w-3 h-3 text-amber-400 inline" />
                      ) : (
                        <Moon className="w-3 h-3 text-indigo-400 inline" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
