import { useMemo } from "react";
import { cityById } from "./lib/cities";
import { compute, utcOffsetMinutes } from "./lib/time";
import { useMediaQuery, useStore } from "./lib/useStore";
import { AddCity } from "./components/AddCity";
import { DesktopGrid } from "./components/DesktopGrid";
import { MobileGrid } from "./components/MobileGrid";
import { ModeToggle } from "./components/ModeToggle";
import { OverlapSummary } from "./components/OverlapSummary";
import { SettingsPanel } from "./components/SettingsPanel";
import type { GridCity } from "./components/types";

export function App() {
  const store = useStore();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { cityIds, settings, mode } = store;

  const cities: GridCity[] = useMemo(() => {
    const now = new Date();
    return cityIds.flatMap((id) => {
      const city = cityById(id);
      return city ? [{ ...city, offset: utcOffsetMinutes(city.tz, now) }] : [];
    });
  }, [cityIds]);

  const result = useMemo(() => compute(cities, settings, mode), [cities, settings, mode]);
  const gridProps = {
    cities,
    views: result.views,
    settings,
    onPromote: store.promote,
    onRemove: store.removeCity,
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">Timezone overlap checker</p>
          <h1>Claude Sonnet 5</h1>
        </div>
        <ModeToggle mode={mode} onChange={store.setMode} />
      </header>

      <p className="mode-desc">
        {mode === "meeting"
          ? "Meeting mode: hours when everyone is awake at the same time."
          : "Base mode: overlap between the reference city and each other city, individually."}
      </p>

      <SettingsPanel settings={settings} onWake={store.setWake} onSleep={store.setSleep} onFormat={store.setFormat} />

      <section className="card">
        <div className="card-head">
          <h2>Cities</h2>
          <AddCity selected={cityIds} onAdd={store.addCity} />
        </div>

        {cities.length >= 2 && (
          <OverlapSummary cities={cities} result={result} mode={mode} format={settings.format} />
        )}

        {cities.length === 0 ? (
          <p className="empty">Add a city to get started.</p>
        ) : isDesktop ? (
          <DesktopGrid {...gridProps} />
        ) : (
          <MobileGrid {...gridProps} />
        )}

        <p className="hint">
          <span className="swatch" /> Green cells = everyone awake
        </p>
      </section>
    </div>
  );
}
