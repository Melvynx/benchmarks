import { useState, useRef } from 'react';
import { ChevronDown, Moon, RotateCcw, Settings2, Sun, X } from 'lucide-react';
import { formatTime, mod } from '../time';
import { useDismiss } from '../hooks';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export default function Preferences({ settings, onChange }) {
  const [open, setOpen] = useState(false);
  const container = useRef(null);
  useDismiss(container, () => setOpen(false));
  const awakeHours = mod((settings.sleep - settings.wake) * 60) / 60 || 24;

  return (
    <div className="settings-wrap" ref={container}>
      <button
        className={`settings-button ${open ? 'is-open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label="Preferences"
        aria-expanded={open}
        aria-controls="preferences-panel"
      >
        <Settings2 size={16} /><span>Preferences</span><ChevronDown size={13} />
      </button>
      {open && (
        <div className="settings-panel" id="preferences-panel">
          <div className="popover-heading">
            <h3>Your daily rhythm</h3>
            <button aria-label="Close preferences" onClick={() => setOpen(false)}><X size={16} /></button>
          </div>
          <p>One awake window, applied to every city.</p>
          <div className="schedule-fields">
            {[['wake', 'Wake up', Sun], ['sleep', 'Go to sleep', Moon]].map(([key, label, Icon]) => (
              <label key={key}>
                <span><Icon size={14} />{label}</span>
                <select value={settings[key]} onChange={event => onChange({ [key]: Number(event.target.value) })}>
                  {HOURS.map(hour => <option value={hour} key={hour}>{formatTime(hour * 60, settings.format)}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="awake-note">
            {awakeHours} hours awake
            {settings.wake > settings.sleep ? ' · Overnight schedule' : settings.wake === settings.sleep ? ' · Available all day' : ''}
          </div>
          <div className="format-setting">
            <span>Time format</span>
            <div className="format-switch">
              {['12', '24'].map(format => (
                <button key={format} className={settings.format === format ? 'selected' : ''}
                  aria-pressed={settings.format === format} onClick={() => onChange({ format })}>
                  {format}h
                </button>
              ))}
            </div>
          </div>
          <button className="reset-button" onClick={() => onChange({ wake: 7, sleep: 23, format: '12' })}>
            <RotateCcw size={12} />Reset preferences
          </button>
        </div>
      )}
    </div>
  );
}
