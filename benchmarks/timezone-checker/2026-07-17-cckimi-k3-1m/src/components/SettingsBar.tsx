import { HOURS, formatHourLabel } from '../lib/time';

export interface Settings {
  /** Wake-up hour, 0–23 (inclusive). */
  wake: number;
  /** Sleep hour, 0–23 (exclusive — the hour you go to bed). */
  sleep: number;
  hour12: boolean;
}

interface Props {
  settings: Settings;
  onPatch: (patch: Partial<Settings>) => void;
}

export function SettingsBar({ settings, onPatch }: Props) {
  const windowLength = ((settings.sleep - settings.wake + 24) % 24) || 24;
  const overnight = settings.wake > settings.sleep;

  return (
    <section
      className="card flex flex-wrap items-center gap-x-7 gap-y-3 px-4 py-3"
      aria-label="Availability settings"
    >
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="text-fog">Awake from</span>
        <select
          className="select"
          aria-label="Wake-up hour"
          value={settings.wake}
          onChange={(e) => onPatch({ wake: Number(e.target.value) })}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {formatHourLabel(h, settings.hour12)}
            </option>
          ))}
        </select>
        <span className="text-fog">to</span>
        <select
          className="select"
          aria-label="Sleep hour"
          value={settings.sleep}
          onChange={(e) => onPatch({ sleep: Number(e.target.value) })}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {formatHourLabel(h, settings.hour12)}
            </option>
          ))}
        </select>
        <span className="window-pill">{windowLength}h window</span>
        {overnight && <span className="chip">overnight</span>}
      </div>

      <div className="flex items-center gap-2 sm:ms-auto">
        <span className="text-[13px] text-fog">Clock</span>
        <div className="seg" role="group" aria-label="Time format">
          <button
            type="button"
            className={settings.hour12 ? 'active' : ''}
            aria-pressed={settings.hour12}
            onClick={() => onPatch({ hour12: true })}
          >
            12h
          </button>
          <button
            type="button"
            className={!settings.hour12 ? 'active' : ''}
            aria-pressed={!settings.hour12}
            onClick={() => onPatch({ hour12: false })}
          >
            24h
          </button>
        </div>
      </div>
    </section>
  );
}
