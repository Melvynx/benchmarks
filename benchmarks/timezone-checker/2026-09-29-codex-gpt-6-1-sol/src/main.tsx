import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, Check, ChevronDown, Clock3, Globe2, MapPin, Moon, Plus, Search, Settings2, Sun, Users, X } from 'lucide-react';
import { calculate, cities, formatTime, hours, loadSettings, offsetLabel, ranges, type City, type Settings } from './timezones';
import './styles.css';

function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [now, setNow] = useState(new Date());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [hovered, setHovered] = useState<number | null>(null);
  const [storageError, setStorageError] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const selected = settings.cities.map(id => cities.find(city => city.id === id)!);
  const reference = selected[0];
  const data = calculate(selected, settings, now);
  const update = (patch: Partial<Settings>) => setSettings(previous => ({ ...previous, ...patch }));

  useEffect(() => {
    try { localStorage.setItem('codex-timezones-v1', JSON.stringify(settings)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [settings]);
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!pickerRef.current?.contains(event.target as Node)) setPickerOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setPickerOpen(false); setSettingsOpen(false); } };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
  }, []);

  const promote = (city: City) => update({ cities: [city.id, ...settings.cities.filter(id => id !== city.id)] });
  const remove = (city: City) => update({ cities: settings.cities.filter(id => id !== city.id) });
  const available = cities.filter(city => !settings.cities.includes(city.id) && `${city.name} ${city.country}`.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(search.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')));
  const total = data.meeting.filter(Boolean).length;

  function CityInfo({ city, index, mobile = false }: { city: City; index: number; mobile?: boolean }) {
    return <div className={`city-info ${mobile ? 'compact' : ''}`}>
      <span className="flag">{city.flag}</span>
      <div><button className="city-name" onClick={() => promote(city)} title={index === 0 ? 'Your reference city' : `Make ${city.name} the reference city`}>{city.name}</button>
        <div className="city-meta">{offsetLabel(data.offsets[index])}<span className="meta-dot">·</span>{index === 0 ? <span className="ref-badge">REF</span> : <span>{city.country === 'United States' ? 'USA' : city.country}</span>}</div>
      </div>
    </div>;
  }

  function TimeCell({ row, hour }: { row: number; hour: number }) {
    const minutes = data.local[row][hour];
    const period = minutes < 720 ? 'am' : 'pm';
    return <div className={`time-cell ${data.overlap[row][hour] ? 'overlap' : data.awake[row][hour] ? 'awake' : 'asleep'} ${hovered === hour ? 'inspected' : ''}`} onMouseEnter={() => setHovered(hour)} onMouseLeave={() => setHovered(null)} title={`${selected[row].name}: ${formatTime(minutes, settings.format)} · ${data.overlap[row][hour] ? 'Overlap' : data.awake[row][hour] ? 'Awake' : 'Sleeping'}`}>
      <span>{formatTime(minutes, settings.format, true)}</span>{settings.format === '12h' && <small>{period}</small>}
    </div>;
  }

  function RangeBadges({ overlap }: { overlap: boolean[] }) {
    return <div className="range-badges">{ranges(overlap).map(([start, end]) => <span className="range-badge" key={start}>{formatTime(start * 60, settings.format)}<span className="range-dash">—</span>{formatTime(end * 60, settings.format)}{end === 24 && <small> +1</small>}</span>)}</div>;
  }

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="./" aria-label="Codex home"><span className="brand-icon"><Globe2 size={23} /></span><span>COMMON GROUND</span></a><span className="topbar-note"><span className="live-dot" /> A little closer, wherever you are.</span></header>
    <main>
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><span /> LESS TIME MATH. MORE HUMAN CONNECTION.</div><h1>Codex</h1><p>The world runs on different clocks.<br />Find a little time in common.</p><div className="hero-meta"><Globe2 size={15} /><span>34 cities. One shared moment.</span><span className="hero-meta-line" /><span>DST-aware, always.</span></div></div>
        <div className="clock-illustration" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><span className="orbit-dot dot-one" /><span className="orbit-dot dot-two" /><div className="illustration-label label-sf">SAN FRANCISCO <span>↗</span></div><div className="illustration-label label-bali">BALI <span>↗</span></div><div className="illustration-label label-geneva">GENEVA <span>↗</span></div><div className="dial dial-back"><div className="dial-face"><i className="hand hand-back" /><i className="hand hand-short" /><span className="clock-center" /></div></div><div className="dial dial-front"><div className="dial-face"><i className="hand hand-front" /><i className="hand hand-front-short" /><span className="clock-center" /></div><span className="dial-caption">GOOD TIME TO CONNECT</span></div><span className="spark">✳</span></div>
      </section>

      <section className="workspace" aria-label="Timezone comparison">
        <div className="workspace-top"><div><div className="section-kicker">YOUR WORLD, IN SYNC</div><h2>Find your overlap<span className="city-count">{selected.length} cities</span></h2></div><button className={`settings-button ${settingsOpen ? 'active' : ''}`} aria-expanded={settingsOpen} aria-controls="settings-panel" onClick={() => setSettingsOpen(!settingsOpen)}><Settings2 size={17} /><span>Availability</span><ChevronDown size={14} className={settingsOpen ? 'rotate' : ''} /></button></div>

        {settingsOpen && <div className="settings-panel" id="settings-panel"><div className="settings-intro"><Sun size={20} /><div><strong>Your awake hours</strong><p>The same daily rhythm, in every city.</p></div></div><label>Wake-up hour<select value={settings.wake} onChange={event => update({ wake: Number(event.target.value) })}>{hours.map(hour => <option key={hour} value={hour}>{formatTime(hour * 60, settings.format)}</option>)}</select></label><label>Sleep hour<select value={settings.sleep} onChange={event => update({ sleep: Number(event.target.value) })}>{hours.map(hour => <option key={hour} value={hour}>{formatTime(hour * 60, settings.format)}</option>)}</select></label><div className="format-setting"><span>Time format</span><div className="format-toggle">{(['12h', '24h'] as const).map(format => <button key={format} className={settings.format === format ? 'selected' : ''} aria-pressed={settings.format === format} onClick={() => update({ format })}>{format}</button>)}</div></div><p className="settings-footnote">{settings.wake === settings.sleep ? 'Matching hours mean awake all day.' : settings.wake > settings.sleep ? 'Night owl? Overnight schedules are supported.' : 'Your sleep schedule stays local to each city.'}</p></div>}

        <div className="controls-row"><div className="mode-toggle" aria-label="Comparison mode"><button className={settings.mode === 'meeting' ? 'selected' : ''} aria-pressed={settings.mode === 'meeting'} onClick={() => update({ mode: 'meeting' })}><Users size={16} />Meeting mode</button><button className={settings.mode === 'base' ? 'selected' : ''} aria-pressed={settings.mode === 'base'} onClick={() => update({ mode: 'base' })}><MapPin size={16} />Base mode</button></div><div className="city-picker" ref={pickerRef}><button className="add-button" aria-expanded={pickerOpen} onClick={() => { setPickerOpen(!pickerOpen); setSearch(''); }}><Plus size={17} />Add city</button>{pickerOpen && <div className="picker-popover"><div className="search-field"><Search size={17} /><input autoFocus aria-label="Search cities or countries" placeholder="Search city or country…" value={search} onChange={event => setSearch(event.target.value)} /></div><div className="picker-caption">A NEW PERSPECTIVE</div><div className="picker-list">{available.map(city => <button key={city.id} onClick={() => { update({ cities: [...settings.cities, city.id] }); setPickerOpen(false); }}><span className="picker-flag">{city.flag}</span><span><strong>{city.name}</strong><small>{city.country}</small></span><Plus size={15} /></button>)}{!available.length && <p className="no-results">{search ? 'No cities found. Try a country instead.' : 'You’ve added every city in the catalog.'}</p>}</div></div>}</div></div>
        <p className="mode-description">{settings.mode === 'meeting' ? 'One shared window. Everyone awake, all at once.' : 'Your reference city, matched with each city individually.'}</p>

        {selected.length >= 2 && <div className={`summary ${settings.mode === 'meeting' && !total ? 'warning' : ''}`} aria-live="polite">{settings.mode === 'meeting' ? <><div className="summary-icon">{total ? <Check size={21} /> : <Moon size={21} />}</div><div className="summary-copy"><strong>{total ? `${total} ${total === 1 ? 'hour' : 'hours'} together. Make it count.` : 'No shared awake hours. Yet.'}</strong><span>{total ? `Everyone is awake during these hours in ${reference.name}.` : 'Try a wider awake window or compare individually in Base mode.'}</span></div><RangeBadges overlap={data.meeting} /></> : <div className="base-summaries">{selected.slice(1).map((city, index) => { const overlap = data.overlap[index + 1]; const count = overlap.filter(Boolean).length; return <div className={`base-summary ${!count ? 'no-overlap' : ''}`} key={city.id}><span>{city.flag} <strong>{city.name}</strong></span><span className="base-count">{count ? `${count}h in common` : 'No shared awake hours'}</span><RangeBadges overlap={overlap} /></div>; })}<small>All windows shown in {reference.name} time.</small></div>}</div>}

        <div className="grid-toolbar"><span><Clock3 size={14} />{reference ? <>A day in <strong>{reference.name}</strong></> : 'Your world starts with a city'}</span><span className="date-label">{now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...(reference ? { timeZone: reference.zone } : {}) })}<span className="today-badge">TODAY</span></span></div>

        {selected.length > 0 ? <><div className="desktop-grid"><div className="desktop-axis"><span className="axis-title">CITY / LOCAL TIME</span><div className="hour-axis">{hours.map(hour => <span className={hovered === hour ? 'axis-hover' : ''} key={hour}>{settings.format === '12h' ? hour % 12 || 12 : String(hour).padStart(2, '0')}</span>)}</div><span /></div>{selected.map((city, row) => <div className={`city-row ${row === 0 ? 'reference-row' : ''}`} key={city.id}><CityInfo city={city} index={row} /><div className="hour-cells">{hours.map(hour => <TimeCell key={hour} row={row} hour={hour} />)}</div><button className="remove-button" aria-label={`Remove ${city.name}`} onClick={() => remove(city)}><X size={15} /></button></div>)}</div><div className="mobile-grid"><div className="mobile-table" style={{ gridTemplateColumns: `48px repeat(${selected.length}, minmax(105px, 1fr))` }}><div className="mobile-axis-title">TIME</div>{selected.map((city, index) => <div className="mobile-city-header" key={city.id}><CityInfo city={city} index={index} mobile /><button className="remove-button" aria-label={`Remove ${city.name}`} onClick={() => remove(city)}><X size={13} /></button></div>)}{hours.map(hour => <React.Fragment key={hour}><div className="mobile-hour">{formatTime(hour * 60, settings.format)}</div>{selected.map((city, row) => <TimeCell key={city.id} row={row} hour={hour} />)}</React.Fragment>)}</div></div></> : <div className="empty-state"><Globe2 size={34} /><h3>A world of possibilities.</h3><p>Add your first city to start finding time in common.</p><button className="add-button" onClick={() => setPickerOpen(true)}><Plus size={16} />Add a city</button></div>}

        <div className="grid-footer"><div className="legend"><span><i className="legend-overlap" />Overlap</span><span><i className="legend-awake" />Awake</span><span><i className="legend-sleep" />Sleeping</span></div><span className="awake-note"><Sun size={14} />Awake {formatTime(settings.wake * 60, settings.format)} – {formatTime(settings.sleep * 60, settings.format)}</span></div>
      </section>
      <div className="below-workspace"><span><span className="tip-icon">↗</span>Click a city name to make it your reference.</span><span><span className="green-dot" />{settings.mode === 'meeting' ? 'Green cells = everyone awake' : 'Green cells = awake with your base'}</span></div>
      <section className="bottom-note"><span className="note-icon"><Globe2 size={20} /></span><div><h3>Different timezones. Same team.</h3><p>A good meeting starts with a time that works for everyone.</p></div><span className="bottom-flower">✳</span></section>
    </main>
    <footer><span>Made for a world that works together.</span><span>{storageError ? 'Browser storage unavailable' : <><span className="live-dot" />Saved on this device</>}<span className="footer-divider" />No accounts. No fuss.<ArrowRight size={13} /></span></footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
