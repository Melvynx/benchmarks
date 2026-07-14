"use client";

import { TimeFormat } from "@/lib/store";

interface SettingsProps {
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
  onWakeChange: (h: number) => void;
  onSleepChange: (h: number) => void;
  onFormatChange: (f: TimeFormat) => void;
}

function formatHourLabel(hour: number, use12h: boolean): string {
  if (!use12h) return `${String(hour).padStart(2, "0")}:00`;
  if (hour === 0) return "12:00 AM";
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return "12:00 PM";
  return `${hour - 12}:00 PM`;
}

export function Settings({
  wakeHour,
  sleepHour,
  timeFormat,
  onWakeChange,
  onSleepChange,
  onFormatChange,
}: SettingsProps) {
  const use12h = timeFormat === "12h";

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <label className="flex items-center gap-2">
        <span className="text-zinc-500">Wake</span>
        <select
          value={wakeHour}
          onChange={(e) => onWakeChange(Number(e.target.value))}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>
              {formatHourLabel(i, use12h)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2">
        <span className="text-zinc-500">Sleep</span>
        <select
          value={sleepHour}
          onChange={(e) => onSleepChange(Number(e.target.value))}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>
              {formatHourLabel(i, use12h)}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-1 rounded-md border border-zinc-200 bg-white p-0.5">
        <button
          onClick={() => onFormatChange("12h")}
          className={`rounded px-2 py-0.5 text-xs font-medium transition-all ${
            use12h ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          12h
        </button>
        <button
          onClick={() => onFormatChange("24h")}
          className={`rounded px-2 py-0.5 text-xs font-medium transition-all ${
            !use12h ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          24h
        </button>
      </div>
    </div>
  );
}
