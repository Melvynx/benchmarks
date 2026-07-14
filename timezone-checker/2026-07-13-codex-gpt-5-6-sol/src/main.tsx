import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type IconName = 'chevron'|'clock'|'globe'|'moon'|'plus'|'settings'|'sun'|'users'|'x';
const paths: Record<IconName, React.ReactNode> = {
  chevron:<path d="m6 9 6 6 6-6"/>, clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  globe:<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></>,
  moon:<path d="M20 15.2A8.5 8.5 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z"/>, plus:<path d="M12 5v14M5 12h14"/>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7-.7-1.7.9-1.9-2.1-2.1-1.9.9-1.7-.7L10.5 2h-3l-.7 2.3-1.7.7-1.9-.9-2.1 2.1L2 8.1l-.7 1.7-2 .7v3l2 .7.7 1.7-.9 1.9 2.1 2.1 1.9-.9 1.7.7.7 2.3h3l.7-2.3 1.7-.7 1.9.9 2.1-2.1-.9-1.9.7-1.7Z" transform="translate(2.5 -0.2) scale(.8)"/></>,
  sun:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  users:<><path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 20v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></>, x:<path d="m6 6 12 12M18 6 6 18"/>
};
function Icon({name,size=16}:{name:IconName;size?:number}){return <svg className="line-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>}

type City = { id: string; name: string; country: string; zone: string; code: string };
type Mode = 'meeting' | 'base';
type HourFormat = '12h' | '24h';
type SavedState = { cities: string[]; wake: number; sleep: number; format: HourFormat; mode: Mode };

const CATALOG: City[] = [
  { id:'san-francisco', name:'San Francisco', country:'United States', zone:'America/Los_Angeles', code:'US' },
  { id:'new-york', name:'New York', country:'United States', zone:'America/New_York', code:'US' },
  { id:'vancouver', name:'Vancouver', country:'Canada', zone:'America/Vancouver', code:'CA' },
  { id:'toronto', name:'Toronto', country:'Canada', zone:'America/Toronto', code:'CA' },
  { id:'mexico-city', name:'Mexico City', country:'Mexico', zone:'America/Mexico_City', code:'MX' },
  { id:'honolulu', name:'Honolulu', country:'United States', zone:'Pacific/Honolulu', code:'US' },
  { id:'sao-paulo', name:'São Paulo', country:'Brazil', zone:'America/Sao_Paulo', code:'BR' },
  { id:'buenos-aires', name:'Buenos Aires', country:'Argentina', zone:'America/Argentina/Buenos_Aires', code:'AR' },
  { id:'bogota', name:'Bogotá', country:'Colombia', zone:'America/Bogota', code:'CO' },
  { id:'london', name:'London', country:'United Kingdom', zone:'Europe/London', code:'GB' },
  { id:'geneva', name:'Geneva', country:'Switzerland', zone:'Europe/Zurich', code:'CH' },
  { id:'paris', name:'Paris', country:'France', zone:'Europe/Paris', code:'FR' },
  { id:'berlin', name:'Berlin', country:'Germany', zone:'Europe/Berlin', code:'DE' },
  { id:'lisbon', name:'Lisbon', country:'Portugal', zone:'Europe/Lisbon', code:'PT' },
  { id:'helsinki', name:'Helsinki', country:'Finland', zone:'Europe/Helsinki', code:'FI' },
  { id:'kyiv', name:'Kyiv', country:'Ukraine', zone:'Europe/Kyiv', code:'UA' },
  { id:'cape-town', name:'Cape Town', country:'South Africa', zone:'Africa/Johannesburg', code:'ZA' },
  { id:'nairobi', name:'Nairobi', country:'Kenya', zone:'Africa/Nairobi', code:'KE' },
  { id:'cairo', name:'Cairo', country:'Egypt', zone:'Africa/Cairo', code:'EG' },
  { id:'lagos', name:'Lagos', country:'Nigeria', zone:'Africa/Lagos', code:'NG' },
  { id:'dubai', name:'Dubai', country:'United Arab Emirates', zone:'Asia/Dubai', code:'AE' },
  { id:'tel-aviv', name:'Tel Aviv', country:'Israel', zone:'Asia/Jerusalem', code:'IL' },
  { id:'mumbai', name:'Mumbai', country:'India', zone:'Asia/Kolkata', code:'IN' },
  { id:'kathmandu', name:'Kathmandu', country:'Nepal', zone:'Asia/Kathmandu', code:'NP' },
  { id:'singapore', name:'Singapore', country:'Singapore', zone:'Asia/Singapore', code:'SG' },
  { id:'denpasar', name:'Denpasar', country:'Indonesia', zone:'Asia/Makassar', code:'ID' },
  { id:'bangkok', name:'Bangkok', country:'Thailand', zone:'Asia/Bangkok', code:'TH' },
  { id:'hong-kong', name:'Hong Kong', country:'Hong Kong', zone:'Asia/Hong_Kong', code:'HK' },
  { id:'tokyo', name:'Tokyo', country:'Japan', zone:'Asia/Tokyo', code:'JP' },
  { id:'seoul', name:'Seoul', country:'South Korea', zone:'Asia/Seoul', code:'KR' },
  { id:'beijing', name:'Beijing', country:'China', zone:'Asia/Shanghai', code:'CN' },
  { id:'sydney', name:'Sydney', country:'Australia', zone:'Australia/Sydney', code:'AU' },
  { id:'perth', name:'Perth', country:'Australia', zone:'Australia/Perth', code:'AU' },
  { id:'auckland', name:'Auckland', country:'New Zealand', zone:'Pacific/Auckland', code:'NZ' },
  { id:'suva', name:'Suva', country:'Fiji', zone:'Pacific/Fiji', code:'FJ' }
];

const DEFAULTS: SavedState = { cities:['san-francisco','denpasar','geneva'], wake:7, sleep:23, format:'12h', mode:'meeting' };

function loadState(): SavedState {
  try {
    const raw = localStorage.getItem('orbit-time-state');
    if (!raw) return DEFAULTS;
    const data = JSON.parse(raw) as Partial<SavedState>;
    const validCities = (data.cities ?? []).filter(id => CATALOG.some(c => c.id === id));
    return { ...DEFAULTS, ...data, cities: validCities.length ? validCities : DEFAULTS.cities };
  } catch { return DEFAULTS; }
}

function partsAt(date: Date, zone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone:zone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(date);
  const get = (t: Intl.DateTimeFormatPartTypes) => Number(parts.find(p => p.type === t)?.value);
  return { year:get('year'), month:get('month'), day:get('day'), hour:get('hour'), minute:get('minute') };
}

function zonedDateForHour(zone: string, base: Date, hour: number) {
  const p = partsAt(base, zone);
  const target = Date.UTC(p.year, p.month - 1, p.day, hour, 0);
  let guess = target;
  for (let i=0; i<3; i++) {
    const z = partsAt(new Date(guess), zone);
    const represented = Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute);
    guess += target - represented;
  }
  return new Date(guess);
}

function offsetLabel(zone: string, date: Date) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone:zone, timeZoneName:'shortOffset' }).formatToParts(date).find(p => p.type==='timeZoneName')?.value ?? 'GMT';
  return name.replace('GMT', 'UTC').replace('UTC+0', 'UTC');
}

function hourLabel(hour: number, minute: number, format: HourFormat, compact=false) {
  const h = ((hour % 24) + 24) % 24;
  const mins = minute ? `:${String(minute).padStart(2,'0')}` : '';
  if (format === '24h') return `${String(h).padStart(compact ? 2 : 1,'0')}${mins}`;
  const n = h % 12 || 12;
  return `${n}${mins}${h < 12 ? 'a' : 'p'}`;
}

function isAwake(hour: number, minute: number, wake: number, sleep: number) {
  const value = hour + minute / 60;
  if (wake === sleep) return true;
  return wake < sleep ? value >= wake && value < sleep : value >= wake || value < sleep;
}

function rangesFromHours(hours: boolean[], format: HourFormat) {
  const ranges: {start:number; end:number}[] = [];
  let start: number | null = null;
  for (let i=0; i<=24; i++) {
    if (i<24 && hours[i] && start===null) start=i;
    if ((i===24 || !hours[i]) && start!==null) { ranges.push({start, end:i}); start=null; }
  }
  return ranges.map(r => `${hourLabel(r.start,0,format)} — ${hourLabel(r.end,0,format)}`);
}

function App() {
  const [saved, setSaved] = useState(loadState);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const addRef = useRef<HTMLDivElement>(null);
  const now = useMemo(() => new Date(), []);
  const cities = saved.cities.map(id => CATALOG.find(c => c.id === id)).filter(Boolean) as City[];
  const reference = cities[0];

  useEffect(() => localStorage.setItem('orbit-time-state', JSON.stringify(saved)), [saved]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (addRef.current && !addRef.current.contains(e.target as Node)) setAddOpen(false); };
    document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close);
  }, []);

  const instants = useMemo(() => reference ? Array.from({length:24}, (_,h) => zonedDateForHour(reference.zone, now, h)) : [], [reference, now]);
  const localTimes = useMemo(() => new Map(cities.map(city => [city.id, instants.map(date => partsAt(date, city.zone))])), [cities, instants]);
  const awake = useMemo(() => new Map(cities.map(city => [city.id, (localTimes.get(city.id) ?? []).map(t => isAwake(t.hour,t.minute,saved.wake,saved.sleep))])), [cities, localTimes, saved.wake, saved.sleep]);
  const meetingOverlap = Array.from({length:24}, (_,h) => cities.length > 1 && cities.every(c => awake.get(c.id)?.[h]));
  const pairOverlaps = new Map(cities.slice(1).map(city => [city.id, Array.from({length:24},(_,h) => Boolean(awake.get(reference.id)?.[h] && awake.get(city.id)?.[h]))]));
  const refBaseOverlap = Array.from({length:24},(_,h) => cities.slice(1).some(c => pairOverlaps.get(c.id)?.[h]));
  const cellOverlap = (city: City, h:number) => saved.mode === 'meeting' ? meetingOverlap[h] : city.id===reference.id ? refBaseOverlap[h] : Boolean(pairOverlaps.get(city.id)?.[h]);

  const update = (patch: Partial<SavedState>) => setSaved(s => ({...s,...patch}));
  const promote = (id:string) => update({cities:[id,...saved.cities.filter(c => c!==id)]});
  const remove = (id:string) => { if (saved.cities.length > 1) update({cities:saved.cities.filter(c => c!==id)}); };
  const add = (id:string) => { update({cities:[...saved.cities,id]}); setSearch(''); setAddOpen(false); };
  const candidates = CATALOG.filter(c => !saved.cities.includes(c.id) && `${c.name} ${c.country}`.toLowerCase().includes(search.toLowerCase()));

  if (!reference) return null;
  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-mark"><Icon name="globe" size={19}/></div>
      <h1>GPT-5.6 Sol</h1>
      <span className="brand-subtitle">World overlap planner</span>
      <button className="icon-button settings-trigger" aria-label="Open availability settings" onClick={() => setSettingsOpen(v=>!v)}><Icon name="settings" size={18}/><span>Settings</span></button>
    </header>

    <main>
      <section className="hero">
        <div>
          <p className="eyebrow"><span className="live-dot"/> LIVE TIMEZONE MATH</p>
          <h2>Find the hours that<br/><em>work for everyone.</em></h2>
          <p className="intro">Compare working hours across the world. Your schedule, translated instantly.</p>
        </div>
        <div className="mode-switch" role="group" aria-label="Overlap mode">
          <button className={saved.mode==='meeting'?'active':''} onClick={()=>update({mode:'meeting'})}><Icon name="users"/><span><b>Meeting</b><small>Everyone together</small></span></button>
          <button className={saved.mode==='base'?'active':''} onClick={()=>update({mode:'base'})}><Icon name="clock"/><span><b>Base</b><small>Compare to reference</small></span></button>
        </div>
      </section>

      <section className="toolbar">
        <div className="city-count"><b>{cities.length}</b> {cities.length===1?'city':'cities'} in your board</div>
        <div className="toolbar-actions">
          <div className="add-wrap" ref={addRef}>
            <button className="add-button" onClick={()=>setAddOpen(v=>!v)}><Icon name="plus"/> Add city <Icon name="chevron" size={14}/></button>
            {addOpen && <div className="city-menu">
              <div className="search-wrap"><span>⌕</span><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search city or country…"/></div>
              <div className="city-options">{candidates.length ? candidates.map(c=><button key={c.id} onClick={()=>add(c.id)}><span className="country-code">{c.code}</span><span><b>{c.name}</b><small>{c.country}</small></span><Icon name="plus" size={15}/></button>) : <p className="empty-search">No more cities match.</p>}</div>
            </div>}
          </div>
          <button className="availability-button" onClick={()=>setSettingsOpen(v=>!v)}><Icon name="sun"/> {hourLabel(saved.wake,0,saved.format)} — {hourLabel(saved.sleep,0,saved.format)}</button>
        </div>
      </section>

      {settingsOpen && <section className="settings-panel">
        <div className="settings-title"><div><Icon name="settings" size={17}/></div><span><b>Availability settings</b><small>Applied to everyone on this board</small></span></div>
        <label><span><Icon name="sun" size={15}/> Wake up</span><select value={saved.wake} onChange={e=>update({wake:Number(e.target.value)})}>{Array.from({length:24},(_,h)=><option key={h} value={h}>{hourLabel(h,0,saved.format)}</option>)}</select></label>
        <label><span><Icon name="moon" size={15}/> Sleep</span><select value={saved.sleep} onChange={e=>update({sleep:Number(e.target.value)})}>{Array.from({length:24},(_,h)=><option key={h} value={h}>{hourLabel(h,0,saved.format)}</option>)}</select></label>
        <div className="format-control"><span>Time format</span><div><button className={saved.format==='12h'?'active':''} onClick={()=>update({format:'12h'})}>12h</button><button className={saved.format==='24h'?'active':''} onClick={()=>update({format:'24h'})}>24h</button></div></div>
        <button className="panel-close" aria-label="Close settings" onClick={()=>setSettingsOpen(false)}><Icon name="x" size={17}/></button>
      </section>}

      {cities.length > 1 && <section className="summary">
        <div className="summary-label"><span className="summary-icon"><Icon name="users"/></span><div><b>{saved.mode==='meeting'?'Shared opening':'Base connections'}</b><small>in {reference.name} time</small></div></div>
        <div className="summary-content">
          {saved.mode==='meeting' ? <SummaryLine hours={meetingOverlap} format={saved.format}/> : cities.slice(1).map(c=><div className="base-summary" key={c.id}><span>{c.name}</span><SummaryLine hours={pairOverlaps.get(c.id) ?? []} format={saved.format}/></div>)}
        </div>
      </section>}

      <section className="board desktop-board" aria-label="Timezone comparison grid">
        <div className="board-head city-head">CITY / TIMEZONE</div>
        <div className="board-head hour-head">{Array.from({length:24},(_,h)=><span key={h}>{hourLabel(h,0,saved.format,true)}</span>)}</div>
        <div className="board-head action-head"/>
        {cities.map((city,index)=><React.Fragment key={city.id}>
          <CityInfo city={city} isRef={index===0} offset={offsetLabel(city.zone, now)} onPromote={()=>promote(city.id)}/>
          <div className="hours-row">{(localTimes.get(city.id) ?? []).map((t,h)=><HourCell key={h} time={t} format={saved.format} awake={Boolean(awake.get(city.id)?.[h])} overlap={cellOverlap(city,h)}/>)}</div>
          <div className="remove-cell"><button disabled={cities.length===1} aria-label={cities.length===1?'At least one city is required':`Remove ${city.name}`} onClick={()=>remove(city.id)}><Icon name="x"/></button></div>
        </React.Fragment>)}
      </section>

      <section className="mobile-board" aria-label="Timezone comparison grid mobile">
        <div className="mobile-scroll">
          <div className="mobile-grid" style={{gridTemplateColumns:`48px repeat(${cities.length}, minmax(92px, 1fr))`}}>
            <div className="mobile-corner">HOUR</div>
            {cities.map((city,index)=><div className="mobile-city" key={city.id}><button onClick={()=>promote(city.id)}><span>{city.name}</span>{index===0&&<i>REF</i>}<small>{offsetLabel(city.zone,now)}</small></button><button disabled={cities.length===1} className="mobile-remove" onClick={()=>remove(city.id)} aria-label={cities.length===1?'At least one city is required':`Remove ${city.name}`}><Icon name="x" size={13}/></button></div>)}
            {Array.from({length:24},(_,h)=><React.Fragment key={h}><div className="mobile-hour-label">{hourLabel(h,0,saved.format,true)}</div>{cities.map(city=>{const t=localTimes.get(city.id)?.[h]; return t ? <HourCell key={city.id} time={t} format={saved.format} awake={Boolean(awake.get(city.id)?.[h])} overlap={cellOverlap(city,h)}/> : null})}</React.Fragment>)}
          </div>
        </div>
      </section>

      <footer><span className="legend-swatch overlap"/> <b>Green cells</b> = {saved.mode==='meeting'?'everyone awake':'shared awake hours'} <span className="footer-divider"/> Click any city name to make it your reference</footer>
    </main>
  </div>;
}

function CityInfo({city,isRef,offset,onPromote}:{city:City;isRef:boolean;offset:string;onPromote:()=>void}) {
  return <div className="city-info"><span className="country-code">{city.code}</span><button onClick={onPromote}><span><b>{city.name}</b>{isRef&&<i>REF</i>}</span><small>{city.country} · {offset}</small></button></div>;
}

function HourCell({time,format,awake,overlap}:{time:{hour:number;minute:number};format:HourFormat;awake:boolean;overlap:boolean}) {
  return <div className={`hour-cell ${!awake?'sleeping':overlap?'overlap':'awake'}`} title={!awake?'Sleeping':overlap?'Available overlap':'Awake'}><span>{hourLabel(time.hour,time.minute,format,true)}</span></div>;
}

function SummaryLine({hours,format}:{hours:boolean[];format:HourFormat}) {
  const count=hours.filter(Boolean).length; const ranges=rangesFromHours(hours,format);
  return <div className={`summary-line ${count===0?'warning':''}`}><strong>{count}h</strong><span>{count===0?'No shared awake hours':count===1?'of overlap':'of overlap'}</span>{ranges.map(r=><mark key={r}>{r}</mark>)}</div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
