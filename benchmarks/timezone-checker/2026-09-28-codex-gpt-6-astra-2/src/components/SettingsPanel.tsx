import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Moon, SlidersHorizontal, Sun, X } from 'lucide-react';
import { formatTime, HOURS, type Settings } from '../time';

export function SettingsPanel({ settings, onChange }: { settings: Settings; onChange: (settings: Settings) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const wakeSelect = useRef<HTMLSelectElement>(null);
  function close() { setOpen(false); trigger.current?.focus(); }
  useEffect(() => {
    if (!open) return;
    wakeSelect.current?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  return <div className="settings-anchor" ref={root} onKeyDown={event => { if (event.key === 'Escape') close(); }}>
    <button ref={trigger} className={`button button-settings ${open ? 'is-open' : ''}`} aria-expanded={open} aria-controls="settings-panel" onClick={() => setOpen(!open)}><SlidersHorizontal size={16} /><span>Settings</span><ChevronDown size={13} /></button>
    {open && <section className="popover settings-panel" id="settings-panel" role="dialog" aria-label="Availability settings">
      <div className="popover-heading"><span>Make time your own</span><button className="icon-button" onClick={close} aria-label="Close settings"><X size={16} /></button></div>
      <p className="settings-description">One awake window, applied to every city.</p>
      <div className="schedule-inputs">
        <label><span><Sun size={15} /> Wake up</span><select ref={wakeSelect} value={settings.wake} onChange={event => onChange({ ...settings, wake: Number(event.target.value) })}>{HOURS.map(hour => <option value={hour} key={hour}>{formatTime(hour * 60, settings.format)}</option>)}</select></label>
        <label><span><Moon size={15} /> Go to sleep</span><select value={settings.sleep} onChange={event => onChange({ ...settings, sleep: Number(event.target.value) })}>{HOURS.map(hour => <option value={hour} key={hour}>{formatTime(hour * 60, settings.format)}</option>)}</select></label>
      </div>
      <p className="schedule-note">{settings.wake === settings.sleep ? 'Same hours means awake for all 24 hours.' : settings.wake > settings.sleep ? 'Night owl? Your awake window crosses midnight.' : 'Sleep time is the end of your availability.'}</p>
      <div className="format-setting"><span>Time format</span><div className="mini-segment" role="group" aria-label="Time format">{(['12h', '24h'] as const).map(format => <button key={format} aria-pressed={settings.format === format} onClick={() => onChange({ ...settings, format })}>{format}</button>)}</div></div>
      <div className="settings-footnote"><span className="tiny-dot" /> Changes apply instantly</div>
    </section>}
  </div>;
}
