import { useId } from "react";
import { cx } from "../lib/cx";
import { formatHours } from "../lib/format";
import { awakeHourCount, isAwakeHour } from "../lib/schedule";
import { HOURS, formatHour } from "../lib/time";
import type { Settings } from "../state/appState";
import { Segmented } from "./Segmented";
import styles from "./Panel.module.css";

interface AvailabilitySettingsProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onReset: () => void;
}

const FORMAT_OPTIONS = [
  { value: "12h", label: "12h" },
  { value: "24h", label: "24h" },
] as const;

export function AvailabilitySettings({ settings, onChange, onReset }: AvailabilitySettingsProps) {
  const { wake, sleep, timeFormat } = settings;
  const awakeHours = awakeHourCount(settings);
  const description =
    wake === sleep
      ? "Awake around the clock"
      : `${formatHours(awakeHours)} awake${wake > sleep ? " · overnight" : ""}`;

  return (
    <div className={cx(styles.group, styles.grow)}>
      <div className={styles.labelRow}>
        <span className={styles.label}>Awake window</span>
        <button type="button" className={styles.reset} onClick={onReset}>
          Reset all
        </button>
      </div>
      <div className={styles.fields}>
        <HourSelect label="Wake up" value={wake} format={timeFormat} onChange={(value) => onChange({ wake: value })} />
        <span className={styles.arrow} aria-hidden="true">
          →
        </span>
        <HourSelect label="Sleep" value={sleep} format={timeFormat} onChange={(value) => onChange({ sleep: value })} />
        <Segmented
          label="Time format"
          size="sm"
          value={timeFormat}
          options={FORMAT_OPTIONS}
          onChange={(value) => onChange({ timeFormat: value })}
        />
      </div>
      <div className={styles.window}>
        <div className={styles.windowBar} aria-hidden="true">
          {HOURS.map((hour) => (
            <span key={hour} className={cx(styles.windowSlot, isAwakeHour(hour, settings) && styles.windowAwake)} />
          ))}
        </div>
        <p className={styles.help}>{description}</p>
      </div>
    </div>
  );
}

interface HourSelectProps {
  label: string;
  value: number;
  format: Settings["timeFormat"];
  onChange: (value: number) => void;
}

function HourSelect({ label, value, format, onChange }: HourSelectProps) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
      </label>
      <div className={styles.selectWrap}>
        <select id={id} className={styles.select} value={value} onChange={(event) => onChange(Number(event.target.value))}>
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
