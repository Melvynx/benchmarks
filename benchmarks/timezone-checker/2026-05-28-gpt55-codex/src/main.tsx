import * as React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Check, ChevronsUp, Clock3, Moon, Plus, Search, Settings2, Sun, Trash2, Users } from "lucide-react";
import "./styles.css";

type Mode = "meeting" | "base";
type TimeFormat = "12h" | "24h";

type City = {
  id: string;
  city: string;
  country: string;
  timeZone: string;
  region: string;
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

type CellState = "sleeping" | "awake" | "overlap";

type HourColumn = {
  refHour: number;
  instant: Date;
};

type CityHour = {
  hourValue: number;
  display: string;
  awake: boolean;
};

type OverlapResult = {
  cityId?: string;
  count: number;
  ranges: Array<{ start: number; end: number }>;
};

const MODEL_NAME = "GPT-5 Codex";
const STORAGE_KEY = "timezone-overlap-checker:v1";
const DEFAULT_CITY_IDS = ["san-francisco", "denpasar", "geneva"];
const DEFAULT_SETTINGS: Settings = { wakeHour: 7, sleepHour: 23, timeFormat: "12h" };

const CITIES: City[] = [
  { id: "san-francisco", city: "San Francisco", country: "United States", timeZone: "America/Los_Angeles", region: "North America" },
  { id: "new-york", city: "New York", country: "United States", timeZone: "America/New_York", region: "North America" },
  { id: "mexico-city", city: "Mexico City", country: "Mexico", timeZone: "America/Mexico_City", region: "North America" },
  { id: "toronto", city: "Toronto", country: "Canada", timeZone: "America/Toronto", region: "North America" },
  { id: "vancouver", city: "Vancouver", country: "Canada", timeZone: "America/Vancouver", region: "North America" },
  { id: "sao-paulo", city: "Sao Paulo", country: "Brazil", timeZone: "America/Sao_Paulo", region: "South America" },
  { id: "buenos-aires", city: "Buenos Aires", country: "Argentina", timeZone: "America/Argentina/Buenos_Aires", region: "South America" },
  { id: "bogota", city: "Bogota", country: "Colombia", timeZone: "America/Bogota", region: "South America" },
  { id: "london", city: "London", country: "United Kingdom", timeZone: "Europe/London", region: "Europe" },
  { id: "geneva", city: "Geneva", country: "Switzerland", timeZone: "Europe/Zurich", region: "Europe" },
  { id: "paris", city: "Paris", country: "France", timeZone: "Europe/Paris", region: "Europe" },
  { id: "berlin", city: "Berlin", country: "Germany", timeZone: "Europe/Berlin", region: "Europe" },
  { id: "lisbon", city: "Lisbon", country: "Portugal", timeZone: "Europe/Lisbon", region: "Europe" },
  { id: "helsinki", city: "Helsinki", country: "Finland", timeZone: "Europe/Helsinki", region: "Europe" },
  { id: "cape-town", city: "Cape Town", country: "South Africa", timeZone: "Africa/Johannesburg", region: "Africa" },
  { id: "nairobi", city: "Nairobi", country: "Kenya", timeZone: "Africa/Nairobi", region: "Africa" },
  { id: "cairo", city: "Cairo", country: "Egypt", timeZone: "Africa/Cairo", region: "Africa" },
  { id: "lagos", city: "Lagos", country: "Nigeria", timeZone: "Africa/Lagos", region: "Africa" },
  { id: "dubai", city: "Dubai", country: "United Arab Emirates", timeZone: "Asia/Dubai", region: "Middle East" },
  { id: "tel-aviv", city: "Tel Aviv", country: "Israel", timeZone: "Asia/Jerusalem", region: "Middle East" },
  { id: "riyadh", city: "Riyadh", country: "Saudi Arabia", timeZone: "Asia/Riyadh", region: "Middle East" },
  { id: "istanbul", city: "Istanbul", country: "Turkiye", timeZone: "Europe/Istanbul", region: "Middle East" },
  { id: "mumbai", city: "Mumbai", country: "India", timeZone: "Asia/Kolkata", region: "Asia" },
  { id: "new-delhi", city: "New Delhi", country: "India", timeZone: "Asia/Kolkata", region: "Asia" },
  { id: "kathmandu", city: "Kathmandu", country: "Nepal", timeZone: "Asia/Kathmandu", region: "Asia" },
  { id: "bangkok", city: "Bangkok", country: "Thailand", timeZone: "Asia/Bangkok", region: "Asia" },
  { id: "singapore", city: "Singapore", country: "Singapore", timeZone: "Asia/Singapore", region: "Asia" },
  { id: "hong-kong", city: "Hong Kong", country: "China", timeZone: "Asia/Hong_Kong", region: "Asia" },
  { id: "tokyo", city: "Tokyo", country: "Japan", timeZone: "Asia/Tokyo", region: "Asia" },
  { id: "seoul", city: "Seoul", country: "South Korea", timeZone: "Asia/Seoul", region: "Asia" },
  { id: "denpasar", city: "Denpasar", country: "Indonesia", timeZone: "Asia/Makassar", region: "Asia" },
  { id: "sydney", city: "Sydney", country: "Australia", timeZone: "Australia/Sydney", region: "Oceania" },
  { id: "adelaide", city: "Adelaide", country: "Australia", timeZone: "Australia/Adelaide", region: "Oceania" },
  { id: "auckland", city: "Auckland", country: "New Zealand", timeZone: "Pacific/Auckland", region: "Oceania" }
];

const CITY_BY_ID = new Map(CITIES.map((city) => [city.id, city]));

const partFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getPartFormatter(timeZone: string) {
  const cached = partFormatterCache.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });

  partFormatterCache.set(timeZone, formatter);
  return formatter;
}

function getZonedParts(date: Date, timeZone: string) {
  const parts = getPartFormatter(timeZone).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second")
  };
}

function getOffsetMinutes(timeZone: string, date: Date) {
  const parts = getZonedParts(date, timeZone);
  const zonedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((zonedAsUtc - date.getTime()) / 60000);
}

function zonedTimeToDate(timeZone: string, year: number, month: number, day: number, hour: number) {
  const localAsUtc = Date.UTC(year, month - 1, day, hour, 0, 0);
  const firstOffset = getOffsetMinutes(timeZone, new Date(localAsUtc));
  const firstGuess = localAsUtc - firstOffset * 60000;
  const secondOffset = getOffsetMinutes(timeZone, new Date(firstGuess));
  return new Date(localAsUtc - secondOffset * 60000);
}

function getReferenceDateParts(timeZone: string) {
  const now = new Date();
  const parts = getZonedParts(now, timeZone);
  return { year: parts.year, month: parts.month, day: parts.day };
}

function formatOffset(timeZone: string, date = new Date()) {
  const minutes = getOffsetMinutes(timeZone, date);
  const sign = minutes >= 0 ? "+" : "-";
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const mins = absolute % 60;
  return `UTC${sign}${hours}${mins ? `:${String(mins).padStart(2, "0")}` : ""}`;
}

function formatHour(hour: number, timeFormat: TimeFormat) {
  const normalized = ((hour % 24) + 24) % 24;
  const wholeHour = Math.floor(normalized);
  const minutes = Math.round((normalized - wholeHour) * 60);

  if (timeFormat === "24h") {
    return `${String(wholeHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  const suffix = wholeHour >= 12 ? "pm" : "am";
  const displayHour = wholeHour % 12 || 12;
  return minutes ? `${displayHour}:${String(minutes).padStart(2, "0")}${suffix}` : `${displayHour}${suffix}`;
}

function formatRange(start: number, end: number, timeFormat: TimeFormat) {
  return `${formatHour(start, timeFormat)} - ${formatHour(end % 24, timeFormat)}`;
}

function isAwake(hourValue: number, settings: Settings) {
  const hour = ((hourValue % 24) + 24) % 24;
  const wake = settings.wakeHour;
  const sleep = settings.sleepHour;

  if (wake === sleep) return true;
  if (wake < sleep) return hour >= wake && hour < sleep;
  return hour >= wake || hour < sleep;
}

function makeHourColumns(referenceCity: City) {
  const refDate = getReferenceDateParts(referenceCity.timeZone);
  return Array.from({ length: 24 }, (_, refHour) => ({
    refHour,
    instant: zonedTimeToDate(referenceCity.timeZone, refDate.year, refDate.month, refDate.day, refHour)
  }));
}

function getCityHour(city: City, column: HourColumn, settings: Settings): CityHour {
  const parts = getZonedParts(column.instant, city.timeZone);
  const hourValue = parts.hour + parts.minute / 60;

  return {
    hourValue,
    display: formatHour(hourValue, settings.timeFormat),
    awake: isAwake(hourValue, settings)
  };
}

function hoursToRanges(hours: number[]) {
  if (hours.length === 0) return [];

  const sorted = [...hours].sort((a, b) => a - b);
  const ranges: Array<{ start: number; end: number }> = [];
  let start = sorted[0];
  let previous = sorted[0];

  for (let index = 1; index < sorted.length; index += 1) {
    const hour = sorted[index];
    if (hour === previous + 1) {
      previous = hour;
      continue;
    }

    ranges.push({ start, end: previous + 1 });
    start = hour;
    previous = hour;
  }

  ranges.push({ start, end: previous + 1 });
  return ranges;
}

function calculateMeetingOverlap(cities: City[], columns: HourColumn[], settings: Settings): OverlapResult {
  const hours = columns
    .filter((column) => cities.every((city) => getCityHour(city, column, settings).awake))
    .map((column) => column.refHour);

  return { count: hours.length, ranges: hoursToRanges(hours) };
}

function calculateBaseOverlaps(cities: City[], columns: HourColumn[], settings: Settings): OverlapResult[] {
  const referenceCity = cities[0];
  return cities.slice(1).map((city) => {
    const hours = columns
      .filter((column) => {
        const referenceHour = getCityHour(referenceCity, column, settings);
        const targetHour = getCityHour(city, column, settings);
        return referenceHour.awake && targetHour.awake;
      })
      .map((column) => column.refHour);

    return { cityId: city.id, count: hours.length, ranges: hoursToRanges(hours) };
  });
}

function loadState(): PersistedState {
  if (typeof window === "undefined") {
    return { cityIds: DEFAULT_CITY_IDS, mode: "meeting", settings: DEFAULT_SETTINGS };
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) throw new Error("No saved state");

    const parsed = JSON.parse(stored) as Partial<PersistedState>;
    const cityIds = Array.isArray(parsed.cityIds)
      ? parsed.cityIds.filter((id): id is string => typeof id === "string" && CITY_BY_ID.has(id))
      : DEFAULT_CITY_IDS;

    return {
      cityIds: cityIds.length ? [...new Set(cityIds)] : DEFAULT_CITY_IDS,
      mode: parsed.mode === "base" ? "base" : "meeting",
      settings: {
        wakeHour: clampHour(parsed.settings?.wakeHour ?? DEFAULT_SETTINGS.wakeHour),
        sleepHour: clampHour(parsed.settings?.sleepHour ?? DEFAULT_SETTINGS.sleepHour),
        timeFormat: parsed.settings?.timeFormat === "24h" ? "24h" : "12h"
      }
    };
  } catch {
    return { cityIds: DEFAULT_CITY_IDS, mode: "meeting", settings: DEFAULT_SETTINGS };
  }
}

function clampHour(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.min(23, Math.max(0, Math.round(numberValue)));
}

function App() {
  const [state, setState] = React.useState<PersistedState>(loadState);
  const [query, setQuery] = React.useState("");
  const selectedCities = state.cityIds.map((id) => CITY_BY_ID.get(id)).filter((city): city is City => Boolean(city));
  const referenceCity = selectedCities[0] ?? CITY_BY_ID.get(DEFAULT_CITY_IDS[0])!;
  const columns = React.useMemo(() => makeHourColumns(referenceCity), [referenceCity]);
  const meetingOverlap = React.useMemo(
    () => calculateMeetingOverlap(selectedCities, columns, state.settings),
    [selectedCities, columns, state.settings]
  );
  const baseOverlaps = React.useMemo(
    () => calculateBaseOverlaps(selectedCities, columns, state.settings),
    [selectedCities, columns, state.settings]
  );
  const availableCities = CITIES.filter((city) => !state.cityIds.includes(city.id));
  const filteredCities = availableCities
    .filter((city) => `${city.city} ${city.country} ${city.region}`.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 8);

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  function addCity(cityId: string) {
    if (state.cityIds.includes(cityId)) return;
    setState((current) => ({ ...current, cityIds: [...current.cityIds, cityId] }));
    setQuery("");
  }

  function removeCity(cityId: string) {
    setState((current) => {
      const cityIds = current.cityIds.filter((id) => id !== cityId);
      return { ...current, cityIds: cityIds.length ? cityIds : [DEFAULT_CITY_IDS[0]] };
    });
  }

  function promoteCity(cityId: string) {
    setState((current) => ({
      ...current,
      cityIds: [cityId, ...current.cityIds.filter((id) => id !== cityId)]
    }));
  }

  function updateSettings(settings: Partial<Settings>) {
    setState((current) => ({ ...current, settings: { ...current.settings, ...settings } }));
  }

  const overlapHours = state.mode === "meeting" ? meetingOverlap.count : Math.max(0, ...baseOverlaps.map((result) => result.count));
  const hasMultipleCities = selectedCities.length >= 2;

  return (
    <main className="app-shell">
      <section className="masthead" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Timezone overlap checker</p>
          <h1 id="page-title">{MODEL_NAME}</h1>
          <p className="lede">
            Compare a reference day across distributed teams, spot shared meeting windows, and switch to per-city base
            overlaps when your day is the anchor.
          </p>
        </div>
        <div className="status-panel" aria-label="Current overlap summary">
          <span className="status-number">{overlapHours}</span>
          <span className="status-label">{state.mode === "meeting" ? "common hours" : "best base hours"}</span>
        </div>
      </section>

      <section className="control-deck" aria-label="Controls">
        <div className="mode-switch" role="group" aria-label="Overlap mode">
          <button className={state.mode === "meeting" ? "active" : ""} type="button" onClick={() => setState({ ...state, mode: "meeting" })}>
            <Users size={18} aria-hidden="true" />
            Meeting
          </button>
          <button className={state.mode === "base" ? "active" : ""} type="button" onClick={() => setState({ ...state, mode: "base" })}>
            <ChevronsUp size={18} aria-hidden="true" />
            Base
          </button>
        </div>

        <div className="city-picker">
          <label htmlFor="city-search">
            <Search size={17} aria-hidden="true" />
            Add city
          </label>
          <div className="search-box">
            <input
              id="city-search"
              type="search"
              placeholder="Search city or country"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && filteredCities[0]) addCity(filteredCities[0].id);
              }}
            />
            {query && filteredCities.length > 0 && (
              <div className="city-menu" role="listbox">
                {filteredCities.map((city) => (
                  <button key={city.id} type="button" onClick={() => addCity(city.id)}>
                    <span>
                      <strong>{city.city}</strong>
                      <small>{city.country}</small>
                    </span>
                    <Plus size={16} aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="settings-card" aria-label="Availability settings">
          <div className="settings-title">
            <Settings2 size={18} aria-hidden="true" />
            Awake window
          </div>
          <label>
            <Sun size={16} aria-hidden="true" />
            <span>Wake</span>
            <input
              type="number"
              min="0"
              max="23"
              value={state.settings.wakeHour}
              onChange={(event) => updateSettings({ wakeHour: clampHour(event.target.value) })}
            />
          </label>
          <label>
            <Moon size={16} aria-hidden="true" />
            <span>Sleep</span>
            <input
              type="number"
              min="0"
              max="23"
              value={state.settings.sleepHour}
              onChange={(event) => updateSettings({ sleepHour: clampHour(event.target.value) })}
            />
          </label>
          <label>
            <Clock3 size={16} aria-hidden="true" />
            <span>Format</span>
            <select value={state.settings.timeFormat} onChange={(event) => updateSettings({ timeFormat: event.target.value as TimeFormat })}>
              <option value="12h">12h</option>
              <option value="24h">24h</option>
            </select>
          </label>
        </div>
      </section>

      {hasMultipleCities && (
        <OverlapSummary
          mode={state.mode}
          referenceCity={referenceCity}
          cities={selectedCities}
          settings={state.settings}
          meetingOverlap={meetingOverlap}
          baseOverlaps={baseOverlaps}
        />
      )}

      <section className="timezone-board" aria-label="Timezone comparison grid">
        <DesktopGrid
          cities={selectedCities}
          columns={columns}
          settings={state.settings}
          mode={state.mode}
          meetingOverlap={meetingOverlap}
          baseOverlaps={baseOverlaps}
          onPromote={promoteCity}
          onRemove={removeCity}
        />
        <MobileGrid
          cities={selectedCities}
          columns={columns}
          settings={state.settings}
          mode={state.mode}
          meetingOverlap={meetingOverlap}
          baseOverlaps={baseOverlaps}
          onPromote={promoteCity}
          onRemove={removeCity}
        />
      </section>

      <p className="hint">
        <Check size={16} aria-hidden="true" />
        Green cells = {state.mode === "meeting" ? "everyone awake" : "base city and that city awake"}
      </p>
    </main>
  );
}

function OverlapSummary({
  mode,
  referenceCity,
  cities,
  settings,
  meetingOverlap,
  baseOverlaps
}: {
  mode: Mode;
  referenceCity: City;
  cities: City[];
  settings: Settings;
  meetingOverlap: OverlapResult;
  baseOverlaps: OverlapResult[];
}) {
  if (mode === "meeting") {
    return (
      <section className={`overlap-summary ${meetingOverlap.count === 0 ? "warning" : ""}`} aria-label="Meeting overlap summary">
        <div>
          <strong>{meetingOverlap.count} shared hours</strong>
          <span>in {referenceCity.city} time</span>
        </div>
        <RangeList result={meetingOverlap} settings={settings} />
      </section>
    );
  }

  return (
    <section className="overlap-summary base-list" aria-label="Base overlap summary">
      {baseOverlaps.map((result) => {
        const city = cities.find((item) => item.id === result.cityId);
        if (!city) return null;

        return (
          <div key={city.id} className={result.count === 0 ? "base-row warning" : "base-row"}>
            <div>
              <strong>{referenceCity.city} + {city.city}</strong>
              <span>{result.count} overlap hours</span>
            </div>
            <RangeList result={result} settings={settings} />
          </div>
        );
      })}
    </section>
  );
}

function RangeList({ result, settings }: { result: OverlapResult; settings: Settings }) {
  if (result.count === 0) {
    return <span className="empty-range">No overlap with the current awake window</span>;
  }

  return (
    <div className="range-list">
      {result.ranges.map((range) => (
        <span key={`${range.start}-${range.end}`}>{formatRange(range.start, range.end, settings.timeFormat)}</span>
      ))}
    </div>
  );
}

function DesktopGrid({
  cities,
  columns,
  settings,
  mode,
  meetingOverlap,
  baseOverlaps,
  onPromote,
  onRemove
}: GridProps) {
  return (
    <div className="desktop-grid">
      <div className="grid-header left-spacer" />
      <div className="hour-header" aria-hidden="true">
        {columns.map((column) => (
          <span key={column.refHour}>{formatHour(column.refHour, settings.timeFormat)}</span>
        ))}
      </div>
      <div className="grid-header right-spacer" />

      {cities.map((city, cityIndex) => (
        <React.Fragment key={city.id}>
          <CityLabel city={city} isReference={cityIndex === 0} onPromote={onPromote} />
          <div className="hour-row">
            {columns.map((column) => {
              const cityHour = getCityHour(city, column, settings);
              const state = getCellState(city, column.refHour, cityHour, mode, meetingOverlap, baseOverlaps);
              return (
                <span key={`${city.id}-${column.refHour}`} className={`time-cell ${state}`}>
                  {cityHour.display}
                </span>
              );
            })}
          </div>
          <RemoveButton city={city} citiesCount={cities.length} onRemove={onRemove} />
        </React.Fragment>
      ))}
    </div>
  );
}

function MobileGrid({
  cities,
  columns,
  settings,
  mode,
  meetingOverlap,
  baseOverlaps,
  onPromote,
  onRemove
}: GridProps) {
  return (
    <div className="mobile-grid" style={{ "--city-count": cities.length } as React.CSSProperties}>
      <div className="mobile-city-strip">
        <span className="mobile-corner">Ref hour</span>
        {cities.map((city, cityIndex) => (
          <div key={city.id} className="mobile-city-head">
            <button type="button" onClick={() => onPromote(city.id)}>
              <strong>{city.city}</strong>
              {cityIndex === 0 && <em>REF</em>}
            </button>
            <span>{formatOffset(city.timeZone)}</span>
            <RemoveButton city={city} citiesCount={cities.length} onRemove={onRemove} compact />
          </div>
        ))}
      </div>
      {columns.map((column) => (
        <div className="mobile-hour-row" key={column.refHour}>
          <span className="mobile-ref-hour">{formatHour(column.refHour, settings.timeFormat)}</span>
          {cities.map((city) => {
            const cityHour = getCityHour(city, column, settings);
            const state = getCellState(city, column.refHour, cityHour, mode, meetingOverlap, baseOverlaps);
            return (
              <span key={`${city.id}-${column.refHour}`} className={`time-cell ${state}`}>
                {cityHour.display}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

type GridProps = {
  cities: City[];
  columns: HourColumn[];
  settings: Settings;
  mode: Mode;
  meetingOverlap: OverlapResult;
  baseOverlaps: OverlapResult[];
  onPromote: (cityId: string) => void;
  onRemove: (cityId: string) => void;
};

function CityLabel({ city, isReference, onPromote }: { city: City; isReference: boolean; onPromote: (cityId: string) => void }) {
  return (
    <button className="city-label" type="button" onClick={() => onPromote(city.id)}>
      <span className="city-name-line">
        <strong>{city.city}</strong>
        {isReference && <em>REF</em>}
      </span>
      <span>{city.country}</span>
      <small>{formatOffset(city.timeZone)}</small>
    </button>
  );
}

function RemoveButton({
  city,
  citiesCount,
  onRemove,
  compact = false
}: {
  city: City;
  citiesCount: number;
  onRemove: (cityId: string) => void;
  compact?: boolean;
}) {
  return (
    <button
      className={compact ? "remove-button compact" : "remove-button"}
      type="button"
      aria-label={`Remove ${city.city}`}
      title={`Remove ${city.city}`}
      disabled={citiesCount <= 1}
      onClick={() => onRemove(city.id)}
    >
      <Trash2 size={16} aria-hidden="true" />
    </button>
  );
}

function getCellState(
  city: City,
  refHour: number,
  cityHour: CityHour,
  mode: Mode,
  meetingOverlap: OverlapResult,
  baseOverlaps: OverlapResult[]
): CellState {
  if (!cityHour.awake) return "sleeping";

  if (mode === "meeting") {
    return hourIsInRanges(refHour, meetingOverlap.ranges) ? "overlap" : "awake";
  }

  const result = baseOverlaps.find((item) => item.cityId === city.id);
  if (result && hourIsInRanges(refHour, result.ranges)) return "overlap";

  return "awake";
}

function hourIsInRanges(hour: number, ranges: Array<{ start: number; end: number }>) {
  return ranges.some((range) => hour >= range.start && hour < range.end);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
