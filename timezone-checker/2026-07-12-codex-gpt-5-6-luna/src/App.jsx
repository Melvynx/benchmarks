import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CITY_CATALOG,
  DEFAULT_CITY_IDS,
  formatHour,
  formatLocalTime,
  formatOffset,
  getLocalHourForReferenceHour,
  getOffsetMinutes,
  getRanges,
  getUtcDateLabel,
  getZonedParts,
  isAwake,
  localHourToDate,
} from './timezone';

const STORAGE_KEY = 'timezone-overlap-checker-v1';
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const Icon = ({ name, size = 18, strokeWidth = 1.8 }) => {
  const paths = {
    globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.7 9h16.6M3.7 15h16.6M12 3.5c2.1 2.3 3.1 5.1 3.1 8.5S14.1 18.2 12 20.5c-2.1-2.3-3.1-5.1-3.1-8.5S9.9 5.8 12 3.5Z" /></>,
    settings: <><path d="M12 8.1a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8Z" /><path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3.1 1.3v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3.1-1.3l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-1.3-3.1h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 1.3-3.1l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3.1-1.3V3.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3.1 1.3l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 1.3 3.1h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-1.3 1.1Z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    x: <><path d="m6 6 12 12M18 6 6 18" /></>,
    pin: <><path d="M15 4.5 19.5 9l-2.2 1.2-3.2 3.2.7 3.1-1.1 1.1-3.5-3.5-4.3 4.3-.7-.7 4.3-4.3-3.5-3.5 1.1-1.1 3.1.7 3.2-3.2L15 4.5Z" /></>,
    search: <><circle cx="10.8" cy="10.8" r="5.8" /><path d="m15.2 15.2 4.1 4.1" /></>,
    check: <path d="m5.5 12.3 4.1 4.1 8.9-9" />,
    chevron: <path d="m7 9.5 5 5 5-5" />,
    arrow: <><path d="M5 12h13M13 6l6 6-6 6" /></>,
    moon: <path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.2a7.5 7.5 0 1 0 10 10.3Z" />,
  };
  return <svg aria-hidden="true" className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return null;
    return {
      cityIds: Array.isArray(saved.cityIds) && saved.cityIds.length ? saved.cityIds.filter((id) => CITY_CATALOG.some((city) => city.id === id)) : DEFAULT_CITY_IDS,
      mode: saved.mode === 'base' ? 'base' : 'meeting',
      wake: Number.isInteger(saved.wake) ? saved.wake : 7,
      sleep: Number.isInteger(saved.sleep) ? saved.sleep : 23,
      format: saved.format === '24h' ? '24h' : '12h',
    };
  } catch {
    return null;
  }
}

function App() {
  const initial = useMemo(() => loadState() ?? { cityIds: DEFAULT_CITY_IDS, mode: 'meeting', wake: 7, sleep: 23, format: '12h' }, []);
  const [cityIds, setCityIds] = useState(initial.cityIds);
  const [mode, setMode] = useState(initial.mode);
  const [wake, setWake] = useState(initial.wake);
  const [sleep, setSleep] = useState(initial.sleep);
  const [format, setFormat] = useState(initial.format);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const addInputRef = useRef(null);

  const cities = useMemo(() => cityIds.map((id) => CITY_CATALOG.find((city) => city.id === id)).filter(Boolean), [cityIds]);
  const referenceCity = cities[0];
  const now = useMemo(() => new Date(), []);
  const referenceDate = useMemo(() => getTodayInReferenceDay(referenceCity.zone, now), [referenceCity.zone, now]);
  const referenceDateLabel = useMemo(() => getUtcDateLabel(referenceCity.zone, now), [referenceCity.zone, now]);
  const columnDates = useMemo(() => HOURS.map((hour) => localHourToDate(referenceDate, hour, referenceCity.zone)), [referenceDate, referenceCity.zone]);
  const cityMeta = useMemo(() => cities.map((city) => ({ ...city, offset: getOffsetMinutes(city.zone, now) })), [cities, now]);
  const localHours = useMemo(() => cityMeta.map((city) => columnDates.map((date) => getLocalHourForReferenceHour(date, referenceCity.zone, city.zone))), [cityMeta, columnDates, referenceCity.zone]);
  const awakeMatrix = useMemo(() => localHours.map((row) => row.map(({ hour }) => isAwake(hour, wake, sleep))), [localHours, wake, sleep]);
  const referenceAwake = useMemo(() => HOURS.map((hour) => isAwake(hour, wake, sleep)), [wake, sleep]);
  const meetingOverlap = useMemo(() => HOURS.filter((_, hour) => awakeMatrix.every((row) => row[hour])), [awakeMatrix]);
  const baseOverlaps = useMemo(() => cityMeta.slice(1).map((city, index) => ({ city, hours: HOURS.filter((_, hour) => referenceAwake[hour] && awakeMatrix[index + 1][hour]) })), [awakeMatrix, cityMeta, referenceAwake]);
  const overlapCount = mode === 'meeting' ? meetingOverlap.length : baseOverlaps.reduce((total, item) => total + item.hours.length, 0);
  const availableCities = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase();
    return CITY_CATALOG.filter((city) => !cityIds.includes(city.id) && (!normalized || `${city.city} ${city.country} ${city.region}`.toLocaleLowerCase().includes(normalized))).slice(0, 9);
  }, [cityIds, search]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cityIds, mode, wake, sleep, format }));
  }, [cityIds, mode, wake, sleep, format]);

  useEffect(() => {
    if (isAddOpen) addInputRef.current?.focus();
  }, [isAddOpen]);

  function promoteCity(id) {
    setCityIds((current) => [id, ...current.filter((cityId) => cityId !== id)]);
  }

  function removeCity(id) {
    if (cityIds.length === 1) return;
    setCityIds((current) => current.filter((cityId) => cityId !== id));
  }

  function addCity(id) {
    setCityIds((current) => [...current, id]);
    setSearch('');
    setIsAddOpen(false);
  }

  const modeDescription = mode === 'meeting' ? 'Find the hours everyone can meet' : 'Compare each teammate with the reference city';
  const rangeHours = mode === 'meeting' ? meetingOverlap : [];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Icon name="globe" size={21} /></div>
          <div>
            <p className="brand-name">GPT-5.6 Terra</p>
            <p className="brand-subtitle">Timezone overlap checker</p>
          </div>
        </div>
        <div className="topbar-status"><span className="live-dot" /> Live offsets <span className="status-separator" /> {referenceDateLabel}</div>
      </header>

      <main className="main-content">
        <section className="intro-row">
          <div>
            <p className="eyebrow">Plan across the world</p>
            <h1>Find your shared hours.</h1>
            <p className="intro-copy">See the hours when your team is awake, aligned to <strong>{referenceCity.city}</strong>.</p>
          </div>
          <button className="settings-button" type="button" onClick={() => setIsSettingsOpen((open) => !open)} aria-expanded={isSettingsOpen}>
            <Icon name="settings" size={17} />
            <span>Availability settings</span>
            <span className="settings-value">{formatHour(wake, format)} to {formatHour(sleep, format)}</span>
            <Icon name="chevron" size={16} />
          </button>
        </section>

        <section className={`settings-panel ${isSettingsOpen ? 'is-open' : ''}`} aria-hidden={!isSettingsOpen}>
          <div className="settings-heading">
            <div className="settings-heading-icon"><Icon name="settings" size={18} /></div>
            <div><h2>Shared awake window</h2><p>Applied to every city in the comparison.</p></div>
          </div>
          <div className="setting-control">
            <label htmlFor="wake-hour">Wake-up hour</label>
            <select id="wake-hour" value={wake} onChange={(event) => setWake(Number(event.target.value))}>{HOURS.map((hour) => <option key={hour} value={hour}>{formatHour(hour, format)}</option>)}</select>
          </div>
          <div className="setting-control">
            <label htmlFor="sleep-hour">Sleep hour</label>
            <select id="sleep-hour" value={sleep} onChange={(event) => setSleep(Number(event.target.value))}>{HOURS.map((hour) => <option key={hour} value={hour}>{formatHour(hour, format)}</option>)}</select>
          </div>
          <div className="setting-control format-control">
            <span className="control-label">Time format</span>
            <div className="format-toggle" role="group" aria-label="Time format">
              <button type="button" className={format === '12h' ? 'selected' : ''} onClick={() => setFormat('12h')}>12h</button>
              <button type="button" className={format === '24h' ? 'selected' : ''} onClick={() => setFormat('24h')}>24h</button>
            </div>
          </div>
          <div className="settings-note"><Icon name="moon" size={15} /> {wake === sleep ? 'Awake all day' : `Overnight schedules work too, such as ${formatHour(wake, format)} to ${formatHour(sleep, format)}.`}</div>
        </section>

        <section className="mode-strip" aria-label="Comparison mode">
          <div className="mode-copy"><span className="mode-label">Comparison mode</span><span className="mode-description">{modeDescription}</span></div>
          <div className="mode-toggle" role="tablist" aria-label="Comparison mode">
            <button type="button" role="tab" aria-selected={mode === 'meeting'} className={mode === 'meeting' ? 'active' : ''} onClick={() => setMode('meeting')}><span className="mode-dot meeting-dot" />Meeting mode</button>
            <button type="button" role="tab" aria-selected={mode === 'base'} className={mode === 'base' ? 'active' : ''} onClick={() => setMode('base')}><span className="mode-dot base-dot" />Base mode</button>
          </div>
        </section>

        <section className="summary-section" aria-live="polite">
          <div className="summary-heading">
            <div><p className="eyebrow">{mode === 'meeting' ? 'Team overlap' : 'Per-person overlap'}</p><h2>{mode === 'meeting' ? 'Everyone is awake' : `Compared with ${referenceCity.city}`}</h2></div>
            <div className="summary-stat"><strong>{mode === 'meeting' ? meetingOverlap.length : overlapCount}</strong><span>{mode === 'meeting' ? 'common hours' : 'paired hours'}</span></div>
          </div>
          {mode === 'meeting' ? (
            meetingOverlap.length ? <div className="range-list">{getRanges(meetingOverlap).map((range) => <span className="range-badge" key={`${range.start}-${range.end}`}><span className="range-dot" />{formatRangeWithFormat(range, format)}</span>)}</div> : <div className="warning-message"><span className="warning-icon">!</span><span>No shared awake hours with the current cities and schedule. Try widening the awake window.</span></div>
          ) : (
            <div className="base-summary-list">{baseOverlaps.map(({ city, hours }) => <div className="base-summary-item" key={city.id}><span className="summary-city"><span className="summary-city-code">{city.code}</span>{city.city}</span>{hours.length ? <><strong>{hours.length}h</strong><span className="summary-ranges">{getRanges(hours).map((range) => formatRangeWithFormat(range, format)).join(' · ')}</span></> : <span className="summary-no-overlap">No shared hours</span>}</div>)}</div>
          )}
          <p className="summary-footnote"><span className="footnote-line" />Reference city: <strong>{referenceCity.city}</strong>. All columns show that city's calendar day.</p>
        </section>

        <section className="grid-section">
          <div className="grid-toolbar">
            <div><h2>Daily overlap map</h2><p>Reference day in {referenceCity.city} <span className="tiny-separator">•</span> {referenceDateLabel}</p></div>
            <div className="legend" aria-label="Grid legend"><span><i className="legend-swatch overlap-swatch" />{mode === 'meeting' ? 'Everyone awake' : 'Paired overlap'}</span><span><i className="legend-swatch awake-swatch" />Awake</span><span><i className="legend-swatch sleep-swatch" />Sleeping</span></div>
          </div>
          <div className="desktop-grid-wrap">
            <div className="desktop-grid" style={{ '--city-count': cities.length }}>
              <div className="grid-corner"><span>Local time</span><small>Reference: {referenceCity.code}</small></div>
              {HOURS.map((hour) => <div className="hour-header" key={hour}><span>{formatHour(hour, format)}</span>{hour === 0 && <small>midnight</small>}{hour === 12 && <small>noon</small>}</div>)}
              <div className="remove-column-heading" />
              {cityMeta.map((city, cityIndex) => <div className="city-grid-row" key={city.id}>
                <div className={`city-label ${cityIndex === 0 ? 'reference-label' : ''}`}>
                  <button className="city-name-button" type="button" onClick={() => promoteCity(city.id)} aria-label={`Make ${city.city} the reference city`}>
                    <span className="city-code">{city.code}</span><span className="city-name">{city.city}</span>{cityIndex === 0 && <span className="ref-badge">REF</span>}
                  </button>
                  <span className="city-meta">{formatOffset(city.offset)} <span className="meta-separator">•</span> {city.country}</span>
                </div>
                {HOURS.map((hour) => {
                  const local = localHours[cityIndex][hour];
                  const awake = awakeMatrix[cityIndex][hour];
                  const isOverlap = mode === 'meeting' ? meetingOverlap.includes(hour) : cityIndex === 0 ? referenceAwake[hour] : baseOverlaps[cityIndex - 1].hours.includes(hour);
                  return <div className={`time-cell ${!awake ? 'sleeping' : isOverlap ? 'overlap' : 'awake'}`} key={`${city.id}-${hour}`} title={`${city.city}: ${formatLocalTime(local, format)}${!awake ? ', sleeping' : isOverlap ? ', overlap' : ', awake'}`}><span>{formatLocalTime(local, format)}</span></div>;
                })}
                <div className="remove-cell"><button className="icon-button" type="button" onClick={() => removeCity(city.id)} disabled={cities.length === 1} aria-label={`Remove ${city.city}`} title={cities.length === 1 ? 'At least one city is required' : `Remove ${city.city}`}><Icon name="x" size={16} /></button></div>
              </div>)}
            </div>
          </div>

          <div className="mobile-grid-wrap">
            <div className="mobile-grid" style={{ '--city-count': cities.length }}>
              <div className="mobile-hour-column"><div className="mobile-corner">Hour</div>{HOURS.map((hour) => <div className="mobile-hour-label" key={hour}>{formatHour(hour, format)}</div>)}</div>
              {cityMeta.map((city, cityIndex) => <div className="mobile-city-column" key={city.id}>
                <div className="mobile-city-header"><button className="city-name-button" type="button" onClick={() => promoteCity(city.id)}><span className="city-code">{city.code}</span><span className="city-name">{city.city}</span>{cityIndex === 0 && <span className="ref-badge">REF</span>}</button><span>{formatOffset(city.offset)}</span></div>
                {HOURS.map((hour) => {
                  const local = localHours[cityIndex][hour];
                  const awake = awakeMatrix[cityIndex][hour];
                  const isOverlap = mode === 'meeting' ? meetingOverlap.includes(hour) : cityIndex === 0 ? referenceAwake[hour] : baseOverlaps[cityIndex - 1].hours.includes(hour);
                  return <div className={`mobile-time-cell ${!awake ? 'sleeping' : isOverlap ? 'overlap' : 'awake'}`} key={`${city.id}-mobile-${hour}`}><span>{formatLocalTime(local, format)}</span></div>;
                })}
                <button className="mobile-remove" type="button" onClick={() => removeCity(city.id)} disabled={cities.length === 1}><Icon name="x" size={14} /> Remove</button>
              </div>)}
            </div>
          </div>
        </section>

        <section className="cities-section">
          <div className="cities-heading"><div><h2>Compared cities <span>{cities.length}</span></h2><p>Click a city name to make it the reference.</p></div><button className="add-city-button" type="button" onClick={() => setIsAddOpen((open) => !open)} aria-expanded={isAddOpen}><Icon name="plus" size={17} /> Add city</button></div>
          {isAddOpen && <div className="add-city-panel"><div className="search-field"><Icon name="search" size={17} /><input ref={addInputRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search city or country" aria-label="Search city or country" /><kbd>ESC</kbd></div><div className="city-option-list">{availableCities.length ? availableCities.map((city) => <button type="button" key={city.id} onClick={() => addCity(city.id)}><span className="option-code">{city.code}</span><span className="option-text"><strong>{city.city}</strong><small>{city.country} <span>•</span> {city.region}</small></span><Icon name="plus" size={16} /></button>) : <p className="empty-search">No available cities match “{search}”.</p>}</div></div>}
          <div className="city-chip-list">{cityMeta.map((city, index) => <div className={`city-chip ${index === 0 ? 'is-reference' : ''}`} key={city.id}><span className="chip-code">{city.code}</span><span>{city.city}</span>{index === 0 && <span className="chip-ref">REF</span>}<button type="button" onClick={() => removeCity(city.id)} disabled={cities.length === 1} aria-label={`Remove ${city.city}`}><Icon name="x" size={14} /></button></div>)}</div>
        </section>

        <footer className="app-footer"><span><span className="footer-mark" />Green cells = everyone awake</span><span>Offsets update from the current date and include DST</span></footer>
      </main>
    </div>
  );
}

function getTodayInReferenceDay(zone, date) {
  const parts = getZonedParts(date, zone);
  return { year: parts.year, month: parts.month, day: parts.day };
}

function formatRangeWithFormat(range, format) {
  return `${formatHour(range.start % 24, format)} – ${formatHour(range.end % 24, format)}`;
}

export default App;
