import { AlertTriangle } from "lucide-react";
import type { Board } from "@/lib/board";
import type { OverlapResult } from "@/lib/overlap";
import { formatHourRange, type TimeFormat } from "@/lib/time";
import { CARD, RANGE_CHIP, WARNING } from "./styles";

interface OverlapSummaryProps {
  readonly board: Board;
  readonly timeFormat: TimeFormat;
}

function hoursLabel({ hours }: OverlapResult): string {
  if (hours === 24) return "All day";
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

export function OverlapSummary({ board, timeFormat }: OverlapSummaryProps) {
  if (board.rows.length === 0) return null;

  if (!board.summary) {
    return (
      <section className={`${CARD} px-5 py-4 text-sm text-stone-500 dark:text-stone-400`}>
        Add one more city to see when you overlap.
      </section>
    );
  }

  const referenceName = board.rows[0].city.name;

  if (board.summary.kind === "meeting") {
    const { result } = board.summary;
    const hasOverlap = result.hours > 0;

    return (
      <section aria-label="Overlap summary" aria-live="polite" className={`${CARD} p-5 sm:p-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Shared awake time · {referenceName} time
            </p>
            <p className="mt-1 flex items-baseline gap-3">
              <span className="text-4xl font-semibold tracking-tight tabular-nums text-stone-900 dark:text-stone-50">
                {result.hours}
              </span>
              <span className="text-base font-medium text-stone-700 dark:text-stone-300">
                {result.hours === 1 ? "hour" : "hours"} for everyone
              </span>
            </p>
          </div>

          {hasOverlap && (
            <ul className="flex flex-wrap gap-2" aria-label="Overlap windows">
              {result.ranges.map((range) => (
                <li key={range.startHour} className={RANGE_CHIP}>
                  {formatHourRange(range, timeFormat)}
                </li>
              ))}
            </ul>
          )}
        </div>

        {!hasOverlap && (
          <div role="status" className={`${WARNING} mt-5`}>
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              No overlap. Someone is always asleep. Widen the awake window or remove a city.
            </span>
          </div>
        )}
      </section>
    );
  }

  const { entries } = board.summary;

  return (
    <section aria-label="Overlap with reference" className={`${CARD} p-5 sm:p-6`}>
      <div className="mb-3">
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          Overlap with {referenceName}
        </p>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Hours shown in {referenceName} time
        </p>
      </div>

      <ul className="divide-y divide-stone-100 dark:divide-stone-800">
        {entries.map(({ city, result }) => (
          <li
            key={city.id}
            className="flex flex-col gap-2.5 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-baseline gap-3">
              <span className="font-medium text-stone-900 dark:text-stone-100">{city.name}</span>
              <span className="text-sm tabular-nums text-stone-500 dark:text-stone-400">
                {hoursLabel(result)}
              </span>
            </div>

            {result.hours > 0 ? (
              <ul className="flex flex-wrap gap-2" aria-label={`Overlap windows with ${city.name}`}>
                {result.ranges.map((range) => (
                  <li key={range.startHour} className={RANGE_CHIP}>
                    {formatHourRange(range, timeFormat)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-300">
                <AlertTriangle className="size-4 shrink-0" aria-hidden />
                No overlap with {referenceName}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
