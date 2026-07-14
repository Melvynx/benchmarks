import { useMemo } from 'react';
import { CitySearch } from './components/CitySearch';
import { DesktopGrid } from './components/DesktopGrid';
import { Header } from './components/Header';
import { ClockIcon } from './components/icons';
import { Legend } from './components/Legend';
import { MobileGrid } from './components/MobileGrid';
import { OverlapSummary } from './components/OverlapSummary';
import { CITY_BY_ID, type City } from './data/cities';
import { useAppState } from './hooks/useAppState';
import { useNow } from './hooks/useNow';
import type { Mode, Settings } from './lib/appState';
import { buildSchedule, type CityClock } from './lib/overlap';
import { getMinutesOfDay, getOffsetMinutes } from './lib/time';

export function App() {
  const [state, setState] = useAppState();
  const now = useNow();

  const cities = useMemo(
    () => state.cityIds.map((id) => CITY_BY_ID.get(id)).filter((city): city is City => city !== undefined),
    [state.cityIds],
  );

  const clocks: CityClock[] = useMemo(
    () => cities.map((city) => ({ city, offsetMinutes: getOffsetMinutes(city.timeZone, now) })),
    [cities, now],
  );

  const schedule = useMemo(
    () => buildSchedule(clocks, state.mode, state.settings),
    [clocks, state.mode, state.settings],
  );

  const refCity = cities[0];
  const nowHour = refCity ? Math.floor(getMinutesOfDay(refCity.timeZone, now) / 60) : null;

  const addCity = (id: string) =>
    setState((s) => (s.cityIds.includes(id) ? s : { ...s, cityIds: [...s.cityIds, id] }));
  const removeCity = (id: string) =>
    setState((s) => ({ ...s, cityIds: s.cityIds.filter((cityId) => cityId !== id) }));
  const promoteCity = (id: string) =>
    setState((s) =>
      s.cityIds[0] === id ? s : { ...s, cityIds: [id, ...s.cityIds.filter((cityId) => cityId !== id)] },
    );
  const setMode = (mode: Mode) => setState((s) => ({ ...s, mode }));
  const patchSettings = (patch: Partial<Settings>) =>
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

  return (
    <div className="app">
      <Header
        mode={state.mode}
        onModeChange={setMode}
        settings={state.settings}
        onSettingsChange={patchSettings}
      />
      <main className="main">
        <OverlapSummary schedule={schedule} mode={state.mode} settings={state.settings} cities={cities} />

        <section className="card board">
          <div className="board-toolbar">
            <CitySearch addedIds={state.cityIds} onAdd={addCity} now={now} />
            {refCity && (
              <p className="board-context">
                <ClockIcon />
                <span>
                  All hours shown in <strong>{refCity.name}</strong> time
                </span>
              </p>
            )}
          </div>

          {cities.length === 0 ? (
            <p className="board-empty">No cities yet — use the search above to add your first one.</p>
          ) : (
            <>
              <DesktopGrid
                lanes={schedule.lanes}
                settings={state.settings}
                now={now}
                nowHour={nowHour}
                onPromote={promoteCity}
                onRemove={removeCity}
              />
              <MobileGrid
                lanes={schedule.lanes}
                settings={state.settings}
                now={now}
                nowHour={nowHour}
                onPromote={promoteCity}
                onRemove={removeCity}
              />
            </>
          )}

          {cities.length > 0 && <Legend mode={state.mode} refName={refCity?.name} />}
        </section>

        <footer className="footer">
          UTC offsets are computed for{' '}
          {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, so
          daylight-saving time is handled automatically.
        </footer>
      </main>
    </div>
  );
}
