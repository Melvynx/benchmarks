import type { ReactNode } from "react";
import { HOURS, awakeDuration, formatHour } from "../lib/time";
import type { Mode, Settings } from "../types";
import { AnchorIcon, MoonIcon, SunIcon, UsersIcon } from "./Icons";
import { Segmented } from "./Segmented";

interface ControlsPanelProps {
  mode: Mode;
  settings: Settings;
  onModeChange: (mode: Mode) => void;
  onSettingsChange: (patch: Partial<Settings>) => void;
}

const MODE_COPY: Record<Mode, string> = {
  meeting: "Hours when every city is awake at once.",
  base: "Each city's overlap with the reference city.",
};

export function ControlsPanel({ mode, settings, onModeChange, onSettingsChange }: ControlsPanelProps) {
  const duration = awakeDuration(settings);
  const overnight = settings.sleepHour < settings.wakeHour;

  return (
    <section className="panel controls" aria-label="Settings">
      <div className="controls__group">
        <span className="eyebrow">Mode</span>
        <Segmented
          label="Mode"
          value={mode}
          onChange={onModeChange}
          options={[
            { value: "meeting", label: <><UsersIcon /> Meeting</> },
            { value: "base", label: <><AnchorIcon /> Base</> },
          ]}
        />
        <p className="controls__hint">{MODE_COPY[mode]}</p>
      </div>

      <div className="controls__divider" aria-hidden />

      <div className="controls__group">
        <span className="eyebrow">Awake window</span>
        <div className="controls__row">
          <HourSelect
            label="Wake up"
            icon={<SunIcon />}
            value={settings.wakeHour}
            format={settings.timeFormat}
            onChange={(wakeHour) => onSettingsChange({ wakeHour })}
          />
          <span className="controls__arrow" aria-hidden>→</span>
          <HourSelect
            label="Sleep"
            icon={<MoonIcon />}
            value={settings.sleepHour}
            format={settings.timeFormat}
            onChange={(sleepHour) => onSettingsChange({ sleepHour })}
          />
        </div>
        <p className="controls__hint">
          {duration}h awake{overnight ? " · overnight" : ""} · applies to every city
        </p>
      </div>

      <div className="controls__divider" aria-hidden />

      <div className="controls__group">
        <span className="eyebrow">Format</span>
        <Segmented
          label="Time format"
          value={settings.timeFormat}
          onChange={(timeFormat) => onSettingsChange({ timeFormat })}
          options={[
            { value: "12h", label: "12h" },
            { value: "24h", label: "24h" },
          ]}
        />
      </div>
    </section>
  );
}

interface HourSelectProps {
  label: string;
  icon: ReactNode;
  value: number;
  format: Settings["timeFormat"];
  onChange: (hour: number) => void;
}

function HourSelect({ label, icon, value, format, onChange }: HourSelectProps) {
  return (
    <label className="hour-select">
      <span className="hour-select__label">
        {icon}
        {label}
      </span>
      <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {HOURS.map((hour) => (
          <option key={hour} value={hour}>
            {formatHour(hour, format)}
          </option>
        ))}
      </select>
    </label>
  );
}
