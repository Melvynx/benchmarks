import React, { useState } from 'react';
import { Trash2, ArrowUpCircle, Clock } from 'lucide-react';
import {
  AppMode,
  AvailabilitySettings,
  City,
  HourCellInfo,
} from '../types';
import {
  formatCellCompactLabel,
  formatLiveClock,
  formatRelativeDiff,
  formatUtcOffset,
} from '../utils/timezone';

interface DesktopGridProps {
  cities: City[];
  mode: AppMode;
  settings: AvailabilitySettings;
  offsetsByCityId: Record<string, number>;
  cellsByCityId: Record<string, HourCellInfo[]>;
  meetingOverlapHours: number[];
  onPromoteCity: (cityId: string) => void;
  onRemoveCity: (cityId: string) => void;
  now: Date;
}

export const DesktopGrid: React.FC<DesktopGridProps> = ({
  cities,
  mode,
  settings,
  offsetsByCityId,
  cellsByCityId,
  meetingOverlapHours,
  onPromoteCity,
  onRemoveCity,
  now,
}) => {
  const [hoveredRefHour, setHoveredRefHour] = useState<number | null>(null);

  if (cities.length === 0) return null;

  const refCity = cities[0];
  const refOffset = offsetsByCityId[refCity.id] ?? 0;
  const meetingOverlapSet = new Set(meetingOverlapHours);
  const refCells = cellsByCityId[refCity.id] || [];

  return (
    <div
      data-testid="desktop-grid"
      className="hidden md:block bg-slate-900/85 border border-slate-800/90 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
    >
      <div className="overflow-x-auto">
        <div className="min-w-[1040px]">
          {/* Header Row: Reference City Hours (0-23) */}
          <div className="grid grid-cols-[240px_1fr_52px] border-b border-slate-800 bg-slate-950/80">
            <div className="px-4 py-3 flex items-center justify-between border-r border-slate-800/80">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                City / UTC Offset
              </span>
              <span className="text-[10px] text-slate-500">Click city → REF</span>
            </div>

            {/* 24 Reference Hour Columns Header */}
            <div className="grid grid-cols-24 divide-x divide-slate-800/50">
              {refCells.map((_cell, h) => {
                const isMeetingColOverlap =
                  mode === 'meeting' && cities.length >= 2 && meetingOverlapSet.has(h);
                const isHovered = hoveredRefHour === h;
                const compact = formatCellCompactLabel(h, 0, settings.timeFormat);

                return (
                  <div
                    key={h}
                    onMouseEnter={() => setHoveredRefHour(h)}
                    onMouseLeave={() => setHoveredRefHour(null)}
                    className={`py-2.5 px-0.5 flex flex-col items-center justify-center text-center transition-colors select-none ${
                      isMeetingColOverlap
                        ? 'bg-emerald-500/15 text-emerald-300 font-semibold'
                        : isHovered
                        ? 'bg-slate-800/80 text-white'
                        : 'text-slate-400'
                    }`}
                  >
                    <span className="text-[11px] font-mono leading-none">
                      {compact.primary}
                    </span>
                    {compact.sub && (
                      <span className="text-[9px] font-mono uppercase opacity-75 leading-none mt-0.5">
                        {compact.sub}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-l border-slate-800/80 flex items-center justify-center text-[10px] uppercase tracking-wider text-slate-500">
              Del
            </div>
          </div>

          {/* City Rows */}
          <div className="divide-y divide-slate-800/80">
            {cities.map((city, idx) => {
              const isRef = idx === 0;
              const offsetMins = offsetsByCityId[city.id] ?? 0;
              const utcBadge = formatUtcOffset(offsetMins);
              const relDiff = formatRelativeDiff(offsetMins, refOffset);
              const liveTime = formatLiveClock(city.timezone, settings.timeFormat, now);
              const rowCells = cellsByCityId[city.id] || [];

              return (
                <div
                  key={city.id}
                  data-testid={`desktop-row-${city.id}`}
                  className={`grid grid-cols-[240px_1fr_52px] items-stretch transition-colors ${
                    isRef
                      ? 'bg-slate-900/95'
                      : 'bg-slate-900/40 hover:bg-slate-900/75'
                  }`}
                >
                  {/* Left: City Info + REF badge + UTC offset */}
                  <div className="px-4 py-3 border-r border-slate-800/80 flex flex-col justify-center min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => !isRef && onPromoteCity(city.id)}
                        title={
                          isRef
                            ? `${city.name} is the reference city`
                            : `Click to promote ${city.name} as the Reference City`
                        }
                        className={`group inline-flex items-center gap-1.5 text-left truncate font-semibold text-sm transition-colors ${
                          isRef
                            ? 'text-white cursor-default'
                            : 'text-slate-100 hover:text-emerald-400 cursor-pointer'
                        }`}
                      >
                        <span className="truncate">{city.name}</span>
                        {!isRef && (
                          <ArrowUpCircle className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-emerald-400 transition-opacity shrink-0" />
                        )}
                      </button>

                      {isRef && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                          REF
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400 flex-wrap">
                      <span className="truncate max-w-[95px]">{city.country}</span>
                      <span className="text-slate-600">•</span>
                      <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-slate-800/90 text-slate-300 border border-slate-700/60">
                        {utcBadge}
                      </span>
                      {!isRef && (
                        <span className="font-mono text-[10px] text-slate-400">
                          ({relDiff})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500 font-mono">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>Now: {liveTime}</span>
                    </div>
                  </div>

                  {/* Center: 24 Hour Cells */}
                  <div className="grid grid-cols-24 p-1.5 gap-1 items-center bg-slate-950/40">
                    {rowCells.map((cell) => {
                      const compact = formatCellCompactLabel(
                        cell.localHour,
                        cell.localMinuteOffset,
                        settings.timeFormat
                      );
                      const isColHovered = hoveredRefHour === cell.refHour;

                      let cellClasses = '';
                      if (cell.state === 'overlap') {
                        cellClasses =
                          'bg-emerald-500 text-slate-950 font-bold border-emerald-300/80 shadow-sm shadow-emerald-950/50';
                      } else if (cell.state === 'awake') {
                        cellClasses =
                          'bg-slate-800/90 text-slate-200 font-medium border-slate-700/70 hover:border-slate-600';
                      } else {
                        // sleeping
                        cellClasses =
                          'bg-slate-950/60 text-slate-600 font-normal border-slate-900/80 opacity-55';
                      }

                      return (
                        <div
                          key={cell.refHour}
                          data-state={cell.state}
                          onMouseEnter={() => setHoveredRefHour(cell.refHour)}
                          onMouseLeave={() => setHoveredRefHour(null)}
                          title={`${city.name}: ${cell.formattedLocal} (${cell.state.toUpperCase()})`}
                          className={`relative h-12 rounded-lg border flex flex-col items-center justify-center select-none transition-all ${cellClasses} ${
                            isColHovered ? 'ring-2 ring-white/40 z-10 scale-[1.03]' : ''
                          }`}
                        >
                          <span className="text-xs font-mono leading-none tracking-tight">
                            {compact.primary}
                          </span>
                          {compact.sub && (
                            <span
                              className={`text-[9px] font-mono leading-none mt-0.5 ${
                                cell.state === 'overlap'
                                  ? 'text-slate-900 font-bold'
                                  : cell.state === 'awake'
                                  ? 'text-slate-400'
                                  : 'text-slate-600'
                              }`}
                            >
                              {compact.sub}
                            </span>
                          )}
                          {cell.dayDelta !== 0 && (
                            <span
                              className={`absolute top-0.5 right-1 text-[8px] font-mono leading-none ${
                                cell.state === 'overlap'
                                  ? 'text-slate-900 font-bold'
                                  : 'text-slate-500'
                              }`}
                            >
                              {cell.dayDelta > 0 ? '+1' : '-1'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Right: Remove Button */}
                  <div className="border-l border-slate-800/80 flex items-center justify-center px-1">
                    <button
                      type="button"
                      onClick={() => onRemoveCity(city.id)}
                      aria-label={`Remove ${city.name}`}
                      title={`Remove ${city.name}`}
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
