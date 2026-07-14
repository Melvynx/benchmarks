import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type Mode = 'meeting' | 'base';
type TimeFormat = '12h' | '24h';

type City = {
  id: string;
  name: string;
  country: string;
  region: string;
  timeZone: string;
  accent: string;
};

type Settings = {
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
};

type PersistedState = {
  cityIds: string[];
  mode: Mode;
  settings: Settings;
};

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

type HourRecord = {
  referenceHour: number;
  instant: Date;
  cityTimes: Record<string, CityHourState>;
  meetingOverlap: boolean;
  baseOverlaps: Record<string, boolean>;
};

type CityHourState = {
  localHour: number;
  localMinute: number;
  localLabel: string;
  isAwake: boolean;
  offsetLabel: string;
  dayShift: number;
};

type Range = {
  start: number;
  end: number;
  count: number;
  wraps: boolean;
};

const MODEL_NAME = 'Sakana Fugu Ultra';
const STORAGE_KEY = 'fugu-timezone-overlap-state-v1';

const CITY_CATALOG: City[] = [
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', region: 'North America', timeZone: 'America/Los_Angeles', accent: '#63d6ff' },
  { id: 'new-york', name: 'New York', country: 'United States', region: 'North America', timeZone: 'America/New_York', accent: '#8ad7ff' },
  { id: 'vancouver', name: 'Vancouver', country: 'Canada', region: 'North America', timeZone: 'America/Vancouver', accent: '#73c7b9' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', region: 'North America', timeZone: 'America/Mexico_City', accent: '#ffc857' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', region: 'South America', timeZone: 'America/Sao_Paulo', accent: '#4ddf91' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', region: 'South America', timeZone: 'America/Argentina/Buenos_Aires', accent: '#9fd356' },
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', region: 'South America', timeZone: 'America/Bogota', accent: '#ffcf5a' },
  { id: 'london', name: 'London', country: 'United Kingdom', region: 'Europe', timeZone: 'Europe/London', accent: '#c8d7ff' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', region: 'Europe', timeZone: 'Europe/Zurich', accent: '#ff6f91' },
  { id: 'paris', name: 'Paris', country: 'France', region: 'Europe', timeZone: 'Europe/Paris', accent: '#f79ac0' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', region: 'Europe', timeZone: 'Europe/Berlin', accent: '#d7a8ff' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', region: 'Europe', timeZone: 'Europe/Lisbon', accent: '#f4a261' },
  { id: 'helsinki', name: 'Helsinki', country: 'Finland', region: 'Europe', timeZone: 'Europe/Helsinki', accent: '#a1eafb' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', region: 'Africa', timeZone: 'Africa/Cairo', accent: '#e9c46a' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', region: 'Africa', timeZone: 'Africa/Lagos', accent: '#75d79a' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', region: 'Africa', timeZone: 'Africa/Nairobi', accent: '#a6e05e' },
  { id: 'cape-town', name: 'Cape Town', country: 'South Africa', region: 'Africa', timeZone: 'Africa/Johannesburg', accent: '#ff9f6e' },
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', region: 'Middle East', timeZone: 'Asia/Dubai', accent: '#ffd166' },
  { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', region: 'Middle East', timeZone: 'Asia/Riyadh', accent: '#e6b980' },
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', region: 'Middle East', timeZone: 'Asia/Jerusalem', accent: '#6ed3cf' },
  { id: 'istanbul', name: 'Istanbul', country: 'Türkiye', region: 'Middle East', timeZone: 'Europe/Istanbul', accent: '#f28482' },
  { id: 'mumbai', name: 'Mumbai', country: 'India', region: 'Asia', timeZone: 'Asia/Kolkata', accent: '#ffb703' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', region: 'Asia', timeZone: 'Asia/Kathmandu', accent: '#fb7185' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', region: 'Asia', timeZone: 'Asia/Bangkok', accent: '#22d3ee' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', region: 'Asia', timeZone: 'Asia/Makassar', accent: '#47d39c' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', region: 'Asia', timeZone: 'Asia/Singapore', accent: '#5eead4' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'China', region: 'Asia', timeZone: 'Asia/Hong_Kong', accent: '#f87171' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', region: 'Asia', timeZone: 'Asia/Tokyo', accent: '#ff8fab' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', region: 'Asia', timeZone: 'Asia/Seoul', accent: '#c084fc' },
  { id: 'shanghai', name: 'Shanghai', country: 'China', region: 'Asia', timeZone: 'Asia/Shanghai', accent: '#f472b6' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', region: 'Oceania', timeZone: 'Australia/Sydney', accent: '#38bdf8' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', region: 'Oceania', timeZone: 'Pacific/Auckland', accent: '#34d399' },
  { id: 'honolulu', name: 'Honolulu', country: 'United States', region: 'Oceania', timeZone: 'Pacific/Honolulu', accent: '#fde047' },
  { id: 'suva', name: 'Suva', country: 'Fiji', region: 'Oceania', timeZone: 'Pacific/Fiji', accent: '#2dd4bf' },
];

const DEFAULT_STATE: PersistedState = {
  cityIds: ['san-francisco', 'denpasar', 'geneva'],
  mode: 'meeting',
  settings: {
    wakeHour: 7,
    sleepHour: 23,
    timeFormat: '12h',
  },
};

const PART_FORMATTERS = new Map<string, Intl.DateTimeFormat>();
const OFFSET_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function getPartFormatter(timeZone: string) {
  const existing = PART_FORMATTERS.get(timeZone);
  if (existing) return existing;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  PART_FORMATTERS.set(timeZone, formatter);
  return formatter;
}

function getOffsetFormatter(timeZone: string) {
  const existing = OFFSET_FORMATTERS.get(timeZone);
  if (existing) return existing;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  OFFSET_FORMATTERS.set(timeZone, formatter);
  return formatter;
}

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = getPartFormatter(timeZone).formatToParts(date);
  const values: Record<string, number> = {};

  for (const part of parts) {
    if (['year', 'month', 'day', 'hour', 'minute', 'second'].includes(part.type)) {
      values[part.type] = Number(part.value);
    }
  }

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour === 24 ? 0 : values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function getOffsetMinutes(timeZone: string, instant: Date): number {
  const parts = getZonedParts(instant, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUtc - instant.getTime()) / 60000);
}

function zonedTimeToUtc(parts: Omit<ZonedParts, 'second'>, timeZone: string): Date {
  const desiredUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
  let guess = desiredUtc;

  for (let index = 0; index < 4; index += 1) {
    const offset = getOffsetMinutes(timeZone, new Date(guess));
    const nextGuess = desiredUtc - offset * 60_000;
    if (Math.abs(nextGuess - guess) < 1000) break;
    guess = nextGuess;
  }

  return new Date(guess);
}

function getOffsetLabel(timeZone: string, instant = new Date()): string {
  const formatter = getOffsetFormatter(timeZone);
  const offsetPart = formatter.formatToParts(instant).find((part) => part.type === 'timeZoneName');
  const value = offsetPart?.value ?? 'GMT';
  return value.replace('GMT', 'UTC');
}

function normalizePersistedState(value: unknown): PersistedState {
  if (!value || typeof value !== 'object') return DEFAULT_STATE;
  const maybe = value as Partial<PersistedState>;
  const validCityIds = Array.isArray(maybe.cityIds)
    ? maybe.cityIds.filter((id, index, array): id is string =>
        typeof id === 'string' && CITY_CATALOG.some((city) => city.id === id) && array.indexOf(id) === index,
      )
    : DEFAULT_STATE.cityIds;

  const settings = maybe.settings ?? DEFAULT_STATE.settings;
  const wakeHour = clampHour(settings.wakeHour, DEFAULT_STATE.settings.wakeHour);
  const sleepHour = clampHour(settings.sleepHour, DEFAULT_STATE.settings.sleepHour);
  const timeFormat: TimeFormat = settings.timeFormat === '24h' ? '24h' : '12h';

  return {
    cityIds: validCityIds,
    mode: maybe.mode === 'base' ? 'base' : 'meeting',
    settings: { wakeHour, sleepHour, timeFormat },
  };
}

function loadState(): PersistedState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_STATE;
    return normalizePersistedState(JSON.parse(stored));
  } catch {
    return DEFAULT_STATE;
  }
}

function clampHour(value: unknown, fallback: number): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 23) return fallback;
  return number;
}

function isAwake(localHour: number, localMinute: number, settings: Settings): boolean {
  if (settings.wakeHour === settings.sleepHour) return true;

  const current = localHour * 60 + localMinute;
  const wake = settings.wakeHour * 60;
  const sleep = settings.sleepHour * 60;

  if (wake < sleep) {
    return current >= wake && current < sleep;
  }

  return current >= wake || current < sleep;
}

function formatHour(hour: number, format: TimeFormat): string {
  const normalized = ((hour % 24) + 24) % 24;
  if (format === '24h') return `${String(normalized).padStart(2, '0')}:00`;
  if (normalized === 0) return '12am';
  if (normalized === 12) return '12pm';
  if (normalized < 12) return `${normalized}am`;
  return `${normalized - 12}pm`;
}

function formatLocalTime(hour: number, minute: number, format: TimeFormat): string {
  const normalizedHour = ((hour % 24) + 24) % 24;
  if (format === '24h') return `${String(normalizedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  const suffix = normalizedHour >= 12 ? 'pm' : 'am';
  const displayHour = normalizedHour % 12 === 0 ? 12 : normalizedHour % 12;
  return minute === 0 ? `${displayHour}${suffix}` : `${displayHour}:${String(minute).padStart(2, '0')}${suffix}`;
}

function formatDayShift(shift: number): string {
  if (shift === 0) return '';
  return shift > 0 ? `+${shift}d` : `${shift}d`;
}

function formatRange(range: Range, format: TimeFormat): string {
  if (range.count === 24) return 'All day';
  return `${formatHour(range.start, format)} — ${formatHour(range.end, format)}`;
}

function getReferenceDateParts(referenceTimeZone: string): Pick<ZonedParts, 'year' | 'month' | 'day'> {
  const nowInReference = getZonedParts(new Date(), referenceTimeZone);
  return {
    year: nowInReference.year,
    month: nowInReference.month,
    day: nowInReference.day,
  };
}

function getDayNumber(parts: Pick<ZonedParts, 'year' | 'month' | 'day'>) {
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000);
}

function buildHourRecords(cities: City[], settings: Settings): HourRecord[] {
  if (cities.length === 0) return [];

  const referenceCity = cities[0];
  const referenceDate = getReferenceDateParts(referenceCity.timeZone);
  const referenceDayNumber = getDayNumber(referenceDate);
  const records: HourRecord[] = [];

  for (let referenceHour = 0; referenceHour < 24; referenceHour += 1) {
    const instant = zonedTimeToUtc({ ...referenceDate, hour: referenceHour, minute: 0 }, referenceCity.timeZone);
    const cityTimes: Record<string, CityHourState> = {};

    for (const city of cities) {
      const parts = getZonedParts(instant, city.timeZone);
      const isCityAwake = isAwake(parts.hour, parts.minute, settings);
      cityTimes[city.id] = {
        localHour: parts.hour,
        localMinute: parts.minute,
        localLabel: formatLocalTime(parts.hour, parts.minute, settings.timeFormat),
        isAwake: isCityAwake,
        offsetLabel: getOffsetLabel(city.timeZone, instant),
        dayShift: getDayNumber(parts) - referenceDayNumber,
      };
    }

    const meetingOverlap = cities.length > 0 && cities.every((city) => cityTimes[city.id].isAwake);
    const baseOverlaps: Record<string, boolean> = {};
    const referenceAwake = cityTimes[referenceCity.id].isAwake;

    for (const city of cities) {
      baseOverlaps[city.id] = referenceAwake && cityTimes[city.id].isAwake;
    }

    records.push({ referenceHour, instant, cityTimes, meetingOverlap, baseOverlaps });
  }

  return records;
}

function rangesFromFlags(flags: boolean[]): Range[] {
  const activeHours = flags.reduce<number[]>((acc, isActive, index) => {
    if (isActive) acc.push(index);
    return acc;
  }, []);

  if (activeHours.length === 0) return [];
  if (activeHours.length === 24) return [{ start: 0, end: 0, count: 24, wraps: false }];

  const groups: Range[] = [];
  let start = activeHours[0];
  let previous = activeHours[0];

  for (let index = 1; index < activeHours.length; index += 1) {
    const hour = activeHours[index];
    if (hour === previous + 1) {
      previous = hour;
      continue;
    }

    groups.push({ start, end: previous + 1, count: previous - start + 1, wraps: false });
    start = hour;
    previous = hour;
  }

  groups.push({ start, end: previous + 1, count: previous - start + 1, wraps: false });

  const first = groups[0];
  const last = groups[groups.length - 1];
  if (first.start === 0 && last.end === 24 && groups.length > 1) {
    const wrapped: Range = {
      start: last.start,
      end: first.end,
      count: last.count + first.count,
      wraps: true,
    };
    return [wrapped, ...groups.slice(1, -1)];
  }

  return groups;
}

function summarizeCount(flags: boolean[]): number {
  return flags.filter(Boolean).length;
}

function getCityById(id: string): City | undefined {
  return CITY_CATALOG.find((city) => city.id === id);
}

function getCitySearchText(city: City): string {
  return `${city.name} ${city.country} ${city.region} ${city.timeZone}`.toLowerCase();
}

function App() {
  const [state, setState] = React.useState<PersistedState>(loadState);
  const [query, setQuery] = React.useState('');
  const cityInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const selectedCities = React.useMemo(
    () => state.cityIds.map(getCityById).filter((city): city is City => Boolean(city)),
    [state.cityIds],
  );

  const selectedCityIds = React.useMemo(() => new Set(state.cityIds), [state.cityIds]);
  const referenceCity = selectedCities[0];
  const hourRecords = React.useMemo(() => buildHourRecords(selectedCities, state.settings), [selectedCities, state.settings]);

  const filteredCities = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return CITY_CATALOG.filter((city) => !selectedCityIds.has(city.id))
      .filter((city) => (normalized ? getCitySearchText(city).includes(normalized) : true))
      .slice(0, 8);
  }, [query, selectedCityIds]);

  function updateSettings(partial: Partial<Settings>) {
    setState((current) => ({ ...current, settings: { ...current.settings, ...partial } }));
  }

  function addCity(cityId: string) {
    setState((current) => {
      if (current.cityIds.includes(cityId)) return current;
      return { ...current, cityIds: [...current.cityIds, cityId] };
    });
    setQuery('');
    requestAnimationFrame(() => cityInputRef.current?.focus());
  }

  function removeCity(cityId: string) {
    setState((current) => ({ ...current, cityIds: current.cityIds.filter((id) => id !== cityId) }));
  }

  function promoteCity(cityId: string) {
    setState((current) => {
      if (current.cityIds[0] === cityId) return current;
      return { ...current, cityIds: [cityId, ...current.cityIds.filter((id) => id !== cityId)] };
    });
  }

  function resetDefaults() {
    setState(DEFAULT_STATE);
    setQuery('');
  }

  return (
    <main className="app-shell">
      <section className="hero-panel" aria-labelledby="page-title">
        <div className="hero-copy">
          <p className="eyebrow">Timezone overlap checker</p>
          <h1 id="page-title">{MODEL_NAME}</h1>
          <p className="hero-text">
            A precise command center for remote teams, nomads, and cross-continent calls. Pick a reference city,
            tune the awake window, and the green lanes reveal usable meeting time instantly.
          </p>
        </div>

        <div className="hero-card" aria-label="Current reference city">
          <span className="card-kicker">Anchored day</span>
          <strong>{referenceCity ? referenceCity.name : 'No reference yet'}</strong>
          <span>{referenceCity ? `${referenceCity.country} · ${getOffsetLabel(referenceCity.timeZone)}` : 'Add a city to begin'}</span>
        </div>
      </section>

      <section className="control-deck" aria-label="Timezone checker controls">
        <div className="mode-toggle" role="group" aria-label="Overlap mode">
          <button
            type="button"
            className={state.mode === 'meeting' ? 'active' : ''}
            onClick={() => setState((current) => ({ ...current, mode: 'meeting' }))}
          >
            <span>Meeting Mode</span>
            <small>Everyone together</small>
          </button>
          <button
            type="button"
            className={state.mode === 'base' ? 'active' : ''}
            onClick={() => setState((current) => ({ ...current, mode: 'base' }))}
          >
            <span>Base Mode</span>
            <small>Reference vs each city</small>
          </button>
        </div>

        <div className="settings-panel" aria-label="Awake window settings">
          <label>
            <span>Wake-up hour</span>
            <select
              value={state.settings.wakeHour}
              onChange={(event) => updateSettings({ wakeHour: Number(event.target.value) })}
            >
              {Array.from({ length: 24 }, (_, hour) => (
                <option key={hour} value={hour}>
                  {formatHour(hour, state.settings.timeFormat)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Sleep hour</span>
            <select
              value={state.settings.sleepHour}
              onChange={(event) => updateSettings({ sleepHour: Number(event.target.value) })}
            >
              {Array.from({ length: 24 }, (_, hour) => (
                <option key={hour} value={hour}>
                  {formatHour(hour, state.settings.timeFormat)}
                </option>
              ))}
            </select>
          </label>

          <div className="segmented" role="group" aria-label="Time format">
            <button
              type="button"
              className={state.settings.timeFormat === '12h' ? 'active' : ''}
              onClick={() => updateSettings({ timeFormat: '12h' })}
            >
              12h
            </button>
            <button
              type="button"
              className={state.settings.timeFormat === '24h' ? 'active' : ''}
              onClick={() => updateSettings({ timeFormat: '24h' })}
            >
              24h
            </button>
          </div>

          <button type="button" className="ghost-button" onClick={resetDefaults}>
            Reset
          </button>
        </div>

        <div className="city-picker">
          <label htmlFor="city-search">Add city</label>
          <div className="search-box">
            <input
              ref={cityInputRef}
              id="city-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search city or country…"
              autoComplete="off"
            />
            <span>{CITY_CATALOG.length - selectedCities.length} available</span>
          </div>

          <div className="city-options" aria-live="polite">
            {filteredCities.length > 0 ? (
              filteredCities.map((city) => (
                <button key={city.id} type="button" onClick={() => addCity(city.id)}>
                  <span className="option-dot" style={{ background: city.accent }} />
                  <span>
                    <strong>{city.name}</strong>
                    <small>{city.country} · {city.region}</small>
                  </span>
                  <em>{getOffsetLabel(city.timeZone)}</em>
                </button>
              ))
            ) : (
              <p className="empty-options">No catalog city matches that search.</p>
            )}
          </div>
        </div>
      </section>

      {selectedCities.length === 0 ? (
        <section className="empty-state">
          <p>No cities selected. Search the catalog above and add a city to create a new reference timeline.</p>
        </section>
      ) : (
        <section className="timeline-card" aria-label="Timezone comparison grid">
          <OverlapSummary cities={selectedCities} records={hourRecords} mode={state.mode} format={state.settings.timeFormat} />

          <ReferenceLegend referenceCity={referenceCity} settings={state.settings} />

          <DesktopGrid
            cities={selectedCities}
            records={hourRecords}
            mode={state.mode}
            settings={state.settings}
            onPromote={promoteCity}
            onRemove={removeCity}
          />

          <MobileGrid
            cities={selectedCities}
            records={hourRecords}
            mode={state.mode}
            settings={state.settings}
            onPromote={promoteCity}
            onRemove={removeCity}
          />

          <p className="bottom-hint">Green cells = {state.mode === 'meeting' ? 'everyone awake' : 'reference and that city awake'}</p>
        </section>
      )}
    </main>
  );
}

function ReferenceLegend({ referenceCity, settings }: { referenceCity?: City; settings: Settings }) {
  return (
    <div className="legend-strip">
      <div>
        <span className="legend-swatch sleeping" /> Sleeping
      </div>
      <div>
        <span className="legend-swatch awake" /> Awake
      </div>
      <div>
        <span className="legend-swatch overlap" /> Overlap
      </div>
      <div className="legend-note">
        {referenceCity ? `Columns are ${referenceCity.name} hours · Awake ${formatHour(settings.wakeHour, settings.timeFormat)}—${formatHour(settings.sleepHour, settings.timeFormat)}` : 'Add cities to compare'}
      </div>
    </div>
  );
}

function OverlapSummary({
  cities,
  records,
  mode,
  format,
}: {
  cities: City[];
  records: HourRecord[];
  mode: Mode;
  format: TimeFormat;
}) {
  if (cities.length < 2) {
    return (
      <div className="summary-panel solo">
        <strong>Add at least one more city</strong>
        <span>Overlap summaries appear when there are 2+ cities.</span>
      </div>
    );
  }

  if (mode === 'meeting') {
    const flags = records.map((record) => record.meetingOverlap);
    const ranges = rangesFromFlags(flags);
    const count = summarizeCount(flags);

    return (
      <div className={`summary-panel ${count === 0 ? 'warning' : ''}`}>
        <div className="summary-lead">
          <span className="summary-label">Meeting Mode</span>
          <strong>{count} shared hour{count === 1 ? '' : 's'}</strong>
        </div>
        {count > 0 ? (
          <RangeBadges ranges={ranges} format={format} />
        ) : (
          <p>No common awake window. Try widening the awake window or removing a distant city.</p>
        )}
      </div>
    );
  }

  const referenceCity = cities[0];
  return (
    <div className="summary-panel base-summary">
      <div className="summary-lead">
        <span className="summary-label">Base Mode</span>
        <strong>{referenceCity.name} against each city</strong>
      </div>
      <div className="base-lines">
        {cities.slice(1).map((city) => {
          const flags = records.map((record) => record.baseOverlaps[city.id]);
          const ranges = rangesFromFlags(flags);
          const count = summarizeCount(flags);
          return (
            <div key={city.id} className={`base-line ${count === 0 ? 'warning' : ''}`}>
              <span className="base-city" style={{ '--city-accent': city.accent } as React.CSSProperties}>
                {city.name}
              </span>
              <strong>{count} hr{count === 1 ? '' : 's'}</strong>
              {count > 0 ? <RangeBadges ranges={ranges} format={format} /> : <em>No overlap</em>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RangeBadges({ ranges, format }: { ranges: Range[]; format: TimeFormat }) {
  return (
    <div className="range-badges">
      {ranges.map((range) => (
        <span key={`${range.start}-${range.end}-${range.count}`} className={range.wraps ? 'wrap-range' : ''}>
          {formatRange(range, format)}
        </span>
      ))}
    </div>
  );
}

function DesktopGrid({
  cities,
  records,
  mode,
  settings,
  onPromote,
  onRemove,
}: {
  cities: City[];
  records: HourRecord[];
  mode: Mode;
  settings: Settings;
  onPromote: (cityId: string) => void;
  onRemove: (cityId: string) => void;
}) {
  const referenceCity = cities[0];

  return (
    <div className="desktop-layout" aria-label="Desktop timezone grid">
      <div className="desktop-header grid-row">
        <div className="city-spacer">City</div>
        <div className="hours-header">
          {records.map((record) => (
            <div key={record.referenceHour} className={record.referenceHour % 6 === 0 ? 'major-hour' : ''}>
              {formatHour(record.referenceHour, settings.timeFormat)}
            </div>
          ))}
        </div>
        <div className="remove-spacer">Edit</div>
      </div>

      {cities.map((city, cityIndex) => (
        <div key={city.id} className="city-row grid-row" style={{ '--city-accent': city.accent } as React.CSSProperties}>
          <button type="button" className="city-info" onClick={() => onPromote(city.id)} aria-label={`Make ${city.name} the reference city`}>
            <span className="city-name-line">
              <strong>{city.name}</strong>
              {cityIndex === 0 ? <em>REF</em> : null}
            </span>
            <span>{city.country}</span>
            <span className="offset-pill">{records[0]?.cityTimes[city.id]?.offsetLabel ?? getOffsetLabel(city.timeZone)}</span>
          </button>

          <div className="hour-cells" role="row" aria-label={`${city.name} local hours`}>
            {records.map((record) => {
              const cityState = record.cityTimes[city.id];
              const stateClass = getCellClass(city.id, record, mode, referenceCity.id);
              return (
                <div
                  key={`${city.id}-${record.referenceHour}`}
                  className={`hour-cell ${stateClass}`}
                  title={`${city.name}: ${cityState.localLabel} (${cityState.offsetLabel}) when ${referenceCity.name} is ${formatHour(record.referenceHour, settings.timeFormat)}`}
                >
                  <span>{cityState.localLabel}</span>
                  {cityState.dayShift !== 0 ? <small>{formatDayShift(cityState.dayShift)}</small> : null}
                </div>
              );
            })}
          </div>

          <button type="button" className="remove-button" onClick={() => onRemove(city.id)} aria-label={`Remove ${city.name}`}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function MobileGrid({
  cities,
  records,
  mode,
  settings,
  onPromote,
  onRemove,
}: {
  cities: City[];
  records: HourRecord[];
  mode: Mode;
  settings: Settings;
  onPromote: (cityId: string) => void;
  onRemove: (cityId: string) => void;
}) {
  const referenceCity = cities[0];

  return (
    <div className="mobile-layout" aria-label="Mobile timezone grid">
      <div className="mobile-city-header" style={{ '--mobile-city-count': cities.length } as React.CSSProperties}>
        <div className="mobile-corner">Ref hr</div>
        {cities.map((city, cityIndex) => (
          <div key={city.id} className="mobile-city-card" style={{ '--city-accent': city.accent } as React.CSSProperties}>
            <button type="button" onClick={() => onPromote(city.id)} aria-label={`Make ${city.name} the reference city`}>
              <strong>{city.name}</strong>
              {cityIndex === 0 ? <em>REF</em> : null}
              <span>{records[0]?.cityTimes[city.id]?.offsetLabel ?? getOffsetLabel(city.timeZone)}</span>
            </button>
            <button type="button" className="mini-remove" onClick={() => onRemove(city.id)} aria-label={`Remove ${city.name}`}>
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="mobile-hour-list">
        {records.map((record) => (
          <div key={record.referenceHour} className="mobile-hour-row" style={{ '--mobile-city-count': cities.length } as React.CSSProperties}>
            <div className="mobile-ref-hour">{formatHour(record.referenceHour, settings.timeFormat)}</div>
            {cities.map((city) => {
              const cityState = record.cityTimes[city.id];
              const stateClass = getCellClass(city.id, record, mode, referenceCity.id);
              return (
                <div key={`${record.referenceHour}-${city.id}`} className={`mobile-cell ${stateClass}`}>
                  <span>{cityState.localLabel}</span>
                  {cityState.dayShift !== 0 ? <small>{formatDayShift(cityState.dayShift)}</small> : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function getCellClass(cityId: string, record: HourRecord, mode: Mode, referenceCityId: string): string {
  const cityState = record.cityTimes[cityId];
  if (!cityState.isAwake) return 'sleeping';

  if (mode === 'meeting') {
    return record.meetingOverlap ? 'overlap' : 'awake';
  }

  if (cityId === referenceCityId) {
    return 'awake';
  }

  return record.baseOverlaps[cityId] ? 'overlap' : 'awake';
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
