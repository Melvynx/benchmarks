"use client";

import { useIsClient } from "@/hooks/use-is-client";
import { CARD } from "./styles";
import { OverlapDashboard } from "./overlap-dashboard";

export function TimezoneOverlapApp() {
  const isClient = useIsClient();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-10 pb-16 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl dark:text-stone-50">
          Claude Haiku 5.5
        </h1>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          Find when your cities are awake at the same time.
        </p>
      </header>

      {isClient ? <OverlapDashboard /> : <DashboardSkeleton />}
    </div>
  );
}

/** Same footprint as the dashboard so the page doesn't jump on hydration. */
function DashboardSkeleton() {
  return (
    <div aria-hidden className="flex animate-pulse flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="h-10 w-56 rounded-xl bg-stone-200 dark:bg-stone-800" />
        <div className="h-10 flex-1 rounded-xl bg-stone-200 dark:bg-stone-800" />
      </div>
      <div className={`${CARD} h-72`} />
    </div>
  );
}
