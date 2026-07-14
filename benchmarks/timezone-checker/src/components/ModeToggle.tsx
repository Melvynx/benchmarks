import type { AppMode } from "../lib/timeEngine";

interface Props {
  mode: AppMode;
  onChange: (m: AppMode) => void;
}

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div
      className="inline-flex rounded-lg bg-surface-2 p-1 ring-1 ring-white/10"
      role="group"
      aria-label="Overlap mode"
    >
      <button
        type="button"
        onClick={() => onChange("meeting")}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
          mode === "meeting"
            ? "bg-emerald-500/20 text-emerald-200 shadow-sm ring-1 ring-emerald-500/40"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        Meeting
      </button>
      <button
        type="button"
        onClick={() => onChange("base")}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
          mode === "base"
            ? "bg-emerald-500/20 text-emerald-200 shadow-sm ring-1 ring-emerald-500/40"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        Base
      </button>
    </div>
  );
}
