import { useMemo, useState } from 'react';
import { CITY_BY_ID } from './data/cities';
import { useAppState } from './state/appState';
import { useNow } from './hooks/useNow';
import { buildSchedule } from './lib/schedule';
import { Header } from './components/Header';
import { SettingsPanel } from './components/SettingsPanel';
import { CityPicker } from './components/CityPicker';
import { OverlapSummary } from './components/OverlapSummary';
import { DesktopGrid } from './components/DesktopGrid';
import { MobileGrid } from './components/MobileGrid';
import { Legend } from './components/Legend';

export default function App() {
  const { state, dispatch } = useAppState();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const now = useNow(30_000);

  const cities = useMemo(
    () => state.cityIds.map((id) => CITY_BY_ID.get(id)).filter((city) => city !== undefined),
    [state.cityIds],
  );

  const schedule = useMemo(
    () => buildSchedule(cities, state.mode, state.wakeHour, state.sleepHour, now),
    [cities, state.mode, state.wakeHour, state.sleepHour, now],
  );

  const refCity = cities[0] ?? null;
  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(now),
    [now],
  );

  const gridProps = {
    schedule,
    timeFormat: state.timeFormat,
    now,
    onRemove: (cityId: string) => dispatch({ type: 'removeCity', cityId }),
    onSetReference: (cityId: string) => dispatch({ type: 'setReference', cityId }),
  };

  return (
    <div className="app">
      <Header
        mode={state.mode}
        wakeHour={state.wakeHour}
        sleepHour={state.sleepHour}
        timeFormat={state.timeFormat}
        settingsOpen={settingsOpen}
        onModeChange={(mode) => dispatch({ type: 'setMode', mode })}
        onToggleSettings={() => setSettingsOpen((open) => !open)}
      />
      <main className="app-main">
        {settingsOpen && (
          <SettingsPanel
            wakeHour={state.wakeHour}
            sleepHour={state.sleepHour}
            timeFormat={state.timeFormat}
            onWakeChange={(hour) => dispatch({ type: 'setWakeHour', hour })}
            onSleepChange={(hour) => dispatch({ type: 'setSleepHour', hour })}
            onFormatChange={(format) => dispatch({ type: 'setTimeFormat', format })}
          />
        )}
        <CityPicker
          selectedIds={state.cityIds}
          timeFormat={state.timeFormat}
          now={now}
          onAdd={(cityId) => dispatch({ type: 'addCity', cityId })}
        />
        <OverlapSummary schedule={schedule} mode={state.mode} timeFormat={state.timeFormat} refCity={refCity} />
        {cities.length > 0 ? (
          <>
            <DesktopGrid {...gridProps} />
            <MobileGrid {...gridProps} />
            <Legend mode={state.mode} refName={refCity?.name ?? ''} />
          </>
        ) : (
          <div className="empty-state">
            <p className="empty-title">No cities on the board</p>
            <p>Use the search above to add cities and compare awake hours across timezones.</p>
          </div>
        )}
      </main>
      <footer className="app-footer">
        Claude Fable 5 · UTC offsets computed live for {dateLabel}, so DST is always current · React + Vite
      </footer>
    </div>
  );
}
