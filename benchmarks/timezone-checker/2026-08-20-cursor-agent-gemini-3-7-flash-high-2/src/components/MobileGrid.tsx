import React from 'react';
import { useTimezone } from '../context/TimezoneContext';
import { Trash2, Crown, ArrowUpCircle } from 'lucide-react';
import { formatRangeHour } from '../lib/timezone';

export const MobileGrid: React.FC = () => {
  const {
    gridRows,
    referenceCity,
    settings,
    removeCity,
    setReferenceCity,
    cities,
  } = useTimezone();

  return (
    <div className="block md:hidden bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden mb-6">
      {/* Mobile Layout Explainer */}
      <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>Vertical Timeline (24 Hours)</span>
        <span className="text-emerald-400 font-mono text-[11px]">
          Anchor: {referenceCity.name}
        </span>
      </div>

      <div className="overflow-x-auto max-h-[75vh] overflow-y-auto relative">
        <table className="w-full border-collapse text-left">
          {/* Sticky Header Row: Cities as Columns */}
          <thead className="sticky top-0 z-20 bg-slate-950 shadow-md">
            <tr className="border-b border-slate-800">
              {/* Top-Left Corner: Reference Hour Column Header */}
              <th className="sticky left-0 z-30 bg-slate-950 p-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-r border-slate-800/80 min-w-[76px] w-[76px]">
                <div>Ref Hour</div>
                <div className="text-[9px] text-slate-400 font-normal">({referenceCity.name})</div>
              </th>

              {/* City Column Headers */}
              {gridRows.map((row) => {
                const isRef = row.isReference;

                return (
                  <th
                    key={row.city.id}
                    className={`p-2.5 min-w-[130px] border-r border-slate-800/80 last:border-r-0 align-top ${
                      isRef ? 'bg-slate-900/90' : 'bg-slate-950/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-sm shrink-0">{row.city.flag}</span>
                          <button
                            type="button"
                            onClick={() => !isRef && setReferenceCity(row.city.id)}
                            className={`font-bold text-xs truncate text-left ${
                              isRef
                                ? 'text-emerald-400'
                                : 'text-slate-200 hover:text-emerald-300'
                            }`}
                          >
                            {row.city.name}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {row.city.country}
                        </div>
                      </div>

                      {/* Remove Button */}
                      {cities.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCity(row.city.id)}
                          className="text-slate-400 hover:text-red-400 p-0.5 rounded shrink-0"
                          title={`Remove ${row.city.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono">
                      <span className="bg-slate-900 px-1 py-0.5 rounded text-slate-300 border border-slate-800">
                        {row.currentUtcOffset.formatted}
                      </span>
                      {isRef ? (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-bold">
                          <Crown className="w-2.5 h-2.5" />
                          REF
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReferenceCity(row.city.id)}
                          className="text-[9px] text-slate-400 hover:text-emerald-300 flex items-center gap-0.5 font-sans"
                          title="Set as reference anchor"
                        >
                          <ArrowUpCircle className="w-2.5 h-2.5" />
                          Set Ref
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body: 24 Hour Rows */}
          <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
            {Array.from({ length: 24 }, (_, refHour) => {
              const formattedRefHour = formatRangeHour(refHour, settings.timeFormat);

              return (
                <tr key={refHour} className="hover:bg-slate-800/40 transition-colors">
                  {/* Sticky Left: Reference City Hour */}
                  <td className="sticky left-0 z-10 bg-slate-950/95 p-2 font-bold text-slate-300 text-center border-r border-slate-800/80 text-[11px]">
                    {formattedRefHour}
                  </td>

                  {/* City Cells for this Ref Hour */}
                  {gridRows.map((row) => {
                    const cell = row.cells[refHour];

                    let cellClasses = '';
                    if (cell.isOverlap) {
                      cellClasses =
                        'bg-emerald-500/25 text-emerald-200 font-bold border-l-2 border-l-emerald-500';
                    } else if (cell.isAwake) {
                      cellClasses = 'text-slate-200 font-medium bg-slate-900/40';
                    } else {
                      cellClasses = 'text-slate-400 opacity-40 bg-slate-950/60';
                    }

                    return (
                      <td
                        key={row.city.id}
                        className={`p-2 border-r border-slate-800/60 last:border-r-0 ${cellClasses}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs">{cell.formattedShort}</span>

                          <div className="flex items-center gap-1">
                            {cell.dayOffset !== 0 && (
                              <span
                                className={`text-[8px] px-1 rounded font-bold ${
                                  cell.dayOffset > 0
                                    ? 'bg-indigo-500/30 text-indigo-300'
                                    : 'bg-amber-500/30 text-amber-300'
                                }`}
                              >
                                {cell.dayOffset > 0 ? `+${cell.dayOffset}d` : `${cell.dayOffset}d`}
                              </span>
                            )}
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                cell.isOverlap
                                  ? 'bg-emerald-400'
                                  : cell.isAwake
                                  ? 'bg-slate-400'
                                  : 'bg-slate-700'
                              }`}
                            />
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
