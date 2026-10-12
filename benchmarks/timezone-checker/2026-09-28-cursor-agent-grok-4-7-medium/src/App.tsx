import { useEffect, useMemo, useState } from 'react';
import { CitySearch } from './components/CitySearch';
import { DesktopGrid } from './components/DesktopGrid';
import { MobileGrid } from './components/MobileGrid';
import { OverlapSummary } from './components/OverlapSummary';
import { SettingsPanel } from './components/SettingsPanel';
import { CITY_BY_ID } from './data/cities';
import { useMediaQuery, useNow } from './hooks';
import { formatZoneDate } from './lib/format';
import { buildSchedule } from './lib/schedule';
import { loadState, saveState } from './lib/storage';
import { getZonedParts } from './lib/time';
import type { AppState, Mode, TimeFormat } from './types';

function clampHour(value: number, fallback: number): number {
  return Number.isInteger(value) && value >= 0 && value <= 23 ? value : fallback;
}

export function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [hoverHour, setHoverHour] = useState<number | null>(null);
  const now = useNow();
  const mobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    document.title = 'Grok 4.7';
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const cities = useMemo(
    () =>
      state.cityIds.flatMap((id) => {
        const city = CITY_BY_ID.get(id);
        return city ? [city] : [];
      }),
    [state.cityIds],
  );

  const schedule = useMemo(
    () =>
      buildSchedule({
        cities,
        wake: state.wake,
        sleep: state.sleep,
        now,
        mode: state.mode,
      }),
    [cities, state.wake, state.sleep, state.mode, now],
  );

  const nowHour = useMemo(
    () => (cities[0] ? getZonedParts(now, cities[0].timeZone).hour : null),
    [cities, now],
  );
  const referenceDateLabel = cities[0] ? formatZoneDate(now, cities[0].timeZone) : '';
  const hint =
    state.mode === 'base' && cities[0]
      ? `Green cells = awake with ${cities[0].city}`
      : 'Green cells = everyone awake';

  function promote(id: string) {
    setState((current) => {
      if (current.cityIds[0] === id || !current.cityIds.includes(id)) return current;
      return { ...current, cityIds: [id, ...current.cityIds.filter((cityId) => cityId !== id)] };
    });
  }

  function addCity(id: string) {
    setState((current) => (current.cityIds.includes(id) ? current : { ...current, cityIds: [...current.cityIds, id] }));
  }

  function removeCity(id: string) {
    setState((current) => ({ ...current, cityIds: current.cityIds.filter((cityId) => cityId !== id) }));
  }

  function setMode(mode: Mode) {
    setState((current) => ({ ...current, mode }));
  }

  function patchSettings(patch: { wake?: number; sleep?: number; format?: TimeFormat }) {
    setState((current) => ({
      ...current,
      format: patch.format ?? current.format,
      wake: patch.wake === undefined ? current.wake : clampHour(patch.wake, current.wake),
      sleep: patch.sleep === undefined ? current.sleep : clampHour(patch.sleep, current.sleep),
    }));
  }

  const gridProps = {
    rows: schedule.rows,
    format: state.format,
    nowHour,
    hoverHour,
    onHover: setHoverHour,
    onPromote: promote,
    onRemove: removeCity,
    referenceDateLabel,
  };

  return (
    <div className="app" data-layout={mobile ? 'mobile' : 'desktop'}>
      <header className="top">
        <h1>Grok 4.7</h1>
        <div className="top-actions">
          <div className="segment" role="group" aria-label="Mode">
            <button type="button" aria-pressed={state.mode === 'meeting'} onClick={() => setMode('meeting')}>
              Meeting
            </button>
            <button type="button" aria-pressed={state.mode === 'base'} onClick={() => setMode('base')}>
              Base
            </button>
          </div>
          <SettingsPanel wake={state.wake} sleep={state.sleep} format={state.format} onChange={patchSettings} />
        </div>
      </header>

      <main className="stack">
        {schedule.rows.length < 2 ? (
          <p className="need-more">Add at least two cities to calculate overlap.</p>
        ) : (
          <OverlapSummary mode={state.mode} format={state.format} rows={schedule.rows} meetingHours={schedule.meetingHours} />
        )}
        <CitySearch cityIds={state.cityIds} onAdd={addCity} />
        {mobile ? <MobileGrid {...gridProps} /> : <DesktopGrid {...gridProps} />}
        <footer className="foot">
          <div className="legend">
            <span>
              <i className="swatch sleep" aria-hidden="true" /> Sleeping
            </span>
            <span>
              <i className="swatch awake" aria-hidden="true" /> Awake
            </span>
            <span>
              <i className="swatch overlap" aria-hidden="true" /> Overlap
            </span>
          </div>
          <p className="hint">{hint}</p>
        </footer>
      </main>
    </div>
  );
}
