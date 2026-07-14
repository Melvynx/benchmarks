import { formatHour, type TimeFormat } from "../lib/format";

interface Props {
  wake: number;
  sleep: number;
  timeFormat: TimeFormat;
  onWake: (h: number) => void;
  onSleep: (h: number) => void;
  onTimeFormat: (f: TimeFormat) => void;
}

function HourStepper({
  label,
  value,
  format,
  onChange,
}: {
  label: string;
  value: number;
  format: TimeFormat;
  onChange: (h: number) => void;
}) {
  const wrap = (h: number) => ((h % 24) + 24) % 24;
  return (
    <div className="stepper">
      <span className="stepper__label">{label}</span>
      <div className="stepper__control">
        <button
          className="stepper__btn"
          onClick={() => onChange(wrap(value - 1))}
          aria-label={`Decrease ${label}`}
        >
          –
        </button>
        <span className="stepper__value">{formatHour(value, 0, format)}</span>
        <button
          className="stepper__btn"
          onClick={() => onChange(wrap(value + 1))}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function SettingsPanel({
  wake,
  sleep,
  timeFormat,
  onWake,
  onSleep,
  onTimeFormat,
}: Props) {
  return (
    <div className="settings">
      <HourStepper label="Wake up" value={wake} format={timeFormat} onChange={onWake} />
      <HourStepper label="Sleep" value={sleep} format={timeFormat} onChange={onSleep} />
      <div className="stepper">
        <span className="stepper__label">Time format</span>
        <div className="segmented segmented--sm">
          {(["12h", "24h"] as TimeFormat[]).map((f) => (
            <button
              key={f}
              className={`segmented__btn ${timeFormat === f ? "is-active" : ""}`}
              onClick={() => onTimeFormat(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
