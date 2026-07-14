import { useRef, useState } from "react";
import type { Settings } from "../lib/overlap";
import { useClickOutside } from "../hooks/useClickOutside";
import { formatHourInline } from "../lib/timezone";
import { MoonIcon, SettingsIcon, SunIcon } from "./Icons";

type Props = {
  settings: Settings;
  onChange: (next: Settings) => void;
};

export function SettingsPanel({ settings, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    onChange({ ...settings, [key]: value });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)]/80 px-3.5 py-1.5 text-sm text-zinc-200 backdrop-blur hover:border-zinc-700 hover:bg-[var(--panel-2)]"
      >
        <SettingsIcon width={15} height={15} className="text-zinc-400" />
        <span className="hidden sm:inline">Availability</span>
        <span className="font-mono text-xs text-zinc-400">
          {formatHourInline(settings.wakeHour, settings.format12h)}
          {" \u2192 "}
          {formatHourInline(settings.sleepHour, settings.format12h)}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Availability settings"
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-[320px] origin-top-right rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-2xl shadow-black/50 backdrop-blur-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">
              Your awake window
            </h2>
            <span className="rounded-full bg-[var(--panel-2)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              shared
            </span>
          </div>

          <div className="space-y-4">
            <HourField
              icon={<SunIcon width={14} height={14} />}
              label="Wake"
              value={settings.wakeHour}
              format12h={settings.format12h}
              onChange={(v) => update("wakeHour", v)}
            />
            <HourField
              icon={<MoonIcon width={14} height={14} />}
              label="Sleep"
              value={settings.sleepHour}
              format12h={settings.format12h}
              onChange={(v) => update("sleepHour", v)}
            />

            <div>
              <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Time format
              </div>
              <div className="inline-flex w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-1">
                {[
                  { value: true, label: "12-hour" },
                  { value: false, label: "24-hour" },
                ].map((opt) => {
                  const active = settings.format12h === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      onClick={() => update("format12h", opt.value)}
                      className={
                        "flex-1 rounded-md px-3 py-1.5 text-sm transition-colors " +
                        (active
                          ? "bg-zinc-700/60 text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                          : "text-zinc-400 hover:text-zinc-200")
                      }
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {settings.wakeHour === settings.sleepHour && (
              <p className="rounded-md bg-rose-950/40 px-2.5 py-2 text-xs text-rose-300 ring-1 ring-rose-900/50">
                Wake and sleep are the same hour. No one is ever awake.
              </p>
            )}
            {isOvernight(settings) && (
              <p className="rounded-md bg-amber-950/30 px-2.5 py-2 text-xs text-amber-300/90 ring-1 ring-amber-900/40">
                Overnight schedule: awake across midnight.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function isOvernight(s: Settings): boolean {
  return s.wakeHour > s.sleepHour;
}

function HourField({
  icon,
  label,
  value,
  format12h,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  format12h: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          <span className="text-zinc-500">{icon}</span>
          {label}
        </div>
        <span className="font-mono text-sm tabular-nums text-zinc-200">
          {formatHourInline(value, format12h)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={23}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-500"
      />
      <div className="mt-1 flex justify-between font-mono text-[10px] text-zinc-600">
        <span>0</span>
        <span>6</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
    </div>
  );
}
