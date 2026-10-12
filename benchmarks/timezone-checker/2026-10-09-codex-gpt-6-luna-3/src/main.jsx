import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Search, Settings2, X, ChevronDown, Globe2, Clock3, ArrowRight, Sun, Moon, Sparkles, MapPin } from 'lucide-react'
import './style.css'

const CITIES = [
  ['San Francisco','United States','America/Los_Angeles','🇺🇸'],['New York','United States','America/New_York','🇺🇸'],['Toronto','Canada','America/Toronto','🇨🇦'],['Vancouver','Canada','America/Vancouver','🇨🇦'],['Mexico City','Mexico','America/Mexico_City','🇲🇽'],['São Paulo','Brazil','America/Sao_Paulo','🇧🇷'],['Buenos Aires','Argentina','America/Argentina/Buenos_Aires','🇦🇷'],['Santiago','Chile','America/Santiago','🇨🇱'],
  ['London','United Kingdom','Europe/London','🇬🇧'],['Geneva','Switzerland','Europe/Zurich','🇨🇭'],['Paris','France','Europe/Paris','🇫🇷'],['Berlin','Germany','Europe/Berlin','🇩🇪'],['Stockholm','Sweden','Europe/Stockholm','🇸🇪'],['Lisbon','Portugal','Europe/Lisbon','🇵🇹'],['Istanbul','Türkiye','Europe/Istanbul','🇹🇷'],['Moscow','Russia','Europe/Moscow','🇷🇺'],
  ['Lagos','Nigeria','Africa/Lagos','🇳🇬'],['Nairobi','Kenya','Africa/Nairobi','🇰🇪'],['Johannesburg','South Africa','Africa/Johannesburg','🇿🇦'],['Cairo','Egypt','Africa/Cairo','🇪🇬'],['Dubai','United Arab Emirates','Asia/Dubai','🇦🇪'],['Tel Aviv','Israel','Asia/Jerusalem','🇮🇱'],
  ['Delhi','India','Asia/Kolkata','🇮🇳'],['Kathmandu','Nepal','Asia/Kathmandu','🇳🇵'],['Bangkok','Thailand','Asia/Bangkok','🇹🇭'],['Singapore','Singapore','Asia/Singapore','🇸🇬'],['Denpasar','Indonesia','Asia/Makassar','🇮🇩'],['Tokyo','Japan','Asia/Tokyo','🇯🇵'],['Seoul','South Korea','Asia/Seoul','🇰🇷'],['Shanghai','China','Asia/Shanghai','🇨🇳'],['Hong Kong','Hong Kong','Asia/Hong_Kong','🇭🇰'],['Manila','Philippines','Asia/Manila','🇵🇭'],
  ['Sydney','Australia','Australia/Sydney','🇦🇺'],['Auckland','New Zealand','Pacific/Auckland','🇳🇿']
].map(([city,country,zone,flag])=>({city,country,zone,flag}))
const DEFAULT_IDS=['America/Los_Angeles','Asia/Makassar','Europe/Zurich']
const defaults={cities:DEFAULT_IDS,wake:7,sleep:23,format:'12h',mode:'meeting'}
const getOffset=(zone, date=new Date())=>{
  const str=new Intl.DateTimeFormat('en-US',{timeZone:zone,timeZoneName:'longOffset'}).format(date)
  const m=str.match(/GMT([+-])(\d{2}):(\d{2})/)
  if(!m) return 0
  return (m[1]==='-'?-1:1)*(Number(m[2])+Number(m[3])/60)
}
const mod=(n,m)=>((n%m)+m)%m
const hourLabel=(h,format)=>format==='24h'?`${String(h).padStart(2,'0')}:00`:`${h%12||12}${h<12?'am':'pm'}`
const localTimeLabel=(value,format)=>{let h=Math.floor(value),minutes=Math.round((value-h)*60);if(minutes===60){h=(h+1)%24;minutes=0}return format==='24h'?`${String(h).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`:`${h%12||12}${minutes?`:${String(minutes).padStart(2,'0')}`:''}${h<12?'am':'pm'}`}
const localHour=(refHour,refOffset,zoneOffset)=>mod(refHour-refOffset+zoneOffset,24)
const isAwake=(h,wake,sleep)=>wake===sleep?true:wake<sleep?h>=wake&&h<sleep:h>=wake||h<sleep
const rangesFor=(hours,format)=>{
  if(hours.length===24)return [`${hourLabel(0,format)} – ${hourLabel(0,format)}`]
  const runs=[]; let start=null
  for(let h=0;h<=24;h++) { const on=h<24&&hours.includes(h); if(on&&start===null)start=h; if(!on&&start!==null){runs.push([start,h]);start=null} }
  if(runs.length>1&&runs[0][0]===0&&runs.at(-1)[1]===24){const first=runs.shift(),last=runs.pop();runs.unshift([last[0],first[1]+24])}
  return runs.map(([a,b])=>`${hourLabel(a%24,format)} – ${hourLabel(b%24,format)}`)
}
function App(){
  const [state,setState]=useState(()=>{try{return {...defaults,...JSON.parse(localStorage.getItem('timezone-studio')||'{}')}}catch{return defaults}})
  const [query,setQuery]=useState('');const [picker,setPicker]=useState(false);const [settings,setSettings]=useState(false)
  useEffect(()=>localStorage.setItem('timezone-studio',JSON.stringify(state)),[state])
  const cities=state.cities.map(id=>CITIES.find(c=>c.zone===id)).filter(Boolean)
  const offsets=useMemo(()=>Object.fromEntries(cities.map(c=>[c.zone,getOffset(c.zone)])),[state.cities.join('|')])
  const ref=cities[0]
  const hourRows=Array.from({length:24},(_,h)=>h)
  const awakeAt=(city,h)=>isAwake(localHour(h,offsets[ref.zone],offsets[city.zone]),state.wake,state.sleep)
  const overlapHours=(city)=>hourRows.filter(h=>city?awakeAt(ref,h)&&awakeAt(city,h):cities.every(c=>awakeAt(c,h)))
  const meeting=overlapHours(null)
  const displayOffset=(offset)=>{const abs=Math.abs(offset),mins=Math.round((abs%1)*60);return `UTC${offset>=0?'+':'−'}${String(Math.floor(abs)).padStart(2,'0')}${mins?`:${String(mins).padStart(2,'0')}`:''}`}
  const addCity=(city)=>{setState(s=>({...s,cities:[...s.cities,city.zone]}));setPicker(false);setQuery('')}
  const promote=(zone)=>setState(s=>({...s,cities:[zone,...s.cities.filter(x=>x!==zone)]}))
  const remove=(zone)=>setState(s=>({...s,cities:s.cities.filter(x=>x!==zone)}))
  const available=CITIES.filter(c=>!state.cities.includes(c.zone)&&`${c.city} ${c.country}`.toLowerCase().includes(query.toLowerCase()))
  const summaryRows=state.mode==='meeting'?[{label:'Everyone together',hours:meeting}]:cities.slice(1).map(c=>({label:`${ref.city} + ${c.city}`,hours:overlapHours(c)}))
  return <main className="shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-icon"><Globe2 size={17}/></span><span>orbit<span className="brand-dot">.</span></span></a><div className="top-meta"><span className="live-dot"/> Live timezone data <span className="meta-divider"/> <span className="today">{new Intl.DateTimeFormat('en',{weekday:'short',month:'short',day:'numeric'}).format(new Date())}</span></div></header>
    <section className="hero"><div><div className="eyebrow"><span className="eyebrow-line"/> YOUR TEAM, IN SYNC</div><h1>GPT-6</h1><p className="hero-copy">Find a time that works <em>everywhere.</em></p></div><button className="settings-button" onClick={()=>setSettings(!settings)}><Settings2 size={16}/> Preferences</button></section>
    {settings&&<section className="settings-panel"><div className="setting-title"><div><span className="eyebrow small">PERSONAL SCHEDULE</span><h3>When is everyone awake?</h3></div><button className="icon-button" onClick={()=>setSettings(false)}><X size={17}/></button></div><div className="setting-controls"><label>Wake up<select value={state.wake} onChange={e=>setState(s=>({...s,wake:+e.target.value}))}>{hourRows.map(h=><option key={h} value={h}>{hourLabel(h,'12h')}</option>)}</select></label><ArrowRight size={16} className="setting-arrow"/><label>Sleep<select value={state.sleep} onChange={e=>setState(s=>({...s,sleep:+e.target.value}))}>{hourRows.map(h=><option key={h} value={h}>{hourLabel(h,'12h')}</option>)}</select></label><div className="format-toggle"><span>Time format</span><button className={state.format==='12h'?'selected':''} onClick={()=>setState(s=>({...s,format:'12h'}))}>12h</button><button className={state.format==='24h'?'selected':''} onClick={()=>setState(s=>({...s,format:'24h'}))}>24h</button></div></div><p className="settings-note"><Moon size={14}/> Your awake hours apply equally to every city. Overnight schedules work too.</p></section>}
    <section className="control-row"><div className="mode-switch"><button className={state.mode==='meeting'?'active':''} onClick={()=>setState(s=>({...s,mode:'meeting'}))}><span className="mode-icon">✳</span> Meeting mode</button><button className={state.mode==='base'?'active':''} onClick={()=>setState(s=>({...s,mode:'base'}))}><MapPin size={14}/> Base mode</button></div><span className="mode-hint">{state.mode==='meeting'?'Find the hours everyone is awake':'Compare each city against your base'}</span></section>
    {cities.length>1&&<section className="overlap-card"><div className="overlap-heading"><div><span className="eyebrow small">{state.mode==='meeting'?'SHARED AVAILABILITY':'BASE CITY OVERLAP'}</span><h2>{state.mode==='meeting'?'The window to meet':'Your working windows'}</h2></div><span className="overlap-chip"><Sparkles size={13}/> {state.mode==='meeting'?'ALL CITIES':'PER CITY'}</span></div><div className="summary-list">{summaryRows.map((row,i)=><div className="summary-row" key={row.label}><div className="summary-label">{state.mode==='base'&&<span className="summary-dot"/>}{row.label}</div>{row.hours.length?<><strong>{row.hours.length} <small>hours</small></strong><div className="range-list">{rangesFor(row.hours,state.format).map(x=><span className="range-pill" key={x}>{x}</span>)}</div></>:<div className="no-overlap"><span>!</span> No shared awake hours</div>}</div>)}</div></section>}
    <section className="cities-section"><div className="section-title"><div><span className="eyebrow small">YOUR WORLD</span><h2>Compare cities <span className="count">{cities.length}</span></h2></div><div className="add-wrap"><button className="add-button" onClick={()=>setPicker(!picker)}><span>+</span> Add a city</button>{picker&&<div className="picker"><div className="search-box"><Search size={15}/><input autoFocus placeholder="Search city or country" value={query} onChange={e=>setQuery(e.target.value)}/><button onClick={()=>setPicker(false)}><X size={14}/></button></div><div className="picker-results">{available.length?available.map(c=><button key={c.zone} onClick={()=>addCity(c)}><span className="flag">{c.flag}</span><span>{c.city}<small>{c.country}</small></span><span className="picker-add">+</span></button>):<p>No cities found</p>}</div><div className="picker-footer">34 cities · across every time zone</div></div>}</div></div>
      <div className="grid-card"><div className="grid-toolbar"><div className="legend"><span><i className="legend-swatch overlap-swatch"/> {state.mode==='meeting'?'Everyone awake':'Overlap'}</span><span><i className="legend-swatch awake-swatch"/> Awake</span><span><i className="legend-swatch sleep-swatch"/> Sleeping</span></div><div className="ref-note"><span className="ref-star">✳</span> Click a city to set as reference</div></div>
        <div className="desktop-grid"><div className="grid-header"><div className="city-head">CITY <span>·</span> LOCAL TIME</div>{hourRows.map(h=><div key={h} className={`hour-head ${h===9?'day-marker':''}`}>{hourLabel(h,state.format)}</div>)}<div className="remove-head"/></div>
          {cities.map((c,ci)=><div className={`city-row ${ci===0?'reference-row':''}`} key={c.zone}><button className="city-info" onClick={()=>promote(c.zone)} title="Set as reference"><span className="city-flag">{c.flag}</span><span className="city-text"><strong>{c.city}</strong><small>{c.country}</small></span>{ci===0&&<span className="ref-badge">REF</span>}<span className="offset">{displayOffset(offsets[c.zone])}</span></button>{hourRows.map(h=>{const lh=localHour(h,offsets[ref.zone],offsets[c.zone]);const awake=awakeAt(c,h);const overlap=state.mode==='meeting'?meeting.includes(h):ci>0&&awakeAt(ref,h)&&awake;return <div className={`hour-cell ${!awake?'sleeping':overlap?'overlap':'awake'} ${h===9?'day-marker':''}`} key={h}><span>{localTimeLabel(lh,state.format)}</span></div>})}<button className="remove-button" onClick={()=>remove(c.zone)} disabled={cities.length<=1} title="Remove city"><X size={15}/></button></div>)}
        </div>
        <div className="mobile-grid" style={{'--city-count':cities.length}}><div className="mobile-city-header"><div className="mobile-time-label">REF TIME</div>{cities.map((c,ci)=><div className="mobile-city-column" key={c.zone}><button className="mobile-city-name" onClick={()=>promote(c.zone)}><span>{c.flag}</span><strong>{c.city}</strong>{ci===0&&<small>REF</small>}</button><div className="mobile-offset">{displayOffset(offsets[c.zone])}</div><button className="mobile-remove" onClick={()=>remove(c.zone)} disabled={cities.length<=1} aria-label={`Remove ${c.city}`}><X size={13}/></button></div>)}</div>{hourRows.map(h=><div className="mobile-time-row" key={h}><div className="mobile-time-label">{hourLabel(h,state.format)}</div>{cities.map((c,ci)=>{const lh=localHour(h,offsets[ref.zone],offsets[c.zone]);const awake=awakeAt(c,h);const overlap=state.mode==='meeting'?meeting.includes(h):ci>0&&awakeAt(ref,h)&&awake;return <div className={`mobile-time-cell ${!awake?'sleeping':overlap?'overlap':'awake'}`} key={c.zone}>{localTimeLabel(lh,state.format)}</div>})}</div>)}</div>
        <div className="grid-foot"><span><Clock3 size={14}/> Hours shown in each city’s local time</span><span><Sun size={14}/> Awake window {hourLabel(state.wake,state.format)} – {hourLabel(state.sleep,state.format)}</span></div>
      </div>
      <div className="bottom-hint"><span className="hint-icon">✳</span><span><strong>Green cells = {state.mode==='meeting'?'everyone awake':'shared awake time'}</strong><small>Times are shown in each city’s local timezone, anchored to {ref?.city}.</small></span><button onClick={()=>setSettings(true)}>Adjust awake hours <ChevronDown size={14}/></button></div>
    </section>
    <footer><span>orbit<span className="brand-dot">.</span> <span className="footer-copy">A little more in sync.</span></span><span>Offsets update automatically with daylight saving time</span></footer>
  </main>
}

createRoot(document.getElementById('root')).render(<App />)
