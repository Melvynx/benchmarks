import type { ReactNode } from "react";
import { awakeHoursPerDay, HOURS } from "../lib/schedule";
import { formatHour, type TimeFormat } from "../lib/time";
import type { Settings } from "../state/appState";
import { MoonIcon, SunIcon } from "./icons";
import styles from "./Panel.module.css";
import { Segmented } from "./Segmented";

interface SettingsPanelProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  const { wakeHour, sleepHour, timeFormat } = settings;
  const awakeHours = awakeHoursPerDay(settings);
  const note =
    wakeHour === sleepHour
      ? "Same wake and sleep hour: awake around the clock."
      : `${awakeHours}h awake per day${wakeHour > sleepHour ? " · overnight schedule" : ""}`;

  return (
    <section className={styles.panel} aria-labelledby="settings-heading">
      <h2 id="settings-heading" className={styles.heading}>
        Availability
      </h2>
      <div className={styles.fields}>
        <HourSelect
          id="wake-hour"
          label="Wake up"
          icon={<SunIcon size={15} />}
          value={wakeHour}
          format={timeFormat}
          onChange={(value) => onChange({ wakeHour: value })}
        />
        <HourSelect
          id="sleep-hour"
          label="Sleep"
          icon={<MoonIcon size={15} />}
          value={sleepHour}
          format={timeFormat}
          onChange={(value) => onChange({ sleepHour: value })}
        />
        <div className={styles.field}>
          <span className={styles.label} aria-hidden="true">
            Format
          </span>
          <Segmented
            label="Time format"
            size="sm"
            value={timeFormat}
            onChange={(value) => onChange({ timeFormat: value })}
            options={[
              { value: "12h", label: "12h" },
              { value: "24h", label: "24h" },
            ]}
          />
        </div>
      </div>
      <p className={styles.description}>{note}</p>
    </section>
  );
}

interface HourSelectProps {
  id: string;
  label: string;
  icon: ReactNode;
  value: number;
  format: TimeFormat;
  onChange: (value: number) => void;
}

function HourSelect({ id, label, icon, value, format, onChange }: HourSelectProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.selectWrap}>
        <span className={styles.selectIcon}>{icon}</span>
        <select id={id} className={styles.select} value={value} onChange={(e) => onChange(Number(e.target.value))}>
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>
              {formatHour(hour, format)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
