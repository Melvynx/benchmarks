import { useMemo } from "react";
import { CitySearch } from "./components/CitySearch";
import { DesktopGrid } from "./components/DesktopGrid";
import { MobileGrid } from "./components/MobileGrid";
import { ModeToggle } from "./components/ModeToggle";
import { OverlapSummary } from "./components/OverlapSummary";
import { SettingsPanel } from "./components/SettingsPanel";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useNow } from "./hooks/useNow";
import { compute } from "./lib/overlap";
import { currentHourInZone } from "./lib/timezone";
import { useAppState } from "./store";

export default function App() {
  const {
    state,
    cities,
    addCity,
    removeCity,
    setReference,
    setMode,
    setWake,
    setSleep,
    setTimeFormat,
  } = useAppState();

  const now = useNow();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const computation = useMemo(
    () => compute(cities, now, { wake: state.wake, sleep: state.sleep, mode: state.mode }),
    [cities, now, state.wake, state.sleep, state.mode],
  );

  const referenceCity = cities[0];
  const nowRefHour = referenceCity ? currentHourInZone(referenceCity.timezone, now) : 0;
  const canRemove = cities.length > 1;
  const showSummary = cities.length >= 2;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <div className="logo" aria-hidden="true">
            <span className="logo__dot" />
          </div>
          <div>
            <h1 className="topbar__title">Claude Opus 4.8</h1>
            <p className="topbar__tagline">Timezone overlap checker for distributed teams</p>
          </div>
        </div>
        <ModeToggle mode={state.mode} onChange={setMode} />
      </header>

      <SettingsPanel
        wake={state.wake}
        sleep={state.sleep}
        timeFormat={state.timeFormat}
        onWake={setWake}
        onSleep={setSleep}
        onTimeFormat={setTimeFormat}
      />

      <CitySearch selectedIds={state.cityIds} onAdd={addCity} />

      {showSummary && (
        <OverlapSummary
          computation={computation}
          mode={state.mode}
          timeFormat={state.timeFormat}
          referenceName={referenceCity.name}
        />
      )}

      <main className="grid-card">
        {cities.length === 0 ? (
          <div className="empty-state">Add a city to get started.</div>
        ) : isDesktop ? (
          <DesktopGrid
            cities={computation.cities}
            timeFormat={state.timeFormat}
            nowRefHour={nowRefHour}
            canRemove={canRemove}
            onPromote={setReference}
            onRemove={removeCity}
          />
        ) : (
          <MobileGrid
            cities={computation.cities}
            timeFormat={state.timeFormat}
            nowRefHour={nowRefHour}
            canRemove={canRemove}
            onPromote={setReference}
            onRemove={removeCity}
          />
        )}
      </main>

      <footer className="legend">
        <span className="legend__item">
          <span className="swatch swatch--overlap" /> Green cells = everyone awake
        </span>
        <span className="legend__item">
          <span className="swatch swatch--awake" /> Awake, no overlap
        </span>
        <span className="legend__item">
          <span className="swatch swatch--sleep" /> Sleeping
        </span>
        {referenceCity && (
          <span className="legend__hint">
            Hours anchored to {referenceCity.name} · click a city name to make it the reference
          </span>
        )}
      </footer>
    </div>
  );
}
