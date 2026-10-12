import { useMemo } from "react";
import { AvailabilitySettings } from "./components/AvailabilitySettings";
import { CityPicker } from "./components/CityPicker";
import { DesktopGrid } from "./components/DesktopGrid";
import { Legend } from "./components/Legend";
import { MobileGrid } from "./components/MobileGrid";
import { ModeToggle } from "./components/ModeToggle";
import { OverlapSummary } from "./components/OverlapSummary";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useNow } from "./hooks/useNow";
import { CITY_BY_ID, type City } from "./lib/cities";
import { computeSchedule } from "./lib/schedule";
import { useAppState } from "./state/useAppState";
import styles from "./App.module.css";

export function App() {
  const [state, dispatch] = useAppState();
  const now = useNow();
  const isMobile = useMediaQuery("(max-width: 767.98px)");
  const { cityIds, mode, settings } = state;

  const cities = useMemo(
    () => cityIds.map((id) => CITY_BY_ID.get(id)).filter((city): city is City => Boolean(city)),
    [cityIds],
  );
  const schedule = useMemo(
    () => computeSchedule({ cities, mode, availability: settings, now }),
    [cities, mode, settings, now],
  );

  const gridProps = {
    schedule,
    format: settings.timeFormat,
    onPromote: (id: string) => dispatch({ type: "city/promote", id }),
    onRemove: (id: string) => dispatch({ type: "city/remove", id }),
  };

  return (
    <div className={styles.shell}>
      <header className={styles.masthead}>
        <span className={styles.logo} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <div>
          <h1 className={styles.title}>Claude Opus 5.5</h1>
          <p className={styles.tagline}>Timezone overlap checker</p>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.controls} aria-label="Settings">
          <ModeToggle
            mode={mode}
            referenceName={schedule.reference?.city.name}
            onChange={(next) => dispatch({ type: "mode/set", mode: next })}
          />
          <AvailabilitySettings
            settings={settings}
            onChange={(patch) => dispatch({ type: "settings/update", patch })}
            onReset={() => dispatch({ type: "reset" })}
          />
        </section>

        <section className={styles.board} aria-label="Cities">
          <div className={styles.boardHead}>
            <div>
              <h2 className={styles.boardTitle}>Cities</h2>
              <p className={styles.boardHint}>
                {cities.length === 0
                  ? "Add a city to get started."
                  : "Click a city name to make it the reference."}
              </p>
            </div>
            <CityPicker selectedIds={cityIds} now={now} onAdd={(id) => dispatch({ type: "city/add", id })} />
          </div>

          <OverlapSummary schedule={schedule} format={settings.timeFormat} />

          {cities.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>No cities yet</p>
              <p>Search for a city above to start comparing timezones.</p>
            </div>
          ) : isMobile ? (
            <MobileGrid {...gridProps} />
          ) : (
            <DesktopGrid {...gridProps} />
          )}

          <footer className={styles.boardFoot}>
            <Legend />
            <p className={styles.hint}>
              {mode === "meeting" || !schedule.reference
                ? "Green cells = everyone awake"
                : `Green cells = awake at the same time as ${schedule.reference.city.name}`}
            </p>
          </footer>
        </section>
      </main>
    </div>
  );
}
