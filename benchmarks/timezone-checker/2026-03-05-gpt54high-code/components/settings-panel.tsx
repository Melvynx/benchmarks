import type { AppMode, TimeFormat } from "@/lib/types";

type SettingsPanelProps = {
  mode: AppMode;
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
  onModeChange: (mode: AppMode) => void;
  onWakeHourChange: (hour: number) => void;
  onSleepHourChange: (hour: number) => void;
  onTimeFormatChange: (format: TimeFormat) => void;
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);

export function SettingsPanel({
  mode,
  wakeHour,
  sleepHour,
  timeFormat,
  onModeChange,
  onWakeHourChange,
  onSleepHourChange,
  onTimeFormatChange,
}: SettingsPanelProps) {
  return (
    <section className="panel-card settings-panel">
      <div className="panel-header">
        <p className="panel-kicker">Settings</p>
        <h2>Availability rules</h2>
      </div>

      <div className="segmented-control" role="tablist" aria-label="Mode selector">
        <button
          type="button"
          className={mode === "meeting" ? "segment active" : "segment"}
          onClick={() => onModeChange("meeting")}
        >
          Meeting Mode
        </button>
        <button
          type="button"
          className={mode === "base" ? "segment active" : "segment"}
          onClick={() => onModeChange("base")}
        >
          Base Mode
        </button>
      </div>

      <div className="settings-grid">
        <label className="select-field">
          <span>Wake-up hour</span>
          <select value={wakeHour} onChange={(event) => onWakeHourChange(Number(event.target.value))}>
            {HOUR_OPTIONS.map((hour) => (
              <option key={hour} value={hour}>
                {hour.toString().padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </label>

        <label className="select-field">
          <span>Sleep hour</span>
          <select value={sleepHour} onChange={(event) => onSleepHourChange(Number(event.target.value))}>
            {HOUR_OPTIONS.map((hour) => (
              <option key={hour} value={hour}>
                {hour.toString().padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </label>

        <label className="select-field">
          <span>Time format</span>
          <select
            value={timeFormat}
            onChange={(event) => onTimeFormatChange(event.target.value as TimeFormat)}
          >
            <option value="12h">12-hour</option>
            <option value="24h">24-hour</option>
          </select>
        </label>
      </div>
    </section>
  );
}
