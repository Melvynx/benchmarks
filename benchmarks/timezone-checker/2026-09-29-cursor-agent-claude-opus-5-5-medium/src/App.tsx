import { useMemo } from "react";
import { CityPicker } from "./components/CityPicker";
import { ControlsPanel } from "./components/ControlsPanel";
import { DesktopGrid } from "./components/grid/DesktopGrid";
import { MobileGrid } from "./components/grid/MobileGrid";
import { Legend } from "./components/Legend";
import { OverlapSummary } from "./components/OverlapSummary";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useNow } from "./hooks/useNow";
import { buildGrid } from "./lib/grid";
import { useAppState } from "./state/useAppState";

export default function App() {
  const { state, cities, addCity, removeCity, promoteCity, setMode, updateSettings, reset } = useAppState();
  const { mode, settings } = state;
  const now = useNow();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const grid = useMemo(() => buildGrid(cities, settings, mode, now), [cities, settings, mode, now]);
  const reference = grid.rows[0];
  const GridView = isDesktop ? DesktopGrid : MobileGrid;

  return (
    <div className="app">
      <header className="masthead">
        <h1 className="masthead__title">Claude Opus 5.5</h1>
        <p className="masthead__tagline">Find the hours when everyone across timezones is awake.</p>
      </header>

      <main className="stack">
        <ControlsPanel mode={mode} settings={settings} onModeChange={setMode} onSettingsChange={updateSettings} />

        {grid.summary && reference && (
          <OverlapSummary
            summary={grid.summary}
            reference={reference.city}
            refOffset={reference.offset}
            format={settings.timeFormat}
          />
        )}

        <section className="panel board" aria-label="Timezone grid">
          <div className="board__head">
            <div>
              <h2 className="board__title">Cities</h2>
              <p className="board__sub">
                {reference
                  ? `${cities.length} ${cities.length === 1 ? "city" : "cities"} · hours in ${reference.city.name} time`
                  : "Nothing to compare yet"}
              </p>
            </div>
            <CityPicker selectedIds={state.cityIds} now={now} onAdd={addCity} />
          </div>

          {reference ? (
            <GridView
              rows={grid.rows}
              refNowHour={grid.refNowHour}
              format={settings.timeFormat}
              onPromote={promoteCity}
              onRemove={removeCity}
            />
          ) : (
            <div className="empty">
              <p className="empty__title">No cities selected</p>
              <p className="empty__body">Search above to add cities, or restore the defaults.</p>
              <button type="button" className="button" onClick={reset}>
                Restore defaults
              </button>
            </div>
          )}
        </section>

        {reference && <Legend mode={mode} referenceName={reference.city.name} />}
      </main>

      <div className="app__foot">
        <span>Offsets follow today's date, so daylight saving is handled automatically.</span>
        <button type="button" className="link" onClick={reset}>
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
