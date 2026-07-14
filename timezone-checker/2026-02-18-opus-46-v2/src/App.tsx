import { useState, useCallback } from 'react';
import type { City, TimezoneRow, Settings } from './types';
import { cities } from './data/cities';
import { getUserTimezone } from './utils/timezone';
import { useLocalStorage } from './hooks/useLocalStorage';
import { CitySearch } from './components/CitySearch';
import { TimezoneGrid } from './components/TimezoneGrid';
import { SettingsPanel } from './components/SettingsPanel';

function findCityByTimezone(tz: string): City {
  return cities.find((c) => c.timezone === tz) || cities[0];
}

function createRow(city: City, isPrimary: boolean): TimezoneRow {
  return { id: `${city.name}-${city.timezone}-${Date.now()}-${Math.random()}`, city, isPrimary };
}

const defaultSettings: Settings = {
  timeFormat: '24h',
  workStart: 9,
  workEnd: 18,
  wakeStart: 7,
  wakeEnd: 9,
};

function getInitialRows(): TimezoneRow[] {
  const userTz = getUserTimezone();
  const userCity = findCityByTimezone(userTz);
  const secondCity =
    userTz === 'Asia/Tokyo'
      ? findCityByTimezone('America/New_York')
      : findCityByTimezone('Asia/Tokyo');
  return [createRow(userCity, true), createRow(secondCity, false)];
}

export default function App() {
  const [settings, setSettings] = useLocalStorage<Settings>('tz-settings', defaultSettings);
  const [rows, setRows] = useLocalStorage<TimezoneRow[]>('tz-rows', getInitialRows());
  const [settingsOpen, setSettingsOpen] = useState(false);

  const addCity = useCallback(
    (city: City) => {
      if (rows.length >= 5) return;
      const alreadyExists = rows.some(
        (r) => r.city.name === city.name && r.city.timezone === city.timezone
      );
      if (alreadyExists) return;
      setRows((prev) => [...prev, createRow(city, prev.length === 0)]);
    },
    [rows, setRows]
  );

  const removeRow = useCallback(
    (id: string) => {
      if (rows.length <= 2) return;
      setRows((prev) => {
        const next = prev.filter((r) => r.id !== id);
        if (!next.some((r) => r.isPrimary) && next.length > 0) {
          next[0].isPrimary = true;
        }
        return next;
      });
    },
    [rows.length, setRows]
  );

  const setPrimary = useCallback(
    (id: string) => {
      setRows((prev) =>
        prev.map((r) => ({ ...r, isPrimary: r.id === id }))
      );
    },
    [setRows]
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>Claude Opus 4.6</h1>
          <p className="subtitle">Timezone Overlap Checker</p>
        </div>
        <div className="header-right">
          <CitySearch onSelect={addCity} disabled={rows.length >= 5} />
          <button
            className="settings-btn"
            onClick={() => setSettingsOpen(true)}
            title="Settings"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </header>

      <main className="app-main">
        <TimezoneGrid
          rows={rows}
          settings={settings}
          onRemove={removeRow}
          onSetPrimary={setPrimary}
        />
      </main>

      <SettingsPanel
        settings={settings}
        onUpdate={setSettings}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
