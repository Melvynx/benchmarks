import { formatHour, type Settings, type TimeFormat } from '../lib/time';
import type { Mode } from '../lib/storage';

interface ModeToggleProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="segmented" role="radiogroup" aria-label="Overlap mode">
      {(['meeting', 'base'] as const).map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={mode === value}
          className={mode === value ? 'is-selected' : ''}
          onClick={() => onChange(value)}
        >
          {value === 'meeting' ? 'Meeting' : 'Base'}
        </button>
      ))}
    </div>
  );
}

interface SettingsPanelProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h);

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  const sameHours = settings.wakeHour === settings.sleepHour;
  const label = (h: number) => formatHour(h, settings.format);

  return (
    <div className="settings">
      <label className="field">
        <span>Wake</span>
        <select value={settings.wakeHour} onChange={(e) => onChange({ wakeHour: Number(e.target.value) })}>
          {HOUR_OPTIONS.map((h) => (
            <option key={h} value={h}>
              {label(h)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Sleep</span>
        <select value={settings.sleepHour} onChange={(e) => onChange({ sleepHour: Number(e.target.value) })}>
          {HOUR_OPTIONS.map((h) => (
            <option key={h} value={h}>
              {label(h)}
            </option>
          ))}
        </select>
      </label>
      <div className="segmented segmented--small" role="radiogroup" aria-label="Time format">
        {(['12h', '24h'] as TimeFormat[]).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={settings.format === value}
            className={settings.format === value ? 'is-selected' : ''}
            onClick={() => onChange({ format: value })}
          >
            {value}
          </button>
        ))}
      </div>
      {sameHours && <p className="field-note">Wake equals sleep: treated as always awake.</p>}
    </div>
  );
}
