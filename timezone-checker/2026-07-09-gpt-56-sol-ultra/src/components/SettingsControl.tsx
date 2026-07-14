import { useEffect, useRef, useState } from 'react';
import { RotateCcw, SlidersHorizontal, X } from 'lucide-react';

import { formatHourOption } from '../lib/timezone';
import type { TimeFormat } from '../types';

interface SettingsControlProps {
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
  onWakeHourChange: (hour: number) => void;
  onSleepHourChange: (hour: number) => void;
  onTimeFormatChange: (format: TimeFormat) => void;
  onReset: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function SettingsControl({
  wakeHour,
  sleepHour,
  timeFormat,
  onWakeHourChange,
  onSleepHourChange,
  onTimeFormatChange,
  onReset,
}: SettingsControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="settings-control" ref={wrapperRef}>
      <span className="control-label" id="availability-label">Availability</span>
      <button
        className="settings-trigger"
        type="button"
        ref={triggerRef}
        aria-labelledby="availability-label availability-value"
        aria-expanded={isOpen}
        aria-controls="availability-settings"
        onClick={() => setIsOpen((open) => !open)}
      >
        <SlidersHorizontal size={17} aria-hidden="true" />
        <span id="availability-value">
          {formatHourOption(wakeHour, timeFormat)} — {formatHourOption(sleepHour, timeFormat)}
        </span>
      </button>

      {isOpen && (
        <section
          className="settings-popover"
          id="availability-settings"
          role="dialog"
          aria-label="Availability settings"
        >
          <div className="settings-popover__header">
            <div>
              <p className="eyebrow">Shared schedule</p>
              <h2>Availability</h2>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label="Close settings"
              onClick={() => {
                setIsOpen(false);
                triggerRef.current?.focus();
              }}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <p className="settings-popover__intro">
            The same awake window applies to everyone. Overnight schedules are welcome.
          </p>

          <div className="settings-field-grid">
            <div className="settings-field">
              <label htmlFor="wake-hour">Wake up</label>
              <select id="wake-hour" value={wakeHour} onChange={(event) => onWakeHourChange(Number(event.target.value))}>
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>{formatHourOption(hour, timeFormat)}</option>
                ))}
              </select>
            </div>
            <div className="settings-field">
              <label htmlFor="sleep-hour">Sleep</label>
              <select id="sleep-hour" value={sleepHour} onChange={(event) => onSleepHourChange(Number(event.target.value))}>
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>{formatHourOption(hour, timeFormat)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="settings-format">
            <span>Time format</span>
            <div className="segmented-control segmented-control--small" role="group" aria-label="Time format">
              {(['12h', '24h'] as const).map((format) => (
                <button
                  className="segmented-control__button"
                  data-active={timeFormat === format}
                  key={format}
                  type="button"
                  aria-pressed={timeFormat === format}
                  onClick={() => onTimeFormatChange(format)}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>

          {wakeHour === sleepHour && (
            <p className="settings-note">Matching times mean everyone is awake all day.</p>
          )}

          <button className="reset-button" type="button" onClick={onReset}>
            <RotateCcw size={15} aria-hidden="true" />
            Reset defaults
          </button>
        </section>
      )}
    </div>
  );
}
