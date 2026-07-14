import type { Settings } from '../types';

interface SettingsPanelProps {
  settings: Settings;
  onUpdate: (settings: Settings) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ settings, onUpdate, isOpen, onClose }: SettingsPanelProps) {
  if (!isOpen) return null;

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>Settings</h3>
          <button className="settings-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="settings-group">
          <label>Time format</label>
          <div className="toggle-group">
            <button
              className={settings.timeFormat === '24h' ? 'active' : ''}
              onClick={() => onUpdate({ ...settings, timeFormat: '24h' })}
            >
              24h
            </button>
            <button
              className={settings.timeFormat === '12h' ? 'active' : ''}
              onClick={() => onUpdate({ ...settings, timeFormat: '12h' })}
            >
              12h
            </button>
          </div>
        </div>

        <div className="settings-group">
          <label>Working hours (overlap band)</label>
          <div className="range-selects">
            <select
              value={settings.workStart}
              onChange={(e) => onUpdate({ ...settings, workStart: +e.target.value })}
            >
              {hours.map((h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
            <span className="range-sep">to</span>
            <select
              value={settings.workEnd}
              onChange={(e) => onUpdate({ ...settings, workEnd: +e.target.value })}
            >
              {hours.map((h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="settings-group">
          <label>Wake-up window</label>
          <div className="range-selects">
            <select
              value={settings.wakeStart}
              onChange={(e) => onUpdate({ ...settings, wakeStart: +e.target.value })}
            >
              {hours.map((h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
            <span className="range-sep">to</span>
            <select
              value={settings.wakeEnd}
              onChange={(e) => onUpdate({ ...settings, wakeEnd: +e.target.value })}
            >
              {hours.map((h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
