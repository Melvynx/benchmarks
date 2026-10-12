import { useEffect, useMemo, useState } from "react";
import { CITY_BY_ID, type City } from "./lib/cities";
import { loadState, saveState } from "./lib/storage";
import { analyze, type Mode, type Settings } from "./lib/time";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { ModeToggle } from "./components/ModeToggle";
import { SettingsPanel } from "./components/SettingsPanel";
import { CityPicker } from "./components/CityPicker";
import { OverlapSummary } from "./components/OverlapSummary";
import { DesktopGrid } from "./components/DesktopGrid";
import { MobileGrid } from "./components/MobileGrid";

export function App() {
  const [state, setState] = useState(loadState);
  const { cityIds, settings, mode } = state;
  const isDesktop = useMediaQuery("(min-width: 768px)");

  useEffect(() => saveState(state), [state]);

  const cities = useMemo(
    () => cityIds.map((id) => CITY_BY_ID.get(id)).filter((c): c is City => !!c),
    [cityIds],
  );
  const analysis = useMemo(() => analyze(cities, mode, settings, new Date()), [cities, mode, settings]);

  const setMode = (m: Mode) => setState((s) => ({ ...s, mode: m }));
  const setSettings = (settings: Settings) => setState((s) => ({ ...s, settings }));
  const addCity = (id: string) =>
    setState((s) => (s.cityIds.includes(id) ? s : { ...s, cityIds: [...s.cityIds, id] }));
  const removeCity = (id: string) =>
    setState((s) => ({ ...s, cityIds: s.cityIds.filter((x) => x !== id) }));
  const promote = (id: string) =>
    setState((s) => ({ ...s, cityIds: [id, ...s.cityIds.filter((x) => x !== id)] }));

  const gridProps = { analysis, settings, onPromote: promote, onRemove: removeCity };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1 className="title">Claude Sonnet 5.5</h1>
          <p className="subtitle">Find the hours when your timezones line up.</p>
        </div>
        <ModeToggle mode={mode} onChange={setMode} />
      </header>

      <SettingsPanel settings={settings} onChange={setSettings} />

      <section className="card">
        <div className="card-head">
          <h2 className="section-title">Cities</h2>
          <CityPicker selected={cityIds} onAdd={addCity} />
        </div>

        {cities.length >= 2 && <OverlapSummary analysis={analysis} mode={mode} format={settings.format} />}

        {cities.length === 0 ? (
          <p className="empty">Add a city to get started.</p>
        ) : isDesktop ? (
          <DesktopGrid {...gridProps} />
        ) : (
          <MobileGrid {...gridProps} />
        )}

        <p className="hint">
          <span className="swatch" /> Green cells = everyone awake
          {mode === "base" && " (per city, against the reference)"}
        </p>
      </section>
    </div>
  );
}
