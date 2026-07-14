import { useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'luna-timezone-overlap-v1';

const CITIES = [
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', countryCode: 'US', zone: 'America/Los_Angeles', color: '#f0806f', abbr: 'SF' },
  { id: 'new-york', name: 'New York', country: 'United States', countryCode: 'US', zone: 'America/New_York', color: '#f5b544', abbr: 'NY' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', countryCode: 'CA', zone: 'America/Toronto', color: '#ef826b', abbr: 'TO' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', countryCode: 'MX', zone: 'America/Mexico_City', color: '#73c98b', abbr: 'MC' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', countryCode: 'BR', zone: 'America/Sao_Paulo', color: '#ee8c78', abbr: 'SP' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', countryCode: 'AR', zone: 'America/Argentina/Buenos_Aires', color: '#d991c3', abbr: 'BA' },
  { id: 'london', name: 'London', country: 'United Kingdom', countryCode: 'GB', zone: 'Europe/London', color: '#83b6f2', abbr: 'LD' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', countryCode: 'CH', zone: 'Europe/Zurich', color: '#8d96ed', abbr: 'GE' },
  { id: 'paris', name: 'Paris', country: 'France', countryCode: 'FR', zone: 'Europe/Paris', color: '#91a4ee', abbr: 'PA' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', countryCode: 'DE', zone: 'Europe/Berlin', color: '#edbc62', abbr: 'BE' },
  { id: 'madrid', name: 'Madrid', country: 'Spain', countryCode: 'ES', zone: 'Europe/Madrid', color: '#eb7d6e', abbr: 'MA' },
  { id: 'stockholm', name: 'Stockholm', country: 'Sweden', countryCode: 'SE', zone: 'Europe/Stockholm', color: '#e5aa68', abbr: 'ST' },
  { id: 'istanbul', name: 'Istanbul', country: 'Türkiye', countryCode: 'TR', zone: 'Europe/Istanbul', color: '#e78273', abbr: 'IS' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', countryCode: 'EG', zone: 'Africa/Cairo', color: '#edb856', abbr: 'CA' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', countryCode: 'NG', zone: 'Africa/Lagos', color: '#73bf93', abbr: 'LA' },
  { id: 'cape-town', name: 'Cape Town', country: 'South Africa', countryCode: 'ZA', zone: 'Africa/Johannesburg', color: '#82bceb', abbr: 'CT' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', countryCode: 'KE', zone: 'Africa/Nairobi', color: '#dca16a', abbr: 'NA' },
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', zone: 'Asia/Dubai', color: '#ed8b70', abbr: 'DU' },
  { id: 'delhi', name: 'New Delhi', country: 'India', countryCode: 'IN', zone: 'Asia/Kolkata', color: '#f2b64f', abbr: 'ND' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', countryCode: 'NP', zone: 'Asia/Kathmandu', color: '#83c69a', abbr: 'KA' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', countryCode: 'TH', zone: 'Asia/Bangkok', color: '#ef8574', abbr: 'BK' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', countryCode: 'SG', zone: 'Asia/Singapore', color: '#e48cb8', abbr: 'SI' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', countryCode: 'ID', zone: 'Asia/Makassar', color: '#7fc7ed', abbr: 'DP' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'Hong Kong', countryCode: 'HK', zone: 'Asia/Hong_Kong', color: '#edab68', abbr: 'HK' },
  { id: 'shanghai', name: 'Shanghai', country: 'China', countryCode: 'CN', zone: 'Asia/Shanghai', color: '#ef796c', abbr: 'SH' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', countryCode: 'JP', zone: 'Asia/Tokyo', color: '#f0b84b', abbr: 'TK' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', countryCode: 'KR', zone: 'Asia/Seoul', color: '#81c991', abbr: 'SE' },
  { id: 'perth', name: 'Perth', country: 'Australia', countryCode: 'AU', zone: 'Australia/Perth', color: '#e88975', abbr: 'PE' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', countryCode: 'AU', zone: 'Australia/Sydney', color: '#e49ac1', abbr: 'SY' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', countryCode: 'NZ', zone: 'Pacific/Auckland', color: '#7fb7e9', abbr: 'AK' },
  { id: 'honolulu', name: 'Honolulu', country: 'United States', countryCode: 'US', zone: 'Pacific/Honolulu', color: '#89c998', abbr: 'HO' },
  { id: 'anchorage', name: 'Anchorage', country: 'United States', countryCode: 'US', zone: 'America/Anchorage', color: '#e6a75e', abbr: 'AN' },
  { id: 'reykjavik', name: 'Reykjavík', country: 'Iceland', countryCode: 'IS', zone: 'Atlantic/Reykjavik', color: '#8e99e8', abbr: 'RE' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', countryCode: 'PT', zone: 'Europe/Lisbon', color: '#ed826e', abbr: 'LI' },
];

const DEFAULTS = {
  cityIds: ['san-francisco', 'denpasar', 'geneva'],
  mode: 'meeting',
  wakeHour: 7,
  sleepHour: 23,
  format: '12h',
};

const HOURS = Array.from({ length: 24 }, (_, index) => index);

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return DEFAULTS;
    return {
      ...DEFAULTS,
      ...saved,
      cityIds: Array.isArray(saved.cityIds) && saved.cityIds.length ? saved.cityIds.filter((id) => CITIES.some((city) => city.id === id)) : DEFAULTS.cityIds,
    };
  } catch {
    return DEFAULTS;
  }
}

function mod(value, base) {
  return ((value % base) + base) % base;
}

function getOffsetMinutes(timeZone, date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return Math.round((asUtc - date.getTime()) / 60000);
}

function formatOffset(minutes) {
  const sign = minutes >= 0 ? '+' : '−';
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const mins = absolute % 60;
  return `UTC${sign}${hours}${mins ? `:${String(mins).padStart(2, '0')}` : ''}`;
}

function formatHour(hour, format, includeMinutes = false) {
  const wholeHour = Math.floor(hour);
  const minutes = Math.round((hour - wholeHour) * 60);
  const safeMinutes = minutes === 60 ? 0 : minutes;
  const displayHour = format === '24h' ? String(mod(wholeHour + (minutes === 60 ? 1 : 0), 24)).padStart(2, '0') : String(mod(wholeHour + (minutes === 60 ? 1 : 0), 12) || 12);
  if (format === '24h') return includeMinutes || safeMinutes ? `${displayHour}:${String(safeMinutes).padStart(2, '0')}` : displayHour;
  return `${displayHour}${includeMinutes || safeMinutes ? `:${String(safeMinutes).padStart(2, '0')}` : ''} ${wholeHour + (minutes === 60 ? 1 : 0) >= 12 && wholeHour + (minutes === 60 ? 1 : 0) < 24 ? 'PM' : 'AM'}`;
}

function isAwake(hour, wake, sleep) {
  if (wake === sleep) return true;
  if (wake < sleep) return hour >= wake && hour < sleep;
  return hour >= wake || hour < sleep;
}

function getRanges(flags) {
  const ranges = [];
  let start = null;
  flags.forEach((isActive, hour) => {
    if (isActive && start === null) start = hour;
    const isLast = hour === flags.length - 1;
    if (start !== null && (!isActive || isLast)) {
      const end = isActive && isLast ? hour + 1 : hour;
      ranges.push({ start, end });
      start = null;
    }
  });
  if (ranges.length > 1 && ranges[0].start === 0 && ranges[ranges.length - 1].end === 24) {
    const first = ranges.shift();
    const last = ranges.pop();
    ranges.unshift({ start: last.start, end: first.end });
  }
  return ranges;
}

function formatRange(range, format) {
  return `${formatHour(range.start, format)} — ${formatHour(range.end % 24, format)}`;
}

function getFlagIcon(code) {
  const offset = code.toUpperCase().charCodeAt(0) - 65;
  const offset2 = code.toUpperCase().charCodeAt(1) - 65;
  return String.fromCodePoint(0x1f1e6 + offset, 0x1f1e6 + offset2);
}

function App() {
  const [state, setState] = useState(loadState);
  const [now, setNow] = useState(() => new Date());
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isAddOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState('');
  const addRef = useRef(null);

  const cities = useMemo(() => state.cityIds.map((id) => CITIES.find((city) => city.id === id)).filter(Boolean), [state.cityIds]);
  const offsets = useMemo(() => Object.fromEntries(cities.map((city) => [city.id, getOffsetMinutes(city.zone, now)])), [cities, now]);
  const reference = cities[0];
  const filteredCities = useMemo(() => CITIES.filter((city) => !state.cityIds.includes(city.id) && `${city.name} ${city.country}`.toLowerCase().includes(query.trim().toLowerCase())), [query, state.cityIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const closeOnOutside = (event) => {
      if (addRef.current && !addRef.current.contains(event.target)) setAddOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, []);

  const updateState = (next) => setState((current) => ({ ...current, ...next }));

  const cells = useMemo(() => {
    if (!reference) return [];
    const referenceOffset = offsets[reference.id];
    return cities.map((city) => {
      const localHours = HOURS.map((hour) => mod(hour + (offsets[city.id] - referenceOffset) / 60, 24));
      const awake = localHours.map((localHour) => isAwake(localHour, state.wakeHour, state.sleepHour));
      return { city, localHours, awake };
    });
  }, [cities, offsets, reference, state.sleepHour, state.wakeHour]);

  const meetingFlags = useMemo(() => HOURS.map((hour) => cells.length > 0 && cells.every((row) => row.awake[hour])), [cells]);
  const baseFlags = useMemo(() => cells.map((row) => HOURS.map((hour) => Boolean(cells[0]?.awake[hour] && row.awake[hour]))), [cells]);
  const meetingRanges = getRanges(meetingFlags);

  const dateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(now);
  const timeLabel = reference ? new Intl.DateTimeFormat('en-US', { timeZone: reference.zone, hour: 'numeric', minute: '2-digit' }).format(now) : '';

  const removeCity = (id) => updateState({ cityIds: state.cityIds.filter((cityId) => cityId !== id) });
  const promoteCity = (id) => updateState({ cityIds: [id, ...state.cityIds.filter((cityId) => cityId !== id)] });
  const addCity = (id) => {
    updateState({ cityIds: [...state.cityIds, id] });
    setQuery('');
    setAddOpen(false);
  };

  const countLabel = cities.length === 1 ? '1 city' : `${cities.length} cities`;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span /></div>
          <div>
            <div className="brand-name">GPT-5.6 Luna</div>
            <div className="brand-subtitle">Timezone overlap checker</div>
          </div>
        </div>
        <div className="topbar-meta">
          <div className="live-indicator"><span className="live-dot" /> Live offsets</div>
          <div className="date-stamp">{dateLabel}</div>
          <button className="icon-button settings-trigger" onClick={() => setSettingsOpen((open) => !open)} aria-label="Open settings" aria-expanded={isSettingsOpen}>
            <span className="sliders-icon" aria-hidden="true">☷</span>
          </button>
        </div>
      </header>

      <main className="page-content">
        <section className="intro-row">
          <div>
            <p className="eyebrow">Find your shared rhythm</p>
            <h1>GPT-5.6 <span className="accent-word">Luna</span></h1>
            <p className="intro-copy">Make time for everyone. See when your team is awake and ready, wherever the day takes them.</p>
          </div>
          <div className="intro-time-card">
            <span className="time-card-label">Local time in {reference?.name || 'your reference'}</span>
            <strong>{timeLabel}</strong>
            <span className="time-card-offset">{reference ? formatOffset(offsets[reference.id]) : ''}</span>
          </div>
        </section>

        <section className="toolbar" aria-label="Planner controls">
          <div className="mode-switch" role="tablist" aria-label="Overlap mode">
            <button className={state.mode === 'meeting' ? 'mode-button active' : 'mode-button'} onClick={() => updateState({ mode: 'meeting' })} role="tab" aria-selected={state.mode === 'meeting'}>
              <span className="mode-icon">◎</span> Meeting mode
            </button>
            <button className={state.mode === 'base' ? 'mode-button active' : 'mode-button'} onClick={() => updateState({ mode: 'base' })} role="tab" aria-selected={state.mode === 'base'}>
              <span className="mode-icon">◉</span> Base mode
            </button>
          </div>
          <div className="toolbar-actions">
            <div className="add-city-wrap" ref={addRef}>
              <button className="add-city-button" onClick={() => setAddOpen((open) => !open)} aria-expanded={isAddOpen}>
                <span className="plus-icon">+</span> Add city
              </button>
              {isAddOpen && (
                <div className="city-picker">
                  <div className="picker-heading">Add a city</div>
                  <label className="search-box">
                    <span aria-hidden="true">⌕</span>
                    <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search city or country" />
                  </label>
                  <div className="picker-results">
                    {filteredCities.length ? filteredCities.map((city) => (
                      <button className="city-option" key={city.id} onClick={() => addCity(city.id)}>
                        <span className="city-option-flag">{getFlagIcon(city.countryCode)}</span>
                        <span><strong>{city.name}</strong><small>{city.country}</small></span>
                        <span className="option-offset">{formatOffset(getOffsetMinutes(city.zone, now))}</span>
                      </button>
                    )) : <div className="empty-results">No new cities found</div>}
                  </div>
                </div>
              )}
            </div>
            <button className="settings-button" onClick={() => setSettingsOpen((open) => !open)}>
              <span className="settings-glyph">☷</span> Availability <span className="chevron">{isSettingsOpen ? '⌃' : '⌄'}</span>
            </button>
          </div>
        </section>

        {isSettingsOpen && (
          <section className="settings-panel" aria-label="Availability settings">
            <div className="settings-title"><span className="settings-panel-icon">☼</span><span><strong>Shared availability</strong><small>Applied uniformly to every city</small></span></div>
            <div className="setting-field">
              <label htmlFor="wake-hour">Wake up</label>
              <select id="wake-hour" value={state.wakeHour} onChange={(event) => updateState({ wakeHour: Number(event.target.value) })}>
                {HOURS.map((hour) => <option key={hour} value={hour}>{formatHour(hour, state.format)}</option>)}
              </select>
            </div>
            <div className="setting-arrow">→</div>
            <div className="setting-field">
              <label htmlFor="sleep-hour">Sleep</label>
              <select id="sleep-hour" value={state.sleepHour} onChange={(event) => updateState({ sleepHour: Number(event.target.value) })}>
                {HOURS.map((hour) => <option key={hour} value={hour}>{formatHour(hour, state.format)}</option>)}
              </select>
            </div>
            <div className="format-field"><span>Time format</span><div className="format-toggle"><button className={state.format === '12h' ? 'selected' : ''} onClick={() => updateState({ format: '12h' })}>12h</button><button className={state.format === '24h' ? 'selected' : ''} onClick={() => updateState({ format: '24h' })}>24h</button></div></div>
            <div className="settings-note"><span>i</span> Overnight windows are supported</div>
          </section>
        )}

        <section className="summary-section">
          <div className="summary-heading">
            <div><span className="summary-eyebrow">{state.mode === 'meeting' ? 'Shared availability' : 'Pair by pair'}</span><h2>{state.mode === 'meeting' ? 'When can everyone meet?' : `Working from ${reference?.name || 'your base'}`}</h2></div>
            <span className="city-count">{countLabel}</span>
          </div>
          {cities.length < 2 ? <div className="one-city-note">Add another city to see an overlap window.</div> : state.mode === 'meeting' ? (
            <div className="meeting-summary-row">
              <div className="overlap-stat"><strong>{meetingFlags.filter(Boolean).length}</strong><span>overlap<br />hours</span></div>
              <div className="summary-divider" />
              <div className="range-list">{meetingRanges.length ? meetingRanges.map((range) => <span className="range-badge" key={`${range.start}-${range.end}`}><span className="range-dot" />{formatRange(range, state.format)}</span>) : <span className="warning-message"><span>!</span> No common awake hours in this window</span>}</div>
              <div className="summary-description">Every green cell below lines up<br />with the same moment.</div>
            </div>
          ) : (
            <div className="base-summary-list">
              {cells.slice(1).map((row, index) => {
                const flags = baseFlags[index + 1];
                const ranges = getRanges(flags);
                return <div className="base-summary-item" key={row.city.id}><span className="summary-city-dot" style={{ backgroundColor: row.city.color }} /><strong>{row.city.name}</strong><span className="base-count">{flags.filter(Boolean).length}h</span>{ranges.length ? <div className="mini-range-list">{ranges.map((range) => <span className="mini-range" key={`${range.start}-${range.end}`}>{formatRange(range, state.format)}</span>)}</div> : <span className="mini-warning">No overlap</span>}</div>;
              })}
            </div>
          )}
        </section>

        <section className={`planner-card ${state.mode === 'base' ? 'base-mode' : ''}`}>
          <div className="planner-card-header">
            <div className="grid-title"><span className="calendar-icon">▦</span><span><strong>24-hour day map</strong><small>Each column follows {reference?.name || 'the reference city'}</small></span></div>
            <div className="grid-legend"><span><i className="legend-swatch overlap" /> Overlap</span><span><i className="legend-swatch awake" /> Awake</span><span><i className="legend-swatch sleeping" /> Sleeping</span></div>
          </div>
          <div className="desktop-grid-wrap">
            <div className="desktop-grid">
              <div className="grid-label-corner"><span>LOCAL HOURS</span><small>Reference · {reference?.name || '—'}</small></div>
              <div className="hour-header">{HOURS.map((hour) => <div className="hour-header-cell" key={hour}><span className={hour === 12 ? 'noon-mark' : ''}>{formatHour(hour, state.format)}</span>{hour === 0 && <small>midnight</small>}{hour === 12 && <small>noon</small>}</div>)}</div>
              <div className="grid-remove-head" />
              {cells.map((row, rowIndex) => {
                const overlapFlags = state.mode === 'meeting' ? meetingFlags : rowIndex === 0 ? baseFlags.slice(1).some(() => true) ? HOURS.map((hour) => baseFlags.slice(1).some((flags) => flags[hour])) : [] : baseFlags[rowIndex];
                return <div className="desktop-city-row" key={row.city.id}>
                  <div className="city-info" style={{ '--city-color': row.city.color }}>
                    <div className="city-avatar">{row.city.abbr}</div>
                    <div className="city-copy"><button className="city-name-button" onClick={() => promoteCity(row.city.id)} title={rowIndex === 0 ? 'Reference city' : `Make ${row.city.name} the reference city`}>{row.city.name}</button><span>{getFlagIcon(row.city.countryCode)} {row.city.country}</span></div>
                    {rowIndex === 0 && <span className="ref-badge">REF</span>}
                    <span className="city-offset">{formatOffset(offsets[row.city.id])}</span>
                  </div>
                  <div className="hour-row">{HOURS.map((hour) => <div className={`hour-cell ${row.awake[hour] ? 'awake' : 'sleeping'} ${overlapFlags[hour] ? 'overlap' : ''}`} key={hour} title={`${row.city.name}: ${formatHour(row.localHours[hour], state.format, true)}${row.awake[hour] ? ' · awake' : ' · sleeping'}`}><span>{formatHour(row.localHours[hour], state.format, true)}</span></div>)}</div>
                  <div className="remove-cell"><button onClick={() => removeCity(row.city.id)} aria-label={`Remove ${row.city.name}`} title={`Remove ${row.city.name}`}>×</button></div>
                </div>;
              })}
            </div>
          </div>
          <div className="mobile-grid-wrap">
            <div className="mobile-grid">
              <div className="mobile-hour-labels">{HOURS.map((hour) => <div key={hour} className="mobile-hour-label"><span>{formatHour(hour, state.format)}</span>{hour === 0 && <small>midnight</small>}{hour === 12 && <small>noon</small>}</div>)}</div>
              {cells.map((row, rowIndex) => {
                const overlapFlags = state.mode === 'meeting' ? meetingFlags : rowIndex === 0 ? HOURS.map((hour) => baseFlags.slice(1).some((flags) => flags[hour])) : baseFlags[rowIndex];
                return <div className="mobile-city-column" key={row.city.id} style={{ '--city-color': row.city.color }}><div className="mobile-city-heading"><div className="city-avatar">{row.city.abbr}</div><button className="city-name-button" onClick={() => promoteCity(row.city.id)}>{row.city.name}</button>{rowIndex === 0 && <span className="ref-badge">REF</span>}<span className="mobile-offset">{formatOffset(offsets[row.city.id])}</span><button className="mobile-remove" onClick={() => removeCity(row.city.id)} aria-label={`Remove ${row.city.name}`}>×</button></div>{HOURS.map((hour) => <div className={`mobile-hour-cell ${row.awake[hour] ? 'awake' : 'sleeping'} ${overlapFlags[hour] ? 'overlap' : ''}`} key={hour}><span>{formatHour(row.localHours[hour], state.format, true)}</span></div>)}</div>;
              })}
            </div>
          </div>
          <div className="planner-footer"><span className="hint-icon">✦</span> Green cells = {state.mode === 'meeting' ? 'everyone awake' : 'you and this city awake together'} <span className="footer-separator">·</span> Click a city name to make it the reference</div>
        </section>
      </main>
      <footer className="page-footer"><span>Designed for distributed days.</span><span>All calculations use current timezone rules</span></footer>
    </div>
  );
}

export default App;
