import { hourLabel, type Settings } from "../lib/time";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function SettingsPanel({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
}) {
  const { wake, sleep, format } = settings;
  const label = (h: number) => (format === "24h" ? `${String(h).padStart(2, "0")}:00` : hourLabel(h, format));

  return (
    <section className="card settings" aria-label="Availability settings">
      <label className="field">
        <span>Wake-up</span>
        <select value={wake} onChange={(e) => onChange({ ...settings, wake: Number(e.target.value) })}>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {label(h)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Sleep</span>
        <select value={sleep} onChange={(e) => onChange({ ...settings, sleep: Number(e.target.value) })}>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {label(h)}
            </option>
          ))}
        </select>
      </label>
      <div className="field">
        <span>Time format</span>
        <div className="segmented small" role="radiogroup" aria-label="Time format">
          {(["12h", "24h"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={format === f}
              className={format === f ? "seg active" : "seg"}
              onClick={() => onChange({ ...settings, format: f })}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
