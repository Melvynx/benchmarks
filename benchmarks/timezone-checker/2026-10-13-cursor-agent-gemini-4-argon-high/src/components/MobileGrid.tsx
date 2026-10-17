import React from 'react';
import { Trash2 } from 'lucide-react';
import { City } from '../data/cities';
import {
  formatHourLabel,
  formatUtcOffset,
  LocalTimeSlot,
  TimeFormat,
} from '../utils/timezone';

interface MobileGridProps {
  cities: City[];
  offsetsByCityId: Record<string, number>;
  slotsByCityId: Record<string, LocalTimeSlot[]>;
  timeFormat: TimeFormat;
  onPromoteCity: (cityId: string) => void;
  onRemoveCity: (cityId: string) => void;
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);

export const MobileGrid: React.FC<MobileGridProps> = ({
  cities,
  offsetsByCityId,
  slotsByCityId,
  timeFormat,
  onPromoteCity,
  onRemoveCity,
}) => {
  if (cities.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="mobile-grid"
      className="block md:hidden overflow-x-auto rounded-xl border border-slate-800/90 bg-slate-900/50 p-3 shadow-xl"
    >
      <div className="min-w-full">
        {/* City Columns Header */}
        <div
          className="mb-2 grid gap-1.5 border-b border-slate-800 pb-2.5"
          style={{
            gridTemplateColumns: `repeat(${cities.length}, minmax(92px, 1fr))`,
          }}
        >
          {cities.map((city, index) => {
            const isRef = index === 0;
            const offsetStr = formatUtcOffset(offsetsByCityId[city.id] ?? 0);

            return (
              <div
                key={city.id}
                data-testid={`mobile-city-col-${city.id}`}
                className={`flex flex-col justify-between rounded-lg p-2 ${
                  isRef
                    ? 'bg-slate-800/60 ring-1 ring-emerald-500/35'
                    : 'bg-slate-900/70 border border-slate-800/80'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => onPromoteCity(city.id)}
                    className={`text-left text-xs font-semibold leading-tight transition ${
                      isRef
                        ? 'text-white'
                        : 'text-slate-200 hover:text-emerald-300'
                    }`}
                  >
                    {city.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveCity(city.id)}
                    aria-label={`Remove ${city.name}`}
                    className="rounded p-1 text-slate-500 hover:bg-rose-500/15 hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  {isRef && (
                    <span className="rounded bg-emerald-500/20 px-1 py-0.2 font-mono text-[9px] font-bold uppercase text-emerald-300 border border-emerald-500/40">
                      REF
                    </span>
                  )}
                  <span className="rounded bg-slate-800 px-1 py-0.2 font-mono text-[10px] text-slate-300 border border-slate-700/70">
                    {offsetStr}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 24 Hour Rows (Vertical layout: hours as rows, cities as columns) */}
        <div className="space-y-1">
          {HOURS_24.map((refHour) => (
            <div
              key={refHour}
              data-testid={`mobile-hour-row-${refHour}`}
              className="grid gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${cities.length}, minmax(92px, 1fr))`,
              }}
            >
              {cities.map((city) => {
                const slot = slotsByCityId[city.id]?.[refHour];
                if (!slot) return null;

                let cellClasses = '';
                if (slot.state === 'overlap') {
                  cellClasses =
                    'bg-emerald-500/25 text-emerald-200 border-emerald-500/60 font-bold';
                } else if (slot.state === 'awake') {
                  cellClasses =
                    'bg-slate-800/80 text-slate-200 border-slate-700/70 font-normal';
                } else {
                  cellClasses =
                    'bg-slate-950/60 text-slate-500 border-slate-800/50 opacity-50 font-normal';
                }

                return (
                  <div
                    key={city.id}
                    data-state={slot.state}
                    data-ref-hour={slot.refHour}
                    data-local-hour={slot.localHour}
                    className={`flex h-9 items-center justify-center rounded-md border px-2 font-mono text-xs transition ${cellClasses}`}
                  >
                    <span>
                      {formatHourLabel(
                        slot.localHour,
                        timeFormat,
                        slot.localMinute
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
