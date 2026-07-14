import { useEffect, useMemo, useState } from "react";
import { CITIES, findCity } from "./data/cities";
import { useLocalStorage } from "./lib/useLocalStorage";
import { getOffsetMinutes } from "./lib/timezone";
import {
  buildAwakeArray,
  countHours,
  rangesFromMask,
} from "./lib/overlap";
import { AddCity } from "./components/AddCity";
import { SettingsPanel } from "./components/SettingsPanel";
import { ModeToggle, type Mode } from "./components/ModeToggle";
import { OverlapSummary } from "./components/OverlapSummary";
import { Grid, type CityRow } from "./components/Grid";

const DEFAULT_CITY_IDS = ["san-francisco", "denpasar", "geneva"];

export function App() {
  const [cityIds, setCityIds] = useLocalStorage<string[]>(
    "tz:cities",
    DEFAULT_CITY_IDS,
  );
  const [mode, setMode] = useLocalStorage<Mode>("tz:mode", "meeting");
  const [wake, setWake] = useLocalStorage<number>("tz:wake", 7);
  const [sleep, setSleep] = useLocalStorage<number>("tz:sleep", 23);
  const [format12h, setFormat12h] = useLocalStorage<boolean>("tz:fmt12", true);

  // Guard against corrupted storage.
  const validIds = cityIds.filter((id) => findCity(id));
  const cities = validIds
    .map((id) => findCity(id)!)
    .filter(Boolean);

  // Re-evaluate offsets every minute so DST boundaries and the "now" marker stay fresh.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const now = useMemo(() => new Date(), [tick]);

  const offsets = useMemo(
    () => cities.map((c) => getOffsetMinutes(c.timeZone, now)),
    [cities, now],
  );

  const refOffset = offsets[0] ?? 0;

  const awakeArrays = useMemo(
    () =>
      cities.map((_, i) =>
        buildAwakeArray(refOffset, offsets[i], { wake, sleep }),
      ),
    [cities, refOffset, offsets, wake, sleep],
  );

  // Meeting mode: all-awake mask
  const meetingMask = useMemo(() => {
    if (awakeArrays.length === 0) return Array(24).fill(false);
    return Array.from({ length: 24 }, (_, h) =>
      awakeArrays.every((a) => a[h]),
    );
  }, [awakeArrays]);

  // Base mode: per-other-city mask against ref
  const baseMasks = useMemo(() => {
    if (awakeArrays.length === 0) return [] as boolean[][];
    const ref = awakeArrays[0];
    return awakeArrays.map((a, i) =>
      i === 0 ? a : Array.from({ length: 24 }, (_, h) => ref[h] && a[h]),
    );
  }, [awakeArrays]);

  // Overlap per row for visualization
  const rows: CityRow[] = useMemo(() => {
    return cities.map((city, i) => {
      let overlap: boolean[];
      if (mode === "meeting") {
        overlap = meetingMask;
      } else {
        if (i === 0) {
          // Ref row overlap = any-colleague overlap
          overlap = Array.from({ length: 24 }, (_, h) =>
            baseMasks.slice(1).some((m) => m[h]),
          );
        } else {
          overlap = baseMasks[i];
        }
      }
      return {
        city,
        offsetMin: offsets[i],
        awake: awakeArrays[i],
        overlap,
      };
    });
  }, [cities, mode, offsets, awakeArrays, meetingMask, baseMasks]);

  // Summary data
  const meetingRanges = useMemo(() => rangesFromMask(meetingMask), [meetingMask]);
  const meetingCount = countHours(meetingMask);

  const baseOverlaps = useMemo(
    () =>
      cities.slice(1).map((city, idx) => {
        const mask = baseMasks[idx + 1] ?? Array(24).fill(false);
        return {
          city,
          ranges: rangesFromMask(mask),
          count: countHours(mask),
        };
      }),
    [cities, baseMasks],
  );

  // Current hour (in ref tz) for the "now" indicator
  const currentRefHour = useMemo(() => {
    if (!cities[0]) return null;
    const h = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: cities[0].timeZone,
        hour: "2-digit",
        hour12: false,
      }).format(now),
    );
    return isFinite(h) ? h % 24 : null;
  }, [cities, now]);

  const addCity = (id: string) => {
    if (cityIds.includes(id)) return;
    setCityIds([...cityIds, id]);
  };
  const removeCity = (id: string) => {
    setCityIds(cityIds.filter((x) => x !== id));
  };
  const promote = (id: string) => {
    if (cityIds[0] === id) return;
    setCityIds([id, ...cityIds.filter((x) => x !== id)]);
  };

  const updateSettings = (patch: {
    wake?: number;
    sleep?: number;
    format12h?: boolean;
  }) => {
    if (patch.wake !== undefined) setWake(patch.wake);
    if (patch.sleep !== undefined) setSleep(patch.sleep);
    if (patch.format12h !== undefined) setFormat12h(patch.format12h);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-white/5 sticky top-0 backdrop-blur-xl bg-zinc-950/70 z-40">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Logo />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-zinc-50 truncate">
                Claude Opus 4.7
              </h1>
              <div className="text-[11px] text-zinc-500 hidden sm:block">
                Timezone overlap · for distributed teams
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <ModeToggle mode={mode} onChange={setMode} />
            <SettingsPanel
              wake={wake}
              sleep={sleep}
              format12h={format12h}
              onChange={updateSettings}
            />
            <AddCity selectedIds={cityIds} onAdd={addCity} />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        {/* Mode explanation */}
        <div className="text-sm text-zinc-400">
          {mode === "meeting" ? (
            <>
              <strong className="text-zinc-200">Meeting mode</strong> — green
              cells show hours when{" "}
              <span className="text-emerald-300">everyone</span> is awake at the
              same time.
            </>
          ) : (
            <>
              <strong className="text-zinc-200">Base mode</strong> — each city
              highlights its own overlap with{" "}
              <span className="text-emerald-300">
                {cities[0]?.name ?? "the reference"}
              </span>
              . Different cities may highlight different hours.
            </>
          )}
        </div>

        {cities.length > 1 && (
          <OverlapSummary
            mode={mode}
            refCity={cities[0]}
            otherCities={cities.slice(1)}
            format12h={format12h}
            meetingRanges={meetingRanges}
            meetingCount={meetingCount}
            baseOverlaps={baseOverlaps}
          />
        )}

        {cities.length === 0 ? (
          <EmptyState
            onReset={() => setCityIds(DEFAULT_CITY_IDS)}
            available={CITIES.length}
          />
        ) : (
          <Grid
            rows={rows}
            refOffsetMin={refOffset}
            format12h={format12h}
            currentRefHour={currentRefHour}
            onPromote={promote}
            onRemove={removeCity}
          />
        )}

        <Legend />

        <p className="text-xs text-zinc-500 pt-2">
          {mode === "meeting" ? (
            <>
              Green cells = everyone awake. Click any city's name to make it the
              reference.
            </>
          ) : (
            <>
              Green cells = overlap with{" "}
              {cities[0]?.name ?? "the reference city"}. Click any city's name
              to change the reference.
            </>
          )}
        </p>
      </main>

      <footer className="border-t border-white/5 mt-10 py-6 text-center text-[11px] text-zinc-600">
        DST auto-handled · {CITIES.length} cities across 7 regions · state saved
        to this browser
      </footer>
    </div>
  );
}

function Logo() {
  return (
    <div className="relative h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-emerald-950"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 0 0 18M3 12h18" />
        <path d="M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" />
      </svg>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
      <LegendItem className="bg-emerald-500/90" label="Overlap" />
      <LegendItem className="bg-zinc-800/60" label="Awake" />
      <LegendItem className="bg-zinc-900/40 border border-white/5" label="Sleeping" />
    </div>
  );
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-3 w-5 rounded ${className}`} />
      <span>{label}</span>
    </div>
  );
}

function EmptyState({
  onReset,
  available,
}: {
  onReset: () => void;
  available: number;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/30 p-10 text-center">
      <div className="text-zinc-200 font-medium mb-1">No cities yet</div>
      <div className="text-sm text-zinc-500 mb-4">
        Add a city to get started — pick from {available} cities across 7
        regions.
      </div>
      <button
        onClick={onReset}
        className="text-sm text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
      >
        Load default cities
      </button>
    </div>
  );
}
