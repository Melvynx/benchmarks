import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const MODEL_NAME = "GPT-5.6 Terra";
const STORAGE_KEY = "gpt-terra-timezone-overlap-v1";

const CITIES = [
  { id: "san-francisco", name: "San Francisco", country: "United States", code: "US", timezone: "America/Los_Angeles", region: "North America" },
  { id: "new-york", name: "New York", country: "United States", code: "US", timezone: "America/New_York", region: "North America" },
  { id: "toronto", name: "Toronto", country: "Canada", code: "CA", timezone: "America/Toronto", region: "North America" },
  { id: "mexico-city", name: "Mexico City", country: "Mexico", code: "MX", timezone: "America/Mexico_City", region: "North America" },
  { id: "sao-paulo", name: "São Paulo", country: "Brazil", code: "BR", timezone: "America/Sao_Paulo", region: "South America" },
  { id: "buenos-aires", name: "Buenos Aires", country: "Argentina", code: "AR", timezone: "America/Argentina/Buenos_Aires", region: "South America" },
  { id: "honolulu", name: "Honolulu", country: "United States", code: "US", timezone: "Pacific/Honolulu", region: "North America" },
  { id: "anchorage", name: "Anchorage", country: "United States", code: "US", timezone: "America/Anchorage", region: "North America" },
  { id: "reykjavik", name: "Reykjavík", country: "Iceland", code: "IS", timezone: "Atlantic/Reykjavik", region: "Europe" },
  { id: "london", name: "London", country: "United Kingdom", code: "GB", timezone: "Europe/London", region: "Europe" },
  { id: "dublin", name: "Dublin", country: "Ireland", code: "IE", timezone: "Europe/Dublin", region: "Europe" },
  { id: "lisbon", name: "Lisbon", country: "Portugal", code: "PT", timezone: "Europe/Lisbon", region: "Europe" },
  { id: "paris", name: "Paris", country: "France", code: "FR", timezone: "Europe/Paris", region: "Europe" },
  { id: "geneva", name: "Geneva", country: "Switzerland", code: "CH", timezone: "Europe/Zurich", region: "Europe" },
  { id: "berlin", name: "Berlin", country: "Germany", code: "DE", timezone: "Europe/Berlin", region: "Europe" },
  { id: "cairo", name: "Cairo", country: "Egypt", code: "EG", timezone: "Africa/Cairo", region: "Africa" },
  { id: "johannesburg", name: "Johannesburg", country: "South Africa", code: "ZA", timezone: "Africa/Johannesburg", region: "Africa" },
  { id: "nairobi", name: "Nairobi", country: "Kenya", code: "KE", timezone: "Africa/Nairobi", region: "Africa" },
  { id: "cape-town", name: "Cape Town", country: "South Africa", code: "ZA", timezone: "Africa/Johannesburg", region: "Africa" },
  { id: "dubai", name: "Dubai", country: "United Arab Emirates", code: "AE", timezone: "Asia/Dubai", region: "Middle East" },
  { id: "riyadh", name: "Riyadh", country: "Saudi Arabia", code: "SA", timezone: "Asia/Riyadh", region: "Middle East" },
  { id: "mumbai", name: "Mumbai", country: "India", code: "IN", timezone: "Asia/Kolkata", region: "Asia" },
  { id: "new-delhi", name: "New Delhi", country: "India", code: "IN", timezone: "Asia/Kolkata", region: "Asia" },
  { id: "kathmandu", name: "Kathmandu", country: "Nepal", code: "NP", timezone: "Asia/Kathmandu", region: "Asia" },
  { id: "dhaka", name: "Dhaka", country: "Bangladesh", code: "BD", timezone: "Asia/Dhaka", region: "Asia" },
  { id: "bangkok", name: "Bangkok", country: "Thailand", code: "TH", timezone: "Asia/Bangkok", region: "Asia" },
  { id: "singapore", name: "Singapore", country: "Singapore", code: "SG", timezone: "Asia/Singapore", region: "Asia" },
  { id: "hong-kong", name: "Hong Kong", country: "Hong Kong", code: "HK", timezone: "Asia/Hong_Kong", region: "Asia" },
  { id: "tokyo", name: "Tokyo", country: "Japan", code: "JP", timezone: "Asia/Tokyo", region: "Asia" },
  { id: "seoul", name: "Seoul", country: "South Korea", code: "KR", timezone: "Asia/Seoul", region: "Asia" },
  { id: "beijing", name: "Beijing", country: "China", code: "CN", timezone: "Asia/Shanghai", region: "Asia" },
  { id: "perth", name: "Perth", country: "Australia", code: "AU", timezone: "Australia/Perth", region: "Oceania" },
  { id: "denpasar", name: "Denpasar", country: "Indonesia", code: "ID", timezone: "Asia/Makassar", region: "Asia" },
  { id: "sydney", name: "Sydney", country: "Australia", code: "AU", timezone: "Australia/Sydney", region: "Oceania" },
  { id: "auckland", name: "Auckland", country: "New Zealand", code: "NZ", timezone: "Pacific/Auckland", region: "Oceania" },
];

const DEFAULT_STATE = {
  cityIds: ["san-francisco", "denpasar", "geneva"],
  mode: "meeting",
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: "12",
};

function readStoredState() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_STATE;
    const parsed = JSON.parse(stored);
    const validCityIds = Array.isArray(parsed.cityIds) && parsed.cityIds.length ? parsed.cityIds.filter((id) => CITIES.some((city) => city.id === id)) : DEFAULT_STATE.cityIds;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      cityIds: [...new Set(validCityIds.length ? validCityIds : DEFAULT_STATE.cityIds)],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function getOffsetInMinutes(timezone, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
    hour: "2-digit",
  }).formatToParts(date);
  const label = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = label.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === "+" ? minutes : -minutes;
}

function getCurrentHour(timezone, date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "2-digit", hour12: false }).format(date));
  return hour === 24 ? 0 : hour;
}

function formatOffset(minutes) {
  if (minutes === 0) return "UTC±0";
  const sign = minutes > 0 ? "+" : "−";
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const mins = absolute % 60;
  return `UTC${sign}${hours}${mins ? `:${String(mins).padStart(2, "0")}` : ""}`;
}

function formatTime(hour, format = "12", includeMinutes = false) {
  const minutes = Math.round(((hour % 24) + 24) % 24 * 60) % 1440;
  const rawHour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  if (format === "24") return `${String(rawHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const suffix = rawHour >= 12 ? "pm" : "am";
  const displayHour = rawHour % 12 || 12;
  return `${displayHour}${includeMinutes && minute ? `:${String(minute).padStart(2, "0")}` : ""}${suffix}`;
}

function formatRangeTime(hour, format) {
  if (format === "24") return `${String(hour % 24).padStart(2, "0")}:00`;
  return formatTime(hour, format);
}

function isAwake(hour, wake, sleep) {
  if (wake === sleep) return true;
  if (wake < sleep) return hour >= wake && hour < sleep;
  return hour >= wake || hour < sleep;
}

function getRanges(flags) {
  if (!flags.some(Boolean)) return [];
  if (flags.every(Boolean)) return [{ start: 0, end: 24 }];
  const ranges = [];
  let start = null;
  for (let index = 0; index <= 24; index += 1) {
    const active = index < 24 ? flags[index] : false;
    if (active && start === null) start = index;
    if (!active && start !== null) {
      ranges.push({ start, end: index });
      start = null;
    }
  }
  if (ranges.length > 1 && ranges[0].start === 0 && ranges.at(-1).end === 24) {
    const first = ranges.shift();
    const last = ranges.pop();
    ranges.unshift({ start: last.start, end: first.end + 24 });
  }
  return ranges;
}

function getLocalHour(refHour, cityOffset, referenceOffset) {
  return ((refHour * 60 + cityOffset - referenceOffset) % 1440 + 1440) % 1440 / 60;
}

function getLocalDateLabel(timezone) {
  return new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", month: "short", day: "numeric" }).format(new Date());
}

function Icon({ children, className = "" }) {
  return <span aria-hidden="true" className={`icon ${className}`}>{children}</span>;
}

function RangeBadges({ ranges, format }) {
  if (!ranges.length) return <span className="empty-range">No shared awake hours</span>;
  return (
    <div className="range-list">
      {ranges.map((range) => (
        <span className="range-badge" key={`${range.start}-${range.end}`}>
          <span className="range-dot" />
          {formatRangeTime(range.start, format)} <span className="range-arrow">→</span> {formatRangeTime(range.end, format)}
        </span>
      ))}
    </div>
  );
}

function App() {
  const [state, setState] = useState(readStoredState);
  const [citySearch, setCitySearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const addRef = useRef(null);
  const settingsRef = useRef(null);
  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    function closeMenus(event) {
      if (addRef.current && !addRef.current.contains(event.target)) setIsAddOpen(false);
      if (settingsRef.current && !settingsRef.current.contains(event.target)) setIsSettingsOpen(false);
    }
    document.addEventListener("pointerdown", closeMenus);
    return () => document.removeEventListener("pointerdown", closeMenus);
  }, []);

  const selectedCities = useMemo(() => state.cityIds.map((id) => CITIES.find((city) => city.id === id)).filter(Boolean), [state.cityIds]);
  const reference = selectedCities[0];
  const selectedIds = new Set(state.cityIds);
  const availableCities = CITIES.filter((city) => !selectedIds.has(city.id));
  const filteredCities = availableCities.filter((city) => `${city.name} ${city.country} ${city.region}`.toLowerCase().includes(citySearch.toLowerCase().trim())).slice(0, 8);
  const offsets = useMemo(() => Object.fromEntries(selectedCities.map((city) => [city.id, getOffsetInMinutes(city.timezone, now)])), [selectedCities, now]);
  const referenceOffset = reference ? offsets[reference.id] : 0;
  const referenceCurrentHour = reference ? getCurrentHour(reference.timezone, now) : 0;
  const hours = Array.from({ length: 24 }, (_, index) => index);

  const rows = useMemo(() => selectedCities.map((city, cityIndex) => {
    const localHours = hours.map((hour) => getLocalHour(hour, offsets[city.id], referenceOffset));
    const awake = localHours.map((hour) => isAwake(hour, state.wakeHour, state.sleepHour));
    let overlap;
    if (selectedCities.length < 2) {
      overlap = awake.map(() => false);
    } else if (state.mode === "meeting") {
      const meetingFlags = hours.map((_, hour) => selectedCities.every((candidate) => {
        const candidateLocalHour = getLocalHour(hour, offsets[candidate.id], referenceOffset);
        return isAwake(candidateLocalHour, state.wakeHour, state.sleepHour);
      }));
      overlap = meetingFlags;
    } else if (cityIndex === 0) {
      overlap = hours.map((hour) => selectedCities.slice(1).some((candidate) => {
        const candidateLocalHour = getLocalHour(hour, offsets[candidate.id], referenceOffset);
        return awake[hour] && isAwake(candidateLocalHour, state.wakeHour, state.sleepHour);
      }));
    } else {
      overlap = hours.map((hour) => {
        const baseLocalHour = getLocalHour(hour, offsets[reference.id], referenceOffset);
        return awake[hour] && isAwake(baseLocalHour, state.wakeHour, state.sleepHour);
      });
    }
    return { city, cityIndex, localHours, awake, overlap, ranges: getRanges(overlap), overlapCount: overlap.filter(Boolean).length };
  }), [selectedCities, offsets, referenceOffset, reference, state.wakeHour, state.sleepHour, state.mode]);

  const meetingRanges = useMemo(() => rows[0]?.overlap ?? [], [rows]);
  const meetingCount = meetingRanges.filter(Boolean).length;
  const awakeLabel = `${formatTime(state.wakeHour, state.timeFormat)} – ${formatTime(state.sleepHour, state.timeFormat)}`;

  function updateState(key, value) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function addCity(city) {
    setState((current) => ({ ...current, cityIds: [...current.cityIds, city.id] }));
    setCitySearch("");
    setIsAddOpen(false);
  }

  function removeCity(cityId) {
    if (state.cityIds.length === 1) return;
    setState((current) => ({ ...current, cityIds: current.cityIds.filter((id) => id !== cityId) }));
  }

  function promoteCity(cityId) {
    setState((current) => ({ ...current, cityIds: [cityId, ...current.cityIds.filter((id) => id !== cityId)] }));
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <main className="app-content">
        <header className="topbar">
          <div className="brand-lockup">
            <div className="brand-mark"><span>◒</span></div>
            <div>
              <div className="brand-name">LUMEN / TIME</div>
              <div className="brand-kicker">Global scheduling, made legible</div>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="sync-status"><span className="sync-dot" />Live offsets · today</div>
            <button className="icon-button" aria-label="Toggle settings" onClick={() => setIsSettingsOpen((open) => !open)}><Icon>☷</Icon></button>
            {isSettingsOpen && (
              <section className="settings-popover" ref={settingsRef}>
                <div className="popover-heading">
                  <div><p className="eyebrow">Your hours</p><h2>Awake window</h2></div>
                  <span className="popover-icon">◐</span>
                </div>
                <p className="popover-copy">Applied uniformly across every city. Overnight windows work too.</p>
                <div className="setting-row">
                  <label htmlFor="wake-hour">Wake up <strong>{formatTime(state.wakeHour, state.timeFormat)}</strong></label>
                  <input id="wake-hour" type="range" min="0" max="23" value={state.wakeHour} onChange={(event) => updateState("wakeHour", Number(event.target.value))} />
                </div>
                <div className="setting-row">
                  <label htmlFor="sleep-hour">Sleep <strong>{formatTime(state.sleepHour, state.timeFormat)}</strong></label>
                  <input id="sleep-hour" type="range" min="0" max="23" value={state.sleepHour} onChange={(event) => updateState("sleepHour", Number(event.target.value))} />
                </div>
                <div className="format-toggle">
                  <span>Time format</span>
                  <div className="mini-segmented">
                    {["12", "24"].map((format) => <button key={format} className={state.timeFormat === format ? "active" : ""} onClick={() => updateState("timeFormat", format)}>{format}h</button>)}
                  </div>
                </div>
              </section>
            )}
          </div>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Timezone overlap checker</p>
            <h1>{MODEL_NAME}</h1>
            <p className="hero-description">Find the hours where your distributed team can all be present — without doing the mental timezone math.</p>
          </div>
          <div className="hero-meta">
            <div className="date-orb"><span className="orb-label">Reference date</span><strong>{reference ? getLocalDateLabel(reference.timezone) : "Today"}</strong><span className="orb-caption">Based on current DST</span></div>
            <div className="hero-stat"><span>Selected</span><strong>{selectedCities.length.toString().padStart(2, "0")}</strong><small>cities</small></div>
          </div>
        </section>

        <section className="toolbar-card">
          <div className="toolbar-main">
            <div className="toolbar-title"><span className="section-index">01</span><div><p className="eyebrow">Compare locations</p><h2>Who’s joining?</h2></div></div>
            <div className="mode-switch" aria-label="Overlap mode">
              <button className={state.mode === "meeting" ? "active" : ""} onClick={() => updateState("mode", "meeting")}><span className="mode-icon">✦</span><span><strong>Meeting mode</strong><small>Everyone overlaps</small></span></button>
              <button className={state.mode === "base" ? "active" : ""} onClick={() => updateState("mode", "base")}><span className="mode-icon">◌</span><span><strong>Base mode</strong><small>One-to-one windows</small></span></button>
            </div>
          </div>
          <div className="city-picker-row">
            <div className="selected-city-list">
              {selectedCities.map((city, index) => (
                <div className={`selected-city ${index === 0 ? "is-reference" : ""}`} key={city.id}>
                  <button className="city-name-button" onClick={() => promoteCity(city.id)} title={index === 0 ? "Reference city" : `Make ${city.name} the reference city`}>
                    <span className="city-avatar">{city.code.slice(0, 2)}</span><span><strong>{city.name}</strong><small>{city.country}</small></span>
                  </button>
                  {index === 0 && <span className="reference-badge">REF</span>}
                  {selectedCities.length > 1 && <button className="remove-city" onClick={() => removeCity(city.id)} aria-label={`Remove ${city.name}`}>×</button>}
                </div>
              ))}
            </div>
            <div className="add-city-wrap" ref={addRef}>
              <button className="add-city-button" onClick={() => setIsAddOpen((open) => !open)}><span className="add-plus">+</span><span>Add city</span><kbd>⌘ K</kbd></button>
              {isAddOpen && (
                <div className="city-menu">
                  <div className="city-menu-search"><Icon>⌕</Icon><input autoFocus value={citySearch} onChange={(event) => setCitySearch(event.target.value)} placeholder="Search city or country" /><span>ESC</span></div>
                  <div className="city-menu-list">
                    {filteredCities.length ? filteredCities.map((city) => <button key={city.id} onClick={() => addCity(city)}><span className="menu-city-avatar">{city.code}</span><span><strong>{city.name}</strong><small>{city.country} · {city.region}</small></span><span className="menu-add">+</span></button>) : <div className="no-results">No available cities found.</div>}
                  </div>
                  <div className="city-menu-footer">{availableCities.length} cities available · no duplicates</div>
                </div>
              )}
            </div>
          </div>
          <div className="toolbar-footnote"><Icon>↗</Icon><span>Click any city name to make it the reference. All columns follow its clock.</span></div>
        </section>

        <section className="planner-card">
          <div className="planner-header">
            <div><p className="eyebrow">{state.mode === "meeting" ? "Shared availability" : "Pairwise availability"}</p><h2>{state.mode === "meeting" ? "When can everyone show up?" : `Windows from ${reference?.name ?? "your base city"}`}</h2></div>
            <div className="planner-header-right"><div className="awake-pill"><span className="awake-swatch" />Awake window <strong>{awakeLabel}</strong></div><div className="format-pill">{state.timeFormat}h</div></div>
          </div>

          {selectedCities.length > 1 && (
            <div className="summary-area">
              {state.mode === "meeting" ? (
                <div className={`summary-highlight ${meetingCount === 0 ? "is-warning" : ""}`}>
                  <div className="summary-icon">{meetingCount === 0 ? "!" : "✦"}</div>
                  <div className="summary-copy"><span className="summary-label">All {selectedCities.length} cities awake</span><strong>{meetingCount} {meetingCount === 1 ? "hour" : "hours"} of shared time</strong>{meetingCount === 0 && <small>Try widening the awake window or removing a location.</small>}</div>
                  <RangeBadges ranges={getRanges(rows[0]?.overlap ?? [])} format={state.timeFormat} />
                </div>
              ) : (
                <div className="base-summary-list">
                  {rows.slice(1).map((row) => <div className={`base-summary-row ${row.overlapCount === 0 ? "is-warning" : ""}`} key={row.city.id}><div className="base-summary-name"><span className="summary-city-dot" /> <strong>{row.city.name}</strong><span>vs {reference.name}</span></div><div className="base-summary-count">{row.overlapCount}h</div><RangeBadges ranges={row.ranges} format={state.timeFormat} /></div>)}
                </div>
              )}
            </div>
          )}

          <div className="legend-row"><div><span className="legend-chip overlap-chip" /><span>Overlap</span></div><div><span className="legend-chip awake-chip" /><span>Awake, not shared</span></div><div><span className="legend-chip sleep-chip" /><span>Sleeping</span></div><span className="legend-note">Hours shown in {reference?.name ?? "reference city"} time</span></div>

          <div className="desktop-scroll">
            <div className="desktop-grid">
              <div className="desktop-grid-corner"><span>Local time</span><small>{reference?.name ?? "Reference"}</small></div>
              {hours.map((hour) => <div className={`hour-header ${hour === referenceCurrentHour ? "is-now" : ""}`} key={`head-${hour}`}><span>{formatTime(hour, state.timeFormat)}</span><small>{hour === referenceCurrentHour ? "now" : hour === 0 ? "midnight" : hour < 12 ? "morning" : "evening"}</small></div>)}
              <div className="grid-action-head" />
              {rows.map((row) => <React.Fragment key={row.city.id}>
                <button className={`desktop-city-label ${row.cityIndex === 0 ? "is-reference" : ""}`} onClick={() => promoteCity(row.city.id)}>
                  <span className="row-city-top"><span className="city-avatar small">{row.city.code}</span><strong>{row.city.name}</strong>{row.cityIndex === 0 && <span className="tiny-ref">REF</span>}</span>
                  <span className="row-city-bottom"><span>{formatOffset(offsets[row.city.id])}</span><span>·</span><span>{row.city.country}</span></span>
                </button>
                {row.localHours.map((localHour, hour) => <div className={`time-cell ${row.awake[hour] ? "awake" : "sleeping"} ${row.overlap[hour] ? "overlap" : ""} ${hour === referenceCurrentHour ? "current-column" : ""}`} key={`${row.city.id}-${hour}`}><span>{formatTime(localHour, state.timeFormat, true)}</span></div>)}
                <button className="grid-remove" onClick={() => removeCity(row.city.id)} disabled={selectedCities.length === 1} aria-label={`Remove ${row.city.name}`}>×</button>
              </React.Fragment>)}
            </div>
          </div>

          <div className="mobile-grid-wrap">
            <div className="mobile-grid" style={{ "--city-count": selectedCities.length }}>
              <div className="mobile-hour-head">Hour</div>
              {rows.map((row) => <div className={`mobile-city-head ${row.cityIndex === 0 ? "is-reference" : ""}`} key={`mobile-head-${row.city.id}`}><button onClick={() => promoteCity(row.city.id)}><span className="city-avatar small">{row.city.code}</span><strong>{row.city.name}</strong>{row.cityIndex === 0 && <span className="tiny-ref">REF</span>}</button><small>{formatOffset(offsets[row.city.id])}</small><button className="mobile-remove" onClick={() => removeCity(row.city.id)} disabled={selectedCities.length === 1} aria-label={`Remove ${row.city.name}`}>×</button></div>)}
              {hours.map((hour) => <React.Fragment key={`mobile-row-${hour}`}><div className={`mobile-hour-label ${hour === referenceCurrentHour ? "is-now" : ""}`}><strong>{formatTime(hour, state.timeFormat)}</strong><small>{hour === referenceCurrentHour ? "now" : ""}</small></div>{rows.map((row) => <div className={`mobile-time-cell ${row.awake[hour] ? "awake" : "sleeping"} ${row.overlap[hour] ? "overlap" : ""}`} key={`mobile-${row.city.id}-${hour}`}><strong>{formatTime(row.localHours[hour], state.timeFormat, true)}</strong><small>{row.overlap[hour] ? "shared" : row.awake[hour] ? "awake" : "sleep"}</small></div>)}</React.Fragment>)}
            </div>
          </div>

          <div className="planner-footer"><div className="green-hint"><span className="hint-spark">✦</span><span>Green cells = {state.mode === "meeting" ? "everyone awake" : "base + city awake"}</span></div><div className="footer-detail">Offsets refresh from the current date so daylight saving changes stay accurate.</div></div>
        </section>
        <footer className="page-footer"><span>Built for distributed teams who think in local time.</span><span className="footer-brand">LUMEN / TIME <span>•</span> {MODEL_NAME}</span></footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
