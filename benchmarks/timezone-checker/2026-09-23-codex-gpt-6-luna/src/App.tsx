import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowDownUp,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Globe2,
  Plus,
  Search,
  Settings2,
  Sun,
  Users,
  X,
} from 'lucide-react';
import {
  CITIES,
  DEFAULT_CITY_IDS,
  formatOffset,
  formatRangeHour,
  formatReferenceHour,
  formatShortLocalTime,
  getContiguousRanges,
  getInstantForZonedHour,
  getOffsetMinutes,
  getZonedDate,
  isAwakeAt,
  type City,
} from './timezones';

type Mode = 'meeting' | 'base';
type HourFormat = '12h' | '24h';
type SavedState = {
  cityIds: string[];
  mode: Mode;
  wakeHour: number;
  sleepHour: number;
  hourFormat: HourFormat;
};

const STORAGE_KEY = 'gpt-6-time-overlap-v1';
const CITY_BY_ID = new Map(CITIES.map((city) => [city.id, city]));
const DAY_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function readSavedState(): SavedState | undefined {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<SavedState> | null;
    if (!saved || !Array.isArray(saved.cityIds)) return undefined;
    const cityIds = [...new Set(saved.cityIds.filter((id): id is string => typeof id === 'string' && CITY_BY_ID.has(id)))];
    const validHour = (hour: unknown): hour is number => typeof hour === 'number' && Number.isInteger(hour) && hour >= 0 && hour <= 23;
    return {
      cityIds,
      mode: saved.mode === 'base' ? 'base' : 'meeting',
      wakeHour: validHour(saved.wakeHour) ? saved.wakeHour : 7,
      sleepHour: validHour(saved.sleepHour) ? saved.sleepHour : 23,
      hourFormat: saved.hourFormat === '24h' ? '24h' : '12h',
    };
  } catch {
    return undefined;
  }
}

function formatHours(count: number) {
  return `${count} ${count === 1 ? 'hour' : 'hours'}`;
}

function formatDay(date: Date, timezone: string) {
  let formatter = DAY_FORMATTERS.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
    DAY_FORMATTERS.set(timezone, formatter);
  }
  return formatter.format(date);
}

function getRangesLabel(hours: number[], format: HourFormat) {
  return getContiguousRanges(hours).map(({ start, end }) => `${formatRangeHour(start, format)} — ${formatRangeHour(end, format)}`);
}

function RangeBadges({ hours, format }: { hours: number[]; format: HourFormat }) {
  const ranges = getRangesLabel(hours, format);
  if (!ranges.length) return <span className="no-window">No shared window</span>;
  return (
    <div className="range-badges">
      {ranges.map((range) => <span className="range-badge" key={range}>{range}</span>)}
    </div>
  );
}

function CityPicker({ cityIds, onAdd }: { cityIds: string[]; onAdd: (city: City) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const filteredCities = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return CITIES.filter((city) => `${city.name} ${city.country} ${city.region}`.toLocaleLowerCase().includes(normalized));
  }, [query]);

  return (
    <div className="picker-wrap" ref={pickerRef}>
      <button className="add-city-button" onClick={() => { setOpen((value) => !value); setQuery(''); }} aria-expanded={open}>
        <Plus size={16} strokeWidth={2.4} /> <span>Add city</span><ChevronDown size={14} className={open ? 'chevron-up' : ''} />
      </button>
      {open && (
        <div className="city-picker popover">
          <div className="picker-search">
            <Search size={16} aria-hidden="true" />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search city or country" aria-label="Search city or country" />
            <kbd>ESC</kbd>
          </div>
          <div className="picker-results">
            {filteredCities.map((city) => {
              const added = cityIds.includes(city.id);
              return (
                <button
                  className="picker-option"
                  key={city.id}
                  disabled={added}
                  onClick={() => { onAdd(city); setOpen(false); setQuery(''); }}
                >
                  <span className={`region-dot region-${city.region.toLowerCase().replaceAll(' ', '-')}`} />
                  <span className="picker-city"><strong>{city.name}</strong><small>{city.country}</small></span>
                  {added ? <span className="already-added"><Check size={13} /> Added</span> : <Plus size={15} className="picker-plus" />}
                </button>
              );
            })}
            {!filteredCities.length && <div className="picker-empty">No cities match “{query}”</div>}
          </div>
          <div className="picker-foot">{CITIES.length} cities · 7 regions</div>
        </div>
      )}
    </div>
  );
}

type HourColumn = {
  hour: number;
  skipped: boolean;
  localTimes: Map<string, string>;
  awake: Map<string, boolean>;
};

function TimeGrid({
  cities,
  columns,
  mode,
  format,
  overlapHours,
  pairHours,
  now,
  onPromote,
  onRemove,
}: {
  cities: City[];
  columns: HourColumn[];
  mode: Mode;
  format: HourFormat;
  overlapHours: number[];
  pairHours: Map<string, number[]>;
  now: Date;
  onPromote: (city: City) => void;
  onRemove: (city: City) => void;
}) {
  const reference = cities[0];
  const meetingOverlapHours = new Set(overlapHours);
  const baseOverlapHours = new Set([...pairHours.values()].flat());
  const isOverlap = (city: City, hour: number) => {
    if (mode === 'meeting') return meetingOverlapHours.has(hour);
    if (city.id === reference?.id) return baseOverlapHours.has(hour);
    return pairHours.get(city.id)?.includes(hour) ?? false;
  };
  const stateFor = (city: City, column: HourColumn) => {
    if (column.skipped || !column.awake.get(city.id)) return 'sleeping';
    return isOverlap(city, column.hour) ? 'overlap' : 'awake';
  };

  return (
    <>
      <div className="desktop-grid" role="table" aria-label="Today's city availability by hour">
        <div className="desktop-grid-head" role="row">
          <div className="city-heading" role="columnheader">CITY <span>LOCAL TIME · UTC OFFSET</span></div>
          {columns.map((column) => (
            <div className={`hour-heading ${column.hour % 6 === 0 ? 'hour-break' : ''}`} role="columnheader" key={column.hour}>
              {formatReferenceHour(column.hour, format)}
            </div>
          ))}
          <div className="row-action-heading" role="columnheader" aria-label="City actions" />
        </div>
        {cities.map((city, cityIndex) => (
          <div className={`desktop-city-row ${cityIndex === 0 ? 'reference-row' : ''}`} role="row" key={city.id}>
            <div className="city-info" role="rowheader">
              <span className={`city-color-dot color-${cityIndex % 6}`} />
              <div className="city-meta">
                <div className="city-name-line">
                  <button className="city-promote" onClick={() => onPromote(city)} title={cityIndex === 0 ? 'Reference city' : `Use ${city.name} as the reference city`}>
                    {city.name}
                  </button>
                  {cityIndex === 0 && <span className="ref-badge">REF</span>}
                  {cityIndex !== 0 && <button className="promote-icon" onClick={() => onPromote(city)} aria-label={`Make ${city.name} the reference city`}><ArrowDownUp size={12} /></button>}
                </div>
                <div className="city-subline"><span className="city-live-dot" />{formatShortLocalTime(now, city.timezone, format)} <span className="city-offset">{formatOffset(getOffsetMinutes(now, city.timezone))}</span></div>
              </div>
            </div>
            {columns.map((column) => (
              <div
                className={`time-cell ${stateFor(city, column)} ${column.hour % 6 === 0 ? 'hour-break' : ''}`}
                role="cell"
                key={`${city.id}-${column.hour}`}
                title={column.skipped ? `${city.name}: this reference hour does not occur because of a daylight-saving change` : `${city.name}: ${column.localTimes.get(city.id)}${isOverlap(city, column.hour) ? ' · shared awake time' : ''}`}
              >
                <span>{column.localTimes.get(city.id)}</span>
              </div>
            ))}
            <div className="remove-cell" role="cell"><button className="remove-city-button" onClick={() => onRemove(city)} aria-label={`Remove ${city.name}`} title={`Remove ${city.name}`}><X size={15} /></button></div>
          </div>
        ))}
      </div>

      <div className="mobile-grid" style={{ '--city-count': cities.length, '--mobile-grid-min-width': `${52 + 88 * cities.length}px` } as CSSProperties} aria-label="Today's city availability by hour">
        <div className="mobile-city-head">
          <div className="mobile-hour-head">REF<br />HOUR</div>
          {cities.map((city, cityIndex) => (
            <div className="mobile-city-column" key={city.id}>
              <div className="mobile-city-title">
                <button className="mobile-city-promote" onClick={() => onPromote(city)} aria-label={`Make ${city.name} the reference city`}>{city.name}</button>
                {cityIndex === 0 && <span className="ref-badge">REF</span>}
                <button className="mobile-remove" onClick={() => onRemove(city)} aria-label={`Remove ${city.name}`}><X size={13} /></button>
              </div>
              <span className="mobile-country">{city.country}</span>
              <span className="mobile-local-now"><i />{formatShortLocalTime(now, city.timezone, format)}</span>
              <span className="mobile-offset">{formatOffset(getOffsetMinutes(now, city.timezone))}</span>
              {cityIndex > 0 && <button className="mobile-ref-action" onClick={() => onPromote(city)} aria-label={`Set ${city.name} as the reference city`}>Set as ref</button>}
            </div>
          ))}
        </div>
        {columns.map((column) => (
          <div className={`mobile-hour-row ${column.hour % 6 === 0 ? 'hour-break' : ''}`} key={column.hour}>
            <div className="mobile-reference-hour">{formatReferenceHour(column.hour, format)}</div>
            {cities.map((city) => (
              <div
                className={`mobile-time-cell time-cell ${stateFor(city, column)}`}
                key={`${city.id}-${column.hour}-mobile`}
                title={column.skipped ? `${city.name}: this reference hour does not occur because of a daylight-saving change` : `${city.name}: ${column.localTimes.get(city.id)}`}
              >
                {column.localTimes.get(city.id)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function App() {
  const [saved] = useState(readSavedState);
  const [cityIds, setCityIds] = useState<string[]>(() => saved?.cityIds ?? DEFAULT_CITY_IDS);
  const [mode, setMode] = useState<Mode>(() => saved?.mode ?? 'meeting');
  const [wakeHour, setWakeHour] = useState(() => saved?.wakeHour ?? 7);
  const [sleepHour, setSleepHour] = useState(() => saved?.sleepHour ?? 23);
  const [format, setFormat] = useState<HourFormat>(() => saved?.hourFormat ?? '12h');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ cityIds, mode, wakeHour, sleepHour, hourFormat: format } satisfies SavedState));
    } catch {
      // The checker still works when storage is unavailable, such as in private browsing.
    }
  }, [cityIds, mode, wakeHour, sleepHour, format]);

  const cities = useMemo(() => cityIds.map((id) => CITY_BY_ID.get(id)).filter((city): city is City => Boolean(city)), [cityIds]);
  const reference = cities[0];
  const columns = useMemo<HourColumn[]>(() => {
    if (!reference) return [];
    const date = getZonedDate(now, reference.timezone);
    return Array.from({ length: 24 }, (_, hour) => {
      const instant = getInstantForZonedHour(date, reference.timezone, hour);
      const localTimes = new Map<string, string>();
      const awake = new Map<string, boolean>();
      for (const city of cities) {
        localTimes.set(city.id, instant ? formatShortLocalTime(instant, city.timezone, format) : '—');
        awake.set(city.id, instant ? isAwakeAt(instant, city.timezone, wakeHour, sleepHour) : false);
      }
      return { hour, skipped: !instant, localTimes, awake };
    });
  }, [cities, format, now, reference, sleepHour, wakeHour]);

  const overlapHours = useMemo(() => columns
    .filter((column) => cities.length > 0 && cities.every((city) => column.awake.get(city.id)))
    .map((column) => column.hour), [cities, columns]);

  const pairHours = useMemo(() => {
    const pairs = new Map<string, number[]>();
    if (!reference) return pairs;
    for (const city of cities.slice(1)) {
      pairs.set(city.id, columns
        .filter((column) => column.awake.get(reference.id) && column.awake.get(city.id))
        .map((column) => column.hour));
    }
    return pairs;
  }, [cities, columns, reference]);

  const addCity = (city: City) => setCityIds((current) => current.includes(city.id) ? current : [...current, city.id]);
  const removeCity = (city: City) => setCityIds((current) => current.filter((id) => id !== city.id));
  const promoteCity = (city: City) => setCityIds((current) => [city.id, ...current.filter((id) => id !== city.id)]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="GPT-6 home">
          <span className="wordmark-mark"><Clock3 size={17} strokeWidth={2.2} /></span>
          <h1>GPT-6</h1>
        </a>
        <div className="topbar-right"><span className="topbar-status"><i /> Live local times</span><span className="topbar-divider" /><span className="topbar-label">TIMEZONE PLANNER</span></div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Globe2 size={13} /> A LITTLE CLOSER, EVERYWHERE</div>
            <h2>Make time for <span>everyone.</span></h2>
            <p>See the hours your team is awake, wherever the day finds them.</p>
          </div>
          {reference ? (
            <div className="reference-clock">
              <div className="reference-clock-icon"><CalendarDays size={15} /></div>
              <div><span className="reference-clock-label">YOUR REFERENCE DAY</span><strong>{formatDay(now, reference.timezone)}</strong><span className="reference-clock-place">{reference.name} · {formatShortLocalTime(now, reference.timezone, format)} local</span></div>
            </div>
          ) : (
            <div className="reference-clock empty-clock"><Globe2 size={18} /><span>Add a city to get started</span></div>
          )}
        </section>

        <section className="toolbar" aria-label="Planner settings">
          <div className="mode-panel">
            <div className="panel-label"><Settings2 size={14} /> OVERLAP MODE</div>
            <div className="mode-switch" role="group" aria-label="Overlap mode">
              <button className={mode === 'meeting' ? 'mode-option selected' : 'mode-option'} onClick={() => setMode('meeting')} aria-pressed={mode === 'meeting'}>
                <span className="mode-icon meeting-icon"><Users size={14} /></span><span className="mode-text"><strong>Meeting</strong><small>Everyone together</small></span>
              </button>
              <button className={mode === 'base' ? 'mode-option selected' : 'mode-option'} onClick={() => setMode('base')} aria-pressed={mode === 'base'}>
                <span className="mode-icon base-icon"><Globe2 size={14} /></span><span className="mode-text"><strong>Base</strong><small>Compare one by one</small></span>
              </button>
            </div>
          </div>

          <div className="awake-panel">
            <div className="awake-heading"><span className="panel-label"><Sun size={14} /> EVERYONE'S AWAKE WINDOW</span><span className="awake-note">Same for every city</span></div>
            <div className="awake-controls">
              <label className="hour-select-wrap"><span>Wake</span><select aria-label="Wake-up hour" value={wakeHour} onChange={(event) => setWakeHour(Number(event.target.value))}>{Array.from({ length: 24 }, (_, hour) => <option value={hour} key={hour}>{formatReferenceHour(hour, format)}</option>)}</select><ChevronDown size={12} /></label>
              <span className="awake-dash">→</span>
              <label className="hour-select-wrap"><span>Sleep</span><select aria-label="Sleep hour" value={sleepHour} onChange={(event) => setSleepHour(Number(event.target.value))}>{Array.from({ length: 24 }, (_, hour) => <option value={hour} key={hour}>{formatReferenceHour(hour, format)}</option>)}</select><ChevronDown size={12} /></label>
              <div className="format-toggle" role="group" aria-label="Time format">
                <button className={format === '12h' ? 'active' : ''} onClick={() => setFormat('12h')} aria-pressed={format === '12h'}>12h</button>
                <button className={format === '24h' ? 'active' : ''} onClick={() => setFormat('24h')} aria-pressed={format === '24h'}>24h</button>
              </div>
            </div>
          </div>
        </section>

        {cities.length >= 2 && (
          <section className={`summary-panel ${mode === 'base' ? 'summary-base' : ''}`} aria-live="polite">
            {mode === 'meeting' ? (
              <>
                <div className="summary-icon"><Users size={17} /></div>
                <div className="summary-title"><span className="summary-kicker">THE SHARED WINDOW</span><strong>{formatHours(overlapHours.length)} with everyone awake</strong><small>Measured across {cities.length} cities · reference time in {reference?.name}</small></div>
                <div className="summary-ranges"><RangeBadges hours={overlapHours} format={format} />{!overlapHours.length && <small className="summary-hint">Try changing the awake window or switching to Base mode.</small>}</div>
              </>
            ) : (
              <>
                <div className="summary-icon"><Globe2 size={17} /></div>
                <div className="summary-base-heading"><span className="summary-kicker">FROM {reference?.name.toUpperCase()}</span><strong>Best time with each city</strong><small>Each window is calculated independently</small></div>
                <div className="pair-summaries">
                  {cities.slice(1).map((city) => {
                    const hours = pairHours.get(city.id) ?? [];
                    return <div className="pair-summary" key={city.id}><strong>{city.name}</strong><span>{formatHours(hours.length)}</span><RangeBadges hours={hours} format={format} /></div>;
                  })}
                </div>
              </>
            )}
          </section>
        )}

        <section className="schedule-card">
          <div className="schedule-topline">
            <div className="schedule-heading"><span className="schedule-icon"><Clock3 size={16} /></span><div><h3>Today's rhythm</h3><p>{reference ? `All 24 hours in ${reference.name}` : 'Your cities will appear here'}</p></div></div>
            <div className="schedule-actions">
              <div className="location-count"><span>{cities.length}</span> {cities.length === 1 ? 'CITY' : 'CITIES'}</div>
              <CityPicker cityIds={cityIds} onAdd={addCity} />
            </div>
          </div>

          {cities.length ? (
            <div className="grid-scroll">
              <div className="grid-inner">
                <TimeGrid
                  cities={cities}
                  columns={columns}
                  mode={mode}
                  format={format}
                  overlapHours={overlapHours}
                  pairHours={pairHours}
                  now={now}
                  onPromote={promoteCity}
                  onRemove={removeCity}
                />
              </div>
            </div>
          ) : (
            <div className="empty-grid"><span><Globe2 size={22} /></span><strong>Your world, in sync</strong><p>Add a city to see its local time and find the hours you share.</p></div>
          )}

          <div className="grid-footer">
            <div className="legend">
              <span><i className="legend-swatch overlap" />{mode === 'meeting' ? 'Everyone awake' : 'Shared awake time'}</span>
              <span><i className="legend-swatch awake" />Awake</span>
              <span><i className="legend-swatch sleeping" />Sleeping</span>
            </div>
            <div className="grid-foot-note"><span className="foot-sun"><Sun size={13} /></span>{mode === 'meeting' ? 'Green cells = everyone awake' : 'Green cells = you and this city awake'}</div>
          </div>
        </section>

        <footer className="page-footer"><span>Good work happens when the time is right.</span><span>Times update live · Offsets account for daylight saving</span></footer>
      </main>
    </div>
  );
}

export default App;
