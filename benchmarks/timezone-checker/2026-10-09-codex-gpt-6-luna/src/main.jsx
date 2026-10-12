import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDownUp, Check, ChevronDown, Clock3, Globe2, Plus, Search, Settings2, Sparkles, X } from 'lucide-react';
import './style.css';

const CATALOG = [
  { id:'san-francisco', city:'San Francisco', country:'United States', tz:'America/Los_Angeles', region:'North America', flag:'🇺🇸' },
  { id:'new-york', city:'New York', country:'United States', tz:'America/New_York', region:'North America', flag:'🇺🇸' },
  { id:'chicago', city:'Chicago', country:'United States', tz:'America/Chicago', region:'North America', flag:'🇺🇸' },
  { id:'denver', city:'Denver', country:'United States', tz:'America/Denver', region:'North America', flag:'🇺🇸' },
  { id:'toronto', city:'Toronto', country:'Canada', tz:'America/Toronto', region:'North America', flag:'🇨🇦' },
  { id:'vancouver', city:'Vancouver', country:'Canada', tz:'America/Vancouver', region:'North America', flag:'🇨🇦' },
  { id:'mexico-city', city:'Mexico City', country:'Mexico', tz:'America/Mexico_City', region:'North America', flag:'🇲🇽' },
  { id:'sao-paulo', city:'São Paulo', country:'Brazil', tz:'America/Sao_Paulo', region:'South America', flag:'🇧🇷' },
  { id:'buenos-aires', city:'Buenos Aires', country:'Argentina', tz:'America/Argentina/Buenos_Aires', region:'South America', flag:'🇦🇷' },
  { id:'santiago', city:'Santiago', country:'Chile', tz:'America/Santiago', region:'South America', flag:'🇨🇱' },
  { id:'london', city:'London', country:'United Kingdom', tz:'Europe/London', region:'Europe', flag:'🇬🇧' },
  { id:'geneva', city:'Geneva', country:'Switzerland', tz:'Europe/Zurich', region:'Europe', flag:'🇨🇭' },
  { id:'paris', city:'Paris', country:'France', tz:'Europe/Paris', region:'Europe', flag:'🇫🇷' },
  { id:'berlin', city:'Berlin', country:'Germany', tz:'Europe/Berlin', region:'Europe', flag:'🇩🇪' },
  { id:'madrid', city:'Madrid', country:'Spain', tz:'Europe/Madrid', region:'Europe', flag:'🇪🇸' },
  { id:'istanbul', city:'Istanbul', country:'Türkiye', tz:'Europe/Istanbul', region:'Europe', flag:'🇹🇷' },
  { id:'reykjavik', city:'Reykjavík', country:'Iceland', tz:'Atlantic/Reykjavik', region:'Europe', flag:'🇮🇸' },
  { id:'lagos', city:'Lagos', country:'Nigeria', tz:'Africa/Lagos', region:'Africa', flag:'🇳🇬' },
  { id:'nairobi', city:'Nairobi', country:'Kenya', tz:'Africa/Nairobi', region:'Africa', flag:'🇰🇪' },
  { id:'johannesburg', city:'Johannesburg', country:'South Africa', tz:'Africa/Johannesburg', region:'Africa', flag:'🇿🇦' },
  { id:'cairo', city:'Cairo', country:'Egypt', tz:'Africa/Cairo', region:'Africa', flag:'🇪🇬' },
  { id:'casablanca', city:'Casablanca', country:'Morocco', tz:'Africa/Casablanca', region:'Africa', flag:'🇲🇦' },
  { id:'dubai', city:'Dubai', country:'United Arab Emirates', tz:'Asia/Dubai', region:'Middle East', flag:'🇦🇪' },
  { id:'riyadh', city:'Riyadh', country:'Saudi Arabia', tz:'Asia/Riyadh', region:'Middle East', flag:'🇸🇦' },
  { id:'mumbai', city:'Mumbai', country:'India', tz:'Asia/Kolkata', region:'Asia', flag:'🇮🇳' },
  { id:'kathmandu', city:'Kathmandu', country:'Nepal', tz:'Asia/Kathmandu', region:'Asia', flag:'🇳🇵' },
  { id:'bangkok', city:'Bangkok', country:'Thailand', tz:'Asia/Bangkok', region:'Asia', flag:'🇹🇭' },
  { id:'singapore', city:'Singapore', country:'Singapore', tz:'Asia/Singapore', region:'Asia', flag:'🇸🇬' },
  { id:'hong-kong', city:'Hong Kong', country:'Hong Kong', tz:'Asia/Hong_Kong', region:'Asia', flag:'🇭🇰' },
  { id:'tokyo', city:'Tokyo', country:'Japan', tz:'Asia/Tokyo', region:'Asia', flag:'🇯🇵' },
  { id:'seoul', city:'Seoul', country:'South Korea', tz:'Asia/Seoul', region:'Asia', flag:'🇰🇷' },
  { id:'beijing', city:'Beijing', country:'China', tz:'Asia/Shanghai', region:'Asia', flag:'🇨🇳' },
  { id:'denpasar', city:'Denpasar', country:'Indonesia', tz:'Asia/Makassar', region:'Asia', flag:'🇮🇩' },
  { id:'sydney', city:'Sydney', country:'Australia', tz:'Australia/Sydney', region:'Oceania', flag:'🇦🇺' },
  { id:'auckland', city:'Auckland', country:'New Zealand', tz:'Pacific/Auckland', region:'Oceania', flag:'🇳🇿' },
];
const DEFAULTS = { cities:['san-francisco','denpasar','geneva'], mode:'meeting', wake:7, sleep:23, format:'12h', base:'san-francisco' };
const HOURS = Array.from({length:24},(_,i)=>i);

function getInitial() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('gpt6-timezones') || '{}') }; }
  catch { return DEFAULTS; }
}
function zonedParts(date,tz) {
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'numeric',minute:'numeric',hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(date);
  return Object.fromEntries(parts.filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
}
function offsetMinutes(tz, date=new Date()) {
  const p=zonedParts(date,tz); return Math.round((Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute)-date.getTime())/60000);
}
function offsetLabel(tz) {
  const mins=offsetMinutes(tz), sign=mins>=0?'+':'−', abs=Math.abs(mins);
  return `UTC${sign}${String(Math.floor(abs/60)).padStart(2,'0')}:${String(abs%60).padStart(2,'0')}`;
}
function localHour(refHour,refCity,targetCity) {
  const now=new Date(); const rp=zonedParts(now,refCity.tz);
  // Anchor all slots to today's reference-city date, then convert that local wall hour to UTC.
  const rough=Date.UTC(rp.year,rp.month-1,rp.day,refHour);
  let instant=rough-offsetMinutes(refCity.tz,new Date(rough));
  instant=rough-offsetMinutes(refCity.tz,new Date(instant));
  return zonedParts(new Date(instant),targetCity.tz).hour;
}
function isAwake(hour,wake,sleep) { return wake===sleep ? true : wake<sleep ? hour>=wake&&hour<sleep : hour>=wake||hour<sleep; }
function fmt(hour,format) {
  if(format==='24h') return `${String(hour).padStart(2,'0')}:00`;
  const h=hour%12||12; return `${h}${hour<12?'am':'pm'}`;
}
function rangesFor(hours) {
  if (!hours.length) return [];
  const set=new Set(hours), starts=hours.filter(h=>!set.has((h+23)%24));
  if (starts.length===0) return [{start:0,end:24}];
  return starts.map(start=>{let end=start;while(set.has(end%24))end++;return {start,end};});
}
function App() {
  const [state,setState]=useState(getInitial);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [addOpen,setAddOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [now,setNow]=useState(new Date());
  useEffect(()=>{ localStorage.setItem('gpt6-timezones',JSON.stringify(state)); },[state]);
  useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(timer);},[]);
  const cities=state.cities.map(id=>CATALOG.find(c=>c.id===id)).filter(Boolean);
  const reference=cities[0];
  const referenceDate=reference?zonedParts(now,reference.tz):null;
  const referenceDayKey=referenceDate?`${referenceDate.year}-${referenceDate.month}-${referenceDate.day}`:'utc';
  const cellHours=useMemo(()=>cities.map(city=>HOURS.map(h=>localHour(h,reference,city))),[state.cities,referenceDayKey]);
  const overlapByCity=useMemo(()=>cities.map((_,i)=>HOURS.map(h=>{
    if(state.mode==='meeting') return cities.every((__,j)=>isAwake(cellHours[j][h],state.wake,state.sleep));
    return i===0 ? false : isAwake(cellHours[0][h],state.wake,state.sleep)&&isAwake(cellHours[i][h],state.wake,state.sleep);
  })),[cities,cellHours,state.mode,state.wake,state.sleep]);
  const meetingHours=HOURS.filter(h=>cities.every((_,i)=>isAwake(cellHours[i][h],state.wake,state.sleep)));
  const groups=state.mode==='meeting' ? [{label:'Everyone together',city:null,hours:meetingHours}] : cities.slice(1).map((city,index)=>({label:city.city,city,hours:HOURS.filter(h=>isAwake(cellHours[0][h],state.wake,state.sleep)&&isAwake(cellHours[index+1][h],state.wake,state.sleep))}));
  function update(key,value){setState(s=>({...s,[key]:value}));}
  function promote(id){setState(s=>({...s,cities:[id,...s.cities.filter(x=>x!==id)],base:id}));}
  function addCity(id){if(!state.cities.includes(id)){setState(s=>({...s,cities:[...s.cities,id]}));}setQuery('');setAddOpen(false);}
  const searchResults=CATALOG.filter(c=>!state.cities.includes(c.id)&&`${c.city} ${c.country} ${c.region}`.toLowerCase().includes(query.toLowerCase()));
  const timeNow=new Intl.DateTimeFormat('en-US',{timeZone:reference?.tz||'UTC',hour:'numeric',minute:'2-digit',hour12:true}).format(now);
  const activeHour=zonedParts(now,reference?.tz||'UTC').hour;
  const dayLabel=new Intl.DateTimeFormat('en-US',{timeZone:reference?.tz||'UTC',weekday:'long',month:'short',day:'numeric'}).format(now);
  const overlapTotal=meetingHours.length;
  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-mark"><Globe2 size={17}/></span><span>WORLD<span className="brand-light">TIME</span></span></a><div className="topbar-right"><span className="live-dot"/> <span className="live-label">LIVE CLOCKS</span><span className="top-divider"/><span className="top-date">{dayLabel}</span></div></header>
    <section className="hero"><div className="eyebrow"><span className="eyebrow-line"/> TIME, IN SYNC</div><div className="hero-row"><div><h1>GPT-6</h1><p className="hero-copy">Find a time that works <em>everywhere.</em></p></div><div className="hero-clock"><span className="hero-clock-label">YOUR REFERENCE TIME</span><span className="hero-time">{timeNow}</span><span className="hero-clock-city">{reference?.city} <span>·</span> {offsetLabel(reference?.tz||'UTC')}</span></div></div></section>
    <section className="workspace">
      <div className="toolbar"><div className="mode-switch" role="tablist" aria-label="Overlap mode"><button role="tab" aria-selected={state.mode==='meeting'} className={state.mode==='meeting'?'selected':''} onClick={()=>update('mode','meeting')}><span className="mode-icon"><ArrowDownUp size={14}/></span>Meeting mode</button><button role="tab" aria-selected={state.mode==='base'} className={state.mode==='base'?'selected':''} onClick={()=>update('mode','base')}><span className="mode-icon"><Sparkles size={14}/></span>Base mode</button></div><button className={`settings-button ${settingsOpen?'is-open':''}`} onClick={()=>setSettingsOpen(o=>!o)}><Settings2 size={15}/><span>Availability</span><ChevronDown size={14}/></button></div>
      {settingsOpen&&<div className="settings-panel"><div className="settings-title"><div><span className="eyebrow-small">YOUR HOURS</span><strong>When is everyone awake?</strong></div><button className="icon-button" onClick={()=>setSettingsOpen(false)} aria-label="Close settings"><X size={16}/></button></div><div className="settings-controls"><label>Wake up<select value={state.wake} onChange={e=>update('wake',Number(e.target.value))}>{HOURS.map(h=><option value={h} key={h}>{fmt(h,state.format)}</option>)}</select></label><span className="settings-arrow">→</span><label>Sleep<select value={state.sleep} onChange={e=>update('sleep',Number(e.target.value))}>{HOURS.map(h=><option value={h} key={h}>{fmt(h,state.format)}</option>)}</select></label><div className="format-control"><span>Time format</span><div><button className={state.format==='12h'?'on':''} onClick={()=>update('format','12h')}>12h</button><button className={state.format==='24h'?'on':''} onClick={()=>update('format','24h')}>24h</button></div></div></div><p className="settings-note"><Clock3 size={13}/> Awake window applies to everyone · overnight schedules supported</p></div>}
      <div className="summary-bar"><div className="summary-icon"><span className="sun-icon">◒</span></div><div className="summary-content"><div className="summary-heading">{state.mode==='meeting'?'Shared awake hours':'Availability by city'}<span className="summary-meta">{state.mode==='meeting'?`${cities.length} CITIES`:`${Math.max(0,cities.length-1)} PAIRINGS`}</span></div><div className="summary-results">{cities.length<2?<span className="empty-hint">Add another city to find overlapping hours.</span>:groups.map((g,i)=>{const ranges=rangesFor(g.hours);return <div className={`result-item ${!g.hours.length?'no-result':''}`} key={g.label}><span className="result-name">{state.mode==='base'&&<span className="result-dot" style={{background:COLORS[(i+1)%COLORS.length]}}/>}{g.label}</span>{g.hours.length?<><span className="result-count">{g.hours.length}h</span><span className="range-list">{ranges.map((r,j)=><span className="range-badge" key={j}>{fmt(r.start%24,state.format)} – {fmt(r.end%24,state.format)}</span>)}</span></>:<span className="warning-text">No shared awake hours</span>}</div>})}</div></div>{state.mode==='meeting'&&cities.length>1&&<div className={`big-count ${overlapTotal===0?'is-zero':''}`}><strong>{overlapTotal.toString().padStart(2,'0')}</strong><span>HOURS</span></div>}</div>
      <div className="grid-card"><div className="grid-heading"><div className="grid-heading-left"><span className="section-kicker">THE DAY, SIDE BY SIDE</span><span className="grid-date">{dayLabel}</span></div><div className="grid-legend"><span><i className="legend-dot overlap-dot"/> {state.mode==='meeting'?'Everyone awake':'Shared hours'}</span><span><i className="legend-dot sleep-dot"/> Sleeping</span></div></div>
        <div className="desktop-grid"><div className="grid-table"><div className="city-col-head">CITY <span>· {cities.length}</span></div><div className="hour-heads">{HOURS.map(h=><div key={h} className={`hour-head ${h===activeHour?'current-head':''}`}>{fmt(h,state.format)}</div>)}</div><div className="end-col-head"><span>REMOVE</span></div>
          {cities.map((city,i)=><React.Fragment key={city.id}><div className={`city-cell ${i===0?'reference-row':''}`}><button className="city-main" onClick={()=>promote(city.id)} title={i===0?'Reference city — click another city to set as reference':`Set ${city.city} as reference`}><span className="flag">{city.flag}</span><span className="city-text"><strong>{city.city}</strong><small>{city.country}</small></span>{i===0&&<span className="ref-tag">REF</span>}</button><span className="city-offset">{offsetLabel(city.tz)}</span></div><div className="hour-cells">{HOURS.map(h=>{const awake=isAwake(cellHours[i][h],state.wake,state.sleep), overlap=state.mode==='meeting'?overlapByCity[i][h]:overlapByCity[i][h];return <div key={h} className={`hour-cell ${!awake?'sleeping':''} ${awake&&!overlap?'awake':''} ${overlap?'overlap':''} ${h===activeHour?'now-cell':''}`} title={`${city.city}: ${fmt(cellHours[i][h],state.format)} local${overlap?', shared availability':''}`}><span>{fmt(cellHours[i][h],state.format)}</span></div>})}</div><div className="remove-cell"><button aria-label={`Remove ${city.city}`} disabled={cities.length===1} onClick={()=>setState(s=>({...s,cities:s.cities.filter(id=>id!==city.id)}))}><X size={15}/></button></div></React.Fragment>)}
        </div></div>
        <div className="mobile-grid"><div className="mobile-table" style={{'--city-count':cities.length}}><div className="mobile-table-head"><span className="mobile-time-label">REF<br/>TIME</span>{cities.map((city,i)=><div className="mobile-city-column" key={city.id}><button className="mobile-city-head" onClick={()=>promote(city.id)} title="Click to set as reference"><span className="flag">{city.flag}</span><strong>{city.city}</strong>{i===0&&<span className="ref-tag">REF</span>}</button><span className="mobile-offset">{offsetLabel(city.tz)}</span><button className="mobile-remove" aria-label={`Remove ${city.city}`} disabled={cities.length===1} onClick={()=>setState(s=>({...s,cities:s.cities.filter(id=>id!==city.id)}))}><X size={13}/></button></div>)}</div>{HOURS.map(h=><div className={`mobile-table-row ${h===activeHour?'current-mobile-row':''}`} key={h}><span className="mobile-ref-time">{fmt(h,state.format)}{h===activeHour&&<i className="now-marker"/>}</span>{cities.map((city,i)=>{const awake=isAwake(cellHours[i][h],state.wake,state.sleep),overlap=overlapByCity[i][h];return <div className={`mobile-cell ${!awake?'sleeping':''} ${overlap?'overlap':''}`} key={city.id}><span>{fmt(cellHours[i][h],state.format)}</span></div>})}</div>)}</div></div>
        <div className="grid-footer"><span><i className="now-marker"/> NOW IN {reference?.city.toUpperCase()}</span><span>HOURS SHOWN IN EACH CITY’S LOCAL TIME</span></div>
      </div>
      <div className="cities-footer"><div className="cities-label"><span className="section-kicker">YOUR CITIES</span><span className="city-counter">{cities.length} / {CATALOG.length}</span></div><div className="city-chips">{cities.map((c,i)=><div className={`city-chip ${i===0?'is-ref':''}`} key={c.id}><span>{c.flag}</span><span>{c.city}</span>{i===0&&<span className="chip-ref">REF</span>}<button aria-label={`Remove ${c.city}`} disabled={cities.length===1} onClick={()=>setState(s=>({...s,cities:s.cities.filter(id=>id!==c.id)}))}><X size={13}/></button></div>)}<div className="add-wrap"><button className="add-city" onClick={()=>setAddOpen(o=>!o)}><Plus size={15}/> Add a city</button>{addOpen&&<div className="add-popover"><div className="search-box"><Search size={15}/><input autoFocus placeholder="Search city or country" value={query} onChange={e=>setQuery(e.target.value)}/><button onClick={()=>setAddOpen(false)}><X size={14}/></button></div><div className="search-results">{searchResults.length?searchResults.map(c=><button className="search-result" key={c.id} onClick={()=>addCity(c.id)}><span>{c.flag}</span><span><strong>{c.city}</strong><small>{c.country} · {c.region}</small></span><Plus size={15}/></button>):<div className="no-cities">{query?'No cities found':'All cities added'}</div>}</div></div>}</div></div></div>
      <footer className="page-foot"><span><span className="foot-green"/> Green cells = {state.mode==='meeting'?'everyone awake':'shared with reference city'}</span><span>Offsets adjust automatically for daylight saving time</span></footer>
    </section>
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
  </main>;
}
const COLORS=['#80a98a','#7698bc','#d19773','#aa8bbd','#c89868'];
createRoot(document.getElementById('root')).render(<App/>);
