import { useState, useCallback } from "react";
import { CitySearch } from "./components/CitySearch";
import { TimezoneCard } from "./components/TimezoneCard";
import { SettingsPanel } from "./components/Settings";
import { useClock } from "./hooks/useClock";
import { useSettings } from "./hooks/useSettings";
import { useSelectedCities } from "./hooks/useSelectedCities";
import type { City } from "./types";

function App() {
  const now = useClock();
  const { settings, setSettings } = useSettings();
  const { selected, primaryId, setPrimaryId, addCity, removeCity, canAdd } = useSelectedCities();
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  const primaryTimezone =
    selected.find((c) => c.id === primaryId)?.timezone ?? selected[0]?.timezone ?? "UTC";

  const handleRemove = useCallback(
    (id: string) => {
      setExitingIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        removeCity(id);
        setExitingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 200);
    },
    [removeCity]
  );

  const handleAdd = useCallback(
    (city: City) => {
      addCity(city);
    },
    [addCity]
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-surface/80 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white leading-tight truncate">Claude Opus 4.6</h1>
              <p className="text-xs text-slate-500 leading-tight hidden sm:block">Timezone Overlap Checker</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-surface-card border border-border rounded-lg px-2.5 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
              {selected.length}/5 zones
            </div>
            <SettingsPanel settings={settings} onChange={setSettings} />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        <div className="flex justify-center">
          <CitySearch onSelect={handleAdd} selected={selected} canAdd={canAdd} />
        </div>

        {selected.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-card border border-border flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-slate-400 text-sm">Search for a city to get started</p>
            <p className="text-slate-600 text-xs mt-1">Add up to 5 timezones to compare</p>
          </div>
        ) : (
          <div className="flex gap-4 md:flex-row flex-col md:overflow-x-auto md:pb-4 md:snap-x md:snap-mandatory items-stretch">
            {selected.map((city) => (
              <TimezoneCard
                key={city.id}
                city={city}
                isPrimary={city.id === primaryId}
                primaryTimezone={primaryTimezone}
                settings={settings}
                now={now}
                onSetPrimary={() => setPrimaryId(city.id)}
                onRemove={() => handleRemove(city.id)}
                exiting={exitingIds.has(city.id)}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border/30 py-4">
        <p className="text-center text-xs text-slate-600">
          Click a card to set it as primary &middot; Green band = overlapping working hours
        </p>
      </footer>
    </div>
  );
}

export default App;
