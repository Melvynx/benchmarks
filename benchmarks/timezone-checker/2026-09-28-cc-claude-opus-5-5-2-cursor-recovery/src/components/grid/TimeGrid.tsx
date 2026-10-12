import { Globe2, RotateCcw } from "lucide-react";
import { DesktopGrid } from "@/components/grid/DesktopGrid";
import { MobileGrid } from "@/components/grid/MobileGrid";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { PlannerView } from "@/hooks/usePlannerView";
import { usePlanner } from "@/state/store";

export const DESKTOP_QUERY = "(min-width: 768px)";

/** Desktop and mobile are two distinct layouts, not one grid reflowed by CSS. */
export function TimeGrid({ view }: { view: PlannerView }) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  return (
    <section aria-label="Time zone grid" className="rounded-2xl border border-line bg-surface p-3 shadow-card sm:p-5">
      {view.cities.length === 0 ? <EmptyState /> : isDesktop ? <DesktopGrid view={view} /> : <MobileGrid view={view} />}
    </section>
  );
}

function EmptyState() {
  const restoreDefaultCities = usePlanner((state) => state.restoreDefaultCities);
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-ink-2">
        <Globe2 aria-hidden className="size-6" />
      </span>
      <h2 className="mt-4 font-semibold text-ink">No cities yet</h2>
      <p className="mt-1 max-w-xs text-sm text-ink-2">Search for a city above — the first one you add becomes the reference.</p>
      <button
        type="button"
        onClick={restoreDefaultCities}
        className="mt-5 inline-flex h-9 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
      >
        <RotateCcw aria-hidden className="size-4" />
        Restore San Francisco, Denpasar, Geneva
      </button>
    </div>
  );
}
