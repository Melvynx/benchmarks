import { useEffect, useRef, useState } from "react";
import { formatLocalTime } from "../lib/timezone";

type Props = {
  wake: number;
  sleep: number;
  format12h: boolean;
  onChange: (patch: { wake?: number; sleep?: number; format12h?: boolean }) => void;
};

export function SettingsPanel({ wake, sleep, format12h, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const fmt = (h: number) => formatLocalTime(h * 60, format12h).compact;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-zinc-200 hover:bg-white/10 transition"
        aria-label="Open settings"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        Settings
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[320px] rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 p-5 z-50 fade-in">
          <div className="text-sm font-semibold text-zinc-100 mb-1">
            Your availability
          </div>
          <div className="text-xs text-zinc-500 mb-4">
            Applies to every city in your list.
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label className="text-xs font-medium text-zinc-400">
                  Wake up
                </label>
                <span className="font-mono text-sm text-emerald-400">
                  {fmt(wake)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={23}
                value={wake}
                onChange={(e) => onChange({ wake: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label className="text-xs font-medium text-zinc-400">Sleep</label>
                <span className="font-mono text-sm text-indigo-400">
                  {fmt(sleep)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={23}
                value={sleep}
                onChange={(e) => onChange({ sleep: Number(e.target.value) })}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-2">
                Time format
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-800/60 rounded-lg">
                {[
                  { label: "12-hour", val: true },
                  { label: "24-hour", val: false },
                ].map((opt) => (
                  <button
                    key={String(opt.val)}
                    onClick={() => onChange({ format12h: opt.val })}
                    className={`text-xs font-medium py-1.5 rounded-md transition ${
                      format12h === opt.val
                        ? "bg-white/10 text-zinc-100 shadow"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {wake > sleep && (
              <div className="text-xs text-amber-300/90 bg-amber-500/5 border border-amber-400/20 rounded-lg px-3 py-2">
                Overnight window — awake from {fmt(wake)} to {fmt(sleep)} the next day.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
