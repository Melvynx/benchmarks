import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Moon, Settings2, Sun, X } from 'lucide-react';
import { formatTime, HOURS, type Settings } from '../lib/time';

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

export default function Preferences({ settings, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return (
    <div className="preferences" ref={root}>
      <button
        className={`preferences-button ${open ? 'is-open' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Settings2 size={17} />
        <span>Preferences</span>
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="preferences-popover" role="region" aria-label="Availability preferences">
          <div className="picker-heading">
            <span>Your waking hours</span>
            <button
              aria-label="Close preferences"
              className="icon-button"
              onClick={() => setOpen(false)}
            >
              <X size={16} />
            </button>
          </div>
          <p className="preferences-description">A shared daily rhythm for every city.</p>
          <div className="time-settings">
            <label>
              <span>
                <Sun size={15} /> Wake up
              </span>
              <select
                aria-label="Wake-up hour"
                value={settings.wake}
                onChange={(event) => onChange({ ...settings, wake: Number(event.target.value) })}
              >
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {formatTime(hour * 60, settings.format)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>
                <Moon size={15} /> Go to sleep
              </span>
              <select
                aria-label="Sleep hour"
                value={settings.sleep}
                onChange={(event) => onChange({ ...settings, sleep: Number(event.target.value) })}
              >
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {formatTime(hour * 60, settings.format)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="format-setting">
            <span>Time format</span>
            <div className="format-toggle">
              {(['12h', '24h'] as const).map((format) => (
                <button
                  key={format}
                  className={settings.format === format ? 'active' : ''}
                  aria-pressed={settings.format === format}
                  onClick={() => onChange({ ...settings, format })}
                >
                  {format === '12h' ? '12-hour' : '24-hour'}
                </button>
              ))}
            </div>
          </div>
          <div className="preferences-note">
            <span className="status-dot" />
            {settings.wake === settings.sleep
              ? 'Same hours means available all day.'
              : settings.wake > settings.sleep
                ? 'Night shift? Overnight hours are supported.'
                : 'Changes apply instantly to every city.'}
          </div>
        </div>
      )}
    </div>
  );
}
