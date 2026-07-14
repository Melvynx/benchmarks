import * as React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUp,
  ChevronsUp,
  Clock3,
  Globe2,
  Moon,
  Search,
  Settings2,
  Sun,
  Trash2,
  Users,
  UserRoundCheck,
  X
} from "lucide-react";
import "./styles.css";

type Mode = "meeting" | "base";
type TimeFormat = "12h" | "24h";

type City = {
  id: string;
  name: string;
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

type Cell = {
  refHour: number;
  localMinutes: number;
  label: string;
  isAwake: boolean;
};

type SummaryRange = {
  start: number;
  end: number;
};

const CITY_CATALOG: City[] = [
  { id: "san-francisco", name: "San Francisco", country: "United States", timeZone: "America/Los_Angeles", region: "North America" },
  { id: "new-york", name: "New York", country: "United States", timeZone: "America/New_York", region: "North America" },
  { id: "toronto", name: "Toronto", country: "Canada", timeZone: "America/Toronto", region: "North America" },
  { id: "vancouver", name: "Vancouver", country: "Canada", timeZone: "America/Vancouver", region: "North America" },
  { id: "mexico-city", name: "Mexico City", country: "Mexico", timeZone: "America/Mexico_City", region: "North America" },
  { id: "bogota", name: "Bogota", country: "Colombia", timeZone: "America/Bogota", region: "South America" },
  { id: "sao-paulo", name: "Sao Paulo", country: "Brazil", timeZone: "America/Sao_Paulo", region: "South America" },
  { id: "buenos-aires", name: "Buenos Aires", country: "Argentina", timeZone: "America/Argentina/Buenos_Aires", region: "South America" },
  { id: "london", name: "London", country: "United Kingdom", timeZone: "Europe/London", region: "Europe" },
  { id: "dublin", name: "Dublin", country: "Ireland", timeZone: "Europe/Dublin", region: "Europe" },
  { id: "lisbon", name: "Lisbon", country: "Portugal", timeZone: "Europe/Lisbon", region: "Europe" },
  { id: "paris", name: "Paris", country: "France", timeZone: "Europe/Paris", region: "Europe" },
  { id: "geneva", name: "Geneva", country: "Switzerland", timeZone: "Europe/Zurich", region: "Europe" },
  { id: "berlin", name: "Berlin", country: "Germany", timeZone: "Europe/Berlin", region: "Europe" },
  { id: "stockholm", name: "Stockholm", country: "Sweden", timeZone: "Europe/Stockholm", region: "Europe" },
  { id: "cairo", name: "Cairo", country: "Egypt", timeZone: "Africa/Cairo", region: "Africa" },
  { id: "lagos", name: "Lagos", country: "Nigeria", timeZone: "Africa/Lagos", region: "Africa" },
  { id: "nairobi", name: "Nairobi", country: "Kenya", timeZone: "Africa/Nairobi", region: "Africa" },
  { id: "cape-town", name: "Cape Town", country: "South Africa", timeZone: "Africa/Johannesburg", region: "Africa" },
  { id: "dubai", name: "Dubai", country: "United Arab Emirates", timeZone: "Asia/Dubai", region: "Middle East" },
  { id: "tel-aviv", name: "Tel Aviv", country: "Israel", timeZone: "Asia/Jerusalem", region: "Middle East" },
  { id: "riyadh", name: "Riyadh", country: "Saudi Arabia", timeZone: "Asia/Riyadh", region: "Middle East" },
  { id: "mumbai", name: "Mumbai", country: "India", timeZone: "Asia/Kolkata", region: "Asia" },
  { id: "new-delhi", name: "New Delhi", country: "India", timeZone: "Asia/Kolkata", region: "Asia" },
  { id: "kathmandu", name: "Kathmandu", country: "Nepal", timeZone: "Asia/Kathmandu", region: "Asia" },
  { id: "singapore", name: "Singapore", country: "Singapore", timeZone: "Asia/Singapore", region: "Asia" },
  { id: "bangkok", name: "Bangkok", country: "Thailand", timeZone: "Asia/Bangkok", region: "Asia" },
  { id: "jakarta", name: "Jakarta", country: "Indonesia", timeZone: "Asia/Jakarta", region: "Asia" },
  { id: "denpasar", name: "Denpasar", country: "Indonesia", timeZone: "Asia/Makassar", region: "Asia" },
  { id: "shanghai", name: "Shanghai", country: "China", timeZone: "Asia/Shanghai", region: "Asia" },
  { id: "tokyo", name: "Tokyo", country: "Japan", timeZone: "Asia/Tokyo", region: "Asia" },
  { id: "seoul", name: "Seoul", country: "South Korea", timeZone: "Asia/Seoul", region: "Asia" },
  { id: "sydney", name: "Sydney", country: "Australia", timeZone: "Australia/Sydney", region: "Oceania" },
  { id: "auckland", name: "Auckland", country: "New Zealand", timeZone: "Pacific/Auckland", region: "Oceania" }
];

const DEFAULT_STATE: PersistedState = {
  cityIds: ["san-francisco", "denpasar", "geneva"],
  mode: "meeting",
  settings: {
    wakeHour: 7,
    sleepHour: 23,
    timeFormat: "12h"
  }
};

const STORAGE_KEY = "gpt-55-timezone-overlap-state";

const cityById = new Map(CITY_CATALOG.map((city) => [city.id, city]));

function readInitialState(): PersistedState {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_STATE;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const cityIds = Array.isArray(parsed.cityIds)
      ? parsed.cityIds.filter((id) => cityById.has(id))
      : DEFAULT_STATE.cityIds;

    return {
      cityIds: cityIds.length > 0 ? [...new Set(cityIds)] : DEFAULT_STATE.cityIds,
      mode: parsed.mode === "base" || parsed.mode === "meeting" ? parsed.mode : DEFAULT_STATE.mode,
      settings: {
        wakeHour: clampHour(parsed.settings?.wakeHour, DEFAULT_STATE.settings.wakeHour),
        sleepHour: clampHour(parsed.settings?.sleepHour, DEFAULT_STATE.settings.sleepHour),
        timeFormat: parsed.settings?.timeFormat === "24h" ? "24h" : "12h"
      }
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function clampHour(value: unknown, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) {
    return fallback;
  }
  return Math.min(23, Math.max(0, numeric));
}

function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });

  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}

function zonedTimeToUtcMs(
  timeZone: string,
  local: { year: number; month: number; day: number; hour: number; minute?: number; second?: number }
) {
  const desiredMinute = local.minute ?? 0;
  const desiredSecond = local.second ?? 0;
  let guess = Date.UTC(local.year, local.month - 1, local.day, local.hour, desiredMinute, desiredSecond);

  for (let i = 0; i < 4; i += 1) {
    const actual = getZonedParts(new Date(guess), timeZone);
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    const desiredAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, desiredMinute, desiredSecond);
    const delta = desiredAsUtc - actualAsUtc;
    if (delta === 0) {
      break;
    }
    guess += delta;
  }

  return guess;
}

function getOffsetMinutes(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  const zonedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((zonedAsUtc - date.getTime()) / 60000);
}

function formatUtcOffset(minutes: number) {
  const sign = minutes >= 0 ? "+" : "-";
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const mins = absolute % 60;
  return `UTC${sign}${hours}${mins ? `:${String(mins).padStart(2, "0")}` : ""}`;
}

function formatHourLabel(hour: number, format: TimeFormat) {
  if (format === "24h") {
    return `${String(hour).padStart(2, "0")}:00`;
  }

  const period = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 || 12;
  return `${hour12}${period}`;
}

function formatLocalMinutes(minutes: number, format: TimeFormat) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;

  if (format === "24h") {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const period = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 || 12;
  return minute === 0 ? `${hour12}${period}` : `${hour12}:${String(minute).padStart(2, "0")}${period}`;
}

function isAwakeAt(minutes: number, settings: Settings) {
  const start = settings.wakeHour * 60;
  const end = settings.sleepHour * 60;

  if (start === end) {
    return true;
  }

  if (start < end) {
    return minutes >= start && minutes < end;
  }

  return minutes >= start || minutes < end;
}

function rangesFromHours(hours: number[]) {
  if (hours.length === 0) {
    return [];
  }

  const sorted = [...hours].sort((a, b) => a - b);
  const ranges: SummaryRange[] = [];
  let start = sorted[0];
  let previous = sorted[0];

  for (const hour of sorted.slice(1)) {
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

function formatRange(range: SummaryRange, format: TimeFormat) {
  return `${formatHourLabel(range.start % 24, format)} - ${formatHourLabel(range.end % 24, format)}`;
}

function buildRows(cities: City[], settings: Settings) {
  const reference = cities[0];
  const todayInReference = getZonedParts(new Date(), reference.timeZone);
  const referenceInstants = Array.from({ length: 24 }, (_, hour) =>
    zonedTimeToUtcMs(reference.timeZone, {
      year: todayInReference.year,
      month: todayInReference.month,
      day: todayInReference.day,
      hour
    })
  );

  return cities.map((city) => {
    const cells: Cell[] = referenceInstants.map((ms, refHour) => {
      const date = new Date(ms);
      const local = getZonedParts(date, city.timeZone);
      const localMinutes = local.hour * 60 + local.minute;

      return {
        refHour,
        localMinutes,
        label: formatLocalMinutes(localMinutes, settings.timeFormat),
        isAwake: isAwakeAt(localMinutes, settings)
      };
    });

    return { city, cells };
  });
}

function App() {
  const [state, setState] = usePersistentState();
  const [cityQuery, setCityQuery] = React.useState("");
  const [isCityMenuOpen, setIsCityMenuOpen] = React.useState(false);

  const cities = React.useMemo(
    () => state.cityIds.map((id) => cityById.get(id)).filter(Boolean) as City[],
    [state.cityIds]
  );

  const rows = React.useMemo(() => buildRows(cities, state.settings), [cities, state.settings]);

  const meetingOverlapHours = React.useMemo(() => {
    return Array.from({ length: 24 }, (_, hour) => hour).filter((hour) =>
      rows.every((row) => row.cells[hour]?.isAwake)
    );
  }, [rows]);

  const baseOverlapByCity = React.useMemo(() => {
    const referenceRow = rows[0];
    if (!referenceRow) {
      return new Map<string, number[]>();
    }

    return new Map(
      rows.slice(1).map((row) => [
        row.city.id,
        Array.from({ length: 24 }, (_, hour) => hour).filter(
          (hour) => referenceRow.cells[hour]?.isAwake && row.cells[hour]?.isAwake
        )
      ])
    );
  }, [rows]);

  const selectedIds = new Set(state.cityIds);
  const cityOptions = CITY_CATALOG.filter((city) => !selectedIds.has(city.id));
  const filteredOptions = cityOptions
    .filter((city) => `${city.name} ${city.country} ${city.region}`.toLowerCase().includes(cityQuery.toLowerCase()))
    .slice(0, 8);

  const offsets = React.useMemo(() => {
    const now = new Date();
    return new Map(CITY_CATALOG.map((city) => [city.id, formatUtcOffset(getOffsetMinutes(now, city.timeZone))]));
  }, []);

  function updateSettings(next: Partial<Settings>) {
    setState((current) => ({
      ...current,
      settings: { ...current.settings, ...next }
    }));
  }

  function addCity(cityId: string) {
    setState((current) => {
      if (current.cityIds.includes(cityId)) {
        return current;
      }

      return {
        ...current,
        cityIds: [...current.cityIds, cityId]
      };
    });
    setCityQuery("");
  }

  function removeCity(cityId: string) {
    setState((current) => ({
      ...current,
      cityIds: current.cityIds.filter((id) => id !== cityId)
    }));
  }

  function promoteCity(cityId: string) {
    setState((current) => ({
      ...current,
      cityIds: [cityId, ...current.cityIds.filter((id) => id !== cityId)]
    }));
  }

  return (
    <main className="app-shell">
      <section className="topbar" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Timezone overlap checker</p>
          <h1 id="page-title">GPT-5.5</h1>
        </div>

        <div className="mode-switch" aria-label="Overlap mode">
          <button
            className={state.mode === "meeting" ? "active" : ""}
            onClick={() => setState((current) => ({ ...current, mode: "meeting" }))}
            type="button"
          >
            <Users size={17} />
            Meeting
          </button>
          <button
            className={state.mode === "base" ? "active" : ""}
            onClick={() => setState((current) => ({ ...current, mode: "base" }))}
            type="button"
          >
            <UserRoundCheck size={17} />
            Base
          </button>
        </div>
      </section>

      <section className="control-strip" aria-label="Controls">
        <div className="city-search">
          <label htmlFor="city-search">Add city</label>
          <div className="search-box">
            <Search size={18} />
            <input
              id="city-search"
              type="search"
              placeholder="Search city or country"
              value={cityQuery}
              onChange={(event) => setCityQuery(event.target.value)}
              onFocus={() => setIsCityMenuOpen(true)}
              onBlur={() => window.setTimeout(() => setIsCityMenuOpen(false), 120)}
            />
          </div>

          {isCityMenuOpen && (
            <div className="city-menu">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((city) => (
                  <button key={city.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addCity(city.id)}>
                    <span>
                      {city.name}
                      <small>{city.country}</small>
                    </span>
                    <span>{city.region}</span>
                  </button>
                ))
              ) : (
                <p>No available city matches that search.</p>
              )}
            </div>
          )}
        </div>

        <div className="settings-panel" aria-label="Availability settings">
          <div className="panel-title">
            <Settings2 size={17} />
            Availability
          </div>

          <label>
            <Sun size={16} />
            Wake
            <select
              value={state.settings.wakeHour}
              onChange={(event) => updateSettings({ wakeHour: Number(event.target.value) })}
            >
              {Array.from({ length: 24 }, (_, hour) => (
                <option key={hour} value={hour}>
                  {formatHourLabel(hour, state.settings.timeFormat)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <Moon size={16} />
            Sleep
            <select
              value={state.settings.sleepHour}
              onChange={(event) => updateSettings({ sleepHour: Number(event.target.value) })}
            >
              {Array.from({ length: 24 }, (_, hour) => (
                <option key={hour} value={hour}>
                  {formatHourLabel(hour, state.settings.timeFormat)}
                </option>
              ))}
            </select>
          </label>

          <div className="format-toggle" aria-label="Time format">
            <button
              type="button"
              className={state.settings.timeFormat === "12h" ? "active" : ""}
              onClick={() => updateSettings({ timeFormat: "12h" })}
            >
              12h
            </button>
            <button
              type="button"
              className={state.settings.timeFormat === "24h" ? "active" : ""}
              onClick={() => updateSettings({ timeFormat: "24h" })}
            >
              24h
            </button>
          </div>
        </div>
      </section>

      {cities.length >= 2 && (
        <Summary
          mode={state.mode}
          cities={cities}
          meetingOverlapHours={meetingOverlapHours}
          baseOverlapByCity={baseOverlapByCity}
          timeFormat={state.settings.timeFormat}
        />
      )}

      <section className="grid-section" aria-label="Timezone comparison grid">
        <DesktopGrid
          rows={rows}
          mode={state.mode}
          meetingOverlapHours={meetingOverlapHours}
          baseOverlapByCity={baseOverlapByCity}
          offsets={offsets}
          timeFormat={state.settings.timeFormat}
          onRemove={removeCity}
          onPromote={promoteCity}
        />

        <MobileGrid
          rows={rows}
          mode={state.mode}
          meetingOverlapHours={meetingOverlapHours}
          baseOverlapByCity={baseOverlapByCity}
          offsets={offsets}
          timeFormat={state.settings.timeFormat}
          onRemove={removeCity}
          onPromote={promoteCity}
        />
      </section>

      <footer className="hint">
        <span />
        Green cells = {state.mode === "meeting" ? "everyone awake" : "base city and that city awake"}
      </footer>
    </main>
  );
}

function usePersistentState() {
  const [state, setState] = React.useState<PersistedState>(readInitialState);

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return [state, setState] as const;
}

function Summary({
  mode,
  cities,
  meetingOverlapHours,
  baseOverlapByCity,
  timeFormat
}: {
  mode: Mode;
  cities: City[];
  meetingOverlapHours: number[];
  baseOverlapByCity: Map<string, number[]>;
  timeFormat: TimeFormat;
}) {
  const reference = cities[0];

  if (mode === "meeting") {
    return (
      <section className={`summary ${meetingOverlapHours.length === 0 ? "warning" : ""}`} aria-label="Overlap summary">
        <div>
          <strong>{meetingOverlapHours.length} shared hours</strong>
          <span>in {reference.name}</span>
        </div>
        <RangeBadges ranges={rangesFromHours(meetingOverlapHours)} timeFormat={timeFormat} />
      </section>
    );
  }

  return (
    <section className="summary stacked" aria-label="Overlap summary">
      <div>
        <strong>Base overlaps</strong>
        <span>against {reference.name}</span>
      </div>
      <div className="base-lines">
        {cities.slice(1).map((city) => {
          const overlap = baseOverlapByCity.get(city.id) ?? [];
          return (
            <div key={city.id} className={overlap.length === 0 ? "base-line warning-line" : "base-line"}>
              <span>
                {city.name}
                <small>{overlap.length} hours</small>
              </span>
              <RangeBadges ranges={rangesFromHours(overlap)} timeFormat={timeFormat} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RangeBadges({ ranges, timeFormat }: { ranges: SummaryRange[]; timeFormat: TimeFormat }) {
  if (ranges.length === 0) {
    return <span className="no-overlap">No overlap</span>;
  }

  return (
    <div className="range-list">
      {ranges.map((range) => (
        <span className="range-badge" key={`${range.start}-${range.end}`}>
          {formatRange(range, timeFormat)}
        </span>
      ))}
    </div>
  );
}

function DesktopGrid({
  rows,
  mode,
  meetingOverlapHours,
  baseOverlapByCity,
  offsets,
  timeFormat,
  onRemove,
  onPromote
}: GridProps) {
  return (
    <div className="desktop-grid">
      <div className="grid-head">
        <div className="grid-corner">
          <Clock3 size={16} />
          Reference day
        </div>
        <div className="hour-row">
          {Array.from({ length: 24 }, (_, hour) => (
            <span key={hour}>{formatHourLabel(hour, timeFormat)}</span>
          ))}
        </div>
        <span className="action-spacer" />
      </div>

      {rows.map((row, rowIndex) => (
        <div className="city-row" key={row.city.id}>
          <CityInfo
            city={row.city}
            isReference={rowIndex === 0}
            offset={offsets.get(row.city.id) ?? ""}
            onPromote={onPromote}
          />
          <div className="cell-row">
            {row.cells.map((cell) => (
              <TimeCell
                key={cell.refHour}
                cell={cell}
                overlap={isOverlapCell(mode, row.city.id, cell.refHour, meetingOverlapHours, baseOverlapByCity)}
              />
            ))}
          </div>
          <RemoveButton city={row.city} disabled={rows.length <= 1} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}

function MobileGrid({
  rows,
  mode,
  meetingOverlapHours,
  baseOverlapByCity,
  offsets,
  timeFormat,
  onRemove,
  onPromote
}: GridProps) {
  return (
    <div className="mobile-grid" style={{ "--city-count": rows.length } as React.CSSProperties}>
      <div className="mobile-city-head">
        <div className="mobile-corner">
          <Globe2 size={16} />
        </div>
        {rows.map((row, index) => (
          <div className="mobile-city" key={row.city.id}>
            <button type="button" onClick={() => onPromote(row.city.id)}>
              {row.city.name}
            </button>
            <span>
              {index === 0 && <b>REF</b>}
              {offsets.get(row.city.id)}
            </span>
            <button
              type="button"
              className="mobile-remove"
              aria-label={`Remove ${row.city.name}`}
              disabled={rows.length <= 1}
              onClick={() => onRemove(row.city.id)}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>

      {Array.from({ length: 24 }, (_, hour) => (
        <div className="mobile-hour-row" key={hour}>
          <div className="mobile-ref-hour">{formatHourLabel(hour, timeFormat)}</div>
          {rows.map((row) => {
            const cell = row.cells[hour];
            return (
              <TimeCell
                key={row.city.id}
                cell={cell}
                overlap={isOverlapCell(mode, row.city.id, cell.refHour, meetingOverlapHours, baseOverlapByCity)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

type GridProps = {
  rows: Array<{ city: City; cells: Cell[] }>;
  mode: Mode;
  meetingOverlapHours: number[];
  baseOverlapByCity: Map<string, number[]>;
  offsets: Map<string, string>;
  timeFormat: TimeFormat;
  onRemove: (cityId: string) => void;
  onPromote: (cityId: string) => void;
};

function CityInfo({
  city,
  isReference,
  offset,
  onPromote
}: {
  city: City;
  isReference: boolean;
  offset: string;
  onPromote: (cityId: string) => void;
}) {
  return (
    <div className="city-info">
      <button type="button" onClick={() => onPromote(city.id)}>
        <span>{city.name}</span>
        {!isReference && <ChevronsUp size={15} />}
      </button>
      <div>
        {isReference && <span className="ref-badge">REF</span>}
        <span>{city.country}</span>
        <span>{offset}</span>
      </div>
    </div>
  );
}

function RemoveButton({
  city,
  disabled,
  onRemove
}: {
  city: City;
  disabled: boolean;
  onRemove: (cityId: string) => void;
}) {
  return (
    <button
      type="button"
      className="remove-button"
      disabled={disabled}
      aria-label={`Remove ${city.name}`}
      title={`Remove ${city.name}`}
      onClick={() => onRemove(city.id)}
    >
      <Trash2 size={17} />
    </button>
  );
}

function TimeCell({ cell, overlap }: { cell: Cell; overlap: boolean }) {
  const className = overlap ? "time-cell overlap" : cell.isAwake ? "time-cell awake" : "time-cell sleeping";

  return (
    <div className={className} title={cell.isAwake ? "Awake" : "Sleeping"}>
      {cell.label}
    </div>
  );
}

function isOverlapCell(
  mode: Mode,
  cityId: string,
  hour: number,
  meetingOverlapHours: number[],
  baseOverlapByCity: Map<string, number[]>
) {
  if (mode === "meeting") {
    return meetingOverlapHours.includes(hour);
  }

  const cityOverlap = baseOverlapByCity.get(cityId);
  if (!cityOverlap) {
    return false;
  }

  return cityOverlap.includes(hour);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
