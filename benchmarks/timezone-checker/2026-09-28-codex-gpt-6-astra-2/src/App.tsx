import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Check, CircleHelp, Clock3, Globe2, Heart, House, Info, MapPin, Moon, MousePointer2, Sun, Users, X } from 'lucide-react';
import { CITIES } from './cities';
import { formatTime, overlapRanges, utcOffset, type Mode } from './time';
import { usePreferences } from './usePreferences';
import { CityPicker } from './components/CityPicker';
import { HelpDialog } from './components/HelpDialog';
import { OverlapSummary } from './components/OverlapSummary';
import { SettingsPanel } from './components/SettingsPanel';
import { TimeGrid } from './components/TimeGrid';
import { WorldScene } from './components/WorldScene';

export default function App() {
  const { preferences, setPreferences, storageAvailable } = usePreferences();
  const { cityIds, mode, settings } = preferences;
  const [now, setNow] = useState(() => new Date());
  const [showHelp, setShowHelp] = useState(false);
  const [selectedMinute, setSelectedMinute] = useState<number | null>(null);
  useEffect(() => { const interval = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(interval); }, []);
  const cities = useMemo(() => cityIds.flatMap(id => { const city = CITIES.find(item => item.id === id); return city ? [city] : []; }), [cityIds]);
  const offsets = useMemo(() => cities.map(city => utcOffset(city.timezone, now)), [cities, now]);
  const meetingRanges = useMemo(() => overlapRanges(offsets, offsets[0], settings), [offsets, settings]);
  const pairRanges = useMemo(() => offsets.slice(1).map(offset => overlapRanges([offsets[0], offset], offsets[0], settings)), [offsets, settings]);
  const reference = cities[0];
  const dateLabel = new Intl.DateTimeFormat('en-US', { timeZone: reference?.timezone ?? 'UTC', month: 'short', day: 'numeric', year: 'numeric' }).format(now);

  function setMode(next: Mode) { setPreferences(current => ({ ...current, mode: next })); }
  function addCity(id: string) { setPreferences(current => ({ ...current, cityIds: current.cityIds.includes(id) ? current.cityIds : [...current.cityIds, id] })); }
  function promoteCity(id: string) { setPreferences(current => ({ ...current, cityIds: [id, ...current.cityIds.filter(cityId => cityId !== id)] })); setSelectedMinute(null); }
  function removeCity(id: string) { setPreferences(current => ({ ...current, cityIds: current.cityIds.filter(cityId => cityId !== id) })); setSelectedMinute(null); }

  return <div className="app-shell">
    <header className="site-header"><a className="wordmark" href="#" aria-label="Back to top"><span className="brand-mark"><Globe2 size={23} strokeWidth={1.5} /></span><span>in good time<span className="brand-period">.</span></span></a><div className="header-right"><span className="live-status"><span className="tiny-dot" /> A little more connected</span><button className="help-button" onClick={() => setShowHelp(true)}><CircleHelp size={16} /> How it works</button></div></header>
    <main>
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><span /> DIFFERENT PLACES. SHARED MOMENTS.</div><h1>GPT-6</h1><p className="hero-subtitle">Find a little time together.</p><p className="hero-description">Your people, across the planet. Discover the hours<br className="desktop-break" /> that bring everyone into the same moment.</p></div><WorldScene now={now} format={settings.format} /></section>

      <section className="workspace" aria-label="Timezone overlap checker">
        <div className="workspace-toolbar"><div className="mode-tabs" role="group" aria-label="Comparison mode"><button aria-pressed={mode === 'meeting'} className={mode === 'meeting' ? 'active' : ''} onClick={() => setMode('meeting')}><Users size={16} />Meeting mode</button><button aria-pressed={mode === 'base'} className={mode === 'base' ? 'active' : ''} onClick={() => setMode('base')}><House size={16} />Base mode</button></div><div className="toolbar-actions"><SettingsPanel settings={settings} onChange={next => setPreferences(current => ({ ...current, settings: next }))} /><span className="toolbar-divider" /><CityPicker selected={cityIds} onAdd={addCity} /></div></div>
        <div className="workspace-intro"><div><h2>{mode === 'meeting' ? 'Better together.' : 'Your world, in sync.'}</h2><p>{mode === 'meeting' ? 'Find the sweet spot when everyone is awake.' : 'Find a little shared time between your base and each city.'}</p></div><span className="today-label"><CalendarDays size={15} /><span>Today, {dateLabel}</span></span></div>

        <div className="summary-container"><OverlapSummary cities={cities} mode={mode} format={settings.format} meetingRanges={meetingRanges} pairRanges={pairRanges} onSelect={setSelectedMinute} /></div>

        {cities.length > 0 ? <>
          <div className="grid-context"><span><Globe2 size={13} /><strong>{cities.length} {cities.length === 1 ? 'city' : 'cities'}</strong><span className="context-divider">/</span>One shared day</span><span><Clock3 size={13} /> All hours in {reference.name} time</span></div>
          <TimeGrid cities={cities} offsets={offsets} settings={settings} mode={mode} now={now} meetingRanges={meetingRanges} pairRanges={pairRanges} selectedMinute={selectedMinute} onSelect={setSelectedMinute} onPromote={promoteCity} onRemove={removeCity} />
          {cities.length === 1 && <div className="single-city-note"><Info size={15} /> Add another city to discover your overlap.</div>}
          {selectedMinute !== null && <div className="selected-time" aria-live="polite"><span className="selected-label"><Clock3 size={15} /> A moment together</span><div className="selected-cities">{cities.map((city, index) => <span key={city.id}>{city.name} <strong>{formatTime(selectedMinute + offsets[index] - offsets[0], settings.format)}</strong></span>)}</div><button className="icon-button" onClick={() => setSelectedMinute(null)} aria-label="Close selected time"><X size={16} /></button></div>}
          <div className="grid-bottom"><span className="reference-hint"><MousePointer2 size={14} /> Click a city’s name to make it your reference</span><div className="legend"><span><i className="legend-swatch overlap" />Overlap</span><span><i className="legend-swatch awake" />Awake</span><span><i className="legend-swatch sleeping" />Sleeping</span></div></div>
        </> : <div className="empty-state"><span><Globe2 size={35} strokeWidth={1.3} /></span><h3>Your world starts with a city.</h3><p>Add your first city above, then a few places your people call home.</p></div>}

        <div className="workspace-footer"><span><Sun size={15} /><span>Awake from <strong>{formatTime(settings.wake * 60, settings.format)}</strong> to <strong>{formatTime(settings.sleep * 60, settings.format)}</strong></span><Moon size={13} /></span><span className="saved-status">{storageAvailable ? <><Check size={13} /> Saved on this device</> : <><Info size={13} /> Settings won’t be saved in this browser</>}</span></div>
      </section>

      <section className="below-workspace"><div className="green-hint"><span className="hint-icon"><Heart size={14} /></span><p>{mode === 'meeting' ? 'Green cells = everyone awake' : 'Green cells = shared time with your base'}<span>{mode === 'meeting' ? 'A good time to say hello.' : 'A little time for each connection.'}</span></p></div><div className="timezone-note"><span className="tiny-dot" /> Daylight saving? Already taken care of.</div></section>
      <section className="bottom-note"><div className="mini-orbits" aria-hidden="true"><span /><span /><span /></div><p>Less timezone math.<br /><strong>More human connection.</strong></p><ArrowRight size={18} /></section>
    </main>
    <footer className="site-footer"><span>Made for a world that works together.</span><span><MapPin size={12} /> Wherever you call home.</span></footer>
    {showHelp && <HelpDialog onClose={() => setShowHelp(false)} />}
  </div>;
}
