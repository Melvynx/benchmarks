import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CITIES, CITY_BY_ID, DEFAULT_CITY_IDS, type City } from "./data/cities";
import { usePersistentState } from "./hooks/usePersistentState";
import {
  buildReferenceInstants,
  formatHour,
  formatLocalTime,
  formatOffset,
  formatRange,
  formatReferenceDate,
  getHourRanges,
  getLocalTime,
  getOffsetMinutes,
  isAwake,
  type LocalTime,
  type TimeFormat,
} from "./lib/timezone";
import {
  BaseIcon,
  CheckIcon,
  ChevronIcon,
  CloseIcon,
  MoonIcon,
  PeopleIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
} from "./components/Icons";

type Mode = "meeting" | "base";

interface AppState {
  cityIds: string[];
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
  mode: Mode;
}

const DEFAULT_STATE: AppState = {
  cityIds: DEFAULT_CITY_IDS,
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: "12h",
  mode: "meeting",
};

const STORAGE_KEY = "gpt-5.6-sol:timezone-checker:v1";
const HOURS = Array.from({ length: 24 }, (_, index) => index);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validHour(value: unknown, fallback: number) {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 23
    ? Number(value)
    : fallback;
}

function validateState(value: unknown): AppState {
  if (!isRecord(value)) return DEFAULT_STATE;
  const sourceIds = Array.isArray(value.cityIds) ? value.cityIds : DEFAULT_CITY_IDS;
  const cityIds = [...new Set(sourceIds.filter((id): id is string => typeof id === "string" && CITY_BY_ID.has(id)))];
  return {
    cityIds,
    wakeHour: validHour(value.wakeHour, DEFAULT_STATE.wakeHour),
    sleepHour: validHour(value.sleepHour, DEFAULT_STATE.sleepHour),
    timeFormat: value.timeFormat === "24h" ? "24h" : "12h",
    mode: value.mode === "base" ? "base" : "meeting",
  };
}

function useCurrentTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  return now;
}

interface CityPickerProps {
  selectedIds: string[];
  onAdd: (id: string) => void;
}

function CityPicker({ selectedIds, onAdd }: CityPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const available = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return CITIES.filter((city) => {
      if (selectedIds.includes(city.id)) return false;
      return !normalized || `${city.name} ${city.country}`.toLocaleLowerCase().includes(normalized);
    });
  }, [query, selectedIds]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const addCity = (id: string) => {
    onAdd(id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="city-picker" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="button button-primary"
        disabled={selectedIds.length === CITIES.length}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <PlusIcon />
        Add city
        <ChevronIcon className={open ? "chevron-open" : ""} />
      </button>

      {open && (
        <div className="city-menu">
          <div className="search-field">
            <SearchIcon />
            <input
              aria-controls="city-results"
              aria-expanded="true"
              aria-label="Search cities by name or country"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setOpen(false);
                if (event.key === "Enter" && available[0]) addCity(available[0].id);
              }}
              placeholder="Search city or country"
              ref={inputRef}
              role="combobox"
              value={query}
            />
          </div>
          <div className="city-results" id="city-results" role="listbox">
            {available.length ? available.map((city) => (
              <button
                aria-selected="false"
                className="city-option"
                key={city.id}
                onClick={() => addCity(city.id)}
                role="option"
                type="button"
              >
                <span>
                  <strong>{city.name}</strong>
                  <small>{city.country}</small>
                </span>
                <span className="region-label">{city.region}</span>
              </button>
            )) : (
              <div className="no-results">
                <SearchIcon />
                <span>No matching cities</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ModeSwitchProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  return (
    <div className="mode-switch" role="group" aria-label="Overlap calculation mode">
      <button
        aria-pressed={mode === "meeting"}
        className={mode === "meeting" ? "active" : ""}
        onClick={() => onChange("meeting")}
        type="button"
      >
        <PeopleIcon />
        <span><strong>Meeting</strong><small>Everyone together</small></span>
      </button>
      <button
        aria-pressed={mode === "base"}
        className={mode === "base" ? "active" : ""}
        onClick={() => onChange("base")}
        type="button"
      >
        <BaseIcon />
        <span><strong>Base</strong><small>Pair by reference</small></span>
      </button>
    </div>
  );
}

interface SettingsPanelProps {
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
  onWakeChange: (hour: number) => void;
  onSleepChange: (hour: number) => void;
  onFormatChange: (format: TimeFormat) => void;
}

function SettingsPanel({
  wakeHour,
  sleepHour,
  timeFormat,
  onWakeChange,
  onSleepChange,
  onFormatChange,
}: SettingsPanelProps) {
  const awakeDuration = wakeHour === sleepHour ? 24 : (sleepHour - wakeHour + 24) % 24;
  return (
    <section aria-label="Availability settings" className="settings-panel" id="settings-panel">
      <div className="settings-intro">
        <span className="settings-icon"><MoonIcon /></span>
        <div>
          <h2>Awake window</h2>
          <p>Applied to every city · {awakeDuration} hours awake</p>
        </div>
      </div>
      <label className="select-field">
        <span>Wake up</span>
        <select value={wakeHour} onChange={(event) => onWakeChange(Number(event.target.value))}>
          {HOURS.map((hour) => <option key={hour} value={hour}>{formatHour(hour, timeFormat)}</option>)}
        </select>
      </label>
      <label className="select-field">
        <span>Sleep</span>
        <select value={sleepHour} onChange={(event) => onSleepChange(Number(event.target.value))}>
          {HOURS.map((hour) => <option key={hour} value={hour}>{formatHour(hour, timeFormat)}</option>)}
        </select>
      </label>
      <div className="format-field">
        <span>Time format</span>
        <div className="format-switch" role="group" aria-label="Time format">
          <button aria-pressed={timeFormat === "12h"} className={timeFormat === "12h" ? "active" : ""} onClick={() => onFormatChange("12h")} type="button">12h</button>
          <button aria-pressed={timeFormat === "24h"} className={timeFormat === "24h" ? "active" : ""} onClick={() => onFormatChange("24h")} type="button">24h</button>
        </div>
      </div>
    </section>
  );
}

interface SummaryProps {
  cities: City[];
  mode: Mode;
  meetingFlags: boolean[];
  pairFlags: Map<string, boolean[]>;
  timeFormat: TimeFormat;
}

function RangeBadges({ flags, format }: { flags: boolean[]; format: TimeFormat }) {
  const ranges = getHourRanges(flags);
  if (!ranges.length) return <span className="summary-warning">No shared awake time</span>;
  return (
    <span className="range-list">
      {ranges.map((range) => (
        <span className="range-badge" key={`${range.start}-${range.end}`}>
          <CheckIcon />
          {formatRange(range, format)}
        </span>
      ))}
    </span>
  );
}

function OverlapSummary({ cities, mode, meetingFlags, pairFlags, timeFormat }: SummaryProps) {
  if (cities.length < 2) return null;
  const reference = cities[0];

  if (mode === "meeting") {
    const count = meetingFlags.filter(Boolean).length;
    return (
      <section aria-live="polite" className={`summary ${count ? "summary-success" : "summary-empty"}`}>
        <div className="summary-heading">
          <span className="status-mark"><PeopleIcon /></span>
          <div>
            <h2>{count ? `${count} shared ${count === 1 ? "hour" : "hours"}` : "No common window"}</h2>
            <p>Everyone awake · {reference.name} time</p>
          </div>
        </div>
        <RangeBadges flags={meetingFlags} format={timeFormat} />
      </section>
    );
  }

  return (
    <section aria-live="polite" className="summary summary-base">
      <div className="base-summary-title">
        <span className="status-mark"><BaseIcon /></span>
        <div>
          <h2>Paired with {reference.name}</h2>
          <p>Independent windows in reference time</p>
        </div>
      </div>
      <div className="pair-list">
        {cities.slice(1).map((city) => {
          const flags = pairFlags.get(city.id) ?? HOURS.map(() => false);
          const count = flags.filter(Boolean).length;
          return (
            <div className="pair-summary" key={city.id}>
              <span className="pair-city">{city.name}</span>
              <strong className={count ? "" : "zero"}>{count}h</strong>
              <RangeBadges flags={flags} format={timeFormat} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface TimeCellProps {
  city: City;
  local: LocalTime;
  awake: boolean;
  overlap: boolean;
  format: TimeFormat;
  current: boolean;
}

function TimeCell({ city, local, awake, overlap, format, current }: TimeCellProps) {
  const state = !awake ? "sleeping" : overlap ? "overlap" : "awake";
  const stateLabel = !awake ? "sleeping" : overlap ? "shared awake time" : "awake, no overlap";
  const localLabel = formatLocalTime(local, format);
  return (
    <div
      aria-label={`${city.name}, ${localLabel}, ${stateLabel}`}
      className={`time-cell ${state} ${current ? "current-column" : ""}`}
      role="gridcell"
      title={`${city.name}: ${localLabel} · ${stateLabel}`}
    >
      {!awake && <MoonIcon className="sleep-mark" />}
      <span>{formatLocalTime(local, format, true)}</span>
    </div>
  );
}

interface BoardProps {
  cities: City[];
  instants: Date[];
  localTimes: Map<string, LocalTime[]>;
  awakeFlags: Map<string, boolean[]>;
  meetingFlags: boolean[];
  pairFlags: Map<string, boolean[]>;
  mode: Mode;
  timeFormat: TimeFormat;
  currentHour: number;
  now: Date;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
}

function overlapForCity(
  city: City,
  index: number,
  reference: City,
  mode: Mode,
  meetingFlags: boolean[],
  pairFlags: Map<string, boolean[]>,
  awakeFlags: Map<string, boolean[]>,
) {
  if (mode === "meeting") return meetingFlags[index];
  if (city.id === reference.id) return awakeFlags.get(reference.id)?.[index] ?? false;
  return pairFlags.get(city.id)?.[index] ?? false;
}

function DesktopBoard(props: BoardProps) {
  const reference = props.cities[0];
  return (
    <div className="desktop-board board-shell" role="grid" aria-label="Timezone overlap grid, cities as rows">
      <div className="desktop-scroll">
        <div className="desktop-grid-header" role="row">
          <div className="city-header" role="columnheader">
            <span>City</span>
            <small>Local time</small>
          </div>
          {HOURS.map((hour) => (
            <div className={`hour-header ${hour === props.currentHour ? "current" : ""}`} key={hour} role="columnheader">
              <span>{formatHour(hour, props.timeFormat, true)}</span>
              {hour === props.currentHour && <small>now</small>}
            </div>
          ))}
          <div aria-hidden="true" />
        </div>
        {props.cities.map((city, cityIndex) => {
          const localTimes = props.localTimes.get(city.id) ?? [];
          const awake = props.awakeFlags.get(city.id) ?? [];
          return (
            <div className="desktop-row" key={city.id} role="row">
              <div className="city-info" role="rowheader">
                <button className="city-name-button" disabled={cityIndex === 0} onClick={() => props.onPromote(city.id)} type="button">
                  <span>{city.name}</span>
                  {cityIndex === 0 && <span className="ref-badge">REF</span>}
                </button>
                <span className="city-meta">{city.country} · {formatOffset(getOffsetMinutes(city.timezone, props.now))}</span>
              </div>
              {props.instants.map((instant, hour) => (
                <TimeCell
                  awake={awake[hour] ?? false}
                  city={city}
                  current={hour === props.currentHour}
                  format={props.timeFormat}
                  key={`${city.id}-${instant.toISOString()}`}
                  local={localTimes[hour]}
                  overlap={overlapForCity(city, hour, reference, props.mode, props.meetingFlags, props.pairFlags, props.awakeFlags)}
                />
              ))}
              <button aria-label={`Remove ${city.name}`} className="remove-button" onClick={() => props.onRemove(city.id)} title={`Remove ${city.name}`} type="button"><CloseIcon /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MobileBoard(props: BoardProps) {
  const reference = props.cities[0];
  const gridStyle = {
    "--city-count": props.cities.length,
    minWidth: `${76 + props.cities.length * 112}px`,
  } as CSSProperties;
  return (
    <div className="mobile-board board-shell" role="grid" aria-label="Timezone overlap grid, cities as columns">
      <div className="mobile-scroll" style={gridStyle}>
        <div className="mobile-grid-header" role="row">
          <div className="mobile-corner" role="columnheader"><span>Hour</span><small>{reference.name}</small></div>
          {props.cities.map((city, index) => (
            <div className="mobile-city-header" key={city.id} role="columnheader">
              <button className="mobile-city-name" disabled={index === 0} onClick={() => props.onPromote(city.id)} type="button">
                <span>{city.name}</span>
                {index === 0 && <span className="ref-badge">REF</span>}
              </button>
              <span>{formatOffset(getOffsetMinutes(city.timezone, props.now))}</span>
              <button aria-label={`Remove ${city.name}`} className="mobile-remove" onClick={() => props.onRemove(city.id)} type="button"><CloseIcon /></button>
            </div>
          ))}
        </div>
        {HOURS.map((hour) => (
          <div className="mobile-row" key={hour} role="row">
            <div className={`mobile-hour ${hour === props.currentHour ? "current" : ""}`} role="rowheader">
              <span>{formatHour(hour, props.timeFormat)}</span>
              {hour === props.currentHour && <small>now</small>}
            </div>
            {props.cities.map((city) => {
              const local = props.localTimes.get(city.id)?.[hour];
              const awake = props.awakeFlags.get(city.id)?.[hour] ?? false;
              if (!local) return null;
              return (
                <TimeCell
                  awake={awake}
                  city={city}
                  current={hour === props.currentHour}
                  format={props.timeFormat}
                  key={`${city.id}-${hour}`}
                  local={local}
                  overlap={overlapForCity(city, hour, reference, props.mode, props.meetingFlags, props.pairFlags, props.awakeFlags)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyBoard() {
  return (
    <div className="empty-board">
      <span><PlusIcon /></span>
      <h2>Add your first city</h2>
      <p>It becomes the reference for every hour in the grid.</p>
    </div>
  );
}

export default function App() {
  const [state, setState] = usePersistentState(STORAGE_KEY, DEFAULT_STATE, validateState);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const now = useCurrentTime();
  const cities = useMemo(() => state.cityIds.map((id) => CITY_BY_ID.get(id)).filter((city): city is City => Boolean(city)), [state.cityIds]);
  const reference = cities[0];
  const instants = useMemo(() => reference ? buildReferenceInstants(reference, now) : [], [reference, now]);

  const localTimes = useMemo(() => {
    const result = new Map<string, LocalTime[]>();
    for (const city of cities) result.set(city.id, instants.map((instant) => getLocalTime(instant, city.timezone)));
    return result;
  }, [cities, instants]);

  const awakeFlags = useMemo(() => {
    const result = new Map<string, boolean[]>();
    for (const city of cities) {
      result.set(city.id, (localTimes.get(city.id) ?? []).map((local) => isAwake(local, state.wakeHour, state.sleepHour)));
    }
    return result;
  }, [cities, localTimes, state.sleepHour, state.wakeHour]);

  const meetingFlags = useMemo(() => HOURS.map((hour) => cities.length > 0 && cities.every((city) => awakeFlags.get(city.id)?.[hour])), [awakeFlags, cities]);
  const pairFlags = useMemo(() => {
    const result = new Map<string, boolean[]>();
    if (!reference) return result;
    const referenceFlags = awakeFlags.get(reference.id) ?? [];
    for (const city of cities.slice(1)) {
      const cityFlags = awakeFlags.get(city.id) ?? [];
      result.set(city.id, HOURS.map((hour) => Boolean(referenceFlags[hour] && cityFlags[hour])));
    }
    return result;
  }, [awakeFlags, cities, reference]);

  const currentHour = reference ? getLocalTime(now, reference.timezone).hour : -1;
  const update = (next: Partial<AppState>) => setState((current) => ({ ...current, ...next }));
  const removeCity = (id: string) => update({ cityIds: state.cityIds.filter((cityId) => cityId !== id) });
  const promoteCity = (id: string) => update({ cityIds: [id, ...state.cityIds.filter((cityId) => cityId !== id)] });
  const addCity = (id: string) => {
    if (!state.cityIds.includes(id)) update({ cityIds: [...state.cityIds, id] });
  };

  const boardProps: BoardProps | null = reference ? {
    cities,
    instants,
    localTimes,
    awakeFlags,
    meetingFlags,
    pairFlags,
    mode: state.mode,
    timeFormat: state.timeFormat,
    currentHour,
    now,
    onPromote: promoteCity,
    onRemove: removeCity,
  } : null;

  return (
    <main>
      <header className="app-header">
        <div className="title-block">
          <h1>GPT-5.6 Sol</h1>
          <p>{reference ? `${formatReferenceDate(reference, now)} · ${reference.name} reference` : "Choose a city to begin"}</p>
        </div>
        <button
          aria-controls="settings-panel"
          aria-expanded={settingsOpen}
          className={`button button-secondary settings-button ${settingsOpen ? "active" : ""}`}
          onClick={() => setSettingsOpen((value) => !value)}
          type="button"
        >
          <SettingsIcon />
          Availability
          <span className="awake-chip">{formatHour(state.wakeHour, state.timeFormat)} – {formatHour(state.sleepHour, state.timeFormat)}</span>
        </button>
      </header>

      {settingsOpen && (
        <SettingsPanel
          onFormatChange={(timeFormat) => update({ timeFormat })}
          onSleepChange={(sleepHour) => update({ sleepHour })}
          onWakeChange={(wakeHour) => update({ wakeHour })}
          sleepHour={state.sleepHour}
          timeFormat={state.timeFormat}
          wakeHour={state.wakeHour}
        />
      )}

      <section className="workspace-toolbar" aria-label="Schedule controls">
        <ModeSwitch mode={state.mode} onChange={(mode) => update({ mode })} />
        <CityPicker onAdd={addCity} selectedIds={state.cityIds} />
      </section>

      <OverlapSummary
        cities={cities}
        meetingFlags={meetingFlags}
        mode={state.mode}
        pairFlags={pairFlags}
        timeFormat={state.timeFormat}
      />

      {boardProps ? (
        <>
          <DesktopBoard {...boardProps} />
          <MobileBoard {...boardProps} />
        </>
      ) : <EmptyBoard />}

      <footer className="legend">
        <span><i className="legend-swatch overlap" />{state.mode === "meeting" ? "Green cells = everyone awake" : "Green cells = awake with reference"}</span>
        <span><i className="legend-swatch awake" />Awake</span>
        <span><i className="legend-swatch sleeping" />Sleeping</span>
        {cities.length > 1 && <small>Click a city name to make it the reference</small>}
      </footer>
    </main>
  );
}
