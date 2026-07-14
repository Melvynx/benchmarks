"use client";

import { City } from "@/lib/cities";
import { Mode } from "@/lib/store";
import {
  computeMeetingOverlap,
  computeBaseOverlap,
  hoursToRanges,
  formatRange,
  getUtcOffsetMinutes,
} from "@/lib/timezone";

interface OverlapSummaryProps {
  cities: City[];
  mode: Mode;
  wakeHour: number;
  sleepHour: number;
  use12h: boolean;
}

export function OverlapSummary({ cities, mode, wakeHour, sleepHour, use12h }: OverlapSummaryProps) {
  if (cities.length < 2) return null;

  const now = new Date();
  const offsets = cities.map((c) => getUtcOffsetMinutes(c.timezone, now));
  const refOffset = offsets[0];

  if (mode === "meeting") {
    const overlapHours = computeMeetingOverlap(offsets, refOffset, wakeHour, sleepHour);
    const ranges = hoursToRanges(overlapHours);

    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
        {overlapHours.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-amber-700">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="font-medium">No overlap — everyone can&apos;t be awake at the same time</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-emerald-800">{overlapHours.length}h overlap</span>
            <span className="text-emerald-600">in {cities[0].name} time:</span>
            {ranges.map((r, i) => (
              <span
                key={i}
                className="rounded-full bg-emerald-200/70 px-2.5 py-0.5 text-xs font-medium text-emerald-900"
              >
                {formatRange(r, use12h)}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Base mode
  return (
    <div className="space-y-1.5">
      {cities.slice(1).map((city, idx) => {
        const targetOffset = offsets[idx + 1];
        const overlapHours = computeBaseOverlap(refOffset, targetOffset, wakeHour, sleepHour);
        const ranges = hoursToRanges(overlapHours);

        return (
          <div
            key={city.id}
            className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-4 py-2 text-sm"
          >
            {overlapHours.length === 0 ? (
              <span className="text-amber-700">
                <span className="font-medium">{city.name}</span> — no overlap with {cities[0].name}
              </span>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-zinc-700">{city.name}</span>
                <span className="text-emerald-700 font-semibold">{overlapHours.length}h</span>
                {ranges.map((r, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800"
                  >
                    {formatRange(r, use12h)}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
