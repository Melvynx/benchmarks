import { useMemo, useState } from "react";
import { CityPicker } from "./components/CityPicker";
import { ModeToggle } from "./components/ModeToggle";
import { OverlapSummary } from "./components/OverlapSummary";
import { SettingsPanel } from "./components/SettingsPanel";
import { TimeGridDesktop, TimeGridMobile } from "./components/TimeGrid";
import { useAppState } from "./hooks/useAppState";

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const {
    persisted,
    cities,
    refCity,
    grid,
    catalog,
    setMode,
    setWakeHour,
    setSleepHour,
    setUse12h,
    addCity,
    removeCity,
    promoteToReference,
  } = useAppState();

  const selectedIds = useMemo(
    () => new Set(persisted.cityIds),
    [persisted.cityIds],
  );

  const ref = refCity;
  if (!ref || !grid) return null;

  const canRemove = cities.length > 1;

  return (
    <div className="mx-auto min-h-dvh max-w-[120rem] px-4 pb-10 pt-6 md:px-8">
      <header className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Composer
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            Find when your distributed team is awake together, or compare each
            location against your base city. Grid uses{" "}
            <span className="text-slate-300">{grid.refDateLabel}</span> in the
            reference timezone (DST-aware).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ModeToggle mode={persisted.mode} onChange={setMode} />
          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            className="rounded-lg border border-white/15 bg-surface-2 px-3 py-1.5 text-sm font-medium text-slate-200 hover:border-emerald-500/40 hover:text-white"
          >
            Settings
          </button>
        </div>
      </header>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        wakeHour={persisted.wakeHour}
        sleepHour={persisted.sleepHour}
        use12h={persisted.use12h}
        onWake={setWakeHour}
        onSleep={setSleepHour}
        onUse12h={setUse12h}
      />

      <section className="mt-6 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <CityPicker
            catalog={catalog}
            selectedIds={selectedIds}
            onAdd={addCity}
          />
        </div>

        <OverlapSummary
          mode={persisted.mode}
          cities={cities}
          refCity={ref}
          meetingOverlapHours={grid.meetingOverlapHours}
          baseOverlapByCityId={grid.baseOverlapByCityId}
          use12h={persisted.use12h}
        />

        <TimeGridDesktop
          cities={cities}
          refCity={ref}
          columns={grid.columns}
          use12h={persisted.use12h}
          onPromote={promoteToReference}
          onRemove={removeCity}
          canRemove={canRemove}
        />
        <TimeGridMobile
          cities={cities}
          refCity={ref}
          columns={grid.columns}
          use12h={persisted.use12h}
          onPromote={promoteToReference}
          onRemove={removeCity}
          canRemove={canRemove}
        />
      </section>

      <footer className="mt-8 text-center text-xs text-slate-500">
        Green cells = everyone awake
        {persisted.mode === "meeting" ? " at the same reference hour" : ""}
        {persisted.mode === "base"
          ? " between base and that city’s local time"
          : ""}
        . Click a city name to make it the reference (
        <span className="font-mono text-emerald-500/80">REF</span>
        ).
      </footer>
    </div>
  );
}
