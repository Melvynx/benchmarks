import { useMemo } from "react";
import type { SelectedCity, Settings } from "../types";
import { HourGrid } from "./HourGrid";
import {
  formatTime,
  formatUtcOffset,
  getUtcOffsetMinutes,
  getOverlapHours,
  getLocalHour,
  getCurrentDate,
} from "../utils/timezone";

type Props = {
  city: SelectedCity;
  isPrimary: boolean;
  primaryTimezone: string;
  settings: Settings;
  now: Date;
  onSetPrimary: () => void;
  onRemove: () => void;
  exiting: boolean;
};

export function TimezoneCard({
  city,
  isPrimary,
  primaryTimezone,
  settings,
  now,
  onSetPrimary,
  onRemove,
  exiting,
}: Props) {
  const offset = useMemo(() => getUtcOffsetMinutes(city.timezone, now), [city.timezone, now]);
  const offsetStr = formatUtcOffset(offset);
  const timeStr = formatTime(city.timezone, settings.timeFormat, now);
  const dateStr = getCurrentDate(city.timezone, now);
  const currentHour = getLocalHour(city.timezone, now);

  const overlapHours = useMemo(() => {
    if (isPrimary) {
      const hours = new Set<number>();
      for (let h = settings.workStart; h < settings.workEnd; h++) {
        hours.add(h % 24);
      }
      return hours;
    }
    return getOverlapHours(primaryTimezone, city.timezone, settings.workStart, settings.workEnd);
  }, [isPrimary, primaryTimezone, city.timezone, settings.workStart, settings.workEnd]);

  return (
    <div
      className={`${exiting ? "card-exit" : "card-enter"} flex-shrink-0 w-72 md:w-80 rounded-2xl border transition-all ${
        isPrimary
          ? "border-emerald-500/50 bg-emerald-500/5 shadow-lg shadow-emerald-500/10"
          : "border-border bg-surface-card hover:border-slate-600"
      }`}
    >
      <div
        className="p-4 pb-3 cursor-pointer group"
        onClick={onSetPrimary}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onSetPrimary()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {isPrimary && (
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-white truncate text-sm leading-tight group-hover:text-emerald-300 transition-colors">
                {city.name}
              </h3>
              <p className="text-xs text-slate-500 truncate">
                {city.country}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 transition-all text-sm"
            aria-label={`Remove ${city.name}`}
          >
            &times;
          </button>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-mono font-bold text-white tabular-nums tracking-tight">
            {timeStr}
          </span>
          <span className="text-xs text-slate-500 font-mono">{offsetStr}</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{dateStr}</p>

        {isPrimary && (
          <span className="inline-block mt-2 text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Primary
          </span>
        )}
      </div>

      <div className="px-4 pb-4 pt-1 border-t border-border/50">
        <HourGrid
          overlapHours={overlapHours}
          currentHour={currentHour}
          settings={settings}
          timeFormat={settings.timeFormat}
        />
      </div>
    </div>
  );
}
