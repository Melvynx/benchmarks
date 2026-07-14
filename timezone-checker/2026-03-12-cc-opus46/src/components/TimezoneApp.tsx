"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { CITIES, type City } from "@/lib/cities";
import {
  getUtcOffsetMinutes,
  formatUtcOffset,
  getLocalHourFractional,
  isAwake,
  formatHour,
  computeMeetingOverlap,
  computeBaseOverlap,
  overlapToRanges,
} from "@/lib/timezone";

interface AppState {
  cityIds: string[];
  mode: "meeting" | "base";
  wakeHour: number;
  sleepHour: number;
  timeFormat: "12h" | "24h";
}

const DEFAULTS: AppState = {
  cityIds: ["san-francisco", "denpasar", "geneva"],
  mode: "meeting",
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: "12h",
};

const STORAGE_KEY = "tz-overlap-state";
const HOURS = Array.from({ length: 24 }, (_, i) => i);

type CellState = "sleeping" | "awake" | "overlap";

const CELL_BG: Record<CellState, string> = {
  sleeping: "bg-zinc-950/80 text-zinc-600",
  awake: "bg-zinc-800/90 text-zinc-300",
  overlap: "bg-emerald-500 text-white font-bold",
};

export default function TimezoneApp() {
  const [state, setState] = useState<AppState>(DEFAULTS);
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  // -- Persistence --

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch {
      /* ignore */
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, mounted]);

  // -- Click outside to close search --

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // -- Derived data --

  const cities = useMemo(
    () =>
      state.cityIds
        .map((id) => CITIES.find((c) => c.id === id)!)
        .filter(Boolean),
    [state.cityIds],
  );

  const offsets = useMemo(
    () => cities.map((c) => getUtcOffsetMinutes(c.timezone)),
    [cities],
  );

  const refOffset = offsets[0] ?? 0;

  const meetingOverlap = useMemo(() => {
    if (state.mode !== "meeting" || cities.length < 2) return null;
    return computeMeetingOverlap(
      refOffset,
      offsets,
      state.wakeHour,
      state.sleepHour,
    );
  }, [state.mode, cities.length, refOffset, offsets, state.wakeHour, state.sleepHour]);

  const baseOverlaps = useMemo(() => {
    if (state.mode !== "base" || cities.length < 2) return null;
    return cities
      .slice(1)
      .map((_, i) =>
        computeBaseOverlap(
          refOffset,
          offsets[i + 1],
          state.wakeHour,
          state.sleepHour,
        ),
      );
  }, [state.mode, cities, refOffset, offsets, state.wakeHour, state.sleepHour]);

  // -- Actions --

  const update = useCallback(
    (partial: Partial<AppState>) =>
      setState((prev) => ({ ...prev, ...partial })),
    [],
  );

  const addCity = useCallback(
    (id: string) => {
      setState((prev) =>
        prev.cityIds.includes(id)
          ? prev
          : { ...prev, cityIds: [...prev.cityIds, id] },
      );
      setSearchOpen(false);
      setSearchQuery("");
    },
    [],
  );

  const removeCity = useCallback(
    (id: string) =>
      setState((prev) => ({
        ...prev,
        cityIds: prev.cityIds.filter((c) => c !== id),
      })),
    [],
  );

  const promoteToRef = useCallback(
    (id: string) =>
      setState((prev) => ({
        ...prev,
        cityIds: [id, ...prev.cityIds.filter((c) => c !== id)],
      })),
    [],
  );

  // -- Cell state --

  const getCellState = useCallback(
    (cityIdx: number, refHour: number): CellState => {
      const local = getLocalHourFractional(
        refOffset,
        offsets[cityIdx],
        refHour,
      );
      if (!isAwake(local, state.wakeHour, state.sleepHour)) return "sleeping";
      if (state.mode === "meeting") {
        return meetingOverlap?.[refHour] ? "overlap" : "awake";
      }
      if (cityIdx === 0) return "awake";
      return baseOverlaps?.[cityIdx - 1]?.[refHour] ? "overlap" : "awake";
    },
    [
      refOffset,
      offsets,
      state.wakeHour,
      state.sleepHour,
      state.mode,
      meetingOverlap,
      baseOverlaps,
    ],
  );

  // -- Search --

  const available = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return CITIES.filter(
      (c) =>
        !state.cityIds.includes(c.id) &&
        (c.name.toLowerCase().includes(q) ||
          c.country.toLowerCase().includes(q)),
    );
  }, [state.cityIds, searchQuery]);

  // -- Loading state --

  if (!mounted) return <div className="min-h-screen bg-zinc-950" />;

  const { mode, wakeHour, sleepHour, timeFormat } = state;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-6 md:px-8">
      <div className="max-w-[1480px] mx-auto space-y-5">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Claude Opus 4.6
            </h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              Timezone Overlap Checker
            </p>
          </div>

          <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800 w-fit">
            <ModeBtn
              active={mode === "meeting"}
              onClick={() => update({ mode: "meeting" })}
            >
              Meeting
            </ModeBtn>
            <ModeBtn
              active={mode === "base"}
              onClick={() => update({ mode: "base" })}
            >
              Base
            </ModeBtn>
          </div>
        </header>

        {/* Settings bar */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5 text-zinc-400">
            Wake
            <select
              value={wakeHour}
              onChange={(e) => update({ wakeHour: +e.target.value })}
              className="bg-zinc-900 text-zinc-200 rounded-md px-2 py-1.5 text-sm border border-zinc-800 focus:outline-none focus:border-zinc-600"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {formatHour(h, timeFormat)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-zinc-400">
            Sleep
            <select
              value={sleepHour}
              onChange={(e) => update({ sleepHour: +e.target.value })}
              className="bg-zinc-900 text-zinc-200 rounded-md px-2 py-1.5 text-sm border border-zinc-800 focus:outline-none focus:border-zinc-600"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {formatHour(h, timeFormat)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex bg-zinc-900 rounded-md border border-zinc-800 overflow-hidden">
            <button
              onClick={() => update({ timeFormat: "12h" })}
              className={`px-3 py-1.5 text-sm transition-colors ${
                timeFormat === "12h"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              12h
            </button>
            <button
              onClick={() => update({ timeFormat: "24h" })}
              className={`px-3 py-1.5 text-sm transition-colors ${
                timeFormat === "24h"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              24h
            </button>
          </div>

          {/* City search */}
          <div ref={searchRef} className="relative ml-auto w-full sm:w-64">
            <input
              type="text"
              placeholder="Add city..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              className="w-full bg-zinc-900 text-zinc-200 rounded-lg px-3 py-1.5 text-sm border border-zinc-800 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
            {searchOpen && available.length > 0 && (
              <div className="absolute z-50 top-full mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                {available.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => addCity(city.id)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 transition-colors flex items-center gap-2"
                  >
                    <span>{city.emoji}</span>
                    <span className="text-zinc-200">{city.name}</span>
                    <span className="text-zinc-600 text-xs ml-auto">
                      {city.country}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Overlap summary */}
        {cities.length >= 2 && (
          <OverlapSummary
            mode={mode}
            cities={cities}
            meetingOverlap={meetingOverlap}
            baseOverlaps={baseOverlaps}
            timeFormat={timeFormat}
          />
        )}

        {/* Desktop grid */}
        <div className="hidden md:block">
          <DesktopGrid
            cities={cities}
            offsets={offsets}
            refOffset={refOffset}
            timeFormat={timeFormat}
            getCellState={getCellState}
            onPromote={promoteToRef}
            onRemove={removeCity}
          />
        </div>

        {/* Mobile grid */}
        <div className="md:hidden">
          <MobileGrid
            cities={cities}
            offsets={offsets}
            refOffset={refOffset}
            timeFormat={timeFormat}
            getCellState={getCellState}
            onPromote={promoteToRef}
            onRemove={removeCity}
          />
        </div>

        <p className="text-center text-zinc-600 text-xs pb-4">
          Green cells = everyone awake
        </p>
      </div>
    </div>
  );
}

// ---- Sub-components ----

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
        active
          ? "bg-white text-zinc-900 shadow-sm"
          : "text-zinc-500 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function OverlapSummary({
  mode,
  cities,
  meetingOverlap,
  baseOverlaps,
  timeFormat,
}: {
  mode: "meeting" | "base";
  cities: City[];
  meetingOverlap: boolean[] | null;
  baseOverlaps: boolean[][] | null;
  timeFormat: "12h" | "24h";
}) {
  if (mode === "meeting" && meetingOverlap) {
    const count = meetingOverlap.filter(Boolean).length;
    const ranges = overlapToRanges(meetingOverlap, timeFormat);

    return (
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3">
        {count > 0 ? (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-emerald-400 font-semibold text-sm">
              {count}h overlap
            </span>
            <div className="flex gap-2 flex-wrap">
              {ranges.map((r, i) => (
                <span
                  key={i}
                  className="bg-emerald-500/15 text-emerald-300 text-sm px-3 py-0.5 rounded-full border border-emerald-500/20"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <span className="text-amber-400 text-sm">
            No overlap - no common awake hours across all cities
          </span>
        )}
      </div>
    );
  }

  if (mode === "base" && baseOverlaps) {
    return (
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 space-y-2">
        {cities.slice(1).map((city, i) => {
          const overlap = baseOverlaps[i];
          if (!overlap) return null;
          const count = overlap.filter(Boolean).length;
          const ranges = overlapToRanges(overlap, timeFormat);

          return (
            <div key={city.id} className="flex items-center gap-3 flex-wrap">
              <span className="text-zinc-300 text-sm min-w-[140px]">
                {city.emoji} {city.name}
              </span>
              {count > 0 ? (
                <>
                  <span className="text-emerald-400 font-semibold text-sm">
                    {count}h
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {ranges.map((r, j) => (
                      <span
                        key={j}
                        className="bg-emerald-500/15 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/20"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <span className="text-amber-400 text-sm">No overlap</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

function DesktopGrid({
  cities,
  offsets,
  refOffset,
  timeFormat,
  getCellState,
  onPromote,
  onRemove,
}: {
  cities: City[];
  offsets: number[];
  refOffset: number;
  timeFormat: "12h" | "24h";
  getCellState: (cityIdx: number, refHour: number) => CellState;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (cities.length === 0) {
    return (
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
        Add cities to compare timezones
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <div className="overflow-x-auto grid-scroll">
        <div
          className="gap-[1px] bg-zinc-800/40 min-w-[920px]"
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(190px, 220px) repeat(24, minmax(34px, 1fr)) 36px",
          }}
        >
          {/* Header row */}
          <div className="bg-zinc-900 px-3 py-2 text-[10px] text-zinc-600 font-medium flex items-center">
            Reference hours
          </div>
          {HOURS.map((h) => (
            <div
              key={`hdr-${h}`}
              className="bg-zinc-900 py-2 text-center text-[10px] text-zinc-500 font-mono"
            >
              {formatHour(h, timeFormat)}
            </div>
          ))}
          <div className="bg-zinc-900" />

          {/* City rows */}
          {cities.map((city, idx) => {
            const offset = offsets[idx];
            return [
              /* City info */
              <div
                key={`info-${city.id}`}
                className="bg-zinc-900 px-3 py-2.5 flex items-center gap-2 min-w-0"
              >
                <button
                  onClick={() => onPromote(city.id)}
                  className="flex items-center gap-1.5 min-w-0 hover:opacity-75 transition-opacity"
                  title="Set as reference"
                >
                  <span className="text-sm shrink-0">{city.emoji}</span>
                  <span className="text-sm font-medium truncate">
                    {city.name}
                  </span>
                </button>
                {idx === 0 && (
                  <span className="shrink-0 text-[9px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/25">
                    REF
                  </span>
                )}
                <span className="shrink-0 text-[10px] text-zinc-600 ml-auto font-mono">
                  {formatUtcOffset(offset)}
                </span>
              </div>,

              /* Hour cells */
              ...HOURS.map((h) => {
                const cellState = getCellState(idx, h);
                const local = getLocalHourFractional(refOffset, offset, h);
                return (
                  <div
                    key={`${city.id}-${h}`}
                    className={`py-2.5 text-center text-[11px] font-mono leading-none ${CELL_BG[cellState]} transition-colors`}
                  >
                    {formatHour(local, timeFormat)}
                  </div>
                );
              }),

              /* Remove button */
              <div
                key={`rm-${city.id}`}
                className="bg-zinc-900 flex items-center justify-center"
              >
                <button
                  onClick={() => onRemove(city.id)}
                  className="text-zinc-700 hover:text-red-400 transition-colors text-base leading-none"
                  title="Remove"
                >
                  &times;
                </button>
              </div>,
            ];
          })}
        </div>
      </div>
    </div>
  );
}

function MobileGrid({
  cities,
  offsets,
  refOffset,
  timeFormat,
  getCellState,
  onPromote,
  onRemove,
}: {
  cities: City[];
  offsets: number[];
  refOffset: number;
  timeFormat: "12h" | "24h";
  getCellState: (cityIdx: number, refHour: number) => CellState;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (cities.length === 0) {
    return (
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
        Add cities to compare timezones
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <div className="overflow-x-auto grid-scroll">
        <div
          className="gap-[1px] bg-zinc-800/40"
          style={{
            display: "grid",
            gridTemplateColumns: `52px repeat(${cities.length}, minmax(72px, 1fr))`,
          }}
        >
          {/* Header row */}
          <div className="bg-zinc-900 p-1" />
          {cities.map((city, idx) => (
            <div
              key={`mhdr-${city.id}`}
              className="bg-zinc-900 p-2 text-center"
            >
              <button
                onClick={() => onPromote(city.id)}
                className="text-xs font-medium hover:opacity-75 transition-opacity leading-tight"
                title="Set as reference"
              >
                {city.emoji} {city.name}
              </button>
              <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                {idx === 0 && (
                  <span className="text-[8px] font-bold bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded border border-amber-500/25">
                    REF
                  </span>
                )}
                <span className="text-[9px] text-zinc-600 font-mono">
                  {formatUtcOffset(offsets[idx])}
                </span>
              </div>
              <button
                onClick={() => onRemove(city.id)}
                className="text-zinc-700 hover:text-red-400 text-[10px] mt-1 transition-colors"
              >
                remove
              </button>
            </div>
          ))}

          {/* Hour rows */}
          {HOURS.map((h) => [
            <div
              key={`mlbl-${h}`}
              className="bg-zinc-900 p-1.5 text-center text-[10px] text-zinc-500 font-mono flex items-center justify-center"
            >
              {formatHour(h, timeFormat)}
            </div>,
            ...cities.map((city, idx) => {
              const cellState = getCellState(idx, h);
              const local = getLocalHourFractional(
                refOffset,
                offsets[idx],
                h,
              );
              return (
                <div
                  key={`m-${city.id}-${h}`}
                  className={`p-1.5 text-center text-[11px] font-mono leading-none flex items-center justify-center ${CELL_BG[cellState]} transition-colors`}
                >
                  {formatHour(local, timeFormat)}
                </div>
              );
            }),
          ])}
        </div>
      </div>
    </div>
  );
}
