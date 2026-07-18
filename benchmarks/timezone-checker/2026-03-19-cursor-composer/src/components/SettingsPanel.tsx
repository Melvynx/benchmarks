interface Props {
  open: boolean;
  onClose: () => void;
  wakeHour: number;
  sleepHour: number;
  use12h: boolean;
  onWake: (h: number) => void;
  onSleep: (h: number) => void;
  onUse12h: (v: boolean) => void;
}

const hourOptions = Array.from({ length: 24 }, (_, i) => i);

export function SettingsPanel({
  open,
  onClose,
  wakeHour,
  sleepHour,
  use12h,
  onWake,
  onSleep,
  onUse12h,
}: Props) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close settings"
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="fixed right-4 top-16 z-50 w-[min(100%-2rem,20rem)] rounded-xl border border-white/10 bg-surface-2 p-4 shadow-2xl shadow-black/40"
        role="dialog"
        aria-labelledby="settings-title"
      >
        <h2 id="settings-title" className="text-sm font-semibold text-white">
          Availability
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Same schedule for every city. Overnight windows supported (e.g. wake
          22 → sleep 6).
        </p>

        <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-muted">
          Wake hour
        </label>
        <select
          value={wakeHour}
          onChange={(e) => onWake(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-white/10 bg-surface-1 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
        >
          {hourOptions.map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}:00
            </option>
          ))}
        </select>

        <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-muted">
          Sleep hour
        </label>
        <select
          value={sleepHour}
          onChange={(e) => onSleep(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-white/10 bg-surface-1 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
        >
          {hourOptions.map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}:00
            </option>
          ))}
        </select>

        <fieldset className="mt-4 border-0 p-0">
          <legend className="text-xs font-medium uppercase tracking-wide text-muted">
            Time format
          </legend>
          <div className="mt-2 flex gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="radio"
                name="tf"
                checked={use12h}
                onChange={() => onUse12h(true)}
                className="accent-emerald-500"
              />
              12-hour
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="radio"
                name="tf"
                checked={!use12h}
                onChange={() => onUse12h(false)}
                className="accent-emerald-500"
              />
              24-hour
            </label>
          </div>
        </fieldset>
      </div>
    </>
  );
}
