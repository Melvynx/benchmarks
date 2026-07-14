import { useRef, useState } from "react";
import { useClickOutside } from "../hooks/useClickOutside";
import { formatHourLabel } from "../lib/timezone";
import type { TimeFormat } from "../lib/types";
import { useTimezoneStore } from "../store/useTimezoneStore";

const HOURS = Array.from({ length: 24 }, (_, h) => h);

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const settings = useTimezoneStore((state) => state.settings);
  const updateSettings = useTimezoneStore((state) => state.updateSettings);

  useClickOutside(containerRef, () => setOpen(false), open);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Availability settings"
        aria-expanded={open}
        className={`inline-flex items-center justify-center rounded-xl border p-2.5 transition-colors ${
          open
            ? "border-overlap-500/50 text-overlap-400"
            : "border-base-700/70 text-base-300 hover:border-base-500 hover:text-base-100"
        } bg-base-850/80`}
      >
        <GearIcon />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-72 rounded-xl border border-base-700/70 bg-base-850 p-4 shadow-2xl shadow-black/50">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-base-500">
            Your awake window
          </p>

          <div className="grid grid-cols-2 gap-3">
            <HourField
              label="Wake up"
              value={settings.wakeHour}
              format={settings.format}
              onChange={(hour) => updateSettings({ wakeHour: hour })}
            />
            <HourField
              label="Sleep"
              value={settings.sleepHour}
              format={settings.format}
              onChange={(hour) => updateSettings({ sleepHour: hour })}
            />
          </div>

          <p className="mt-3 text-xs text-base-500">
            Applies to every city — overnight ranges (e.g. sleep before wake) are supported.
          </p>

          <div className="mt-4 border-t border-base-700/60 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-500">
              Time format
            </p>
            <div className="inline-flex w-full rounded-lg border border-base-700/70 bg-base-800 p-1">
              {(["12h", "24h"] as TimeFormat[]).map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => updateSettings({ format })}
                  className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                    settings.format === format
                      ? "bg-overlap-500 text-base-950"
                      : "text-base-300 hover:text-base-100"
                  }`}
                >
                  {format === "12h" ? "12-hour" : "24-hour"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HourField({
  label,
  value,
  format,
  onChange,
}: {
  label: string;
  value: number;
  format: TimeFormat;
  onChange: (hour: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-base-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-lg border border-base-700/70 bg-base-800 px-2 py-1.5 text-sm text-base-100 focus:outline-none focus:ring-2 focus:ring-overlap-500/40"
      >
        {HOURS.map((hour) => (
          <option key={hour} value={hour}>
            {formatHourLabel(hour, format)}
          </option>
        ))}
      </select>
    </label>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
      <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M10 2.6v2.1M10 15.3v2.1M17.4 10h-2.1M4.7 10H2.6M15.1 4.9l-1.5 1.5M6.4 13.6l-1.5 1.5M15.1 15.1l-1.5-1.5M6.4 6.4 4.9 4.9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
