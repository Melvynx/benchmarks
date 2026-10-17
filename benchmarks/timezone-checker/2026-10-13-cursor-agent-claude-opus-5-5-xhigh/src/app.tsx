import { Globe2, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { CityPicker } from "@/components/city-picker";
import { DesktopGrid } from "@/components/grid/desktop-grid";
import { MobileGrid } from "@/components/grid/mobile-grid";
import { Legend } from "@/components/legend";
import { ModeSwitch } from "@/components/mode-switch";
import { OverlapSummary } from "@/components/overlap-summary";
import { AwakeWindowSettings, TimeFormatSettings } from "@/components/settings-panel";
import { useCityActions } from "@/hooks/use-city-actions";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useNow } from "@/hooks/use-now";
import { useSchedule } from "@/hooks/use-schedule";
import { cn } from "@/lib/cn";
import { formatClock, formatShortDate, formatWeekday } from "@/lib/format";
import { withViewTransition } from "@/lib/view-transition";
import { usePreferences } from "@/state/preferences";

export function App() {
  const now = useNow();
  const schedule = useSchedule(now);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const cityIds = usePreferences((state) => state.cityIds);
  const mode = usePreferences((state) => state.mode);
  const timeFormat = usePreferences((state) => state.timeFormat);
  const reset = usePreferences((state) => state.reset);
  const { add } = useCityActions();

  const { rows, summary, referenceClock } = schedule;
  const reference = rows[0];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[90rem] flex-col gap-4 px-4 pt-6 pb-10 sm:gap-5 sm:px-6 sm:pt-10 xl:px-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 pb-1">
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-1.5 text-xs font-medium tracking-[0.16em] text-ink-3 uppercase">
            <Globe2 aria-hidden className="size-3.5" />
            Timezone overlap
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-[2.5rem] sm:leading-none">
            Claude Opus 5.5
          </h1>
        </div>
        {reference && referenceClock && (
          <p className="text-sm text-ink-3">
            {formatWeekday(referenceClock.weekday)}, {formatShortDate(referenceClock.month, referenceClock.day)} ·{" "}
            <span className="font-mono text-ink-2 tabular">
              {formatClock(referenceClock.minutesOfDay, timeFormat, true)}
            </span>{" "}
            in {reference.city.name}
          </p>
        )}
      </header>

      <Card className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_auto] md:gap-0 md:divide-x md:divide-line">
        <div className="md:pr-6">
          <ModeSwitch referenceName={reference?.city.name} />
        </div>
        <div className="md:px-6">
          <AwakeWindowSettings />
        </div>
        <div className="md:pl-6">
          <TimeFormatSettings />
        </div>
      </Card>

      <Card aria-label="Overlap summary" className="min-h-[5.5rem] content-center">
        <OverlapSummary rows={rows} summary={summary} format={timeFormat} />
      </Card>

      <Card className="flex flex-col gap-4 px-4 sm:px-5" aria-label="Timezone grid">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="leading-tight">
            <h2 className="font-semibold text-ink">
              Cities <span className="font-mono text-sm font-normal text-ink-3">{rows.length}</span>
            </h2>
            <p className="text-xs text-ink-3">
              {rows.length > 1 ? "Click a city name to make it the reference." : "Pick the cities you work with."}
            </p>
          </div>
          <CityPicker selectedIds={cityIds} now={now} format={timeFormat} onAdd={(city) => add(city.id)} />
        </div>

        {rows.length === 0 ? (
          <EmptyGrid />
        ) : isDesktop ? (
          <DesktopGrid rows={rows} referenceClock={referenceClock} now={now} format={timeFormat} />
        ) : (
          <MobileGrid rows={rows} referenceClock={referenceClock} format={timeFormat} />
        )}
      </Card>

      <footer className="flex flex-col gap-4 px-1">
        <Legend mode={mode} referenceName={reference?.city.name} />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-xs text-ink-3">
          <p>Offsets follow today’s date, so daylight saving is handled automatically. Settings are saved in this browser.</p>
          <button
            type="button"
            onClick={() => withViewTransition(reset)}
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium text-ink-2 transition-colors hover:bg-sleep hover:text-ink"
          >
            <RotateCcw aria-hidden className="size-3.5" />
            Reset to defaults
          </button>
        </div>
      </footer>
    </div>
  );
}

function Card({ className, children, ...props }: { className?: string; children: ReactNode; "aria-label"?: string }) {
  return (
    <section
      {...props}
      className={cn(
        "rounded-[1.25rem] bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_0_0_1px_var(--line)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

function EmptyGrid() {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center">
      <p className="font-medium text-ink">No cities yet</p>
      <p className="text-sm text-ink-3">Search above to add the places your team lives in.</p>
    </div>
  );
}
