"use client";

import { useMemo } from "react";
import { getCityById } from "@/lib/cities";
import { useTimezoneStore } from "@/hooks/useTimezoneStore";
import { ModeToggle } from "@/components/ModeToggle";
import { Settings } from "@/components/Settings";
import { CitySelector } from "@/components/CitySelector";
import { OverlapSummary } from "@/components/OverlapSummary";
import { TimezoneGrid } from "@/components/TimezoneGrid";

export default function Home() {
  const store = useTimezoneStore();

  const cities = useMemo(
    () => store.cityIds.map(getCityById).filter((c): c is NonNullable<typeof c> => c !== undefined),
    [store.cityIds]
  );

  if (!store.hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
      </div>
    );
  }

  const use12h = store.timeFormat === "12h";

  return (
    <div className="mx-auto min-h-screen max-w-[1400px] px-4 py-6 md:px-6 md:py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">
          Claude Opus 4.6
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Find the best meeting times across timezones
        </p>
      </div>

      {/* Controls bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 md:gap-4">
        <ModeToggle mode={store.mode} onChange={store.setMode} />
        <div className="hidden h-5 w-px bg-zinc-200 md:block" />
        <Settings
          wakeHour={store.wakeHour}
          sleepHour={store.sleepHour}
          timeFormat={store.timeFormat}
          onWakeChange={store.setWakeHour}
          onSleepChange={store.setSleepHour}
          onFormatChange={store.setTimeFormat}
        />
        <div className="ml-auto">
          <CitySelector selectedIds={store.cityIds} onAdd={store.addCity} />
        </div>
      </div>

      {/* Overlap summary */}
      <div className="mb-4">
        <OverlapSummary
          cities={cities}
          mode={store.mode}
          wakeHour={store.wakeHour}
          sleepHour={store.sleepHour}
          use12h={use12h}
        />
      </div>

      {/* Grid */}
      <TimezoneGrid
        cities={cities}
        mode={store.mode}
        wakeHour={store.wakeHour}
        sleepHour={store.sleepHour}
        use12h={use12h}
        onPromote={store.promoteToReference}
        onRemove={store.removeCity}
      />

      {/* Footer hint */}
      <div className="mt-6 text-center text-xs text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-200" />
          Green cells = everyone awake
        </span>
        <span className="mx-3">·</span>
        <span>Click a city name to set it as reference</span>
      </div>
    </div>
  );
}
