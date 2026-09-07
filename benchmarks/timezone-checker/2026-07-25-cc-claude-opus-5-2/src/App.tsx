import { useMemo } from "react";
import { AddCity } from "./components/AddCity";
import { EmptyState } from "./components/EmptyState";
import { Legend } from "./components/Legend";
import { ModeSwitch } from "./components/ModeSwitch";
import { OverlapSummary } from "./components/OverlapSummary";
import { SettingsPanel } from "./components/SettingsPanel";
import { DesktopGrid } from "./components/grid/DesktopGrid";
import { MobileGrid } from "./components/grid/MobileGrid";
import { useIsDesktop } from "./hooks/useMediaQuery";
import { useNow } from "./hooks/useNow";
import { formatTimeOfDay } from "./lib/format";
import { buildSchedule } from "./lib/schedule";
import { useAppState } from "./state/useAppState";

const MODEL_NAME = "Claude Opus 5";

export default function App() {
  const { state, cities, actions } = useAppState();
  const now = useNow();
  const isDesktop = useIsDesktop();

  const schedule = useMemo(
    () =>
      buildSchedule({
        cities,
        wake: state.wake,
        sleep: state.sleep,
        mode: state.mode,
        now,
      }),
    [cities, state.wake, state.sleep, state.mode, now],
  );

  const reference = schedule.rows[0];

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[1280px] flex-col gap-5 px-4 py-8 md:gap-6 md:px-8 md:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] leading-none font-semibold tracking-[-0.02em] text-ink md:text-[32px]">
            {MODEL_NAME}
          </h1>
          <p className="mt-2 text-[12.5px] text-mute">
            Find the hours everyone is awake, across every timezone on your team.
          </p>
        </div>

        {reference && (
          <div className="text-right">
            <div className="tnum text-[19px] leading-none font-medium text-ink md:text-[22px]">
              {formatTimeOfDay(reference.now.hour, reference.now.minute, state.format)}
            </div>
            <div className="mt-1.5 text-[11px] text-faint">
              {reference.city.name} · {schedule.referenceDayLabel}
            </div>
          </div>
        )}
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ModeSwitch mode={state.mode} onChange={actions.setMode} />
        <div className="flex items-center gap-2">
          <SettingsPanel
            wake={state.wake}
            sleep={state.sleep}
            format={state.format}
            onWake={actions.setWake}
            onSleep={actions.setSleep}
            onFormat={actions.setFormat}
            onReset={actions.reset}
          />
          <AddCity selectedIds={state.cityIds} now={now} onAdd={actions.addCity} />
        </div>
      </div>

      <OverlapSummary schedule={schedule} mode={state.mode} format={state.format} />

      {cities.length === 0 ? (
        <EmptyState />
      ) : isDesktop ? (
        <DesktopGrid
          schedule={schedule}
          format={state.format}
          onPromote={actions.promoteCity}
          onRemove={actions.removeCity}
        />
      ) : (
        <MobileGrid
          schedule={schedule}
          format={state.format}
          onPromote={actions.promoteCity}
          onRemove={actions.removeCity}
        />
      )}

      {cities.length > 0 && (
        <Legend mode={state.mode} referenceName={reference?.city.name ?? null} />
      )}
    </div>
  );
}
