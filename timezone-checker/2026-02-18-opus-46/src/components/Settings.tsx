import { useState, useRef, useEffect } from "react";
import type { Settings as SettingsType } from "../types";

type Props = {
  settings: SettingsType;
  onChange: (update: Partial<SettingsType>) => void;
};

function HourSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-300">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-surface-hover border border-border rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer"
      >
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={i}>
            {String(i).padStart(2, "0")}:00
          </option>
        ))}
      </select>
    </label>
  );
}

export function SettingsPanel({ settings, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all ${
          open
            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
            : "border-border bg-surface-card text-slate-400 hover:text-white hover:border-slate-500"
        }`}
        aria-label="Settings"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
          />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-72 bg-surface-card border border-border rounded-2xl shadow-2xl shadow-black/50 p-5 space-y-5 fade-enter">
          <h3 className="text-sm font-semibold text-white">Settings</h3>

          <div className="space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Time format</p>
            <div className="flex gap-2 mt-1.5">
              {(["12h", "24h"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => onChange({ timeFormat: fmt })}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    settings.timeFormat === fmt
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-surface-hover text-slate-400 border border-transparent hover:text-white"
                  }`}
                >
                  {fmt === "12h" ? "12h" : "24h"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
              Working hours <span className="normal-case">(green band)</span>
            </p>
            <HourSelect label="Start" value={settings.workStart} onChange={(v) => onChange({ workStart: v })} />
            <HourSelect label="End" value={settings.workEnd} onChange={(v) => onChange({ workEnd: v })} />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
              Wake-up window <span className="normal-case">(gray band)</span>
            </p>
            <HourSelect label="Start" value={settings.wakeStart} onChange={(v) => onChange({ wakeStart: v })} />
            <HourSelect label="End" value={settings.wakeEnd} onChange={(v) => onChange({ wakeEnd: v })} />
          </div>
        </div>
      )}
    </div>
  );
}
