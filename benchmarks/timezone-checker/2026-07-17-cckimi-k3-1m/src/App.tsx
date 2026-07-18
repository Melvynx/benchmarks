import { useMemo } from 'react';
import { AppHeader } from './components/AppHeader';
import { CityCombobox } from './components/CityCombobox';
import { DesktopGrid } from './components/DesktopGrid';
import { GlobeIcon } from './components/Icons';
import { MobileGrid } from './components/MobileGrid';
import { OverlapSummary } from './components/OverlapSummary';
import { SettingsBar, type Settings } from './components/SettingsBar';
import { useNow } from './hooks/useNow';
import { usePersistentState } from './hooks/usePersistentState';
import { CITY_BY_ID, DEFAULT_CITY_IDS, type City } from './lib/cities';
import { buildGrid, type Mode } from './lib/overlap';

const DEFAULT_SETTINGS: Settings = { wake: 7, sleep: 23, hour12: true };

function sanitizeCityIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return DEFAULT_CITY_IDS;
  const valid = raw.filter((id): id is string => typeof id === 'string' && CITY_BY_ID.has(id));
  return [...new Set(valid)];
}

function sanitizeMode(raw: unknown): Mode {
  return raw === 'base' ? 'base' : 'meeting';
}

function sanitizeSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_SETTINGS;
  const r = raw as Record<string, unknown>;
  const hour = (v: unknown, d: number) =>
    typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 23 ? v : d;
  return {
    wake: hour(r.wake, DEFAULT_SETTINGS.wake),
    sleep: hour(r.sleep, DEFAULT_SETTINGS.sleep),
    hour12: typeof r.hour12 === 'boolean' ? r.hour12 : DEFAULT_SETTINGS.hour12,
  };
}

function Footer({ mode, refName }: { mode: Mode; refName?: string }) {
  return (
    <footer className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-fog">
      <span className="flex items-center gap-1.5">
        <span className="legend-sq asleep" /> Sleeping
      </span>
      <span className="flex items-center gap-1.5">
        <span className="legend-sq awake" /> Awake
      </span>
      <span className="flex items-center gap-1.5">
        <span className="legend-sq overlap" /> Overlap
      </span>
      <span className="flex items-center gap-1.5">
        <span className="now-dot static" /> Current hour
      </span>
      <span className="ms-auto italic">
        {mode === 'meeting'
          ? 'Green cells = everyone awake'
          : `Green cells = awake at the same time as ${refName ?? 'the reference city'}`}
      </span>
    </footer>
  );
}

export default function App() {
  const [cityIds, setCityIds] = usePersistentState<string[]>(
    'tzc.cities.v1',
    DEFAULT_CITY_IDS,
    sanitizeCityIds,
  );
  const [mode, setMode] = usePersistentState<Mode>('tzc.mode.v1', 'meeting', sanitizeMode);
  const [settings, setSettings] = usePersistentState<Settings>(
    'tzc.settings.v1',
    DEFAULT_SETTINGS,
    sanitizeSettings,
  );

  const now = useNow(20000);

  const cities = useMemo(
    () =>
      cityIds
        .map((id) => CITY_BY_ID.get(id))
        .filter((c): c is City => c !== undefined),
    [cityIds],
  );

  const grid = useMemo(
    () => buildGrid(cities, mode, settings.wake, settings.sleep, now),
    [cities, mode, settings.wake, settings.sleep, now],
  );

  const addedIds = useMemo(() => new Set(cityIds), [cityIds]);

  const addCity = (id: string) =>
    setCityIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  const removeCity = (id: string) => setCityIds((prev) => prev.filter((c) => c !== id));
  const promoteCity = (id: string) =>
    setCityIds((prev) => (prev[0] === id ? prev : [id, ...prev.filter((c) => c !== id)]));
  const patchSettings = (patch: Partial<Settings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  return (
    <div className="min-h-screen font-sans text-paper">
      <div className="bg-glow" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <AppHeader mode={mode} onModeChange={setMode} />

        <main className="pb-20">
          <SettingsBar settings={settings} onPatch={patchSettings} />

          <section className="card mt-4 overflow-hidden">
            {grid && grid.rows.length >= 2 && (
              <OverlapSummary grid={grid} mode={mode} hour12={settings.hour12} />
            )}
            {grid && grid.rows.length === 1 && (
              <div className="summary-band text-[12.5px] text-fog">
                <span className="font-semibold text-paper">{grid.refCity.name}</span> is your
                reference city. Add a second city to see shared awake hours.
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
              <div>
                <h2 className="text-sm font-bold">
                  Cities <span className="font-normal text-fog">({cities.length})</span>
                </h2>
                {cities.length > 0 && (
                  <p className="mt-0.5 text-[11px] text-fog">
                    Click a city's name to make it the reference · cells show each city's local hour
                  </p>
                )}
              </div>
              <CityCombobox addedIds={addedIds} onAdd={addCity} />
            </div>

            {grid ? (
              <>
                <DesktopGrid
                  grid={grid}
                  hour12={settings.hour12}
                  now={now}
                  onPromote={promoteCity}
                  onRemove={removeCity}
                />
                <MobileGrid
                  grid={grid}
                  hour12={settings.hour12}
                  onPromote={promoteCity}
                  onRemove={removeCity}
                />
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <span className="text-leaf/70">
                  <GlobeIcon size={34} />
                </span>
                <div>
                  <p className="text-sm font-semibold">No cities yet</p>
                  <p className="mt-0.5 text-xs text-fog">
                    Add a city above to start comparing timezones.
                  </p>
                </div>
              </div>
            )}
          </section>

          {grid && <Footer mode={mode} refName={grid.refCity.name} />}
        </main>
      </div>
    </div>
  );
}
