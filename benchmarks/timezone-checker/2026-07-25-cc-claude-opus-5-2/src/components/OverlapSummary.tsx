import type { ReactNode } from "react";
import type { HourRange } from "../lib/availability";
import { cx } from "../lib/cx";
import { formatHourRange, type TimeFormat } from "../lib/format";
import type { Mode, Schedule } from "../lib/schedule";
import { AlertIcon } from "./icons";

type Props = { schedule: Schedule; mode: Mode; format: TimeFormat };

/** Shown once there are at least two cities to compare. */
export function OverlapSummary({ schedule, mode, format }: Props) {
  const reference = schedule.rows[0];
  if (!reference || schedule.rows.length < 2) return null;

  return (
    <section className="rounded-2xl border border-line bg-panel p-4 md:p-5" aria-live="polite">
      {mode === "meeting" ? (
        <MeetingSummary schedule={schedule} format={format} />
      ) : (
        <BaseSummary schedule={schedule} format={format} />
      )}
    </section>
  );
}

function MeetingSummary({ schedule, format }: { schedule: Schedule; format: TimeFormat }) {
  const reference = schedule.rows[0]!;
  const { count, ranges } = schedule.overlap;

  if (count === 0) {
    return (
      <Warning>
        No hour works for all {schedule.rows.length} cities. Widen your awake window, or drop a city
        from the list.
      </Warning>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3.5">
        <CountPill count={count} />
        <div className="min-w-0">
          <h2 className="text-[14px] font-medium text-ink">Everyone is awake together</h2>
          <p className="text-[11.5px] text-mute">
            All {schedule.rows.length} cities · times in {reference.city.name}
          </p>
        </div>
      </div>
      <RangeList ranges={ranges} format={format} />
    </div>
  );
}

function BaseSummary({ schedule, format }: { schedule: Schedule; format: TimeFormat }) {
  const reference = schedule.rows[0]!;
  const others = schedule.rows.slice(1);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 className="text-[14px] font-medium text-ink">
          Overlap with <span className="text-ref">{reference.city.name}</span>
        </h2>
        <p className="text-[11.5px] text-mute">· one window per city, times in {reference.city.name}</p>
      </div>

      <ul className="flex flex-col divide-y divide-line-soft">
        {others.map((row) => (
          <li
            key={row.city.id}
            className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cx(
                  "tnum inline-flex h-6 min-w-9 items-center justify-center rounded-md px-1.5 text-[11.5px] font-semibold",
                  row.overlapCount > 0
                    ? "bg-overlap/15 text-overlap ring-1 ring-overlap/25"
                    : "bg-alert/10 text-alert ring-1 ring-alert/20",
                )}
              >
                {row.overlapCount}h
              </span>
              <span className="text-[13px] text-ink">{row.city.name}</span>
            </div>
            {row.overlapCount > 0 ? (
              <RangeList ranges={row.overlapRanges} format={format} />
            ) : (
              <span className="flex items-center gap-1.5 text-[11.5px] text-alert/90">
                <AlertIcon className="h-3.5 w-3.5" />
                No overlap with {reference.city.name}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RangeList({ ranges, format }: { ranges: HourRange[]; format: TimeFormat }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ranges.map((range) => (
        <span
          key={`${range.start}-${range.end}`}
          className="tnum rounded-lg bg-overlap/10 px-2.5 py-1.5 text-[12px] font-medium text-overlap ring-1 ring-overlap/25"
        >
          {formatHourRange(range, format)}
        </span>
      ))}
    </div>
  );
}

function CountPill({ count }: { count: number }) {
  return (
    <span className="tnum flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-overlap/15 text-overlap ring-1 ring-overlap/25">
      <span className="text-[17px] leading-none font-semibold">{count}</span>
      <span className="mt-0.5 text-[8.5px] tracking-[0.1em] uppercase opacity-75">
        {count === 1 ? "hour" : "hours"}
      </span>
    </span>
  );
}

function Warning({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-alert/10 text-alert ring-1 ring-alert/25">
        <AlertIcon className="h-4.5 w-4.5" />
      </span>
      <div>
        <h2 className="text-[14px] font-medium text-alert">No shared overlap</h2>
        <p className="max-w-prose text-[12px] text-mute">{children}</p>
      </div>
    </div>
  );
}
