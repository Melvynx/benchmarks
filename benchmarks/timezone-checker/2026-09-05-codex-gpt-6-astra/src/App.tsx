import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, Check, Clock3, Globe2, Info, MapPin, Moon, Plus, Search, Settings2, Sun, Users, X } from "lucide-react";
import { CITIES, type City } from "./cities";
import { calculateTimeline, DEFAULT_CONFIG, formatTime, HOURS, offsetLabel, overlapRanges, readConfiguration, type Configuration, type Settings } from "./time";

const STORAGE_KEY = "astra-timezones-v1";

function GlobeArtwork() {
  return <div className="globe-art" aria-hidden="true"><svg viewBox="0 0 300 180" fill="none">
    <defs><radialGradient id="glow"><stop stopColor="currentColor" stopOpacity=".07"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></radialGradient></defs>
    <ellipse cx="158" cy="90" rx="138" ry="87" fill="url(#glow)" />
    <g transform="translate(156 91) rotate(-18)" stroke="currentColor" strokeWidth=".8" opacity=".35">
      <circle r="70"/><ellipse rx="47" ry="70"/><ellipse rx="22" ry="70"/><ellipse rx="70" ry="23"/><ellipse rx="70" ry="48"/><path d="M-70 0H70M0-70V70"/>
    </g>
    <path d="M54 114Q113 9 215 72T258 105" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" opacity=".55"/>
    <circle cx="80" cy="80" r="4" fill="currentColor"/><circle cx="218" cy="77" r="4" fill="currentColor"/><circle cx="173" cy="40" r="4" fill="currentColor"/>
    <circle cx="80" cy="80" r="9" stroke="currentColor" opacity=".2"/><circle cx="218" cy="77" r="9" stroke="currentColor" opacity=".2"/>
  </svg><span className="globe-tag tag-sf">SFO <span>↗</span></span><span className="globe-tag tag-bali">DPS <span>↗</span></span><span className="globe-tag tag-geneva">GVA <span>↗</span></span></div>;
}

function CityPicker({ selected, onAdd, onClose }: { selected: string[]; onAdd: (id: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const matches = CITIES.filter((city) => !selected.includes(city.id) && `${city.name} ${city.country}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()));
  return <div className="popover city-picker" role="dialog" aria-label="Add a city">
    <div className="popover-title"><strong>Find your next city</strong><button className="icon-button" aria-label="Close city search" onClick={onClose}><X size={16}/></button></div>
    <label className="search-input"><Search size={17}/><input autoFocus placeholder="Search city or country…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search city or country"/></label>
    <div className="city-options">{matches.map((city) => <button key={city.id} className="city-option" onClick={() => onAdd(city.id)}><span className="option-flag">{city.flag}</span><span><strong>{city.name}</strong><small>{city.country}</small></span><Plus size={16}/></button>)}{!matches.length && <p className="no-results">{selected.length === CITIES.length ? "You have added every city. Quite the global team!" : "No cities found. Try another city or country."}</p>}</div>
    <div className="popover-foot">{CITIES.length} cities. One connected world.</div>
  </div>;
}

function SettingsPanel({ settings, onChange, onClose }: { settings: Settings; onChange: (settings: Settings) => void; onClose: () => void }) {
  return <div className="popover settings-panel" role="dialog" aria-label="Availability settings">
    <div className="popover-title"><strong>Your daily rhythm</strong><button className="icon-button" aria-label="Close settings" onClick={onClose}><X size={16}/></button></div>
    <p>The same awake hours apply to every city.</p>
    <div className="settings-hours">{(["wake", "sleep"] as const).map((key) => <label key={key}>{key === "wake" ? <Sun size={15}/> : <Moon size={15}/>} {key === "wake" ? "Wake up" : "Go to sleep"}<select aria-label={key === "wake" ? "Wake-up hour" : "Sleep hour"} value={settings[key]} onChange={(event) => onChange({ ...settings, [key]: Number(event.target.value) })}>{HOURS.map((hour) => <option key={hour} value={hour}>{formatTime(hour * 60, settings.format, true)}</option>)}</select></label>)}</div>
    <div className="format-setting"><span>Time format</span><div className="format-toggle">{(["12h", "24h"] as const).map((format) => <button key={format} aria-pressed={settings.format === format} onClick={() => onChange({ ...settings, format })}>{format}</button>)}</div></div>
    <p className="settings-note"><Info size={14}/>{settings.wake === settings.sleep ? "Matching hours mean awake all day (24h)." : settings.wake > settings.sleep ? "Night owl? Your overnight schedule is supported." : "Changes are applied and saved automatically."}</p>
  </div>;
}

function Ranges({ overlap, format }: { overlap: boolean[]; format: Settings["format"] }) {
  return <div className="range-badges">{overlapRanges(overlap).map(([start, end]) => <span className="range-badge" key={start}>{formatTime(start * 60, format, true)}<span className="range-dash">—</span>{end === 24 && format === "24h" ? "24:00" : formatTime(end * 60, format, true)}{end === 24 && <sup>+1</sup>}</span>)}</div>;
}

function TimeCell({ minutes, awake, overlap, format, hour, city, selected, onSelect }: { minutes: number; awake: boolean; overlap: boolean; format: Settings["format"]; hour: number; city: City; selected: boolean; onSelect: (hour: number) => void }) {
  const localHour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return <button className={`time-cell ${overlap ? "overlap" : awake ? "awake" : "sleeping"} ${selected ? "selected-hour" : ""}`} onClick={() => onSelect(hour)} aria-pressed={selected} aria-label={`${city.name}, ${formatTime(minutes, format)}, ${overlap ? "overlap" : awake ? "awake" : "sleeping"}`} title={`${city.name} · ${formatTime(minutes, format)} · ${overlap ? "Shared availability" : awake ? "Awake" : "Sleeping"}`}>
    <span className="cell-hour">{format === "24h" ? String(localHour).padStart(2, "0") : localHour % 12 || 12}{minute > 0 && <span className="cell-minute">:{String(minute).padStart(2, "0")}</span>}</span><span className="cell-period">{format === "12h" ? localHour >= 12 ? "pm" : "am" : minute ? "" : ":00"}</span>
  </button>;
}

export default function App() {
  const [config, setConfig] = useState<Configuration>(() => { try { return readConfiguration(localStorage.getItem(STORAGE_KEY)); } catch { return DEFAULT_CONFIG; } });
  const [now, setNow] = useState(() => new Date());
  const [panel, setPanel] = useState<"cities" | "settings" | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const settingsRef = useRef<HTMLButtonElement>(null);
  const cities = config.cityIds.flatMap((id) => { const city = CITIES.find((item) => item.id === id); return city ? [city] : []; });
  const reference = cities[0];
  const { settings, mode } = config;
  const timeline = calculateTimeline(cities, settings, mode, now);
  const commonHours = timeline.meeting.filter(Boolean).length;
  const date = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: reference?.zone ?? "UTC" }).format(now);
  const closePanel = () => { (panel === "cities" ? addRef : settingsRef).current?.focus(); setPanel(null); };

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); setStorageUnavailable(false); } catch { setStorageUnavailable(true); } }, [config]);
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    if (!panel) return;
    const handleClick = (event: PointerEvent) => { if (!toolsRef.current?.contains(event.target as Node)) setPanel(null); };
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") { (panel === "cities" ? addRef : settingsRef).current?.focus(); setPanel(null); } };
    document.addEventListener("pointerdown", handleClick); document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("pointerdown", handleClick); document.removeEventListener("keydown", handleKey); };
  }, [panel]);

  function promote(id: string) { setConfig((current) => ({ ...current, cityIds: [id, ...current.cityIds.filter((cityId) => cityId !== id)] })); setSelectedHour(null); }
  function remove(id: string) { setConfig((current) => ({ ...current, cityIds: current.cityIds.filter((cityId) => cityId !== id) })); setSelectedHour(null); }
  function add(id: string) { setConfig((current) => ({ ...current, cityIds: current.cityIds.includes(id) ? current.cityIds : [...current.cityIds, id] })); closePanel(); }
  function selectHour(hour: number) { setSelectedHour((current) => current === hour ? null : hour); }
  function cityInfo(city: City, index: number, mobile = false) {
    return <div className={`city-info ${mobile ? "mobile-city-info" : ""}`}><span className="city-flag" aria-hidden="true">{city.flag}</span><div className="city-copy"><div className="city-name-line"><button className="city-name" title={index === 0 ? "Reference city" : `Make ${city.name} the reference city`} onClick={() => promote(city.id)}>{city.name}</button>{index === 0 && <span className="ref-badge">REF</span>}</div><div className="city-meta"><span>{offsetLabel(timeline.offsets[index])}</span><span className="meta-dot">·</span><span>{new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", hour12: settings.format === "12h", timeZone: city.zone }).format(now)}</span></div></div>{mobile && <button className="icon-button remove-button" onClick={() => remove(city.id)} aria-label={`Remove ${city.name}`}><X size={14}/></button>}</div>;
  }
  function cell(city: City, cityIndex: number, hour: number) {
    return <TimeCell key={`${city.id}-${hour}`} minutes={timeline.localTimes[cityIndex][hour]} awake={timeline.awake[cityIndex][hour]} overlap={cities.length > 1 && (mode === "base" && cityIndex === 0 ? false : timeline.overlaps[cityIndex][hour])} format={settings.format} hour={hour} city={city} selected={selectedHour === hour} onSelect={selectHour}/>;
  }

  return <div className="app-shell">
    <header className="site-header"><div className="header-inner"><a href="#main" className="brand" aria-label="Timezone planner home"><span className="brand-mark"><Globe2 size={23}/></span><span>across<span className="brand-dot">.</span></span></a><div className="header-right"><span className="header-tagline">Different places. Shared moments.</span><span className="local-badge"><span className="status-dot"/>All times, connected</span></div></div></header>
    <main id="main" className="main-content">
      <section className="intro"><div><div className="eyebrow"><span/> A SMALLER WORLD, ONE MEETING AT A TIME</div><h1>GPT-6 Astra</h1><p>Find a little time in common.<br className="mobile-break"/> Make working across the world feel effortless.</p></div><GlobeArtwork/></section>

      <section className="planner" aria-label="Timezone overlap planner">
        <div className="planner-toolbar"><div className="mode-toggle" aria-label="Comparison mode"><button className={mode === "meeting" ? "active" : ""} aria-pressed={mode === "meeting"} onClick={() => setConfig({ ...config, mode: "meeting" })}><Users size={16}/> Meeting mode</button><button className={mode === "base" ? "active" : ""} aria-pressed={mode === "base"} onClick={() => setConfig({ ...config, mode: "base" })}><MapPin size={16}/> Base mode</button></div><div className="toolbar-actions" ref={toolsRef}><button className={`settings-button ${panel === "settings" ? "is-open" : ""}`} ref={settingsRef} onClick={() => setPanel(panel === "settings" ? null : "settings")} aria-label="Availability settings" aria-expanded={panel === "settings"}><Settings2 size={17}/><span>Settings</span></button><span className="toolbar-divider"/><button ref={addRef} className="primary-button" onClick={() => setPanel(panel === "cities" ? null : "cities")} aria-expanded={panel === "cities"}><Plus size={17}/> Add city</button>{panel === "cities" && <CityPicker selected={config.cityIds} onAdd={add} onClose={closePanel}/>} {panel === "settings" && <SettingsPanel settings={settings} onChange={(updated) => setConfig({ ...config, settings: updated })} onClose={closePanel}/>}</div></div>
        <div className="mode-description"><span>{mode === "meeting" ? "One shared window. Everyone at the table." : "Your home base. A separate window with every city."}</span><span className="awake-indicator"><Sun size={14}/>{formatTime(settings.wake * 60, settings.format, true)}–{formatTime(settings.sleep * 60, settings.format, true)}<span className="awake-label"> awake</span></span></div>

        {cities.length >= 2 && <div className={`overlap-summary ${mode === "meeting" && !commonHours ? "no-overlap" : ""}`} aria-live="polite">{mode === "meeting" ? <><div className="summary-icon">{commonHours ? <Check size={20}/> : <Moon size={20}/>}</div><div className="summary-copy"><strong>{commonHours ? <><span className="summary-count">{commonHours} hours</span> of common ground</> : "No shared awake hours"}</strong><span>{commonHours ? `Everyone is awake. Times shown in ${reference.name}.` : "Try a wider awake window, or switch to base mode."}</span></div><Ranges overlap={timeline.meeting} format={settings.format}/></> : <div className="base-summaries"><div className="base-summary-heading"><MapPin size={16}/>Shared hours with {reference.name}<span>In your reference timezone</span></div>{cities.slice(1).map((city, index) => { const hours = timeline.overlaps[index + 1].filter(Boolean).length; return <div className={`base-summary-row ${!hours ? "zero-hours" : ""}`} key={city.id}><span>{city.flag} <strong>{city.name}</strong></span><span>{hours ? `${hours} hours together` : "No shared awake hours"}</span><Ranges overlap={timeline.overlaps[index + 1]} format={settings.format}/></div>; })}</div>}</div>}

        {cities.length ? <>
          <div className="grid-topline"><div><span className="section-label">YOUR WORLD</span><span className="city-count">{cities.length} {cities.length === 1 ? "city" : "cities"}</span></div><div className="date-label"><Clock3 size={14}/>{date}<span className="date-today">Today</span></div></div>
          {cities.length === 1 && <p className="single-city-hint">A connection starts with two. Add another city to find your shared hours.</p>}
          <div className="desktop-timeline"><div className="timeline-header"><div className="reference-label">{reference.name} time <ArrowRight size={13}/></div><div className="hour-grid">{HOURS.map((hour) => <span key={hour} className={hour % 6 === 0 ? "major-hour" : ""}>{settings.format === "24h" ? String(hour).padStart(2, "0") : hour % 12 || 12}<small>{settings.format === "12h" ? hour >= 12 ? "p" : "a" : ""}</small></span>)}</div><span/></div><div className="timeline-rows">{cities.map((city, index) => <div className={`timeline-row ${index === 0 ? "reference-row" : ""}`} key={city.id}>{cityInfo(city, index)}<div className="hour-grid">{HOURS.map((hour) => cell(city, index, hour))}</div><button className="icon-button remove-button" onClick={() => remove(city.id)} aria-label={`Remove ${city.name}`}><X size={16}/></button></div>)}</div></div>
          <div className="mobile-timeline"><div className="mobile-table" style={{ gridTemplateColumns: `48px repeat(${cities.length}, minmax(106px, 1fr))` }}><div className="mobile-time-label">REF<ArrowDown size={13}/></div>{cities.map((city, index) => <div className="mobile-column-head" key={city.id}>{cityInfo(city, index, true)}</div>)}{HOURS.map((hour) => <div className="mobile-hour-row" key={hour}><div className="mobile-hour-label">{formatTime(hour * 60, settings.format, true)}</div>{cities.map((city, index) => <div className="mobile-cell-wrap" key={city.id}>{cell(city, index, hour)}</div>)}</div>)}</div></div>
          {selectedHour !== null && <div className="selected-detail" aria-live="polite"><Clock3 size={16}/><strong>At {formatTime(selectedHour * 60, settings.format, true)} in {reference.name}</strong><span>{cities.slice(1).map((city, index) => `${city.name} ${formatTime(timeline.localTimes[index + 1][selectedHour], settings.format, true)}`).join(" · ") || "Add a city to compare this time."}</span><button className="icon-button" aria-label="Clear selected hour" onClick={() => setSelectedHour(null)}><X size={15}/></button></div>}
          <div className="grid-footer"><span><Info size={14}/>Click a city name to make it your reference.</span><div className="legend"><span><i className="legend-swatch sleeping-swatch"/>Sleeping</span><span><i className="legend-swatch awake-swatch"/>Awake</span><span><i className="legend-swatch overlap-swatch"/>Overlap</span></div></div>
        </> : <div className="empty-state"><Globe2 size={40}/><h2>Your world starts here.</h2><p>Add a city, then bring the rest of your team into view.</p><button className="primary-button" onClick={() => setPanel("cities")}><Plus size={16}/>Add your first city</button><button className="text-button" onClick={() => setConfig({ ...config, cityIds: DEFAULT_CONFIG.cityIds })}>Restore default cities</button></div>}
        <div className="planner-bottom"><span className="green-hint"><span className="status-dot"/>{mode === "meeting" ? "Green cells = everyone awake" : "Green cells = awake with your base"}</span><span className="autosave"><Check size={13}/>{storageUnavailable ? "Storage unavailable · changes not saved" : "Saved on this device"}</span></div>
      </section>

      <section className="how-it-works" aria-label="How it works"><div className="how-intro"><span className="eyebrow">LESS MATH. MORE CONNECTION.</span><h2>A good time for everyone.</h2></div><div className="how-item"><span className="how-icon"><Globe2 size={19}/></span><div><h3>Build your little world</h3><p>Pick your cities. We take care of timezones and daylight saving.</p></div></div><div className="how-item"><span className="how-icon"><Sun size={19}/></span><div><h3>Find the green</h3><p>Your awake hours, aligned. See when the whole team can connect.</p></div></div><div className="how-item"><span className="how-icon"><MapPin size={19}/></span><div><h3>Make yourself at home</h3><p>Click any city to set your reference. The world moves with you.</p></div></div></section>
      <footer className="site-footer"><span><Globe2 size={14}/>Made for a world that works together.</span><span>Current-date offsets · hourly snapshots · {CITIES.length} cities</span></footer>
    </main>
  </div>;
}
