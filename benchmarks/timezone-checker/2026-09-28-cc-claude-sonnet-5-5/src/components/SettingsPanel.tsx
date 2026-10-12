import { HOURS, formatHourLabel, type HourFormat, type Settings } from "../lib/time";

interface Props {
  settings: Settings;
  onWake: (h: number) => void;
  onSleep: (h: number) => void;
  onFormat: (f: HourFormat) => void;
}

export function SettingsPanel({ settings, onWake, onSleep, onFormat }: Props) {
  const hourSelect = (id: string, value: number, onChange: (h: number) => void) => (
    <select id={id} value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {HOURS.map((h) => (
        <option key={h} value={h}>
          {formatHourLabel(h, settings.format)}
        </option>
      ))}
    </select>
  );

  return (
    <section className="card settings" aria-label="Availability settings">
      <div className="field">
        <label htmlFor="wake">Wake-up</label>
        {hourSelect("wake", settings.wake, onWake)}
      </div>
      <div className="field">
        <label htmlFor="sleep">Sleep</label>
        {hourSelect("sleep", settings.sleep, onSleep)}
      </div>
      <div className="field">
        <span className="label">Time format</span>
        <div className="segmented small" role="radiogroup" aria-label="Time format">
          {(["12h", "24h"] as const).map((f) => (
            <button
              key={f}
              role="radio"
              aria-checked={settings.format === f}
              className={settings.format === f ? "active" : ""}
              onClick={() => onFormat(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
