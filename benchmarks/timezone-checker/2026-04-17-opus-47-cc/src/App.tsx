import { useCallback, useEffect, useMemo, useState } from "react";
import { CITIES, DEFAULT_CITY_IDS, getCityById, type City } from "./data/cities";
import { CitySearch } from "./components/CitySearch";
import { GridDesktop } from "./components/GridDesktop";
import { GridMobile } from "./components/GridMobile";
import { Legend } from "./components/Legend";
import { ModeToggle } from "./components/ModeToggle";
import { OverlapSummary } from "./components/OverlapSummary";
import { SettingsPanel } from "./components/SettingsPanel";
import { usePersistentState } from "./hooks/usePersistentState";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { computeRows, type Mode, type Settings } from "./lib/overlap";

const DEFAULT_SETTINGS: Settings = {
  wakeHour: 7,
  sleepHour: 23,
  format12h: true,
};

export default function App() {
  const [cityIds, setCityIds] = usePersistentState<string[]>(
    "tz.cityIds",
    DEFAULT_CITY_IDS,
    (raw) => {
      if (!Array.isArray(raw)) return undefined;
      const valid = raw.filter(
        (id): id is string =>
          typeof id === "string" && CITIES.some((c) => c.id === id),
      );
      return valid.length > 0 ? valid : undefined;
    },
  );

  const [mode, setMode] = usePersistentState<Mode>("tz.mode", "meeting", (raw) =>
    raw === "meeting" || raw === "base" ? raw : undefined,
  );

  const [settings, setSettings] = usePersistentState<Settings>(
    "tz.settings",
    DEFAULT_SETTINGS,
    (raw) => {
      if (!raw || typeof raw !== "object") return undefined;
      const r = raw as Partial<Settings>;
      const wake = clampHour(r.wakeHour ?? DEFAULT_SETTINGS.wakeHour);
      const sleep = clampHour(r.sleepHour ?? DEFAULT_SETTINGS.sleepHour);
      const fmt =
        typeof r.format12h === "boolean" ? r.format12h : DEFAULT_SETTINGS.format12h;
      return { wakeHour: wake, sleepHour: sleep, format12h: fmt };
    },
  );

  // Recompute every minute so the offsets reflect DST transitions if users
  // leave the tab open across a change. Cheap enough that it doesn't matter.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const cities = useMemo<City[]>(
    () =>
      cityIds
        .map(getCityById)
        .filter((c): c is City => c !== undefined),
    [cityIds],
  );

  const { rows, globalOverlap } = useMemo(
    () => computeRows(cities, mode, settings, now),
    [cities, mode, settings, now],
  );

  const handleAdd = useCallback(
    (id: string) => {
      setCityIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    },
    [setCityIds],
  );
  const handleRemove = useCallback(
    (id: string) => {
      setCityIds((prev) => (prev.length > 1 ? prev.filter((x) => x !== id) : prev));
    },
    [setCityIds],
  );
  const handlePromote = useCallback(
    (id: string) => {
      setCityIds((prev) => {
        if (!prev.includes(id) || prev[0] === id) return prev;
        return [id, ...prev.filter((x) => x !== id)];
      });
    },
    [setCityIds],
  );

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const hint =
    mode === "meeting"
      ? "Green cells = everyone awake"
      : "Green cells = overlap with the reference city";

  return (
    <div className="mx-auto min-h-full max-w-[1180px] px-4 pb-16 pt-6 sm:px-6 md:pt-10">
      <Header mode={mode} setMode={setMode} settings={settings} setSettings={setSettings} />

      <main className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
        <OverlapSummary
          rows={rows}
          globalOverlap={globalOverlap}
          mode={mode}
          format12h={settings.format12h}
        />

        {isDesktop ? (
          <GridDesktop
            rows={rows}
            format12h={settings.format12h}
            onPromote={handlePromote}
            onRemove={handleRemove}
          />
        ) : (
          <GridMobile
            rows={rows}
            format12h={settings.format12h}
            onPromote={handlePromote}
            onRemove={handleRemove}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <CitySearch
            selectedIds={cityIds}
            onAdd={handleAdd}
          />
          <Legend hint={hint} />
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Header({
  mode,
  setMode,
  settings,
  setSettings,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  settings: Settings;
  setSettings: (s: Settings) => void;
}) {
  return (
    <header className="flex flex-col gap-4 sm:gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Mark />
          <div>
            <h1 className="text-xl font-semibold leading-tight tracking-tight text-zinc-100 sm:text-2xl">
              Claude Opus 4.7
            </h1>
            <p className="mt-0.5 text-[12px] text-zinc-500 sm:text-sm">
              Timezone overlap checker for distributed teams
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <ModeToggle mode={mode} onChange={setMode} />
          <SettingsPanel settings={settings} onChange={setSettings} />
        </div>
      </div>
    </header>
  );
}

function Mark() {
  return (
    <div
      aria-hidden
      className="relative grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-400/30 to-emerald-700/30 ring-1 ring-emerald-500/40"
    >
      <div className="absolute inset-[3px] rounded-md bg-[var(--bg)]/70 backdrop-blur" />
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        className="relative text-emerald-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-soft)] pt-5 text-[11px] text-zinc-600">
      <span>
        UTC offsets resolved from today's date · DST handled automatically
      </span>
      <span>Saved locally in your browser</span>
    </footer>
  );
}

function clampHour(n: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(23, Math.floor(n)));
}
