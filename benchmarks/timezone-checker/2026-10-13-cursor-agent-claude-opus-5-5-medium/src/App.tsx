import styles from "./App.module.css";
import { CityPicker } from "./components/CityPicker";
import { DesktopGrid } from "./components/grid/DesktopGrid";
import { MobileGrid } from "./components/grid/MobileGrid";
import { GlobeIcon } from "./components/icons";
import { Legend } from "./components/Legend";
import { ModeToggle } from "./components/ModeToggle";
import { OverlapSummary } from "./components/OverlapSummary";
import { SettingsPanel } from "./components/SettingsPanel";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useNow } from "./hooks/useNow";
import { useAppState } from "./state/useAppState";
import { useScheduleView } from "./state/useScheduleView";

export function App() {
  const { state, actions } = useAppState();
  const now = useNow();
  const view = useScheduleView(state, now);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const { mode, settings, cityIds } = state;
  const referenceName = view.reference?.name ?? null;
  const Grid = isDesktop ? DesktopGrid : MobileGrid;
  const hint =
    mode === "meeting" ? "Green cells = everyone awake" : `Green cells = awake at the same time as ${referenceName}`;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.logo} aria-hidden="true">
          <GlobeIcon size={20} />
        </div>
        <div>
          <h1 className={styles.title}>Claude Opus 5.5</h1>
          <p className={styles.tagline}>Find the hours when everyone across your timezones is awake.</p>
        </div>
      </header>

      <div className={styles.controls}>
        <ModeToggle mode={mode} referenceName={referenceName} onChange={actions.setMode} />
        <SettingsPanel settings={settings} onChange={actions.updateSettings} />
      </div>

      <OverlapSummary view={view} mode={mode} />

      <section className={styles.board} aria-labelledby="cities-heading">
        <div className={styles.boardHeader}>
          <div>
            <h2 id="cities-heading" className={styles.boardTitle}>
              Cities <span className={styles.count}>{cityIds.length}</span>
            </h2>
            <p className={styles.boardHint}>
              {cityIds.length > 1
                ? "Click a city name to make it the reference."
                : "Add another city to compare availability."}
            </p>
          </div>
          <CityPicker selectedIds={cityIds} onSelect={actions.addCity} />
        </div>

        {view.rows.length > 0 ? (
          <Grid
            view={view}
            timeFormat={settings.timeFormat}
            onPromote={actions.promoteCity}
            onRemove={actions.removeCity}
          />
        ) : (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No cities yet</p>
            <p>Add a city to start comparing hours, or restore the default trio.</p>
            <button type="button" className={styles.linkButton} onClick={actions.reset}>
              Restore defaults
            </button>
          </div>
        )}

        <footer className={styles.boardFooter}>
          <Legend />
          {view.canCompare && <p className={styles.hint}>{hint}</p>}
        </footer>
      </section>

      <footer className={styles.pageFooter}>
        <span>Offsets reflect today's date, so daylight saving time is handled automatically.</span>
        <button type="button" className={styles.linkButton} onClick={actions.reset}>
          Reset to defaults
        </button>
      </footer>
    </div>
  );
}
