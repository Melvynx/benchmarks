import { useEffect, useRef, useState } from "react";
import { formatHour, type TimeFormat } from "../lib/timezone";
import { CloseIcon, SlidersIcon } from "./Icons";

type SettingsPanelProps = {
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
  onWakeChange: (hour: number) => void;
  onSleepChange: (hour: number) => void;
  onFormatChange: (format: TimeFormat) => void;
};

export function SettingsPanel({
  wakeHour,
  sleepHour,
  timeFormat,
  onWakeChange,
  onSleepChange,
  onFormatChange,
}: SettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const duration = (sleepHour - wakeHour + 24) % 24 || 24;
  const overnight = wakeHour > sleepHour;
  const schedule = `${formatHour(wakeHour, timeFormat)} → ${formatHour(sleepHour, timeFormat)}`;

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="popover-root settings-root" ref={rootRef}>
      <button
        ref={triggerRef}
        className="control-button schedule-button"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <SlidersIcon />
        <span className="control-button-copy"><span>Awake</span><strong>{schedule}</strong></span>
      </button>

      {open && (
        <div className="popover settings-popover" role="dialog" aria-label="Availability settings">
          <div className="popover-heading">
            <div>
              <strong>Availability</strong>
              <span>Applied to every city</span>
            </div>
            <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close settings">
              <CloseIcon />
            </button>
          </div>

          <div className="schedule-preview" aria-live="polite">
            <div>
              <span className="preview-label">Awake window</span>
              <strong>{schedule}</strong>
            </div>
            <div className="schedule-tags">
              <span>{duration} {duration === 1 ? "hour" : "hours"}</span>
              {overnight && <span className="overnight-tag">Overnight</span>}
              {wakeHour === sleepHour && <span className="overnight-tag">All day</span>}
            </div>
          </div>

          <div className="settings-fields">
            <label className="select-field">
              <span>Wake-up hour</span>
              <select value={wakeHour} onChange={(event) => onWakeChange(Number(event.target.value))}>
                {Array.from({ length: 24 }, (_, hour) => (
                  <option value={hour} key={hour}>{formatHour(hour, timeFormat)}</option>
                ))}
              </select>
            </label>
            <label className="select-field">
              <span>Sleep hour</span>
              <select value={sleepHour} onChange={(event) => onSleepChange(Number(event.target.value))}>
                {Array.from({ length: 24 }, (_, hour) => (
                  <option value={hour} key={hour}>{formatHour(hour, timeFormat)}</option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="format-fieldset">
            <legend>Time format</legend>
            <div className="mini-segmented">
              {(["12h", "24h"] as TimeFormat[]).map((format) => (
                <button
                  key={format}
                  type="button"
                  aria-pressed={timeFormat === format}
                  className={timeFormat === format ? "selected" : undefined}
                  onClick={() => onFormatChange(format)}
                >
                  {format}
                </button>
              ))}
            </div>
          </fieldset>

          <p className="settings-note">Wake is inclusive and sleep is exclusive. Matching hours means awake all day.</p>
        </div>
      )}
    </div>
  );
}
