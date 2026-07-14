import { useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { ModeToggle } from './components/ModeToggle';
import { SettingsPanel } from './components/SettingsPanel';
import { CitySelector } from './components/CitySelector';
import { OverlapSummary } from './components/OverlapSummary';
import { CityGridDesktop } from './components/CityGridDesktop';
import { CityGridMobile } from './components/CityGridMobile';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useMediaQuery } from './hooks/useMediaQuery';
import { computeGrid } from './lib/overlap';
import {
  DEFAULT_STATE,
  STORAGE_KEY,
  sanitizeState,
} from './lib/defaults';
import type { AppState, City, Mode, Settings } from './lib/types';

export default function App() {
  const [rawState, setRawState] = useLocalStorage<AppState>(
    STORAGE_KEY,
    DEFAULT_STATE,
  );

  const state = useMemo(() => sanitizeState(rawState), [rawState]);
  const { cities, settings, mode } = state;
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const grid = useMemo(
    () => computeGrid(cities, settings, mode),
    [cities, settings, mode],
  );

  const setState = useCallback(
    (updater: (prev: AppState) => AppState) => setRawState((p) => updater(sanitizeState(p))),
    [setRawState],
  );

  const addCity = useCallback(
    (city: City) => {
      setState((prev) =>
        prev.cities.some((c) => c.id === city.id)
          ? prev
          : { ...prev, cities: [...prev.cities, city] },
      );
    },
    [setState],
  );

  const removeCity = useCallback(
    (cityId: string) => {
      setState((prev) => ({
        ...prev,
        cities: prev.cities.filter((c) => c.id !== cityId),
      }));
    },
    [setState],
  );

  const promoteCity = useCallback(
    (cityId: string) => {
      setState((prev) => {
        const idx = prev.cities.findIndex((c) => c.id === cityId);
        if (idx <= 0) return prev;
        const next = [...prev.cities];
        const [moved] = next.splice(idx, 1);
        next.unshift(moved);
        return { ...prev, cities: next };
      });
    },
    [setState],
  );

  const setMode = useCallback(
    (next: Mode) => setState((prev) => ({ ...prev, mode: next })),
    [setState],
  );

  const updateSettings = useCallback(
    (next: Settings) => setState((prev) => ({ ...prev, settings: next })),
    [setState],
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <Header />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ModeToggle mode={mode} onChange={setMode} />
        <div className="flex items-center gap-2">
          <CitySelector selectedIds={cities.map((c) => c.id)} onAdd={addCity} />
          <SettingsPanel settings={settings} onChange={updateSettings} />
        </div>
      </div>

      <ModeHint mode={mode} />

      <OverlapSummary
        mode={mode}
        cities={cities}
        meetingOverlapHours={grid.meetingOverlapHours}
        baseOverlap={grid.baseOverlap}
        format={settings.format}
      />

      {isDesktop ? (
        <CityGridDesktop
          rows={grid.rows}
          settings={settings}
          onPromote={promoteCity}
          onRemove={removeCity}
        />
      ) : (
        <CityGridMobile
          rows={grid.rows}
          settings={settings}
          onPromote={promoteCity}
          onRemove={removeCity}
        />
      )}

      <Legend mode={mode} />
    </main>
  );
}

function ModeHint({ mode }: { mode: Mode }) {
  return (
    <p className="text-sm text-slate-400">
      {mode === 'meeting' ? (
        <>
          <span className="font-medium text-slate-200">Meeting mode</span> —
          highlighted hours are when{' '}
          <span className="text-accent-200">everyone is awake at once</span>.
        </>
      ) : (
        <>
          <span className="font-medium text-slate-200">Base mode</span> — each
          city is compared independently against the reference (
          <span className="text-accent-200">REF</span>). Different cities may
          highlight different hours.
        </>
      )}
    </p>
  );
}

function Legend({ mode }: { mode: Mode }) {
  return (
    <footer className="flex flex-col gap-3 border-t border-ink-800 pt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
        <LegendItem
          className="bg-gradient-to-b from-accent-500/35 to-accent-500/20 ring-1 ring-inset ring-accent-400/50"
          label={mode === 'meeting' ? 'Everyone awake' : 'Overlap with ref'}
        />
        <LegendItem
          className="bg-ink-800/70 ring-1 ring-inset ring-ink-700/60"
          label="Awake (no overlap)"
        />
        <LegendItem
          className="bg-ink-900/40 ring-1 ring-inset ring-ink-800/40"
          label="Sleeping"
        />
        <span className="text-slate-600">
          · <span className="tabular-nums">+1 / −1</span> = next / previous day
        </span>
      </div>
      <p className="text-xs text-slate-500">
        Green cells = everyone awake. Click any city name to make it the
        reference. Offsets use today’s date, so DST is handled automatically.
      </p>
    </footer>
  );
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-4 w-6 rounded ${className}`} />
      {label}
    </span>
  );
}
