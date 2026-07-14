import { useEffect, useMemo, useState } from 'react';
import { CitySearch } from './components/CitySearch';
import { DesktopGrid } from './components/DesktopGrid';
import { MobileGrid } from './components/MobileGrid';
import { OverlapSummary } from './components/OverlapSummary';
import { SettingsPanel } from './components/SettingsPanel';
import { cityById } from './data/cities';
import { useAppState } from './hooks/useAppState';
import { computeOverlap, type Mode } from './lib/overlap';
import { getUtcOffsetMinutes } from './lib/time';

/** Re-render every minute so UTC offsets and the "now" marker stay current. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: 'meeting', label: 'Meeting', hint: 'Hours when everyone is awake at once' },
  { value: 'base', label: 'Base', hint: 'Each city compared against the reference only' },
];

export default function App() {
  const { state, addCity, removeCity, promoteCity, setMode, setWakeHour, setSleepHour, setTimeFormat } =
    useAppState();
  const now = useNow();

  const cities = useMemo(
    () => state.cityIds.map((id) => cityById.get(id)).filter((c) => c !== undefined),
    [state.cityIds],
  );

  const model = useMemo(
    () => computeOverlap(cities, state.mode, state.wakeHour, state.sleepHour, now),
    [cities, state.mode, state.wakeHour, state.sleepHour, now],
  );

  // Current hour in the reference city's timezone, to mark the "now" column.
  const nowHour = useMemo(() => {
    if (cities.length === 0) return null;
    const refOffset = getUtcOffsetMinutes(cities[0].timeZone, now);
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    return Math.floor(((((utcMinutes + refOffset) % 1440) + 1440) % 1440) / 60);
  }, [cities, now]);

  return (
    <div className="app">
      <header className="header">
        <div className="header__title-group">
          <h1 className="header__title">Claude Fable 5</h1>
          <p className="header__subtitle">Timezone overlap checker for distributed teams</p>
        </div>
        <div className="segmented segmented--modes" role="group" aria-label="Comparison mode">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              className="segmented__button"
              aria-pressed={state.mode === m.value}
              title={m.hint}
              onClick={() => setMode(m.value)}
            >
              {m.label} mode
            </button>
          ))}
        </div>
      </header>

      <div className="toolbar">
        <CitySearch selectedIds={state.cityIds} onAdd={addCity} />
        <SettingsPanel
          wakeHour={state.wakeHour}
          sleepHour={state.sleepHour}
          timeFormat={state.timeFormat}
          onWakeHour={setWakeHour}
          onSleepHour={setSleepHour}
          onTimeFormat={setTimeFormat}
        />
      </div>

      <main>
        <OverlapSummary model={model} mode={state.mode} timeFormat={state.timeFormat} />
        <DesktopGrid
          model={model}
          timeFormat={state.timeFormat}
          nowHour={nowHour}
          onPromote={promoteCity}
          onRemove={removeCity}
        />
        <MobileGrid
          model={model}
          timeFormat={state.timeFormat}
          nowHour={nowHour}
          onPromote={promoteCity}
          onRemove={removeCity}
        />
      </main>

      <footer className="footer">
        <span className="legend">
          <span className="legend__swatch legend__swatch--overlap" aria-hidden="true" />
          {state.mode === 'meeting'
            ? 'Green cells = everyone awake'
            : 'Green cells = awake together with the reference'}
        </span>
        <span className="legend">
          <span className="legend__swatch legend__swatch--awake" aria-hidden="true" />
          awake
        </span>
        <span className="legend">
          <span className="legend__swatch legend__swatch--sleep" aria-hidden="true" />
          sleeping
        </span>
      </footer>
    </div>
  );
}
