import { useEffect, useMemo, useState } from 'react';
import { CityPicker } from './components/CityPicker';
import { ModeToggle, SettingsPanel } from './components/Controls';
import { DesktopGrid } from './components/DesktopGrid';
import { MobileGrid } from './components/MobileGrid';
import { OverlapSummary } from './components/OverlapSummary';
import { CITY_CATALOG, findCity, type City } from './lib/cities';
import { loadState, saveState, type AppState, type Mode } from './lib/storage';
import {
  buildSchedule,
  computeOverlaps,
  getUtcOffsetMinutes,
  type Settings,
} from './lib/time';
import { useMediaQuery, useNow } from './hooks';
import type { CityRow } from './types';

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const now = useNow();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  useEffect(() => saveState(state), [state]);

  const cities = useMemo(
    () => state.cities.map(findCity).filter((c): c is City => c !== undefined),
    [state.cities],
  );

  const rows = useMemo<CityRow[]>(() => {
    const offsets = cities.map((c) => getUtcOffsetMinutes(c.timezone, now));
    const schedule = buildSchedule(offsets, state.settings);
    const overlaps = computeOverlaps(schedule, state.mode);
    return cities.map((city, i) => ({
      city,
      offset: offsets[i],
      slots: schedule[i],
      overlap: overlaps[i],
    }));
  }, [cities, now, state.settings, state.mode]);

  const available = useMemo(
    () => CITY_CATALOG.filter((c) => !state.cities.includes(c.id)),
    [state.cities],
  );

  const addCity = (id: string) =>
    setState((s) => (s.cities.includes(id) ? s : { ...s, cities: [...s.cities, id] }));

  const removeCity = (id: string) =>
    setState((s) => ({ ...s, cities: s.cities.filter((c) => c !== id) }));

  const promoteCity = (id: string) =>
    setState((s) =>
      s.cities[0] === id ? s : { ...s, cities: [id, ...s.cities.filter((c) => c !== id)] },
    );

  const updateSettings = (patch: Partial<Settings>) =>
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

  const setMode = (mode: Mode) => setState((s) => ({ ...s, mode }));

  const format = state.settings.format;

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Claude Haiku 5.5</h1>
          <p className="tagline">Find when your people are awake at the same time.</p>
        </div>
        <ModeToggle mode={state.mode} onChange={setMode} />
      </header>

      <section className="toolbar">
        <CityPicker available={available} onAdd={addCity} />
        <SettingsPanel settings={state.settings} onChange={updateSettings} />
      </section>

      {rows.length === 0 ? (
        <p className="empty">No cities yet. Add one above to start comparing.</p>
      ) : (
        <>
          <OverlapSummary rows={rows} mode={state.mode} format={format} />

          {isDesktop ? (
            <DesktopGrid
              rows={rows}
              format={format}
              highlightHeader={state.mode === 'meeting'}
              onPromote={promoteCity}
              onRemove={removeCity}
            />
          ) : (
            <MobileGrid rows={rows} format={format} onPromote={promoteCity} onRemove={removeCity} />
          )}
        </>
      )}

      <footer className="hint">Green cells = everyone awake</footer>
    </div>
  );
}
