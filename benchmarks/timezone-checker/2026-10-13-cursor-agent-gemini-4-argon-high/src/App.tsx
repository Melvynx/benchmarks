import { useState, useEffect, useMemo } from 'react';
import { Globe2, Users, GitCompare, Sparkles, MapPin } from 'lucide-react';
import { CITY_CATALOG, City, DEFAULT_CITY_IDS } from './data/cities';
import {
  AppMode,
  TimeFormat,
  computeScheduleData,
} from './utils/timezone';
import { CitySelector } from './components/CitySelector';
import { SettingsPanel } from './components/SettingsPanel';
import { OverlapSummary } from './components/OverlapSummary';
import { DesktopGrid } from './components/DesktopGrid';
import { MobileGrid } from './components/MobileGrid';

const STORAGE_KEY = 'tz_overlap_checker_state_v1';

interface PersistedState {
  cityIds: string[];
  mode: AppMode;
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
}

const DEFAULT_STATE: PersistedState = {
  cityIds: DEFAULT_CITY_IDS,
  mode: 'meeting',
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: '12h',
};

function loadInitialState(): PersistedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;

    const validCityIds = Array.isArray(parsed.cityIds)
      ? parsed.cityIds.filter(
          (id): id is string =>
            typeof id === 'string' && CITY_CATALOG.some((c) => c.id === id)
        )
      : DEFAULT_STATE.cityIds;

    // Deduplicate while preserving order
    const uniqueCityIds = Array.from(new Set(validCityIds));

    const mode: AppMode =
      parsed.mode === 'meeting' || parsed.mode === 'base'
        ? parsed.mode
        : DEFAULT_STATE.mode;

    const wakeHour =
      typeof parsed.wakeHour === 'number' &&
      Number.isInteger(parsed.wakeHour) &&
      parsed.wakeHour >= 0 &&
      parsed.wakeHour <= 23
        ? parsed.wakeHour
        : DEFAULT_STATE.wakeHour;

    const sleepHour =
      typeof parsed.sleepHour === 'number' &&
      Number.isInteger(parsed.sleepHour) &&
      parsed.sleepHour >= 0 &&
      parsed.sleepHour <= 23
        ? parsed.sleepHour
        : DEFAULT_STATE.sleepHour;

    const timeFormat: TimeFormat =
      parsed.timeFormat === '12h' || parsed.timeFormat === '24h'
        ? parsed.timeFormat
        : DEFAULT_STATE.timeFormat;

    return {
      cityIds: uniqueCityIds,
      mode,
      wakeHour,
      sleepHour,
      timeFormat,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function App() {
  const [state, setState] = useState<PersistedState>(loadInitialState);

  useEffect(() => {
    document.title = 'Gemini 4 Argon';
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  const selectedCities = useMemo(() => {
    return state.cityIds
      .map((id) => CITY_CATALOG.find((c) => c.id === id))
      .filter((c): c is City => Boolean(c));
  }, [state.cityIds]);

  const scheduleData = useMemo(() => {
    return computeScheduleData(
      selectedCities,
      state.mode,
      state.wakeHour,
      state.sleepHour,
      state.timeFormat
    );
  }, [
    selectedCities,
    state.mode,
    state.wakeHour,
    state.sleepHour,
    state.timeFormat,
  ]);

  const isDefaultState = useMemo(() => {
    return (
      state.mode === DEFAULT_STATE.mode &&
      state.wakeHour === DEFAULT_STATE.wakeHour &&
      state.sleepHour === DEFAULT_STATE.sleepHour &&
      state.timeFormat === DEFAULT_STATE.timeFormat &&
      state.cityIds.length === DEFAULT_STATE.cityIds.length &&
      state.cityIds.every((id, idx) => id === DEFAULT_STATE.cityIds[idx])
    );
  }, [state]);

  const handleAddCity = (cityId: string) => {
    setState((prev) => {
      if (prev.cityIds.includes(cityId)) return prev;
      return {
        ...prev,
        cityIds: [...prev.cityIds, cityId],
      };
    });
  };

  const handleRemoveCity = (cityId: string) => {
    setState((prev) => ({
      ...prev,
      cityIds: prev.cityIds.filter((id) => id !== cityId),
    }));
  };

  const handlePromoteCity = (cityId: string) => {
    setState((prev) => {
      const idx = prev.cityIds.indexOf(cityId);
      if (idx <= 0) return prev;
      const nextIds = [
        cityId,
        ...prev.cityIds.filter((id) => id !== cityId),
      ];
      return {
        ...prev,
        cityIds: nextIds,
      };
    });
  };

  const handleSetMode = (mode: AppMode) => {
    setState((prev) => ({ ...prev, mode }));
  };

  const handleSetWakeHour = (wakeHour: number) => {
    setState((prev) => ({ ...prev, wakeHour }));
  };

  const handleSetSleepHour = (sleepHour: number) => {
    setState((prev) => ({ ...prev, sleepHour }));
  };

  const handleSetTimeFormat = (timeFormat: TimeFormat) => {
    setState((prev) => ({ ...prev, timeFormat }));
  };

  const handleResetDefaults = () => {
    setState(DEFAULT_STATE);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Subtle top ambient gradient */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-gradient-to-b from-emerald-500/[0.06] via-slate-900/[0.02] to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-5">
        {/* Top Header Bar */}
        <header className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/10 border border-emerald-500/35 shadow-inner">
              <Globe2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Gemini 4 Argon
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                Global timezone overlap &amp; availability matrix for distributed teams
              </p>
            </div>
          </div>

          {/* Right Controls: Mode Switcher + Add City Dropdown */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Mode Toggle */}
            <div
              role="group"
              aria-label="Overlap calculation mode"
              className="inline-flex rounded-xl border border-slate-800 bg-slate-900/90 p-1"
            >
              <button
                type="button"
                onClick={() => handleSetMode('meeting')}
                aria-pressed={state.mode === 'meeting'}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  state.mode === 'meeting'
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Meeting Mode</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetMode('base')}
                aria-pressed={state.mode === 'base'}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  state.mode === 'base'
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <GitCompare className="h-3.5 w-3.5" />
                <span>Base Mode</span>
              </button>
            </div>

            {/* Searchable City Dropdown */}
            <CitySelector
              selectedCityIds={state.cityIds}
              onAddCity={handleAddCity}
            />
          </div>
        </header>

        {/* Awake Window & Time Format Settings Panel */}
        <SettingsPanel
          wakeHour={state.wakeHour}
          sleepHour={state.sleepHour}
          timeFormat={state.timeFormat}
          onChangeWakeHour={handleSetWakeHour}
          onChangeSleepHour={handleSetSleepHour}
          onChangeTimeFormat={handleSetTimeFormat}
          onResetDefaults={handleResetDefaults}
          isDefaultState={isDefaultState}
        />

        {/* Overlap Summary (Displayed above grid when 2+ cities are present) */}
        <OverlapSummary
          cities={selectedCities}
          mode={state.mode}
          meetingOverlapCount={scheduleData.meetingOverlapHours.length}
          meetingRanges={scheduleData.meetingRanges}
          baseSummaries={scheduleData.baseSummaries}
        />

        {/* Main 24-Hour Comparison Grid */}
        {selectedCities.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 px-6 py-16 text-center">
            <MapPin className="h-8 w-8 text-slate-500 mb-3" />
            <h2 className="text-base font-semibold text-slate-200">
              No cities selected
            </h2>
            <p className="mt-1 max-w-md text-xs text-slate-400">
              Use the searchable city dropdown above to add cities from the global catalog, or restore the default cities.
            </p>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/30"
            >
              Restore Default Cities (San Francisco, Denpasar, Geneva)
            </button>
          </div>
        ) : (
          <>
            {/* Desktop (≥768px): Horizontal 24-Column Grid */}
            <DesktopGrid
              cities={selectedCities}
              offsetsByCityId={scheduleData.offsetsByCityId}
              slotsByCityId={scheduleData.slotsByCityId}
              timeFormat={state.timeFormat}
              onPromoteCity={handlePromoteCity}
              onRemoveCity={handleRemoveCity}
            />

            {/* Mobile (<768px): Vertical 24-Row Grid */}
            <MobileGrid
              cities={selectedCities}
              offsetsByCityId={scheduleData.offsetsByCityId}
              slotsByCityId={scheduleData.slotsByCityId}
              timeFormat={state.timeFormat}
              onPromoteCity={handlePromoteCity}
              onRemoveCity={handleRemoveCity}
            />
          </>
        )}

        {/* Footer Legend & Hint */}
        <footer className="flex flex-col gap-3 rounded-xl border border-slate-800/70 bg-slate-900/40 px-4 py-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 rounded border border-emerald-500/60 bg-emerald-500/25" />
              <span className="font-medium text-emerald-300">
                Green cells = everyone awake
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 rounded border border-slate-700/70 bg-slate-800/80" />
              <span>Awake, no overlap</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 rounded border border-slate-800/60 bg-slate-950/60 opacity-55" />
              <span>Sleeping</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>
              {state.mode === 'meeting'
                ? 'Meeting Mode: highlights hours when all selected cities are awake'
                : 'Base Mode: compares each city independently against the REF city'}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
export default App;
