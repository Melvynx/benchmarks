import { CircleAlert, Users } from "lucide-react";
import type { PlannerView } from "@/hooks/usePlannerView";
import { cn } from "@/lib/cn";
import { formatHourRange, toRanges } from "@/lib/schedule";
import type { TimeFormat } from "@/lib/time";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export function OverlapSummary({ view }: { view: PlannerView }) {
  const { cities, reference, schedule, mode, settings } = view;

  if (!reference || cities.length < 2) {
    return (
      <section aria-label="Overlap summary" className="flex items-center gap-3 rounded-2xl border border-dashed border-line-strong px-5 py-4 text-sm text-ink-2">
        <Users aria-hidden className="size-4 shrink-0 text-ink-3" />
        {cities.length === 0
          ? "Add at least two cities to find hours that overlap."
          : `Add another city to compare with ${reference?.name ?? "your reference city"}.`}
      </section>
    );
  }

  return (
    <section
      aria-label="Overlap summary"
      aria-live="polite"
      className="rounded-2xl border border-line bg-surface px-5 py-4 shadow-card sm:px-6 sm:py-5"
    >
      {mode === "meeting" ? (
        <MeetingSummary hours={schedule.meetingOverlap} cityCount={cities.length} referenceName={reference.name} format={settings.timeFormat} />
      ) : (
        <BaseSummary view={view} />
      )}
    </section>
  );
}

function MeetingSummary({
  hours,
  cityCount,
  referenceName,
  format,
}: {
  hours: number[];
  cityCount: number;
  referenceName: string;
  format: TimeFormat;
}) {
  const ranges = toRanges(hours);

  if (ranges.length === 0) {
    return (
      <div className="flex gap-3">
        <WarningIcon />
        <div>
          <h2 className="font-semibold text-ink">No hour works for everyone</h2>
          <p className="mt-0.5 text-sm text-ink-2">
            The {cityCount} cities are never awake at the same time. Widen the awake window, remove a city, or switch to Base mode to see
            per-city overlap.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h2 className="flex items-baseline gap-2 text-ink">
          <span className="text-2xl font-semibold tracking-tight tabular-nums">{plural(hours.length, "hour")}</span>
          <span className="text-sm text-ink-2">when all {cityCount} cities are awake</span>
        </h2>
        <p className="mt-0.5 text-xs text-ink-3">Times shown in {referenceName}</p>
      </div>
      <RangeList ranges={ranges} format={format} />
    </div>
  );
}

function BaseSummary({ view }: { view: PlannerView }) {
  const { reference, schedule, settings } = view;
  const others = schedule.rows.slice(1);

  return (
    <div>
      <h2 className="text-sm text-ink-2">
        Overlap with <span className="font-semibold text-ink">{reference?.name}</span>
        <span className="text-ink-3"> · times in {reference?.name}</span>
      </h2>
      <ul className="mt-3 divide-y divide-line">
        {others.map((row) => {
          const ranges = toRanges(row.overlapHours);
          const count = row.overlapHours.length;
          return (
            <li key={row.city.id} className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex min-w-0 items-baseline gap-2 sm:w-56 sm:shrink-0">
                <span className="truncate font-medium text-ink">{row.city.name}</span>
                <span className={cn("text-sm tabular-nums", count ? "text-overlap-strong font-medium" : "text-warn")}>
                  {count ? plural(count, "hour") : "no overlap"}
                </span>
              </div>
              {count ? (
                <RangeList ranges={ranges} format={settings.timeFormat} align="start" />
              ) : (
                <p className="flex items-center gap-1.5 text-sm text-warn">
                  <CircleAlert aria-hidden className="size-4 shrink-0" />
                  Never awake at the same time as {reference?.name}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RangeList({
  ranges,
  format,
  align = "end",
}: {
  ranges: ReturnType<typeof toRanges>;
  format: TimeFormat;
  align?: "start" | "end";
}) {
  return (
    <ul className={cn("flex flex-wrap gap-2", align === "end" && "sm:justify-end")} aria-label="Overlapping time ranges">
      {ranges.map((range) => (
        <li
          key={range.start}
          className="inline-flex items-center gap-2 rounded-full bg-overlap py-1 pr-1 pl-3 text-sm font-semibold text-overlap-ink"
        >
          <span className="tabular-nums">{formatHourRange(range, format)}</span>
          <span className="rounded-full bg-surface/55 px-1.5 py-px font-mono text-[11px] font-medium tabular-nums">
            {range.length}h
          </span>
        </li>
      ))}
    </ul>
  );
}

function WarningIcon() {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warn-soft text-warn">
      <CircleAlert aria-hidden className="size-5" />
    </span>
  );
}
