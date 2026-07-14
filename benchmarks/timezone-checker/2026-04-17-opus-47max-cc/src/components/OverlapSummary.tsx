import { type City } from "../data/cities";
import { formatHourRange } from "../lib/timezone";
import { type Mode } from "./ModeToggle";

type Props = {
  mode: Mode;
  refCity: City;
  otherCities: City[];
  format12h: boolean;
  meetingRanges: Array<[number, number]>;
  meetingCount: number;
  baseOverlaps: Array<{
    city: City;
    ranges: Array<[number, number]>;
    count: number;
  }>;
};

export function OverlapSummary({
  mode,
  refCity,
  otherCities,
  format12h,
  meetingRanges,
  meetingCount,
  baseOverlaps,
}: Props) {
  if (otherCities.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 px-5 py-4 text-sm text-zinc-400">
        Add at least one more city to see overlap.
      </div>
    );
  }

  const pluralH = (n: number) => `${n} hour${n === 1 ? "" : "s"}`;

  if (mode === "meeting") {
    const hasOverlap = meetingCount > 0;
    return (
      <div
        className={`rounded-2xl border px-5 py-4 ${
          hasOverlap
            ? "border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-emerald-500/[0.02]"
            : "border-amber-500/25 bg-amber-500/[0.05]"
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <div className="text-[11px] tracking-widest uppercase text-zinc-400 mb-0.5">
              Everyone awake together
            </div>
            {hasOverlap ? (
              <div className="text-2xl font-semibold text-emerald-300 font-mono">
                {pluralH(meetingCount)}
              </div>
            ) : (
              <div className="text-2xl font-semibold text-amber-300">
                No overlap
              </div>
            )}
          </div>

          {hasOverlap && (
            <div className="flex flex-wrap gap-2 items-center">
              {meetingRanges.map(([s, e], i) => (
                <span
                  key={i}
                  className="font-mono text-sm px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-200 border border-emerald-500/25"
                >
                  {formatHourRange(s, e, format12h)}
                </span>
              ))}
              <span className="text-xs text-zinc-500">
                in {refCity.name}
              </span>
            </div>
          )}

          {!hasOverlap && (
            <span className="text-sm text-amber-200/80">
              No common awake hours across all {otherCities.length + 1} cities.
              Try adjusting your awake window or removing a far-timezone city.
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/40 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="text-[11px] tracking-widest uppercase text-zinc-400">
          Overlap with{" "}
          <span className="text-zinc-200">{refCity.name}</span>
        </div>
        <div className="text-xs text-zinc-500">per city</div>
      </div>
      <ul className="divide-y divide-white/5">
        {baseOverlaps.map(({ city, ranges, count }) => {
          const has = count > 0;
          return (
            <li
              key={city.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3"
            >
              <div className="flex items-center gap-2 min-w-[9rem]">
                <span className="text-base leading-none">{city.flag}</span>
                <span className="font-medium text-zinc-100">{city.name}</span>
              </div>
              {has ? (
                <>
                  <span className="font-mono text-sm text-emerald-300">
                    {pluralH(count)}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ranges.map(([s, e], i) => (
                      <span
                        key={i}
                        className="font-mono text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-200 border border-emerald-500/20"
                      >
                        {formatHourRange(s, e, format12h)}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <span className="text-sm text-amber-300/80">
                  No overlap with {refCity.name}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
