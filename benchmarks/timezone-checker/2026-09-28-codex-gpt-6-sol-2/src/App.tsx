import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  Globe2,
  Moon,
  Plus,
  Search,
  Settings2,
  Sun,
  X,
} from "lucide-react";
import { CITIES, CITY_BY_ID, DEFAULT_CITY_IDS, type City } from "./cities";
import {
  buildRows,
  formatCellTime,
  formatHour,
  formatRange,
  formatReferenceDate,
  formatUtcOffset,
  getRanges,
  utcOffsetMinutes,
  type HourCell,
  type HourRow,
  type Mode,
  type TimeFormat,
} from "./time";

type AppState = {
  cityIds: string[];
  mode: Mode;
  wake: number;
  sleep: number;
  format: TimeFormat;
};

const STORAGE_KEY = "gpt-6-timezone-overlap-v1";
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const DEFAULT_STATE: AppState = {
  cityIds: DEFAULT_CITY_IDS,
  mode: "meeting",
  wake: 7,
  sleep: 23,
  format: "12h",
};

function validHour(value: unknown, fallback: number) {
  return Number.isInteger(value) &&
    typeof value === "number" &&
    value >= 0 &&
    value <= 23
    ? value
    : fallback;
}

function loadState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_STATE;
    const parsed: Partial<AppState> = JSON.parse(stored);
    const cityIds = Array.isArray(parsed.cityIds)
      ? [
          ...new Set(
            parsed.cityIds.filter(
              (id): id is string =>
                typeof id === "string" && CITY_BY_ID.has(id),
            ),
          ),
        ]
      : DEFAULT_CITY_IDS;
    return {
      cityIds,
      mode: parsed.mode === "base" ? "base" : "meeting",
      wake: validHour(parsed.wake, 7),
      sleep: validHour(parsed.sleep, 23),
      format: parsed.format === "24h" ? "24h" : "12h",
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function useCurrentTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function RangeBadges({
  overlap,
  format,
}: {
  overlap: boolean[];
  format: TimeFormat;
}) {
  const ranges = getRanges(overlap);
  if (!ranges.length)
    return (
      <span className="no-window">
        <AlertCircle size={14} /> No shared hours
      </span>
    );
  return (
    <div className="range-list">
      {ranges.map((range) => (
        <span className="range-badge" key={`${range.start}-${range.end}`}>
          {formatRange(range, format)}
        </span>
      ))}
    </div>
  );
}

function Summary({
  rows,
  mode,
  format,
}: {
  rows: HourRow[];
  mode: Mode;
  format: TimeFormat;
}) {
  if (rows.length < 2) return null;
  const meetingOverlap = rows[0].overlap;
  const meetingHours = meetingOverlap.filter(Boolean).length;
  return (
    <section className="summary-card" aria-label="Overlap summary">
      <div className="summary-glow" />
      <div className="summary-heading">
        <span className="section-eyebrow">
          <span className="eyebrow-dot" /> AVAILABILITY AT A GLANCE
        </span>
        <span className="summary-timezone">
          Times shown in {rows[0].city.name}
        </span>
      </div>
      {mode === "meeting" ? (
        <div className="meeting-summary">
          <div className="meeting-count">
            <span className="count-number">{meetingHours}</span>
            <span className="count-label">
              shared {meetingHours === 1 ? "hour" : "hours"}
              <br />
              <span>in a day</span>
            </span>
          </div>
          <div className="summary-divider" />
          <div className="meeting-ranges">
            <span className="summary-caption">WHEN EVERYONE IS AWAKE</span>
            <RangeBadges overlap={meetingOverlap} format={format} />
          </div>
        </div>
      ) : (
        <div className="base-summary">
          {rows.slice(1).map((row) => {
            const count = row.overlap.filter(Boolean).length;
            return (
              <div className="base-summary-row" key={row.city.id}>
                <div className="base-city">
                  <span className="base-city-dot" />
                  {row.city.name}
                </div>
                <div className="base-hours">
                  <strong>{count}</strong> {count === 1 ? "hour" : "hours"}
                </div>
                <RangeBadges overlap={row.overlap} format={format} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Cell({
  cell,
  overlap,
  city,
  referenceHour,
  format,
}: {
  cell: HourCell;
  overlap: boolean;
  city: City;
  referenceHour: number;
  format: TimeFormat;
}) {
  const state = overlap ? "overlap" : cell.awake ? "awake" : "sleeping";
  const time = formatCellTime(cell.hour, cell.minute, format);
  return (
    <div
      className={`hour-cell ${state}`}
      title={`${city.name}: ${time} · ${state === "overlap" ? "Shared awake hour" : cell.awake ? "Awake" : "Sleeping"} · Reference ${formatHour(referenceHour, format)}`}
      aria-label={`${city.name} ${time}, ${state === "overlap" ? "overlap" : state}`}
    >
      {time}
    </div>
  );
}

function DesktopGrid({
  rows,
  format,
  onPromote,
  onRemove,
  now,
}: {
  rows: HourRow[];
  format: TimeFormat;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
  now: Date;
}) {
  return (
    <div className="desktop-grid-scroll">
      <div className="desktop-grid">
        <div className="grid-header">
          <div className="grid-header-label">CITY / LOCAL TIME</div>
          {HOURS.map((hour) => (
            <div
              className={`grid-hour-label ${hour % 6 === 0 ? "major" : ""}`}
              key={hour}
            >
              {formatCellTime(hour, 0, format)}
            </div>
          ))}
          <div />
        </div>
        {rows.map((row, index) => (
          <div className="desktop-city-row" key={row.city.id}>
            <div className="city-details">
              <div className="city-name-line">
                <button
                  className="city-name-button"
                  onClick={() => onPromote(row.city.id)}
                  title={
                    index
                      ? `Make ${row.city.name} the reference city`
                      : "Reference city"
                  }
                >
                  {row.city.name}
                </button>
                {index === 0 && <span className="ref-badge">REF</span>}
              </div>
              <div className="city-meta">
                <span>{row.city.country}</span>
                <span className="meta-separator">·</span>
                <span>
                  {formatUtcOffset(utcOffsetMinutes(now, row.city.timeZone))}
                </span>
              </div>
            </div>
            {row.cells.map((cell, hour) => (
              <Cell
                key={hour}
                cell={cell}
                overlap={row.overlap[hour]}
                city={row.city}
                referenceHour={hour}
                format={format}
              />
            ))}
            <button
              className="remove-button"
              onClick={() => onRemove(row.city.id)}
              aria-label={`Remove ${row.city.name}`}
              title={`Remove ${row.city.name}`}
            >
              <X size={17} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileGrid({
  rows,
  format,
  onPromote,
  onRemove,
  now,
}: {
  rows: HourRow[];
  format: TimeFormat;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
  now: Date;
}) {
  return (
    <div className="mobile-grid-scroll">
      <div
        className="mobile-grid"
        style={
          {
            "--city-count": rows.length,
            minWidth: `${65 + rows.length * 89}px`,
          } as CSSProperties
        }
      >
        <div className="mobile-grid-header">
          <div className="mobile-time-heading">
            REF
            <br />
            HOUR
          </div>
          {rows.map((row, index) => (
            <div className="mobile-city-heading" key={row.city.id}>
              <div className="mobile-city-top">
                <span>{index === 0 ? "REF" : `0${index + 1}`}</span>
                <button
                  onClick={() => onRemove(row.city.id)}
                  aria-label={`Remove ${row.city.name}`}
                >
                  <X size={14} />
                </button>
              </div>
              <button
                className="mobile-city-name"
                onClick={() => onPromote(row.city.id)}
                title={
                  index
                    ? `Make ${row.city.name} the reference city`
                    : "Reference city"
                }
              >
                {row.city.name}
              </button>
              <span className="mobile-city-offset">
                {formatUtcOffset(utcOffsetMinutes(now, row.city.timeZone))}
              </span>
            </div>
          ))}
        </div>
        {HOURS.map((hour) => (
          <div
            className={`mobile-hour-row ${hour % 6 === 0 ? "major-row" : ""}`}
            key={hour}
          >
            <div className="mobile-hour-label">
              {formatCellTime(hour, 0, format)}
            </div>
            {rows.map((row) => (
              <Cell
                key={row.city.id}
                cell={row.cells[hour]}
                overlap={row.overlap[hour]}
                city={row.city}
                referenceHour={hour}
                format={format}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const now = useCurrentTime();
  const cities = useMemo(
    () =>
      state.cityIds
        .map((id) => CITY_BY_ID.get(id))
        .filter((city): city is City => Boolean(city)),
    [state.cityIds],
  );
  const rows = useMemo(
    () => buildRows(cities, state.wake, state.sleep, state.mode, now),
    [cities, state.wake, state.sleep, state.mode, now],
  );
  const available = CITIES.filter(
    (city) =>
      !state.cityIds.includes(city.id) &&
      `${city.name} ${city.country} ${city.region}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* Storage may be disabled. */
    }
  }, [state]);
  useEffect(() => {
    if (addOpen) searchRef.current?.focus();
  }, [addOpen]);
  useEffect(() => {
    function closeOnOutside(event: PointerEvent) {
      if (addRef.current && !addRef.current.contains(event.target as Node))
        setAddOpen(false);
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      )
        setSettingsOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAddOpen(false);
        setSettingsOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function addCity(id: string) {
    setState((current) =>
      current.cityIds.includes(id)
        ? current
        : { ...current, cityIds: [...current.cityIds, id] },
    );
    setAddOpen(false);
    setQuery("");
  }
  function removeCity(id: string) {
    setState((current) => ({
      ...current,
      cityIds: current.cityIds.filter((cityId) => cityId !== id),
    }));
  }
  function promoteCity(id: string) {
    setState((current) => ({
      ...current,
      cityIds: [id, ...current.cityIds.filter((cityId) => cityId !== id)],
    }));
  }

  const reference = cities[0];
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Globe2 size={19} strokeWidth={1.8} />
          </span>
          <span>
            COMMON<span className="brand-accent">/</span>HOURS
          </span>
        </div>
        <div className="topbar-right">
          <span className="topbar-live">
            <span className="live-dot" /> LIVE TIMEZONE DATA
          </span>
          <span className="topbar-edition">GLOBAL SCHEDULING TOOL</span>
        </div>
      </header>

      <main>
        <section className="intro">
          <div>
            <div className="intro-kicker">
              <span className="kicker-line" /> MADE FOR TEAMS EVERYWHERE
            </div>
            <h1>GPT-6</h1>
            <p>Find the hours that feel right, wherever work takes you.</p>
          </div>
          <div className="intro-orbit" aria-hidden="true">
            <div className="orbit-ring ring-one" />
            <div className="orbit-ring ring-two" />
            <div className="orbit-core">
              <Globe2 size={33} strokeWidth={1.2} />
            </div>
            <span className="orbit-point point-one" />
            <span className="orbit-point point-two" />
          </div>
        </section>

        <section className="mode-bar" aria-label="Comparison mode">
          <div className="mode-tabs" role="group" aria-label="Comparison mode">
            <button
              className={state.mode === "meeting" ? "active" : ""}
              onClick={() =>
                setState((current) => ({ ...current, mode: "meeting" }))
              }
              aria-pressed={state.mode === "meeting"}
            >
              <span className="mode-icon">
                <Globe2 size={16} />
              </span>{" "}
              Meeting mode
            </button>
            <button
              className={state.mode === "base" ? "active" : ""}
              onClick={() =>
                setState((current) => ({ ...current, mode: "base" }))
              }
              aria-pressed={state.mode === "base"}
            >
              <span className="mode-icon">
                <ArrowRight size={16} />
              </span>{" "}
              Base mode
            </button>
          </div>
          <p>
            {state.mode === "meeting"
              ? "Find a window when every city is awake."
              : `Compare each city with ${reference?.name ?? "your reference city"}.`}
          </p>
        </section>

        <Summary rows={rows} mode={state.mode} format={state.format} />

        <section className="workspace" aria-label="Timezone comparison">
          <div className="workspace-top">
            <div className="workspace-title-wrap">
              <div className="workspace-title-line">
                <span className="workspace-icon">
                  <Clock3 size={17} />
                </span>
                <h2>Time across cities</h2>
                <span className="city-count">{cities.length}</span>
              </div>
              <p>
                {reference
                  ? `${formatReferenceDate(now, reference.timeZone)} · Hours anchored to ${reference.name}`
                  : "Add a city to start comparing local hours"}
              </p>
            </div>
            <div className="workspace-actions">
              <div className="action-anchor" ref={addRef}>
                <button
                  className={`add-button ${addOpen ? "is-open" : ""}`}
                  onClick={() => {
                    setAddOpen((value) => !value);
                    setSettingsOpen(false);
                  }}
                  aria-expanded={addOpen}
                >
                  <Plus size={17} /> Add city{" "}
                  <ChevronDown size={14} className="button-chevron" />
                </button>
                {addOpen && (
                  <div className="city-popover">
                    <div className="search-wrap">
                      <Search size={16} />
                      <input
                        ref={searchRef}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search city or country"
                        aria-label="Search city or country"
                      />
                    </div>
                    <div className="popover-caption">
                      {available.length}{" "}
                      {available.length === 1 ? "CITY" : "CITIES"} AVAILABLE
                    </div>
                    <div className="city-results">
                      {available.length ? (
                        available.map((city) => (
                          <button
                            key={city.id}
                            onClick={() => addCity(city.id)}
                          >
                            <span>
                              <strong>{city.name}</strong>
                              <small>
                                {city.country} · {city.region}
                              </small>
                            </span>
                            <Plus size={16} />
                          </button>
                        ))
                      ) : (
                        <div className="no-results">No cities found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="action-anchor" ref={settingsRef}>
                <button
                  className={`settings-button ${settingsOpen ? "is-open" : ""}`}
                  onClick={() => {
                    setSettingsOpen((value) => !value);
                    setAddOpen(false);
                  }}
                  aria-label="Availability settings"
                  aria-expanded={settingsOpen}
                >
                  <Settings2 size={19} />
                </button>
                {settingsOpen && (
                  <div className="settings-popover">
                    <div className="settings-heading">
                      <div>
                        <span className="popover-caption">
                          YOUR DAILY RHYTHM
                        </span>
                        <h3>Availability</h3>
                      </div>
                      <button
                        onClick={() => setSettingsOpen(false)}
                        aria-label="Close settings"
                      >
                        <X size={17} />
                      </button>
                    </div>
                    <p className="settings-help">
                      The same awake window applies to everyone. Overnight hours
                      are supported.
                    </p>
                    <div className="settings-fields">
                      <label>
                        <span>
                          <Sun size={15} /> Wake up
                        </span>
                        <select
                          value={state.wake}
                          onChange={(event) =>
                            setState((current) => ({
                              ...current,
                              wake: Number(event.target.value),
                            }))
                          }
                        >
                          {HOURS.map((hour) => (
                            <option value={hour} key={hour}>
                              {formatHour(hour, state.format)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>
                          <Moon size={15} /> Go to sleep
                        </span>
                        <select
                          value={state.sleep}
                          onChange={(event) =>
                            setState((current) => ({
                              ...current,
                              sleep: Number(event.target.value),
                            }))
                          }
                        >
                          {HOURS.map((hour) => (
                            <option value={hour} key={hour}>
                              {formatHour(hour, state.format)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="format-setting">
                      <span>Time format</span>
                      <div className="format-switch">
                        <button
                          className={state.format === "12h" ? "selected" : ""}
                          onClick={() =>
                            setState((current) => ({
                              ...current,
                              format: "12h",
                            }))
                          }
                          aria-pressed={state.format === "12h"}
                        >
                          12h
                        </button>
                        <button
                          className={state.format === "24h" ? "selected" : ""}
                          onClick={() =>
                            setState((current) => ({
                              ...current,
                              format: "24h",
                            }))
                          }
                          aria-pressed={state.format === "24h"}
                        >
                          24h
                        </button>
                      </div>
                    </div>
                    <div className="settings-foot">
                      <Check size={14} /> Changes apply instantly
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {rows.length ? (
            <>
              <DesktopGrid
                rows={rows}
                format={state.format}
                onPromote={promoteCity}
                onRemove={removeCity}
                now={now}
              />
              <MobileGrid
                rows={rows}
                format={state.format}
                onPromote={promoteCity}
                onRemove={removeCity}
                now={now}
              />
            </>
          ) : (
            <div className="empty-state">
              <Globe2 size={32} strokeWidth={1.3} />
              <h3>Your world starts here</h3>
              <p>Add a city to begin exploring time across places.</p>
              <button onClick={() => setAddOpen(true)}>
                <Plus size={16} /> Add a city
              </button>
            </div>
          )}
          <div className="workspace-bottom">
            <div className="legend">
              <span className="legend-item">
                <i className="legend-swatch overlap-swatch" />{" "}
                {state.mode === "meeting"
                  ? "Everyone awake"
                  : "Shared with reference"}
              </span>
              <span className="legend-item">
                <i className="legend-swatch awake-swatch" /> Awake
              </span>
              <span className="legend-item">
                <i className="legend-swatch sleep-swatch" /> Sleeping
              </span>
            </div>
            <span className="grid-tip">
              Click a city name to make it the reference{" "}
              <ArrowRight size={13} />
            </span>
          </div>
        </section>

        <div className="bottom-hint">
          <span className="hint-line" />
          <span className="hint-icon">
            <Check size={14} />
          </span>
          <span>
            Green cells = everyone awake
            {state.mode === "base" ? " with the reference city" : ""}
          </span>
          <span className="hint-line" />
        </div>
      </main>
      <footer>
        <span>COMMON/HOURS</span>
        <span>
          TIME IS BETTER TOGETHER ·{" "}
          <span className="footer-year">{now.getFullYear()}</span>
        </span>
      </footer>
    </div>
  );
}

export default App;
