import type { City } from "../data/cities";
import {
  formatRangeLabel,
  hoursToRanges,
  type AppMode,
} from "../lib/timeEngine";

interface Props {
  mode: AppMode;
  cities: City[];
  refCity: City;
  meetingOverlapHours: number[];
  baseOverlapByCityId: Map<string, number[]>;
  use12h: boolean;
}

export function OverlapSummary({
  mode,
  cities,
  refCity,
  meetingOverlapHours,
  baseOverlapByCityId,
  use12h,
}: Props) {
  if (cities.length < 2) return null;

  if (mode === "meeting") {
    const ranges = hoursToRanges(meetingOverlapHours);
    const n = meetingOverlapHours.length;
    return (
      <div className="rounded-xl border border-white/10 bg-surface-1/80 px-4 py-3 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          Meeting mode — {refCity.name} time
        </p>
        {n === 0 ? (
          <p className="mt-2 text-sm font-medium text-amber-400/90">
            No shared awake hours today. Try widening the awake window or
            picking closer timezones.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="text-lg font-semibold text-emerald-400">
              {n}h overlap
            </span>
            <span className="text-sm text-slate-400">·</span>
            <div className="flex flex-wrap gap-2">
              {ranges.map((r) => (
                <span
                  key={`${r.start}-${r.end}`}
                  className="rounded-md bg-emerald-500/15 px-2.5 py-1 font-mono text-sm font-medium text-emerald-300 ring-1 ring-emerald-500/30"
                >
                  {formatRangeLabel(r, use12h)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const others = cities.filter((c) => c.id !== refCity.id);
  return (
    <div className="rounded-xl border border-white/10 bg-surface-1/80 px-4 py-3 backdrop-blur-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        Base mode — vs {refCity.name}
      </p>
      <ul className="mt-3 space-y-2">
        {others.map((city) => {
          const hrs = baseOverlapByCityId.get(city.id) ?? [];
          const ranges = hoursToRanges(hrs);
          return (
            <li
              key={city.id}
              className="flex flex-wrap items-baseline gap-2 border-t border-white/5 pt-2 first:border-t-0 first:pt-0"
            >
              <span className="min-w-[7rem] text-sm font-medium text-slate-200">
                {city.name}
              </span>
              {hrs.length === 0 ? (
                <span className="text-sm font-medium text-amber-400/90">
                  No overlap with base today
                </span>
              ) : (
                <>
                  <span className="text-sm font-semibold text-emerald-400">
                    {hrs.length}h
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {ranges.map((r) => (
                      <span
                        key={`${city.id}-${r.start}-${r.end}`}
                        className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/25"
                      >
                        {formatRangeLabel(r, use12h)}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
