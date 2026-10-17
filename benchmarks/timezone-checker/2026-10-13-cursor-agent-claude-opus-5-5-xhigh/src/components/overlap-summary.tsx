import { CircleSlash, MapPinPlus, TriangleAlert } from "lucide-react";
import { RangeBadge } from "@/components/range-badge";
import { formatHour, formatOffsetDiff, type TimeFormat } from "@/lib/format";
import type { BaseSummary, MeetingSummary, ScheduleRow } from "@/lib/overlap";
import { describeWindow } from "@/lib/share";
import { usePreferences } from "@/state/preferences";

interface OverlapSummaryProps {
  rows: readonly ScheduleRow[];
  summary: MeetingSummary | BaseSummary | null;
  format: TimeFormat;
}

export function OverlapSummary({ rows, summary, format }: OverlapSummaryProps) {
  const reference = rows[0];

  if (!summary || !reference) {
    return (
      <div className="flex items-center gap-3 text-sm text-ink-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-sleep text-ink-3">
          <MapPinPlus aria-hidden className="size-4" />
        </span>
        {rows.length === 0
          ? "Add a few cities to start comparing timezones."
          : `Add another city to see when it overlaps with ${reference?.city.name}.`}
      </div>
    );
  }

  return summary.kind === "meeting" ? (
    <MeetingView rows={rows} summary={summary} format={format} />
  ) : (
    <BaseView rows={rows} summary={summary} format={format} />
  );
}

function MeetingView({ rows, summary, format }: { rows: readonly ScheduleRow[]; summary: MeetingSummary; format: TimeFormat }) {
  const reference = rows[0]!;
  const wakeHour = usePreferences((state) => state.wakeHour);
  const sleepHour = usePreferences((state) => state.sleepHour);

  if (summary.total === 0) {
    return (
      <div role="status" className="flex gap-3.5 rounded-2xl bg-warn-soft p-4 text-warn-ink ring-1 ring-warn/25 ring-inset">
        <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-warn" />
        <div className="flex min-w-0 flex-col gap-2">
          <div>
            <p className="font-semibold">No hour works for everyone</p>
            <p className="text-sm opacity-85">
              With a {formatHour(wakeHour, format)}–{formatHour(sleepHour, format)} awake window, these {rows.length} cities never
              share an awake hour. Widen the window or drop a city.
            </p>
          </div>
          {summary.closest.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold tracking-[0.12em] uppercase opacity-70">Closest options</p>
              <ul className="flex flex-col gap-1.5">
                {summary.closest.map((window) => (
                  <li key={window.start} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
                    <RangeBadge range={window} format={format} tone="partial" copyText={describeWindow(window, rows, format)} />
                    <span>
                      {window.awakeCount} of {rows.length} awake ·{" "}
                      <span className="font-medium">{window.asleep.map((city) => city.name).join(", ")}</span> asleep
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div role="status" className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
      <div className="flex shrink-0 items-center gap-3.5">
        <span className="tabular font-mono text-5xl leading-none font-semibold tracking-tight text-overlap-text">
          {summary.total}
        </span>
        <div className="leading-tight">
          <p className="font-semibold text-ink">
            {summary.total === 1 ? "hour" : "hours"} everyone is awake
          </p>
          <p className="text-sm text-ink-3">
            in {reference.city.name} time · {summary.ranges.length} {summary.ranges.length === 1 ? "window" : "windows"}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {summary.ranges.map((range) => (
          <RangeBadge key={range.start} range={range} format={format} copyText={describeWindow(range, rows, format)} />
        ))}
      </div>
    </div>
  );
}

function BaseView({ rows, summary, format }: { rows: readonly ScheduleRow[]; summary: BaseSummary; format: TimeFormat }) {
  const reference = rows[0]!;
  const rowById = new Map(rows.map((row) => [row.city.id, row]));

  return (
    <div className="flex flex-col gap-2" role="status">
      <p className="text-sm text-ink-2">
        Overlap with <span className="font-semibold text-ink">{reference.city.name}</span>
        <span className="text-ink-3"> · times in {reference.city.name}</span>
      </p>
      <ul className="divide-y divide-line">
        {summary.entries.map((entry) => {
          const row = rowById.get(entry.city.id);
          const pair = row ? [reference, row] : [reference];
          return (
            <li
              key={entry.city.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-2.5 sm:grid-cols-[12rem_4.5rem_minmax(0,1fr)]"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{entry.city.name}</p>
                <p className="font-mono text-xs text-ink-3">{formatOffsetDiff(entry.diffMinutes)}</p>
              </div>
              <p className="tabular text-right font-mono text-sm sm:text-left">
                <span className={entry.total ? "font-semibold text-overlap-text" : "text-ink-3"}>{entry.total}h</span>
              </p>
              <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1">
                {entry.total === 0 ? (
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-warn-soft px-3 text-sm font-medium text-warn-ink ring-1 ring-warn/25 ring-inset">
                    <CircleSlash aria-hidden className="size-3.5" />
                    No shared awake hours
                  </span>
                ) : (
                  entry.ranges.map((range) => (
                    <RangeBadge key={range.start} range={range} format={format} copyText={describeWindow(range, pair, format)} />
                  ))
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
