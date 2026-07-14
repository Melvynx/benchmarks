"use client";

import { City } from "@/lib/cities";
import { Mode } from "@/lib/store";
import {
  getUtcOffsetMinutes,
  formatUtcOffset,
  getLocalHour,
  formatHour,
  isAwake,
  computeMeetingOverlap,
  computeBaseOverlap,
} from "@/lib/timezone";

interface TimezoneGridProps {
  cities: City[];
  mode: Mode;
  wakeHour: number;
  sleepHour: number;
  use12h: boolean;
  onPromote: (cityId: string) => void;
  onRemove: (cityId: string) => void;
}

type CellState = "sleeping" | "awake" | "overlap";

function getCellClasses(state: CellState): string {
  switch (state) {
    case "sleeping":
      return "bg-zinc-100 text-zinc-300";
    case "awake":
      return "bg-white text-zinc-500";
    case "overlap":
      return "bg-emerald-100 text-emerald-900 font-semibold";
  }
}

function getMobileCellClasses(state: CellState): string {
  switch (state) {
    case "sleeping":
      return "bg-zinc-100 text-zinc-300";
    case "awake":
      return "bg-white text-zinc-500";
    case "overlap":
      return "bg-emerald-100 text-emerald-900 font-semibold";
  }
}

export function TimezoneGrid({
  cities,
  mode,
  wakeHour,
  sleepHour,
  use12h,
  onPromote,
  onRemove,
}: TimezoneGridProps) {
  if (cities.length === 0) return null;

  const now = new Date();
  const offsets = cities.map((c) => getUtcOffsetMinutes(c.timezone, now));
  const refOffset = offsets[0];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Precompute overlap sets
  const meetingOverlap = new Set(
    mode === "meeting" ? computeMeetingOverlap(offsets, refOffset, wakeHour, sleepHour) : []
  );

  const baseOverlaps = new Map<string, Set<number>>();
  if (mode === "base") {
    cities.slice(1).forEach((city, idx) => {
      baseOverlaps.set(
        city.id,
        new Set(computeBaseOverlap(refOffset, offsets[idx + 1], wakeHour, sleepHour))
      );
    });
  }

  function getCellState(cityIdx: number, refHour: number): CellState {
    const localH = getLocalHour(refHour, refOffset, offsets[cityIdx]);
    if (!isAwake(localH, wakeHour, sleepHour)) return "sleeping";

    if (mode === "meeting") {
      return meetingOverlap.has(refHour) ? "overlap" : "awake";
    }

    // Base mode
    if (cityIdx === 0) {
      // Reference city: overlap if awake AND at least one other city overlaps at this hour
      const refAwake = isAwake(localH, wakeHour, sleepHour);
      if (!refAwake) return "sleeping";
      for (const [, overlapSet] of baseOverlaps) {
        if (overlapSet.has(refHour)) return "overlap";
      }
      return "awake";
    }

    const overlapSet = baseOverlaps.get(cities[cityIdx].id);
    return overlapSet?.has(refHour) ? "overlap" : "awake";
  }

  return (
    <>
      {/* Desktop layout */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-zinc-50 px-3 py-2 text-left text-xs font-medium text-zinc-400 border-b border-zinc-200 min-w-[180px]">
                  City
                </th>
                {hours.map((h) => (
                  <th
                    key={h}
                    className="border-b border-zinc-200 bg-zinc-50 px-0 py-2 text-center text-[10px] font-medium text-zinc-400 min-w-[42px]"
                  >
                    {formatHour(h, use12h)}
                  </th>
                ))}
                <th className="sticky right-0 z-10 border-b border-zinc-200 bg-zinc-50 px-2 py-2 min-w-[40px]" />
              </tr>
            </thead>
            <tbody>
              {cities.map((city, cityIdx) => {
                const isRef = cityIdx === 0;
                return (
                  <tr key={city.id} className="group">
                    <td className="sticky left-0 z-10 bg-white border-b border-zinc-100 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onPromote(city.id)}
                          className="text-left transition-colors hover:text-emerald-700"
                          title={isRef ? "Reference city" : "Click to set as reference"}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-zinc-900">{city.name}</span>
                            {isRef && (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                REF
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400">
                            {city.country} · {formatUtcOffset(offsets[cityIdx])}
                          </div>
                        </button>
                      </div>
                    </td>
                    {hours.map((h) => {
                      const localH = getLocalHour(h, refOffset, offsets[cityIdx]);
                      const state = getCellState(cityIdx, h);
                      return (
                        <td
                          key={h}
                          className={`border-b border-zinc-100 px-0 py-1.5 text-center text-xs transition-colors ${getCellClasses(state)}`}
                        >
                          {formatHour(localH, use12h)}
                        </td>
                      );
                    })}
                    <td className="sticky right-0 z-10 border-b border-zinc-100 bg-white px-2 py-2 text-center">
                      {cities.length > 1 && (
                        <button
                          onClick={() => onRemove(city.id)}
                          className="rounded-md p-1 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500"
                          title="Remove city"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile layout — cities as columns, hours as rows */}
      <div className="block md:hidden">
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky top-0 z-10 bg-zinc-50 px-2 py-2 text-left text-[10px] font-medium text-zinc-400 border-b border-zinc-200 min-w-[44px]">
                  Hour
                </th>
                {cities.map((city, cityIdx) => {
                  const isRef = cityIdx === 0;
                  return (
                    <th
                      key={city.id}
                      className="border-b border-zinc-200 bg-zinc-50 px-1 py-2 text-center min-w-[72px]"
                    >
                      <button
                        onClick={() => onPromote(city.id)}
                        className="block w-full text-center"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs font-medium text-zinc-900">{city.name}</span>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          {isRef && (
                            <span className="rounded bg-emerald-100 px-1 py-px text-[8px] font-bold text-emerald-700">
                              REF
                            </span>
                          )}
                          <span className="text-[9px] text-zinc-400">
                            {formatUtcOffset(offsets[cityIdx])}
                          </span>
                        </div>
                      </button>
                      {cities.length > 1 && (
                        <button
                          onClick={() => onRemove(city.id)}
                          className="mt-1 rounded p-0.5 text-zinc-300 hover:text-red-500"
                          title="Remove"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {hours.map((h) => (
                <tr key={h}>
                  <td className="border-b border-zinc-100 bg-zinc-50 px-2 py-1.5 text-center text-[10px] font-medium text-zinc-400">
                    {formatHour(h, use12h)}
                  </td>
                  {cities.map((city, cityIdx) => {
                    const localH = getLocalHour(h, refOffset, offsets[cityIdx]);
                    const state = getCellState(cityIdx, h);
                    return (
                      <td
                        key={city.id}
                        className={`border-b border-zinc-100 px-1 py-1.5 text-center text-xs ${getMobileCellClasses(state)}`}
                      >
                        {formatHour(localH, use12h)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
