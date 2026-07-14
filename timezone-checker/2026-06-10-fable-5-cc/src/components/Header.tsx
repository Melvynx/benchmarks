import { useEffect, useRef, useState } from 'react';
import type { Mode, Settings, TimeFormat } from '../lib/appState';
import { cx } from '../lib/cx';
import { formatHour } from '../lib/format';
import { LogoIcon, SlidersIcon } from './icons';

interface HeaderProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  settings: Settings;
  onSettingsChange: (patch: Partial<Settings>) => void;
}

export function Header({ mode, onModeChange, settings, onSettingsChange }: HeaderProps) {
  return (
    <header className="header">
      <div className="brand">
        <span className="brand-mark">
          <LogoIcon />
        </span>
        <div className="brand-copy">
          <h1>Fable 5</h1>
          <p>Timezone overlap checker</p>
        </div>
      </div>
      <div className="header-controls">
        <div className="segmented" role="group" aria-label="Comparison mode">
          <button
            type="button"
            className={cx(mode === 'meeting' && 'active')}
            onClick={() => onModeChange('meeting')}
            title="Find hours when every city is awake at once"
          >
            Meeting
          </button>
          <button
            type="button"
            className={cx(mode === 'base' && 'active')}
            onClick={() => onModeChange('base')}
            title="Compare each city against the reference, one-on-one"
          >
            Base
          </button>
        </div>
        <SettingsMenu settings={settings} onChange={onSettingsChange} />
      </div>
    </header>
  );
}

function SettingsMenu({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const awakeLength = (settings.sleep - settings.wake + 24) % 24 || 24;

  return (
    <div className="settings" ref={rootRef}>
      <button
        type="button"
        className="settings-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Availability settings"
      >
        <SlidersIcon />
        <span>
          {formatHour(settings.wake, settings.format)} – {formatHour(settings.sleep, settings.format)}
        </span>
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label="Availability settings">
          <h3>Awake window</h3>
          <div className="popover-grid">
            <label>
              <span>Wake up</span>
              <HourSelect
                value={settings.wake}
                format={settings.format}
                onChange={(wake) => onChange({ wake })}
              />
            </label>
            <label>
              <span>Sleep</span>
              <HourSelect
                value={settings.sleep}
                format={settings.format}
                onChange={(sleep) => onChange({ sleep })}
              />
            </label>
          </div>
          <p className="popover-note">
            {awakeLength === 24 ? 'Awake around the clock' : `${awakeLength}h awake`} — the same
            window applies to every city.
          </p>
          <h3>Time format</h3>
          <div className="segmented segmented--small" role="group" aria-label="Time format">
            {(['12h', '24h'] as TimeFormat[]).map((format) => (
              <button
                key={format}
                type="button"
                className={cx(settings.format === format && 'active')}
                onClick={() => onChange({ format })}
              >
                {format}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HourSelect({
  value,
  format,
  onChange,
}: {
  value: number;
  format: TimeFormat;
  onChange: (value: number) => void;
}) {
  return (
    <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
      {Array.from({ length: 24 }, (_, hour) => (
        <option key={hour} value={hour}>
          {formatHour(hour, format)}
        </option>
      ))}
    </select>
  );
}
