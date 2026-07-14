"use client";

export function SettingsPanel({
  wakeUp,
  sleepAt,
  use12h,
  onChange,
}: {
  wakeUp: number;
  sleepAt: number;
  use12h: boolean;
  onChange: (partial: { wakeUp?: number; sleepAt?: number; use12h?: boolean }) => void;
}) {
  return (
    <div className="mb-4 p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap gap-6 items-end">
      <div>
        <label className="block text-xs text-slate-400 mb-1">Wake up</label>
        <select
          value={wakeUp}
          onChange={(e) => onChange({ wakeUp: Number(e.target.value) })}
          className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-emerald-600"
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>
              {String(i).padStart(2, "0")}:00
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Sleep at</label>
        <select
          value={sleepAt}
          onChange={(e) => onChange({ sleepAt: Number(e.target.value) })}
          className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-emerald-600"
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>
              {String(i).padStart(2, "0")}:00
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Format</label>
        <div className="flex rounded-lg bg-slate-800 border border-slate-700 overflow-hidden text-sm">
          <button
            className={`px-3 py-1.5 transition-colors ${
              use12h ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
            onClick={() => onChange({ use12h: true })}
          >
            12h
          </button>
          <button
            className={`px-3 py-1.5 transition-colors ${
              !use12h ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
            onClick={() => onChange({ use12h: false })}
          >
            24h
          </button>
        </div>
      </div>
    </div>
  );
}
