"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { City, CITY_CATALOG, getCityById } from "@/lib/cities";
import { AppState, DEFAULTS, loadState, saveState } from "@/lib/storage";
import {
  computeBaseOverlap,
  computeMeetingOverlap,
  formatHour,
  formatRange,
  formatUtcOffset,
  getLocalHour,
  getUtcOffsetMinutes,
  isAwake,
  OverlapResult,
} from "@/lib/timezone";
import { CitySearch } from "./CitySearch";
import { SettingsPanel } from "./SettingsPanel";

export function TimezoneChecker() {
  const [state, setState] = useState<AppState>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  const updateState = useCallback(
    (partial: Partial<AppState>) => {
      setState((prev) => {
        const next = { ...prev, ...partial };
        if (hydrated) saveState(next);
        return next;
      });
    },
    [hydrated]
  );

  return <CheckerInner state={state} updateState={updateState} />;
}

function CheckerInner({
  state,
  updateState,
}: {
  state: AppState;
  updateState: (partial: Partial<AppState>) => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const cities: City[] = useMemo(
    () => state.cityIds.map(getCityById).filter((c): c is City => !!c),
    [state.cityIds]
  );

  const offsets = useMemo(
    () => cities.map((c) => getUtcOffsetMinutes(c.timezone)),
    [cities]
  );

  const refOffset = offsets[0] ?? 0;

  const meetingOverlap = useMemo(() => {
    if (cities.length < 2) return null;
    return computeMeetingOverlap(offsets, refOffset, state.wakeUp, state.sleepAt);
  }, [cities.length, offsets, refOffset, state.wakeUp, state.sleepAt]);

  const baseOverlaps = useMemo(() => {
    if (cities.length < 2) return [];
    return cities.slice(1).map((_, i) =>
      computeBaseOverlap(refOffset, offsets[i + 1], state.wakeUp, state.sleepAt)
    );
  }, [cities, offsets, refOffset, state.wakeUp, state.sleepAt]);

  const isOverlapHour = useCallback(
    (refHour: number, cityIndex: number): boolean => {
      if (cities.length < 2) return false;
      if (state.mode === "meeting") {
        return meetingOverlap?.hours.includes(refHour) ?? false;
      }
      if (cityIndex === 0) {
        return baseOverlaps.some((o) => o.hours.includes(refHour));
      }
      return baseOverlaps[cityIndex - 1]?.hours.includes(refHour) ?? false;
    },
    [cities.length, state.mode, meetingOverlap, baseOverlaps]
  );

  const addCity = (id: string) => {
    if (!state.cityIds.includes(id)) {
      updateState({ cityIds: [...state.cityIds, id] });
    }
  };

  const removeCity = (id: string) => {
    updateState({ cityIds: state.cityIds.filter((c) => c !== id) });
  };

  const promoteToRef = (id: string) => {
    const rest = state.cityIds.filter((c) => c !== id);
    updateState({ cityIds: [id, ...rest] });
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-[1440px] mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Claude Opus 4.6
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Timezone Overlap Checker
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ModeToggle mode={state.mode} onChange={(m) => updateState({ mode: m })} />
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm transition-colors"
            >
              Settings
            </button>
          </div>
        </div>

        {/* Settings panel */}
        {settingsOpen && (
          <SettingsPanel
            wakeUp={state.wakeUp}
            sleepAt={state.sleepAt}
            use12h={state.use12h}
            onChange={(s) => updateState(s)}
          />
        )}

        {/* City search */}
        <div className="mb-4">
          <CitySearch
            existingIds={state.cityIds}
            onSelect={addCity}
          />
        </div>

        {/* Overlap summary */}
        {cities.length >= 2 && (
          <OverlapSummary
            state={state}
            cities={cities}
            meetingOverlap={meetingOverlap}
            baseOverlaps={baseOverlaps}
          />
        )}

        {/* Desktop grid */}
        <div className="hidden md:block overflow-x-auto">
          <DesktopGrid
            cities={cities}
            offsets={offsets}
            refOffset={refOffset}
            hours={hours}
            state={state}
            isOverlapHour={isOverlapHour}
            onRemove={removeCity}
            onPromote={promoteToRef}
          />
        </div>

        {/* Mobile grid */}
        <div className="block md:hidden">
          <MobileGrid
            cities={cities}
            offsets={offsets}
            refOffset={refOffset}
            hours={hours}
            state={state}
            isOverlapHour={isOverlapHour}
            onRemove={removeCity}
            onPromote={promoteToRef}
          />
        </div>

        {/* Hint */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Green cells = everyone awake
        </p>
      </div>
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: "meeting" | "base";
  onChange: (m: "meeting" | "base") => void;
}) {
  return (
    <div className="flex rounded-lg bg-slate-800 border border-slate-700 overflow-hidden text-sm">
      <button
        className={`px-3 py-2 transition-colors ${
          mode === "meeting"
            ? "bg-emerald-600 text-white"
            : "text-slate-400 hover:text-slate-200"
        }`}
        onClick={() => onChange("meeting")}
      >
        Meeting
      </button>
      <button
        className={`px-3 py-2 transition-colors ${
          mode === "base"
            ? "bg-emerald-600 text-white"
            : "text-slate-400 hover:text-slate-200"
        }`}
        onClick={() => onChange("base")}
      >
        Base
      </button>
    </div>
  );
}

function OverlapSummary({
  state,
  cities,
  meetingOverlap,
  baseOverlaps,
}: {
  state: AppState;
  cities: City[];
  meetingOverlap: OverlapResult | null;
  baseOverlaps: OverlapResult[];
}) {
  if (state.mode === "meeting") {
    if (!meetingOverlap || meetingOverlap.hours.length === 0) {
      return (
        <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-800/50 text-red-300 text-sm">
          No overlapping hours found - everyone cannot be awake at the same time.
        </div>
      );
    }
    return (
      <div className="mb-4 p-3 rounded-lg bg-emerald-950/50 border border-emerald-800/40 text-sm flex flex-wrap items-center gap-2">
        <span className="text-emerald-300 font-medium">
          {meetingOverlap.hours.length}h overlap
        </span>
        {meetingOverlap.ranges.map((r, i) => (
          <span
            key={i}
            className="px-2 py-0.5 rounded bg-emerald-800/50 text-emerald-200 text-xs font-mono"
          >
            {formatRange(r.start, r.end, state.use12h)}
          </span>
        ))}
        <span className="text-slate-500 text-xs">
          ({cities[0].name} time)
        </span>
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-1.5">
      {cities.slice(1).map((city, i) => {
        const overlap = baseOverlaps[i];
        if (!overlap || overlap.hours.length === 0) {
          return (
            <div
              key={city.id}
              className="p-2.5 rounded-lg bg-red-950/50 border border-red-800/50 text-red-300 text-sm"
            >
              {city.name}: No overlap with {cities[0].name}
            </div>
          );
        }
        return (
          <div
            key={city.id}
            className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800/40 text-sm flex flex-wrap items-center gap-2"
          >
            <span className="text-slate-300 font-medium">{city.name}:</span>
            <span className="text-emerald-300">
              {overlap.hours.length}h
            </span>
            {overlap.ranges.map((r, j) => (
              <span
                key={j}
                className="px-2 py-0.5 rounded bg-emerald-800/50 text-emerald-200 text-xs font-mono"
              >
                {formatRange(r.start, r.end, state.use12h)}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function DesktopGrid({
  cities,
  offsets,
  refOffset,
  hours,
  state,
  isOverlapHour,
  onRemove,
  onPromote,
}: {
  cities: City[];
  offsets: number[];
  refOffset: number;
  hours: number[];
  state: AppState;
  isOverlapHour: (refHour: number, cityIdx: number) => boolean;
  onRemove: (id: string) => void;
  onPromote: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      {/* Hour header */}
      <div className="grid" style={{ gridTemplateColumns: "200px repeat(24, minmax(38px, 1fr)) 40px" }}>
        <div className="p-2 text-xs text-slate-500 font-medium border-b border-slate-800">
          City
        </div>
        {hours.map((h) => (
          <div
            key={h}
            className="p-1 text-center text-[10px] text-slate-500 font-mono border-b border-slate-800"
          >
            {formatHour(h, state.use12h)}
          </div>
        ))}
        <div className="border-b border-slate-800" />
      </div>

      {/* City rows */}
      {cities.map((city, cityIdx) => {
        const offset = offsets[cityIdx];
        const isRef = cityIdx === 0;
        return (
          <div
            key={city.id}
            className="grid group"
            style={{ gridTemplateColumns: "200px repeat(24, minmax(38px, 1fr)) 40px" }}
          >
            {/* City info */}
            <div
              className="p-2 flex items-center gap-2 border-b border-slate-800/50 cursor-pointer hover:bg-slate-800/30 transition-colors"
              onClick={() => onPromote(city.id)}
              title="Click to make reference"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {isRef && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white leading-none">
                      REF
                    </span>
                  )}
                  <span className="font-medium text-sm truncate">
                    {city.name}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {formatUtcOffset(offset)}
                </span>
              </div>
            </div>

            {/* Hour cells */}
            {hours.map((refHour) => {
              const localHour = getLocalHour(refHour, refOffset, offset);
              const awake = isAwake(localHour, state.wakeUp, state.sleepAt);
              const overlap = isOverlapHour(refHour, cityIdx);

              let cellClass = "border-b border-r border-slate-800/30 flex items-center justify-center text-xs font-mono transition-colors ";

              if (!awake) {
                cellClass += "bg-slate-900/80 text-slate-700";
              } else if (overlap) {
                cellClass += "bg-emerald-900/60 text-emerald-200 font-bold";
              } else {
                cellClass += "bg-slate-800/30 text-slate-400";
              }

              return (
                <div key={refHour} className={cellClass} style={{ height: 40 }}>
                  {formatHour(localHour, state.use12h)}
                </div>
              );
            })}

            {/* Remove button */}
            <div className="border-b border-slate-800/50 flex items-center justify-center">
              <button
                onClick={() => onRemove(city.id)}
                className="text-slate-600 hover:text-red-400 transition-colors text-sm"
                title="Remove city"
              >
                x
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MobileGrid({
  cities,
  offsets,
  refOffset,
  hours,
  state,
  isOverlapHour,
  onRemove,
  onPromote,
}: {
  cities: City[];
  offsets: number[];
  refOffset: number;
  hours: number[];
  state: AppState;
  isOverlapHour: (refHour: number, cityIdx: number) => boolean;
  onRemove: (id: string) => void;
  onPromote: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      {/* City headers (columns) */}
      <div
        className="grid border-b border-slate-800"
        style={{ gridTemplateColumns: `50px repeat(${cities.length}, 1fr)` }}
      >
        <div className="p-2 text-[10px] text-slate-500">Hr</div>
        {cities.map((city, cityIdx) => {
          const offset = offsets[cityIdx];
          const isRef = cityIdx === 0;
          return (
            <div key={city.id} className="p-2 text-center border-l border-slate-800/50">
              <button
                onClick={() => onPromote(city.id)}
                className="text-xs font-medium hover:text-emerald-300 transition-colors"
              >
                {city.name}
              </button>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                {isRef && (
                  <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-emerald-600 text-white leading-none">
                    REF
                  </span>
                )}
                <span className="text-[9px] text-slate-500 font-mono">
                  {formatUtcOffset(offset)}
                </span>
              </div>
              <button
                onClick={() => onRemove(city.id)}
                className="text-[10px] text-slate-600 hover:text-red-400 mt-1 transition-colors"
              >
                remove
              </button>
            </div>
          );
        })}
      </div>

      {/* Hour rows */}
      {hours.map((refHour) => (
        <div
          key={refHour}
          className="grid"
          style={{ gridTemplateColumns: `50px repeat(${cities.length}, 1fr)` }}
        >
          <div className="p-1.5 text-[10px] text-slate-500 font-mono flex items-center justify-center border-b border-slate-800/30">
            {formatHour(refHour, state.use12h)}
          </div>
          {cities.map((city, cityIdx) => {
            const localHour = getLocalHour(refHour, refOffset, offsets[cityIdx]);
            const awake = isAwake(localHour, state.wakeUp, state.sleepAt);
            const overlap = isOverlapHour(refHour, cityIdx);

            let cellClass =
              "p-1 text-center text-xs font-mono border-l border-b border-slate-800/30 ";
            if (!awake) {
              cellClass += "bg-slate-900/80 text-slate-700";
            } else if (overlap) {
              cellClass += "bg-emerald-900/60 text-emerald-200 font-bold";
            } else {
              cellClass += "bg-slate-800/30 text-slate-400";
            }

            return (
              <div key={city.id} className={cellClass}>
                {formatHour(localHour, state.use12h)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
