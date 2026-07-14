import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type City = { id: string; name: string; country: string; zone: string };
type Mode = 'meeting' | 'base';
type Format = '12h' | '24h';

const CITIES: City[] = [
  { id:'san-francisco', name:'San Francisco', country:'United States', zone:'America/Los_Angeles' },
  { id:'new-york', name:'New York', country:'United States', zone:'America/New_York' },
  { id:'vancouver', name:'Vancouver', country:'Canada', zone:'America/Vancouver' },
  { id:'toronto', name:'Toronto', country:'Canada', zone:'America/Toronto' },
  { id:'mexico-city', name:'Mexico City', country:'Mexico', zone:'America/Mexico_City' },
  { id:'honolulu', name:'Honolulu', country:'United States', zone:'Pacific/Honolulu' },
  { id:'sao-paulo', name:'São Paulo', country:'Brazil', zone:'America/Sao_Paulo' },
  { id:'buenos-aires', name:'Buenos Aires', country:'Argentina', zone:'America/Argentina/Buenos_Aires' },
  { id:'bogota', name:'Bogotá', country:'Colombia', zone:'America/Bogota' },
  { id:'lima', name:'Lima', country:'Peru', zone:'America/Lima' },
  { id:'london', name:'London', country:'United Kingdom', zone:'Europe/London' },
  { id:'lisbon', name:'Lisbon', country:'Portugal', zone:'Europe/Lisbon' },
  { id:'geneva', name:'Geneva', country:'Switzerland', zone:'Europe/Zurich' },
  { id:'paris', name:'Paris', country:'France', zone:'Europe/Paris' },
  { id:'berlin', name:'Berlin', country:'Germany', zone:'Europe/Berlin' },
  { id:'kyiv', name:'Kyiv', country:'Ukraine', zone:'Europe/Kyiv' },
  { id:'reykjavik', name:'Reykjavík', country:'Iceland', zone:'Atlantic/Reykjavik' },
  { id:'cairo', name:'Cairo', country:'Egypt', zone:'Africa/Cairo' },
  { id:'lagos', name:'Lagos', country:'Nigeria', zone:'Africa/Lagos' },
  { id:'nairobi', name:'Nairobi', country:'Kenya', zone:'Africa/Nairobi' },
  { id:'cape-town', name:'Cape Town', country:'South Africa', zone:'Africa/Johannesburg' },
  { id:'dubai', name:'Dubai', country:'United Arab Emirates', zone:'Asia/Dubai' },
  { id:'tel-aviv', name:'Tel Aviv', country:'Israel', zone:'Asia/Jerusalem' },
  { id:'mumbai', name:'Mumbai', country:'India', zone:'Asia/Kolkata' },
  { id:'kathmandu', name:'Kathmandu', country:'Nepal', zone:'Asia/Kathmandu' },
  { id:'singapore', name:'Singapore', country:'Singapore', zone:'Asia/Singapore' },
  { id:'bangkok', name:'Bangkok', country:'Thailand', zone:'Asia/Bangkok' },
  { id:'denpasar', name:'Denpasar', country:'Indonesia', zone:'Asia/Makassar' },
  { id:'hong-kong', name:'Hong Kong', country:'China', zone:'Asia/Hong_Kong' },
  { id:'tokyo', name:'Tokyo', country:'Japan', zone:'Asia/Tokyo' },
  { id:'seoul', name:'Seoul', country:'South Korea', zone:'Asia/Seoul' },
  { id:'sydney', name:'Sydney', country:'Australia', zone:'Australia/Sydney' },
  { id:'auckland', name:'Auckland', country:'New Zealand', zone:'Pacific/Auckland' },
  { id:'perth', name:'Perth', country:'Australia', zone:'Australia/Perth' },
];

const DEFAULT_IDS = ['san-francisco', 'denpasar', 'geneva'];
const STORAGE_KEY = 'timezone-checker-v1';

const partsAt = (date: Date, zone: string) => Object.fromEntries(
  new Intl.DateTimeFormat('en-US', { timeZone: zone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' })
    .formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)])
) as Record<string, number>;

function offsetMinutes(zone: string, date = new Date()) {
  const p = partsAt(date, zone);
  return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(date.getTime() / 60000) * 60000) / 60000);
}

function offsetLabel(zone: string) {
  const mins = offsetMinutes(zone);
  const sign = mins >= 0 ? '+' : '−';
  const abs = Math.abs(mins);
  return `UTC${sign}${Math.floor(abs / 60)}${abs % 60 ? `:${String(abs % 60).padStart(2, '0')}` : ''}`;
}

function hourMap(reference: City, cities: City[]) {
  const now = new Date();
  const ref = partsAt(now, reference.zone);
  const refOffset = offsetMinutes(reference.zone, now);
  return cities.map(city => Array.from({ length: 24 }, (_, hour) => {
    const instant = new Date(Date.UTC(ref.year, ref.month - 1, ref.day, hour) - refOffset * 60000);
    const local = partsAt(instant, city.zone);
    return { hour: local.hour, dayDelta: Math.sign(Date.UTC(local.year, local.month - 1, local.day) - Date.UTC(ref.year, ref.month - 1, ref.day)) };
  }));
}

function isAwake(hour: number, wake: number, sleep: number) {
  if (wake === sleep) return true;
  return wake < sleep ? hour >= wake && hour < sleep : hour >= wake || hour < sleep;
}

function formatHour(hour: number, format: Format) {
  const h = ((hour % 24) + 24) % 24;
  if (format === '24h') return `${String(h).padStart(2, '0')}:00`;
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  return `${h % 12}${h < 12 ? 'am' : 'pm'}`;
}

function ranges(hours: boolean[], format: Format) {
  const out: string[] = [];
  let start = -1;
  for (let i = 0; i <= 24; i++) {
    if (i < 24 && hours[i] && start < 0) start = i;
    if ((i === 24 || !hours[i]) && start >= 0) {
      out.push(`${formatHour(start, format)} — ${i === 24 && format === '24h' ? '24:00' : formatHour(i, format)}`);
      start = -1;
    }
  }
  return out;
}

function App() {
  const [cityIds, setCityIds] = useState(DEFAULT_IDS);
  const [mode, setMode] = useState<Mode>('meeting');
  const [wake, setWake] = useState(7);
  const [sleep, setSleep] = useState(23);
  const [format, setFormat] = useState<Format>('12h');
  const [hydrated, setHydrated] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const state = JSON.parse(raw);
        const validIds = Array.isArray(state.cityIds) ? state.cityIds.filter((id: string) => CITIES.some(c => c.id === id)) : [];
        if (validIds.length) setCityIds([...new Set(validIds)] as string[]);
        if (state.mode === 'meeting' || state.mode === 'base') setMode(state.mode);
        if (Number.isInteger(state.wake)) setWake(state.wake);
        if (Number.isInteger(state.sleep)) setSleep(state.sleep);
        if (state.format === '12h' || state.format === '24h') setFormat(state.format);
      }
    } catch { /* ignore invalid saved state */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify({ cityIds, mode, wake, sleep, format }));
  }, [cityIds, mode, wake, sleep, format, hydrated]);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!pickerRef.current?.contains(event.target as Node)) setPickerOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const cities = cityIds.map(id => CITIES.find(c => c.id === id)!).filter(Boolean);
  const maps = useMemo(() => cities.length ? hourMap(cities[0], cities) : [], [cityIds]);
  const awake = maps.map(row => row.map(cell => isAwake(cell.hour, wake, sleep)));
  const meetingOverlap = Array.from({ length: 24 }, (_, h) => awake.every(row => row[h]));
  const baseOverlaps = awake.map((row, i) => row.map((v, h) => i === 0 ? v : v && awake[0][h]));
  const filtered = CITIES.filter(c => !cityIds.includes(c.id) && `${c.name} ${c.country}`.toLowerCase().includes(query.toLowerCase()));
  const overlapFor = (row: number, hour: number) => mode === 'meeting' ? meetingOverlap[hour] : baseOverlaps[row]?.[hour];
  const promote = (id: string) => setCityIds(ids => [id, ...ids.filter(v => v !== id)]);
  const remove = (id: string) => setCityIds(ids => ids.filter(v => v !== id));
  const add = (id: string) => { setCityIds(ids => [...ids, id]); setPickerOpen(false); setQuery(''); };

  return <main>
    <header className="topbar">
      <a className="brand" href="#top" aria-label="GPT-5.6 Codex home"><span className="brand-mark">⌁</span> GPT-5.6 Codex</a>
      <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Open availability settings">⚙</button>
    </header>

    <section className="hero" id="top">
      <div className="eyebrow"><span></span> Timezone overlap</div>
      <h1>GPT-5.6 Codex</h1>
      <p>Find the hours when schedules align, without doing the mental math.</p>
    </section>

    <section className="workspace">
      <div className="toolbar">
        <div className="mode-switch" role="group" aria-label="Overlap mode">
          <button className={mode === 'meeting' ? 'active' : ''} onClick={() => setMode('meeting')}><span>◎</span> Meeting</button>
          <button className={mode === 'base' ? 'active' : ''} onClick={() => setMode('base')}><span>⌂</span> Base</button>
        </div>
        <div className="actions">
          <div className="picker" ref={pickerRef}>
            <button className="add-button" onClick={() => setPickerOpen(v => !v)}>＋ Add city</button>
            {pickerOpen && <div className="picker-popover">
              <div className="search-wrap"><span>⌕</span><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search city or country…" /></div>
              <div className="picker-list">
                {filtered.length ? filtered.map(city => <button key={city.id} onClick={() => add(city.id)}><span><strong>{city.name}</strong><small>{city.country}</small></span><span>＋</span></button>) : <p>No more matching cities</p>}
              </div>
            </div>}
          </div>
          <button className="settings-button" onClick={() => setSettingsOpen(true)}>⚙ <span>Availability</span></button>
        </div>
      </div>

      {cities.length >= 2 && <section className="summary" aria-label="Overlap summary">
        <div className="summary-icon">{mode === 'meeting' ? '◎' : '↔'}</div>
        <div className="summary-content">
          <div className="summary-title">
            <strong>{mode === 'meeting' ? 'Everyone’s common window' : `Overlap with ${cities[0].name}`}</strong>
            <span>in {cities[0].name} time</span>
          </div>
          {mode === 'meeting' ? <SummaryLine mask={meetingOverlap} format={format} /> : <div className="base-summary">
            {cities.slice(1).map((city, index) => <div className="base-line" key={city.id}><span>{city.name}</span><SummaryLine mask={baseOverlaps[index + 1]} format={format} compact /></div>)}
          </div>}
        </div>
      </section>}

      <section className="grid-card">
        <div className="desktop-grid">
          <div className="grid-head"><div className="city-heading">CITY / TIMEZONE</div><div className="hour-head">{Array.from({length:24},(_,h)=><div key={h}>{formatHour(h, format).replace(':00','').replace('am','a').replace('pm','p')}</div>)}</div><div /></div>
          {cities.map((city, row) => <div className="city-row" key={city.id}>
            <button className="city-info" onClick={() => promote(city.id)} title={row ? 'Make reference city' : 'Reference city'}>
              <span className="city-name"><strong>{city.name}</strong>{row === 0 && <em>REF</em>}</span>
              <span>{city.country} · {offsetLabel(city.zone)}</span>
            </button>
            <div className="hours">{maps[row].map((cell,h)=><HourCell key={h} cell={cell} awake={awake[row][h]} overlap={!!overlapFor(row,h)} format={format} />)}</div>
            <button className="remove" onClick={() => remove(city.id)} aria-label={`Remove ${city.name}`}>×</button>
          </div>)}
        </div>

        <div className="mobile-grid">
          <div className="mobile-city-head" style={{gridTemplateColumns:`58px repeat(${cities.length}, 110px)`}}><div className="mobile-hour-label">REF<br/>HOUR</div>{cities.map((city,row)=><div className="mobile-city" key={city.id}><button onClick={() => promote(city.id)}><strong>{city.name}</strong>{row===0&&<em>REF</em>}<span>{offsetLabel(city.zone)}</span></button><button className="mobile-remove" onClick={() => remove(city.id)} aria-label={`Remove ${city.name}`}>×</button></div>)}</div>
          {Array.from({length:24},(_,h)=><div className="mobile-hour-row" style={{gridTemplateColumns:`58px repeat(${cities.length}, 110px)`}} key={h}><div className="mobile-ref-hour">{formatHour(h,format)}</div>{cities.map((city,row)=><HourCell key={city.id} cell={maps[row][h]} awake={awake[row][h]} overlap={!!overlapFor(row,h)} format={format}/>)}</div>)}
        </div>
        {!cities.length && <div className="empty">Add a city to begin comparing timezones.</div>}
      </section>

      <div className="legend"><span><i className="dot overlap-dot"></i>{mode === 'meeting' ? 'Everyone awake' : 'Overlap with base'}</span><span><i className="dot awake-dot"></i>Awake</span><span><i className="dot sleep-dot"></i>Sleeping</span><b>Times shown in each city’s local time</b></div>
    </section>

    <footer><span className="pulse"></span><strong>Green cells = everyone awake</strong><span>·</span><span>Offsets update automatically for daylight saving time.</span></footer>

    {settingsOpen && <div className="modal-backdrop" onMouseDown={() => setSettingsOpen(false)}>
      <aside className="settings-panel" onMouseDown={e => e.stopPropagation()} aria-label="Availability settings">
        <div className="panel-head"><div><span className="eyebrow"><span></span> Preferences</span><h2>Your availability</h2><p>Applied to everyone in your comparison.</p></div><button onClick={() => setSettingsOpen(false)}>×</button></div>
        <div className="setting-group"><label>Wake-up hour <strong>{formatHour(wake,format)}</strong></label><input type="range" min="0" max="23" value={wake} onChange={e=>setWake(Number(e.target.value))}/><div className="range-labels"><span>12am</span><span>12pm</span><span>11pm</span></div></div>
        <div className="setting-group"><label>Sleep hour <strong>{formatHour(sleep,format)}</strong></label><input type="range" min="0" max="23" value={sleep} onChange={e=>setSleep(Number(e.target.value))}/><div className="range-labels"><span>12am</span><span>12pm</span><span>11pm</span></div></div>
        <div className="setting-group"><label>Time format</label><div className="format-switch"><button className={format==='12h'?'active':''} onClick={()=>setFormat('12h')}>12-hour</button><button className={format==='24h'?'active':''} onClick={()=>setFormat('24h')}>24-hour</button></div></div>
        <div className="awake-preview"><span>☀</span><div><small>AWAKE WINDOW</small><strong>{formatHour(wake,format)} → {formatHour(sleep,format)}</strong></div></div>
        <button className="done" onClick={() => setSettingsOpen(false)}>Done</button>
      </aside>
    </div>}
  </main>;
}

function SummaryLine({ mask, format, compact=false }: { mask: boolean[]; format: Format; compact?: boolean }) {
  const count = mask.filter(Boolean).length;
  const windowRanges = ranges(mask, format);
  return <div className={`summary-line ${compact ? 'compact' : ''} ${count === 0 ? 'warning' : ''}`}>
    <span className="count"><b>{count}</b> {count === 1 ? 'hour' : 'hours'}</span>
    {count ? windowRanges.map(range => <span className="range" key={range}>{range}</span>) : <span className="no-overlap">No overlap — try widening the awake window</span>}
  </div>;
}

function HourCell({ cell, awake, overlap, format }: { cell: {hour:number;dayDelta:number}; awake:boolean; overlap:boolean; format:Format }) {
  const display = format === '24h' ? String(cell.hour).padStart(2,'0') : (cell.hour % 12 || 12);
  return <div className={`hour-cell ${!awake ? 'sleeping' : overlap ? 'overlap' : 'awake'}`} title={`${formatHour(cell.hour,format)}${cell.dayDelta ? cell.dayDelta > 0 ? ' · next day' : ' · previous day' : ''}`}><span>{display}</span>{cell.dayDelta !== 0 && <sup>{cell.dayDelta > 0 ? '+1' : '−1'}</sup>}</div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
