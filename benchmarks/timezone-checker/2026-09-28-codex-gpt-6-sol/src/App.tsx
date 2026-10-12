import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, Check, ChevronDown, Clock3, Globe2, Plus, Search, Settings2, Sunrise, Moon, UsersRound, X } from 'lucide-react';
import { CITIES, formatTime, isAwake, localTime, offsetLabel, offsetMinutes, overlapRanges, referenceInstants, type City } from './time';

type Mode = 'meeting' | 'base';
type TimeFormat = '12h' | '24h';
type Config = { cityIds: string[]; mode: Mode; wake: number; sleep: number; format: TimeFormat };
type Cell = { hour: number; minute: number; awake: boolean; overlap: boolean };

const STORAGE_KEY = 'gpt-6-timezone-overlap-v1';
const DEFAULTS: Config = {
  cityIds: ['san-francisco', 'denpasar', 'geneva'],
  mode: 'meeting', wake: 7, sleep: 23, format: '12h',
};

function loadConfig(): Config {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Partial<Config> | null;
    if (!saved) return DEFAULTS;
    const validIds = Array.isArray(saved.cityIds)
      ? [...new Set(saved.cityIds.filter((id): id is string => typeof id === 'string' && CITIES.some((city) => city.id === id)))]
      : DEFAULTS.cityIds;
    return {
      cityIds: validIds,
      mode: saved.mode === 'base' ? 'base' : 'meeting',
      wake: Number.isInteger(saved.wake) && saved.wake! >= 0 && saved.wake! < 24 ? saved.wake! : DEFAULTS.wake,
      sleep: Number.isInteger(saved.sleep) && saved.sleep! >= 0 && saved.sleep! < 24 ? saved.sleep! : DEFAULTS.sleep,
      format: saved.format === '24h' ? '24h' : '12h',
    };
  } catch {
    return DEFAULTS;
  }
}

function countHours(hours: boolean[]): number {
  return hours.filter(Boolean).length;
}

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase().trim();
}

function HourRanges({ hours, format }: { hours: boolean[]; format: TimeFormat }) {
  const ranges = overlapRanges(hours);
  return <div className="range-list">
    {ranges.map(([start, end]) => <span className="range-badge" key={start}>
      {formatTime(start, 0, format)} <span className="range-dash">—</span> {formatTime(end, 0, format)}
    </span>)}
  </div>;
}

function HourCell({ cell, format, index, currentHour }: { cell: Cell; format: TimeFormat; index: number; currentHour: number }) {
  return <div
    className={`hour-cell ${cell.overlap ? 'overlap' : cell.awake ? 'awake' : 'sleeping'} ${index === currentHour ? 'current-column' : ''}`}
    title={`${formatTime(cell.hour, cell.minute, format)} · ${cell.overlap ? 'overlap' : cell.awake ? 'awake' : 'sleeping'}`}
  >
    <span>{formatTime(cell.hour, cell.minute, format)}</span>
  </div>;
}

export default function App() {
  const [config, setConfig] = useState<Config>(loadConfig);
  const [now, setNow] = useState(() => new Date());
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (addOpen) searchRef.current?.focus();
  }, [addOpen]);
  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      if (addRef.current && !addRef.current.contains(event.target as Node)) setAddOpen(false);
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) setSettingsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setAddOpen(false); setSettingsOpen(false); }
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('mousedown', closeOnOutside); document.removeEventListener('keydown', closeOnEscape); };
  }, []);

  const cities = useMemo(() => config.cityIds.map((id) => CITIES.find((city) => city.id === id)).filter((city): city is City => Boolean(city)), [config.cityIds]);
  const reference = cities[0];
  const instants = useMemo(() => reference ? referenceInstants(now, reference.zone) : [], [now, reference]);
  const localRows = useMemo(() => cities.map((city) => instants.map((instant) => {
    const local = localTime(instant, city.zone);
    return { ...local, awake: isAwake(local.hour, config.wake, config.sleep) };
  })), [cities, instants, config.wake, config.sleep]);
  const shared = useMemo(() => Array.from({ length: 24 }, (_, hour) => localRows.length > 1 && localRows.every((row) => row[hour]?.awake)), [localRows]);
  const pairOverlaps = useMemo(() => localRows.map((row, index) => Array.from({ length: 24 }, (_, hour) => index > 0 && localRows[0]?.[hour]?.awake && row[hour]?.awake || false)), [localRows]);
  const baseUnion = useMemo(() => Array.from({ length: 24 }, (_, hour) => pairOverlaps.some((row) => row[hour])), [pairOverlaps]);
  const cells = localRows.map((row, cityIndex) => row.map((local, hour) => ({
    ...local,
    overlap: config.mode === 'meeting' ? shared[hour] : cityIndex === 0 ? baseUnion[hour] : pairOverlaps[cityIndex][hour],
  })));
  const currentHour = reference ? localTime(now, reference.zone).hour : -1;
  const available = CITIES.filter((city) => !config.cityIds.includes(city.id) && normalizeSearch(`${city.name} ${city.country}`).includes(normalizeSearch(search)));

  const update = (change: Partial<Config>) => setConfig((current) => ({ ...current, ...change }));
  const addCity = (id: string) => {
    setConfig((current) => ({ ...current, cityIds: [...current.cityIds, id] }));
    setSearch('');
    setAddOpen(false);
  };
  const removeCity = (id: string) => setConfig((current) => ({ ...current, cityIds: current.cityIds.filter((item) => item !== id) }));
  const makeReference = (id: string) => setConfig((current) => ({ ...current, cityIds: [id, ...current.cityIds.filter((item) => item !== id)] }));

  return <div className="app-shell">
    <header className="site-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true"><Globe2 size={20} strokeWidth={2.1} /></span>
        <h1>GPT-6</h1>
      </div>
      <div className="header-right"><span className="live-dot" /> LIVE TIMEZONE DATA <span className="header-divider" /> <span className="header-clock"><Clock3 size={14} /> {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: config.format === '12h', timeZone: reference?.zone || 'UTC' }).format(now)} {reference?.name || 'UTC'}</span></div>
    </header>

    <main className="main-content">
      <div className="intro-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> THE WORLD, IN SYNC</div>
          <h2>Find your hours <em>together.</em></h2>
          <p className="intro-copy">See when your people are awake, wherever they are.</p>
        </div>
        <div className="intro-decoration" aria-hidden="true"><span>24</span><small>HOURS / ONE VIEW</small></div>
      </div>

      <section className="workspace" aria-label="Timezone overlap checker">
        <div className="toolbar">
          <div className="mode-toggle" role="group" aria-label="Overlap mode">
            <button type="button" className={config.mode === 'meeting' ? 'active' : ''} onClick={() => update({ mode: 'meeting' })}><UsersRound size={16} /> Meeting mode</button>
            <button type="button" className={config.mode === 'base' ? 'active' : ''} onClick={() => update({ mode: 'base' })}><Globe2 size={16} /> Base mode</button>
          </div>
          <div className="toolbar-actions">
            <div className="popover-anchor" ref={addRef}>
              <button type="button" className="add-button" onClick={() => { setSettingsOpen(false); setAddOpen((open) => !open); }} aria-expanded={addOpen}><Plus size={17} /> Add city</button>
              {addOpen && <div className="city-popover">
                <label className="search-field"><Search size={17} /><input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search city or country" aria-label="Search city or country" /></label>
                <div className="city-options" role="listbox" aria-label="Available cities">
                  {available.length ? available.map((city) => <button type="button" role="option" aria-selected="false" key={city.id} onClick={() => addCity(city.id)}><span><strong>{city.name}</strong><small>{city.country}</small></span><span className="option-offset">{offsetLabel(offsetMinutes(now, city.zone))}</span></button>) : <div className="empty-options">No matching cities</div>}
                </div>
              </div>}
            </div>
            <div className="popover-anchor" ref={settingsRef}>
              <button type="button" className={`settings-button ${settingsOpen ? 'selected' : ''}`} onClick={() => { setAddOpen(false); setSettingsOpen((open) => !open); }} aria-label="Settings" aria-expanded={settingsOpen}><Settings2 size={19} /></button>
              {settingsOpen && <div className="settings-popover">
                <div className="popover-heading"><div><span className="popover-kicker">PERSONALIZE</span><h3>Your awake hours</h3></div><button type="button" className="close-popover" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><X size={17} /></button></div>
                <p>Applied to every city in your list.</p>
                <label className="setting-label" htmlFor="wake-hour"><Sunrise size={17} /> Wake up</label>
                <div className="select-wrap"><select id="wake-hour" value={config.wake} onChange={(event) => update({ wake: Number(event.target.value) })}>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{formatTime(hour, 0, config.format)}</option>)}</select><ChevronDown size={16} /></div>
                <label className="setting-label" htmlFor="sleep-hour"><Moon size={17} /> Go to sleep</label>
                <div className="select-wrap"><select id="sleep-hour" value={config.sleep} onChange={(event) => update({ sleep: Number(event.target.value) })}>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{formatTime(hour, 0, config.format)}</option>)}</select><ChevronDown size={16} /></div>
                <div className="setting-divider" />
                <span className="setting-label">Time format</span>
                <div className="format-toggle" role="group" aria-label="Time format"><button type="button" className={config.format === '12h' ? 'active' : ''} onClick={() => update({ format: '12h' })}>12 hour</button><button type="button" className={config.format === '24h' ? 'active' : ''} onClick={() => update({ format: '24h' })}>24 hour</button></div>
              </div>}
            </div>
          </div>
        </div>

        {cities.length >= 2 ? <div className="summary-panel">
          {config.mode === 'meeting' ? <div className="summary-main">
            <div className={`summary-icon ${countHours(shared) ? '' : 'warning'}`}>{countHours(shared) ? <Check size={21} /> : <X size={21} />}</div>
            <div className="summary-text"><span className="summary-label">SHARED AVAILABILITY</span><strong>{countHours(shared) ? `${countHours(shared)} hours together` : 'No shared hours'}</strong><span className="summary-sub">{countHours(shared) ? `Everyone is awake · ${reference.name} time` : 'Try adjusting awake hours or removing a city.'}</span></div>
            {countHours(shared) > 0 && <HourRanges hours={shared} format={config.format} />}
          </div> : <div className="base-summary">
            <div className="base-summary-heading"><span className="summary-label">ONE-ON-ONE AVAILABILITY</span><span>Compared with {reference.name}</span></div>
            <div className="base-summary-list">{cities.slice(1).map((city, index) => {
              const hours = pairOverlaps[index + 1];
              const count = countHours(hours);
              return <div className="base-summary-row" key={city.id}><span className="base-city-name">{city.name}</span><strong className={count ? '' : 'no-overlap'}>{count ? `${count} hr${count === 1 ? '' : 's'}` : 'No overlap'}</strong>{count ? <HourRanges hours={hours} format={config.format} /> : <span className="base-warning">Adjust awake hours to find a window</span>}</div>;
            })}</div>
          </div>}
        </div> : <div className="single-city-message"><Globe2 size={19} /><span>Add another city to see overlapping hours.</span></div>}

        <div className="grid-topline"><div><span className="section-index">01 /</span> TIMEZONE COMPARISON</div><span>{reference ? `A 24-hour view from ${reference.name}` : 'Add a city to begin'}</span></div>

        {cities.length ? <>
          <div className="desktop-grid-scroll"><div className="desktop-grid">
            <div className="grid-heading city-heading">YOUR CITIES <span>{cities.length}</span></div>
            <div className="hours-heading">{Array.from({ length: 24 }, (_, hour) => <div key={hour} className={hour === currentHour ? 'current-heading' : ''}><span>{String(hour).padStart(2, '0')}</span></div>)}</div>
            <div className="grid-heading action-heading">&nbsp;</div>
            {cities.map((city, index) => <div className="desktop-row" key={city.id}>
              <div className="city-info"><button type="button" className="city-name" onClick={() => makeReference(city.id)} title={index === 0 ? 'Reference city' : `Make ${city.name} the reference city`}>{city.name}</button><div className="city-meta">{city.country} <span className="meta-dot">·</span> {offsetLabel(offsetMinutes(now, city.zone))}</div>{index === 0 && <span className="ref-badge">REF</span>}</div>
              <div className="hour-row">{cells[index].map((cell, hour) => <HourCell key={hour} cell={cell} format={config.format} index={hour} currentHour={currentHour} />)}</div>
              <div className="row-action"><button type="button" onClick={() => removeCity(city.id)} aria-label={`Remove ${city.name}`} title={`Remove ${city.name}`}><X size={17} /></button></div>
            </div>)}
          </div></div>
          <div className="mobile-grid-scroll"><div className="mobile-grid" style={{ '--city-count': cities.length } as CSSProperties}>
            <div className="mobile-grid-head"><div className="mobile-time-head">REF HOUR</div>{cities.map((city, index) => <div className="mobile-city-head" key={city.id}><button type="button" onClick={() => makeReference(city.id)} title={index === 0 ? 'Reference city' : `Make ${city.name} the reference city`}>{city.name}</button><span>{offsetLabel(offsetMinutes(now, city.zone))}{index === 0 ? ' · REF' : ''}</span><button className="mobile-remove" type="button" onClick={() => removeCity(city.id)} aria-label={`Remove ${city.name}`}><X size={13} /></button></div>)}</div>
            {Array.from({ length: 24 }, (_, hour) => <div className={`mobile-hour-row ${hour === currentHour ? 'current-mobile-row' : ''}`} key={hour}><div className="mobile-hour-label">{formatTime(hour, 0, config.format)}</div>{cells.map((row, index) => <HourCell key={cities[index].id} cell={row[hour]} format={config.format} index={hour} currentHour={currentHour} />)}</div>)}
          </div></div>
        </> : <div className="empty-grid"><Globe2 size={29} /><strong>Your world starts here</strong><span>Add a city to begin comparing timezones.</span><button type="button" onClick={() => setAddOpen(true)}><Plus size={16} /> Add a city</button></div>}

        <div className="grid-footer"><div className="legend"><span><i className="legend-swatch overlap-swatch" /> {config.mode === 'meeting' ? 'Everyone awake' : 'Overlap with base'}</span><span><i className="legend-swatch awake-swatch" /> Awake</span><span><i className="legend-swatch sleeping-swatch" /> Sleeping</span></div><span className="grid-hint">Click a city name to make it the reference <ArrowRight size={14} /></span></div>
      </section>
      <footer className="page-footer"><span>{config.mode === 'meeting' ? 'Green cells = everyone awake' : 'Green cells = both cities awake'}</span><span>Made for people everywhere <span className="footer-star">✳</span></span></footer>
    </main>
  </div>;
}
