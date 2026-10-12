import { useEffect, useRef } from 'react';
import { Globe2, MousePointer2, SlidersHorizontal, Users, X } from 'lucide-react';

export function HelpDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog className="help-dialog" ref={dialog} onClose={onClose} onClick={event => { if (event.target === dialog.current) onClose(); }}>
    <button className="icon-button help-close" onClick={onClose} aria-label="Close help"><X size={20} /></button>
    <span className="help-globe"><Globe2 size={28} /></span><h2>A little more in sync.</h2><p className="help-intro">Good conversations start with good timing.</p>
    <div className="help-step"><Users size={20} /><div><h3>Choose your kind of together</h3><p>Meeting mode finds time when everyone is awake. Base mode compares each city independently with your reference city.</p></div></div>
    <div className="help-step"><MousePointer2 size={20} /><div><h3>Make yourself at home</h3><p>Click a city’s name to make it the reference. The grid and all overlap ranges follow that city’s day. Click any hour to see the local times together.</p></div></div>
    <div className="help-step"><SlidersHorizontal size={20} /><div><h3>Set your rhythm</h3><p>Adjust wake and sleep hours in Settings. Overnight schedules work too. The same awake window applies to every city.</p></div></div>
    <div className="help-detail">Ranges include their start and exclude their end. Each grid cell shows the time at the start of that reference hour; summaries preserve exact half-hour and quarter-hour boundaries. UTC offsets follow today’s daylight saving rules.</div>
    <button className="button button-primary help-done" onClick={onClose}>Let’s find some time</button>
  </dialog>;
}
