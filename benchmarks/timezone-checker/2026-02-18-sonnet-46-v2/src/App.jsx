import { useState, useEffect, useRef, useCallback } from "react";
import { CITIES } from "./cities";
import {
  getLocalHour,
  getUTCOffset,
  formatOffset,
  formatLocalTime,
  getOverlapHours,
  getHasOverlap,
} from "./utils";
import "./App.css";

const DEFAULT_SETTINGS = {
  use12h: false,
  workStart: 9,
  workEnd: 18,
  wakeStart: 7,
  wakeEnd: 9,
};

function loadSettings() {
  try {
    const s = localStorage.getItem("tz-settings");
    return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadZones() {
  try {
    const z = localStorage.getItem("tz-zones");
    return z ? JSON.parse(z) : null;
  } catch {
    return null;
  }
}

function detectUserCity() {
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const found = CITIES.find((c) => c.timezone === userTz);
  if (found) return found;
  return { city: userTz.split("/").pop().replace(/_/g, " "), country: "", timezone: userTz };
}

function getInitialZones() {
  const saved = loadZones();
  if (saved && saved.length >= 2) return saved;

  const userCity = detectUserCity();
  const second =
    userCity.timezone === "America/New_York"
      ? CITIES.find((c) => c.timezone === "Asia/Tokyo")
      : CITIES.find((c) => c.timezone === "America/New_York");

  return [
    { ...userCity, id: crypto.randomUUID(), isPrimary: true },
    { ...second, id: crypto.randomUUID(), isPrimary: false },
  ];
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function App() {
  const [zones, setZones] = useState(() => {
    const initial = getInitialZones();
    if (!initial.some((z) => z.isPrimary)) {
      initial[0].isPrimary = true;
    }
    return initial;
  });
  const [settings, setSettings] = useState(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [tick, setTick] = useState(0);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "tz-zones",
      JSON.stringify(
        zones.map(({ id, city, country, timezone, isPrimary }) => ({
          id,
          city,
          country,
          timezone,
          isPrimary,
        }))
      )
    );
  }, [zones]);

  useEffect(() => {
    localStorage.setItem("tz-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (searchQuery.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results = CITIES.filter(
      (c) =>
        c.city.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
    ).slice(0, 8);
    setSearchResults(results);
  }, [searchQuery]);

  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const primaryZone = zones.find((z) => z.isPrimary) || zones[0];

  const addZone = useCallback(
    (cityData) => {
      if (zones.length >= 5) return;
      if (zones.some((z) => z.timezone === cityData.timezone)) return;
      setZones((prev) => [
        ...prev,
        { ...cityData, id: crypto.randomUUID(), isPrimary: false },
      ]);
      setSearchQuery("");
      setShowSearch(false);
    },
    [zones]
  );

  const removeZone = useCallback((id) => {
    setZones((prev) => {
      const next = prev.filter((z) => z.id !== id);
      if (next.length > 0 && !next.some((z) => z.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
    });
  }, []);

  const setPrimary = useCallback((id) => {
    setZones((prev) => prev.map((z) => ({ ...z, isPrimary: z.id === id })));
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 className="app-title">Claude Sonnet 4.6</h1>
          <span className="app-subtitle">Timezone Overlap</span>
        </div>
        <div className="header-right">
          <button
            className="icon-btn"
            onClick={() => setShowSettings((v) => !v)}
            aria-label="Settings"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      <main className="main">
        <div className="search-wrapper" ref={searchRef}>
          <div
            className="search-bar"
            onClick={() => {
              setShowSearch(true);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
          >
            <svg
              className="search-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              className="search-input"
              placeholder={
                zones.length >= 5
                  ? "Maximum 5 timezones reached"
                  : "Add city or country…"
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearch(true);
              }}
              onFocus={() => setShowSearch(true)}
              disabled={zones.length >= 5}
            />
            {searchQuery && (
              <button
                className="clear-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery("");
                }}
              >
                ×
              </button>
            )}
          </div>
          {showSearch && searchResults.length > 0 && (
            <div className="search-dropdown">
              {searchResults.map((c, i) => (
                <button
                  key={i}
                  className="search-result-item"
                  onClick={() => addZone(c)}
                >
                  <div className="result-left">
                    <span className="result-city">{c.city}</span>
                    <span className="result-country">{c.country}</span>
                  </div>
                  <span className="result-offset">
                    {formatOffset(getUTCOffset(c.timezone))}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid-container">
          <TimezoneGrid
            zones={zones}
            settings={settings}
            primaryZone={primaryZone}
            onRemove={removeZone}
            onSetPrimary={setPrimary}
            tick={tick}
          />
        </div>

        <div className="legend">
          <div className="legend-item">
            <span className="legend-swatch night-swatch" />
            <span>Night</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch day-swatch" />
            <span>Day</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch wakeup-swatch" />
            <span>Wake-up</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch overlap-swatch" />
            <span>Work overlap</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch current-swatch" />
            <span>Now</span>
          </div>
        </div>
      </main>
    </div>
  );
}

function TimezoneGrid({ zones, settings, primaryZone, onRemove, onSetPrimary, tick }) {
  return (
    <div className="tz-grid">
      <div className="tz-row header-row">
        <div className="row-header-spacer" />
        <div className="cells-scroll">
          <div className="cells-inner">
            {HOURS.map((h) => (
              <div key={h} className="hour-label">
                {String(h).padStart(2, "0")}
              </div>
            ))}
          </div>
        </div>
      </div>

      {zones.map((zone) => (
        <ZoneRow
          key={zone.id}
          zone={zone}
          primaryZone={primaryZone}
          settings={settings}
          onRemove={onRemove}
          onSetPrimary={onSetPrimary}
          tick={tick}
        />
      ))}
    </div>
  );
}

function ZoneRow({ zone, primaryZone, settings, onRemove, onSetPrimary, tick }) {
  const localHour = getLocalHour(zone.timezone);
  const offset = getUTCOffset(zone.timezone);
  const localTime = formatLocalTime(zone.timezone, settings.use12h);
  const isPrimary = zone.isPrimary;

  const overlapHours = isPrimary
    ? Array.from(
        { length: settings.workEnd - settings.workStart },
        (_, i) => settings.workStart + i
      )
    : getOverlapHours(
        primaryZone.timezone,
        zone.timezone,
        settings.workStart,
        settings.workEnd
      );

  const hasOverlap = isPrimary || getHasOverlap(overlapHours);

  return (
    <div className={`tz-row zone-row${isPrimary ? " is-primary" : ""}`}>
      <div
        className="row-header"
        onClick={() => !isPrimary && onSetPrimary(zone.id)}
        title={isPrimary ? "Primary timezone" : "Click to set as primary"}
      >
        <div className="zone-info">
          <div className="zone-name-row">
            <span className="zone-city">{zone.city}</span>
            {isPrimary && <span className="primary-badge">●</span>}
          </div>
          {zone.country && <div className="zone-country">{zone.country}</div>}
          <div className="zone-time-row">
            <span className="zone-time">{localTime}</span>
            <span className="zone-offset">{formatOffset(offset)}</span>
          </div>
          {!hasOverlap && (
            <span className="no-overlap-badge">No overlap</span>
          )}
        </div>
        <button
          className="remove-zone-btn"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(zone.id);
          }}
          aria-label="Remove"
        >
          ×
        </button>
      </div>

      <div className="cells-scroll">
        <div className="cells-inner">
          {HOURS.map((h) => {
            const isNow = h === localHour;
            const isOverlap = overlapHours.includes(h);
            const isWake = h >= settings.wakeStart && h < settings.wakeEnd;
            const isDay = h >= 7 && h < 20;

            let cls = "tz-cell";
            if (isOverlap) cls += " cell-overlap";
            else if (isWake) cls += " cell-wakeup";
            else if (isDay) cls += " cell-day";
            else cls += " cell-night";
            if (isNow) cls += " cell-now";

            return (
              <div key={h} className={cls}>
                {isNow && <div className="now-marker" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ settings, onChange, onClose }) {
  const update = (key, value) => onChange((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-panel-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="settings-body">
          <div className="setting-group">
            <label className="setting-label">Time format</label>
            <div className="btn-group">
              <button
                className={`seg-btn${!settings.use12h ? " seg-active" : ""}`}
                onClick={() => update("use12h", false)}
              >
                24h
              </button>
              <button
                className={`seg-btn${settings.use12h ? " seg-active" : ""}`}
                onClick={() => update("use12h", true)}
              >
                12h
              </button>
            </div>
          </div>

          <div className="setting-group">
            <label className="setting-label">Working hours</label>
            <div className="hour-range">
              <input
                type="number"
                className="hour-input"
                min="0"
                max="23"
                value={settings.workStart}
                onChange={(e) => update("workStart", parseInt(e.target.value))}
              />
              <span className="range-sep">→</span>
              <input
                type="number"
                className="hour-input"
                min="1"
                max="24"
                value={settings.workEnd}
                onChange={(e) => update("workEnd", parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="setting-group">
            <label className="setting-label">Wake-up window</label>
            <div className="hour-range">
              <input
                type="number"
                className="hour-input"
                min="0"
                max="23"
                value={settings.wakeStart}
                onChange={(e) => update("wakeStart", parseInt(e.target.value))}
              />
              <span className="range-sep">→</span>
              <input
                type="number"
                className="hour-input"
                min="1"
                max="24"
                value={settings.wakeEnd}
                onChange={(e) => update("wakeEnd", parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
