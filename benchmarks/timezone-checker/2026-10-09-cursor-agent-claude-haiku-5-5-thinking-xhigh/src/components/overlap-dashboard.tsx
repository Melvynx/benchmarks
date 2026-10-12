"use client";

import { Globe, House, Settings2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useNow } from "@/hooks/use-now";
import { buildBoard } from "@/lib/board";
import { CITIES, getCityById, type City } from "@/lib/cities";
import type { Mode } from "@/lib/app-state";
import { cx } from "@/lib/cx";
import { appActions, useAppState } from "@/lib/store";
import { formatClock } from "@/lib/time";
import { CityPicker } from "./city-picker";
import { DesktopGrid } from "./desktop-grid";
import { MobileGrid } from "./mobile-grid";
import { OverlapSummary } from "./overlap-summary";
import { SegmentedControl, type SegmentOption } from "./segmented-control";
import { SettingsPanel } from "./settings-panel";
import { CARD, FOCUS_RING } from "./styles";

const MODE_OPTIONS: readonly SegmentOption<Mode>[] = [
  { value: "meeting", label: "Meeting", icon: <Users className="size-4" aria-hidden /> },
  { value: "base", label: "Base", icon: <House className="size-4" aria-hidden /> },
];

export function OverlapDashboard() {
  const state = useAppState();
  const now = useNow();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { cityIds, mode, settings } = state;

  const cities = useMemo(
    () => cityIds.map(getCityById).filter((city): city is City => city !== undefined),
    [cityIds],
  );
  const available = useMemo(
    () => CITIES.filter((city) => !cityIds.includes(city.id)),
    [cityIds],
  );
  const board = useMemo(
    () => buildBoard({ cities, mode, window: settings, now }),
    [cities, mode, settings, now],
  );

  const referenceName = cities[0]?.name;
  const hasCities = board.rows.length > 0;
  const windowLabel = `${formatClock(settings.wakeHour * 60, settings.timeFormat)} – ${formatClock(settings.sleepHour * 60, settings.timeFormat)}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SegmentedControl
            label="Mode"
            value={mode}
            options={MODE_OPTIONS}
            onChange={appActions.setMode}
          />

          <div className="flex min-w-0 flex-1 gap-3">
            <CityPicker available={available} now={now} onSelect={appActions.addCity} />

            <button
              type="button"
              aria-expanded={settingsOpen}
              aria-controls="awake-settings"
              onClick={() => setSettingsOpen((open) => !open)}
              className={cx(
                "inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-medium tabular-nums transition",
                FOCUS_RING,
                settingsOpen
                  ? "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
                  : "border-stone-300 bg-white text-stone-700 hover:border-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-stone-600",
              )}
            >
              <Settings2 className="size-4" aria-hidden />
              <span className="hidden sm:inline">Awake</span>
              <span>{windowLabel}</span>
            </button>
          </div>
        </div>

        <p className="text-sm text-stone-500 dark:text-stone-400">
          {mode === "meeting"
            ? "Only hours when every city is awake."
            : referenceName
              ? `Each city compared only against ${referenceName}.`
              : "Each city compared only against the reference."}
        </p>
      </div>

      {settingsOpen && (
        <div id="awake-settings">
          <SettingsPanel settings={settings} onChange={appActions.updateSettings} />
        </div>
      )}

      {hasCities && <OverlapSummary board={board} timeFormat={settings.timeFormat} />}

      <section className={cx(CARD, "overflow-hidden")}>
        {hasCities ? (
          <>
            <div className="hidden p-5 md:block">
              <DesktopGrid
                board={board}
                timeFormat={settings.timeFormat}
                onPromote={appActions.promoteCity}
                onRemove={appActions.removeCity}
              />
            </div>
            <div className="p-3 md:hidden">
              <MobileGrid
                board={board}
                timeFormat={settings.timeFormat}
                onPromote={appActions.promoteCity}
                onRemove={appActions.removeCity}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Globe className="size-8 text-stone-400" aria-hidden />
            <p className="font-medium text-stone-800 dark:text-stone-200">No cities yet</p>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Add one above. The first city in the list is your reference.
            </p>
          </div>
        )}
      </section>

      {hasCities && (
        <footer className="flex flex-col items-center gap-3 pt-1 text-center text-sm text-stone-500 dark:text-stone-400">
          <p>
            {mode === "meeting"
              ? "Green cells = everyone awake"
              : `Green cells = awake at the same time as ${referenceName}`}
          </p>
          <div className="flex items-center gap-4 text-xs">
            <LegendItem swatch="bg-emerald-500" label="Overlap" />
            <LegendItem swatch="bg-stone-100 ring-1 ring-inset ring-stone-300 dark:bg-stone-800 dark:ring-stone-700" label="Awake" />
            <LegendItem swatch="sleep-hatch ring-1 ring-inset ring-stone-300 dark:ring-stone-700" label="Asleep" />
          </div>
        </footer>
      )}
    </div>
  );
}

function LegendItem({ swatch, label }: { readonly swatch: string; readonly label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cx("size-3 rounded-sm", swatch)} />
      {label}
    </span>
  );
}
