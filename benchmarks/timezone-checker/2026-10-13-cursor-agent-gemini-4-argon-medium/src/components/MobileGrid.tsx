import React from 'react';
import { Trash2, ArrowUpCircle } from 'lucide-react';
import {
  AppMode,
  AvailabilitySettings,
  City,
  HourCellInfo,
} from '../types';
import {
  formatHourLabel,
  formatUtcOffset,
} from '../utils/timezone';

interface MobileGridProps {
  cities: City[];
  mode: AppMode;
  settings: AvailabilitySettings;
  offsetsByCityId: Record<string, number>;
  cellsByCityId: Record<string, HourCellInfo[]>;
  meetingOverlapHours: number[];
  onPromoteCity: (cityId: string) => void;
  onRemoveCity: (cityId: string) => void;
}

/**
 * Mobile (<768px): cities as columns, hours as rows (vertical layout).
 * Separate layout from DesktopGrid.
 */
export const MobileGrid: React.FC<MobileGridProps> = ({
  cities,
  mode,
  settings,
  offsetsByCityId,
  cellsByCityId,
  meetingOverlapHours,
  onPromoteCity,
  onRemoveCity,
}) => {
  if (cities.length === 0) return null;

  const meetingOverlapSet = new Set(meetingOverlapHours);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div
      data-testid="mobile-grid"
      className="block md:hidden bg-slate-900/85 border border-slate-800/90 rounded-2xl shadow-xl overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/90">
              <th className="sticky left-0 z-20 bg-slate-950 px-2.5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-r border-slate-800 w-16">
                Ref Hr
              </th>
              {cities.map((city, idx) => {
                const isRef = idx === 0;
                const offsetMins = offsetsByCityId[city.id] ?? 0;
                const utcBadge = formatUtcOffset(offsetMins);

                return (
                  <th
                    key={city.id}
                    className="px-2.5 py-2.5 min-w-[112px] border-r last:border-r-0 border-slate-800/70 align-top"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => !isRef && onPromoteCity(city.id)}
                        className={`text-xs font-semibold text-left leading-tight flex items-center gap-1 ${
                          isRef
                            ? 'text-white'
                            : 'text-slate-200 hover:text-emerald-400 cursor-pointer'
                        }`}
                      >
                        <span className="truncate max-w-[78px]">{city.name}</span>
                        {!isRef && (
                          <ArrowUpCircle className="w-3 h-3 text-slate-500 shrink-0" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemoveCity(city.id)}
                        aria-label={`Remove ${city.name}`}
                        className="text-slate-500 hover:text-rose-400 p-0.5 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-1 flex items-center gap-1 flex-wrap">
                      {isRef && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          REF
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.2 rounded">
                        {utcBadge}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60">
            {hours.map((h) => {
              const isMeetingRowOverlap =
                mode === 'meeting' && cities.length >= 2 && meetingOverlapSet.has(h);

              return (
                <tr
                  key={h}
                  className={
                    isMeetingRowOverlap ? 'bg-emerald-950/20' : 'bg-transparent'
                  }
                >
                  {/* Reference Hour Label Column */}
                  <td
                    className={`sticky left-0 z-10 px-2.5 py-2 text-xs font-mono border-r border-slate-800 ${
                      isMeetingRowOverlap
                        ? 'bg-emerald-950 text-emerald-300 font-bold'
                        : 'bg-slate-950 text-slate-400'
                    }`}
                  >
                    {formatHourLabel(h, 0, settings.timeFormat)}
                  </td>

                  {/* Each City's Cell for Hour h */}
                  {cities.map((city) => {
                    const cell = cellsByCityId[city.id]?.[h];
                    if (!cell) return <td key={city.id} />;

                    let cellStyle = '';
                    if (cell.state === 'overlap') {
                      cellStyle =
                        'bg-emerald-500 text-slate-950 font-bold border-emerald-300';
                    } else if (cell.state === 'awake') {
                      cellStyle =
                        'bg-slate-800/85 text-slate-200 font-medium border-slate-700/70';
                    } else {
                      cellStyle =
                        'bg-slate-950/60 text-slate-600 font-normal border-slate-900 opacity-60';
                    }

                    return (
                      <td
                        key={city.id}
                        className="p-1 border-r last:border-r-0 border-slate-800/50"
                      >
                        <div
                          data-state={cell.state}
                          className={`px-2 py-1.5 rounded-lg border text-center font-mono text-xs flex items-center justify-center gap-1 ${cellStyle}`}
                        >
                          <span>{cell.formattedLocal}</span>
                          {cell.dayDelta !== 0 && (
                            <span
                              className={`text-[9px] ${
                                cell.state === 'overlap'
                                  ? 'text-slate-900 font-bold'
                                  : 'text-slate-500'
                              }`}
                            >
                              {cell.dayDelta > 0 ? '+1d' : '-1d'}
                            </span>
                          )}
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
