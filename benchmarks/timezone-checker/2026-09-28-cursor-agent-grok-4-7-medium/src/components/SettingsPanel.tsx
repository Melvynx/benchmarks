import { useEffect, useId, useRef, useState } from 'react';
import { awakeHourCount } from '../lib/schedule';
import { awakeWindowLabel, formatClock } from '../lib/format';
import type { TimeFormat } from '../types';
import { IconClock } from './icons';

type Props = {
  wake: number;
  sleep: number;
  format: TimeFormat;
  onChange: (patch: { wake?: number; sleep?: number; format?: TimeFormat }) => void;
};

export function SettingsPanel({ wake, sleep, format, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const count = awakeHourCount(wake, sleep);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="settings" ref={rootRef}>
      <button
        type="button"
        className="settings-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <IconClock />
        <span>{awakeWindowLabel(wake, sleep, format)}</span>
      </button>
      {open ? (
        <div className="popover" id={panelId} role="dialog" aria-label="Awake hours">
          <p className="popover-title">Awake window</p>
          <p className="help">
            {count === 0
              ? 'Nobody is awake with this setting.'
              : `${count} awake ${count === 1 ? 'hour' : 'hours'}. Same window for every city. A sleep time before wake covers a night shift.`}
          </p>
          <div className="field-row">
            <div className="field">
              <label htmlFor="wake-hour">Wake-up hour</label>
              <select id="wake-hour" value={wake} onChange={(event) => onChange({ wake: Number(event.target.value) })}>
                {Array.from({ length: 24 }, (_, hour) => (
                  <option key={hour} value={hour}>
                    {formatClock(hour, 0, format)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="sleep-hour">Sleep hour</label>
              <select id="sleep-hour" value={sleep} onChange={(event) => onChange({ sleep: Number(event.target.value) })}>
                {Array.from({ length: 24 }, (_, hour) => (
                  <option key={hour} value={hour}>
                    {formatClock(hour, 0, format)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <span>Time format</span>
            <div className="segment" role="group" aria-label="Time format">
              <button type="button" aria-pressed={format === '12'} onClick={() => onChange({ format: '12' })}>
                12h
              </button>
              <button type="button" aria-pressed={format === '24'} onClick={() => onChange({ format: '24' })}>
                24h
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
