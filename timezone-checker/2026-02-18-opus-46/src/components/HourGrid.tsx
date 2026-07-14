import type { Settings } from "../types";
import { isNightHour, isWakeupHour } from "../utils/timezone";

type Props = {
  overlapHours: Set<number>;
  currentHour: number;
  settings: Settings;
  timeFormat: "12h" | "24h";
};

function formatHourLabel(hour: number, format: "12h" | "24h"): string {
  if (format === "24h") return String(hour).padStart(2, "0");
  if (hour === 0) return "12a";
  if (hour < 12) return `${hour}a`;
  if (hour === 12) return "12p";
  return `${hour - 12}p`;
}

export function HourGrid({ overlapHours, currentHour, settings, timeFormat }: Props) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const hasOverlap = overlapHours.size > 0;

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-24 gap-px">
        {hours.map((h) => {
          const isNight = isNightHour(h);
          const isWake = isWakeupHour(h, settings.wakeStart, settings.wakeEnd);
          const isOverlap = overlapHours.has(h);
          const isCurrent = h === currentHour;

          let bg: string;
          if (isOverlap) {
            bg = "bg-emerald-500/80";
          } else if (isWake) {
            bg = "bg-slate-500/40";
          } else if (isNight) {
            bg = "bg-indigo-950/80";
          } else {
            bg = "bg-amber-100/15";
          }

          return (
            <div key={h} className="flex flex-col items-center gap-0.5">
              <div
                className={`w-full h-6 rounded-sm ${bg} ${
                  isCurrent ? "ring-2 ring-white/80 ring-inset" : ""
                } transition-colors`}
                title={`${formatHourLabel(h, "24h")}:00${isOverlap ? " (overlap)" : ""}${isNight ? " (night)" : ""}${isWake ? " (wake-up)" : ""}`}
              />
              {h % 6 === 0 && (
                <span className="text-[9px] text-slate-500 leading-none">
                  {formatHourLabel(h, timeFormat)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {!hasOverlap && (
        <p className="text-xs text-rose-400/80 text-center">No overlap with primary</p>
      )}

      <div className="flex items-center gap-3 text-[10px] text-slate-500 justify-center mt-1">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-emerald-500/80 inline-block" /> Overlap
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-amber-100/15 inline-block border border-slate-700" /> Day
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-slate-500/40 inline-block" /> Wake
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-indigo-950/80 inline-block border border-slate-700" /> Night
        </span>
      </div>
    </div>
  );
}
