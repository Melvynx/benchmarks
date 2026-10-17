import React, { useState } from 'react';
import { Trash2, ArrowUpCircle } from 'lucide-react';
import { City } from '../data/cities';
import {
  formatCellHour,
  formatHourLabel,
  formatUtcOffset,
  LocalTimeSlot,
  TimeFormat,
} from '../utils/timezone';

interface DesktopGridProps {
  cities: City[];
  offsetsByCityId: Record<string, number>;
  slotsByCityId: Record<string, LocalTimeSlot[]>;
  timeFormat: TimeFormat;
  onPromoteCity: (cityId: string) => void;
  onRemoveCity: (cityId: string) => void;
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);

export const DesktopGrid: React.FC<DesktopGridProps> = ({
  cities,
  offsetsByCityId,
  slotsByCityId,
  timeFormat,
  onPromoteCity,
  onRemoveCity,
}) => {
  const [hoveredRefHour, setHoveredRefHour] = useState<number | null>(null);

  if (cities.length === 0) {
    return null;
  }

  const refCity = cities[0];

  return (
    <div
      data-testid="desktop-grid"
      className="hidden md:block rounded-xl border border-slate-800/90 bg-slate-900/50 p-4 shadow-xl backdrop-blur-xs"
    >
      {/* Reference Timeline Header */}
      <div className="mb-2 flex items-end gap-3 border-b border-slate-800/80 pb-2.5">
        <div className="w-44 lg:w-52 shrink-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            City / UTC Offset
          </div>
          <div className="text-[11px] text-slate-500">
            Click a city name to promote to REF
          </div>
        </div>

        <div
          className="grid flex-1 gap-1"
          style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}
        >
          {HOURS_24.map((refHour) => {
            const { label } = formatCellHour(refHour, 0, timeFormat);
            const isHovered = hoveredRefHour === refHour;
            return (
              <div
                key={refHour}
                onMouseEnter={() => setHoveredRefHour(refHour)}
                onMouseLeave={() => setHoveredRefHour(null)}
                className={`flex flex-col items-center justify-center rounded py-1 font-mono text-[10px] transition ${
                  isHovered
                    ? 'bg-slate-800 text-emerald-300 font-bold'
                    : 'text-slate-400'
                }`}
                title={`Reference hour: ${formatHourLabel(refHour, timeFormat)} in ${refCity.name}`}
              >
                <span>{label}</span>
              </div>
            );
          })}
        </div>

        <div className="w-8 shrink-0" />
      </div>

      {/* City Rows */}
      <div className="space-y-2">
        {cities.map((city, index) => {
          const isRef = index === 0;
          const offsetStr = formatUtcOffset(offsetsByCityId[city.id] ?? 0);
          const slots = slotsByCityId[city.id] || [];

          return (
            <div
              key={city.id}
              data-testid={`desktop-city-row-${city.id}`}
              className={`group flex items-center gap-3 rounded-lg p-1.5 transition ${
                isRef
                  ? 'bg-slate-800/35 ring-1 ring-emerald-500/25'
                  : 'hover:bg-slate-800/20'
              }`}
            >
              {/* Left: City Info + REF badge + UTC offset */}
              <div className="w-44 lg:w-52 shrink-0 pr-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onPromoteCity(city.id)}
                    title={
                      isRef
                        ? `${city.name} is the current reference city`
                        : `Click to promote ${city.name} as the reference city`
                    }
                    className={`group/btn inline-flex items-center gap-1 text-left text-sm font-semibold transition focus:outline-none ${
                      isRef
                        ? 'cursor-default text-white'
                        : 'cursor-pointer text-slate-200 hover:text-emerald-300'
                    }`}
                  >
                    <span className="truncate">{city.name}</span>
                    {!isRef && (
                      <ArrowUpCircle className="h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover/btn:opacity-100 text-emerald-400" />
                    )}
                  </button>

                  {isRef && (
                    <span
                      data-testid="ref-badge"
                      className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-300 border border-emerald-500/40"
                    >
                      REF
                    </span>
                  )}
                </div>

                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                  <span className="truncate text-[11px] text-slate-400">
                    {city.country}
                  </span>
                  <span className="shrink-0 rounded bg-slate-800/90 px-1.5 py-0.2 font-mono text-[11px] font-medium text-slate-300 border border-slate-700/70">
                    {offsetStr}
                  </span>
                </div>
              </div>

              {/* Center: 24 Hour Cells */}
              <div
                className="grid flex-1 gap-1"
                style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}
              >
                {slots.map((slot) => {
                  const isHovered = hoveredRefHour === slot.refHour;
                  let cellClasses = '';

                  if (slot.state === 'overlap') {
                    cellClasses =
                      'bg-emerald-500/25 text-emerald-200 border-emerald-500/60 font-bold shadow-[inset_0_1px_0_0_rgba(16,185,129,0.25)]';
                  } else if (slot.state === 'awake') {
                    cellClasses =
                      'bg-slate-800/80 text-slate-200 border-slate-700/70 font-normal';
                  } else {
                    cellClasses =
                      'bg-slate-950/60 text-slate-500 border-slate-800/50 opacity-50 font-normal';
                  }

                  return (
                    <div
                      key={slot.refHour}
                      data-state={slot.state}
                      data-ref-hour={slot.refHour}
                      data-local-hour={slot.localHour}
                      onMouseEnter={() => setHoveredRefHour(slot.refHour)}
                      onMouseLeave={() => setHoveredRefHour(null)}
                      title={`${city.name}: ${formatHourLabel(
                        slot.localHour,
                        timeFormat,
                        slot.localMinute
                      )} (${
                        slot.state === 'overlap'
                          ? 'Overlap'
                          : slot.state === 'awake'
                            ? 'Awake, no overlap'
                            : 'Sleeping'
                      })`}
                      className={`relative flex h-11 flex-col items-center justify-center rounded-md border px-0.5 font-mono transition select-none ${cellClasses} ${
                        isHovered ? 'ring-2 ring-emerald-400/70 z-10 scale-[1.03]' : ''
                      }`}
                    >
                      <span className="text-[11px] leading-none tracking-tighter">
                        {slot.label}
                      </span>
                      {slot.minuteLabel && (
                        <span className="mt-0.5 text-[9px] leading-none opacity-80">
                          {slot.minuteLabel}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Right: Remove Button */}
              <div className="flex w-8 shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => onRemoveCity(city.id)}
                  aria-label={`Remove ${city.name}`}
                  title={`Remove ${city.name}`}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/15 hover:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hovered Column Quick Inspector */}
      {hoveredRefHour !== null && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-300">
          <span className="font-semibold text-slate-400">
            Selected Slice ({formatHourLabel(hoveredRefHour, timeFormat)}{' '}
            {refCity.name}):
          </span>
          {cities.map((city) => {
            const slot = slotsByCityId[city.id]?.[hoveredRefHour];
            if (!slot) return null;
            return (
              <span
                key={city.id}
                className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-xs ${
                  slot.state === 'overlap'
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                    : slot.state === 'awake'
                      ? 'bg-slate-800 text-slate-200 border border-slate-700'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                <span className="font-sans font-medium">{city.name}:</span>
                <span>
                  {formatHourLabel(slot.localHour, timeFormat, slot.localMinute)}
                </span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
