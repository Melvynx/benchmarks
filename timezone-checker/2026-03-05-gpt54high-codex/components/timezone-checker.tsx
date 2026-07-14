"use client";

import { useEffect, useMemo, useState } from "react";

import CityPicker from "@/components/city-picker";
import TimezoneGrid from "@/components/timezone-grid";
import { CITY_CATALOG, CITY_MAP, DEFAULT_CITY_IDS } from "@/lib/city-catalog";
import type { AppMode, TimeFormat } from "@/lib/timezone";
import {
  buildReferenceInstants,
  formatCellTime,
  formatReferenceDate,
  getLocalTimeParts,
  getUtcOffsetLabel,
  isAwakeAtLocalTime,
} from "@/lib/timezone";

type PersistedState = {
  cityIds: string[];
  mode: AppMode;
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
};

const STORAGE_KEY = "gpt5-timezone-checker:v1";

const DEFAULT_STATE: PersistedState = {
  cityIds: DEFAULT_CITY_IDS,
  mode: "meeting",
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: "12h",
};

function loadInitialState(): PersistedState {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return DEFAULT_STATE;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const cityIds =
      parsed.cityIds?.filter((cityId): cityId is string => CITY_MAP.has(cityId)) ??
      DEFAULT_STATE.cityIds;

    return {
      cityIds: cityIds.length > 0 ? Array.from(new Set(cityIds)) : DEFAULT_STATE.cityIds,
      mode: parsed.mode === "base" ? "base" : DEFAULT_STATE.mode,
      wakeHour:
        typeof parsed.wakeHour === "number" && parsed.wakeHour >= 0 && parsed.wakeHour <= 23
          ? parsed.wakeHour
          : DEFAULT_STATE.wakeHour,
      sleepHour:
        typeof parsed.sleepHour === "number" && parsed.sleepHour >= 0 && parsed.sleepHour <= 23
          ? parsed.sleepHour
          : DEFAULT_STATE.sleepHour,
      timeFormat: parsed.timeFormat === "24h" ? "24h" : DEFAULT_STATE.timeFormat,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);

export default function TimezoneChecker() {
  const [state, setState] = useState<PersistedState>(loadInitialState);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const cities = useMemo(
    () =>
      state.cityIds
        .map((cityId) => CITY_MAP.get(cityId))
        .filter((city): city is NonNullable<typeof city> => Boolean(city)),
    [state.cityIds],
  );

  const referenceCity = cities[0];

  const availableCities = useMemo(
    () => CITY_CATALOG.filter((city) => !state.cityIds.includes(city.id)),
    [state.cityIds],
  );

  const boardData = useMemo(() => {
    if (!referenceCity) {
      return [];
    }

    const referenceSlots = buildReferenceInstants(now, referenceCity);
    const awakeByCityId: Record<string, boolean[]> = {};
    const localLabelsByCityId: Record<string, string[]> = {};

    cities.forEach((city) => {
      awakeByCityId[city.id] = [];
      localLabelsByCityId[city.id] = [];

      referenceSlots.forEach((slot) => {
        const localTime = getLocalTimeParts(slot.instant, city.timeZone);
        awakeByCityId[city.id].push(
          isAwakeAtLocalTime(localTime, state.wakeHour, state.sleepHour),
        );
        localLabelsByCityId[city.id].push(formatCellTime(localTime, state.timeFormat));
      });
    });

    const referenceAwake = awakeByCityId[referenceCity.id] ?? Array(24).fill(false);
    const meetingOverlap = referenceSlots.map((_, index) =>
      cities.every((city) => awakeByCityId[city.id]?.[index]),
    );
    const baseOverlap: Record<string, boolean[]> = {};

    cities.slice(1).forEach((city) => {
      baseOverlap[city.id] = referenceSlots.map(
        (_, index) => referenceAwake[index] && awakeByCityId[city.id]?.[index],
      );
    });

    const referenceBaseOverlap = referenceSlots.map((_, index) =>
      Object.values(baseOverlap).some((hours) => hours[index]),
    );

    return cities.map((city, cityIndex) => ({
      city,
      offsetLabel: getUtcOffsetLabel(now, city.timeZone),
      cells: referenceSlots.map((_, index) => {
        const awake = awakeByCityId[city.id]?.[index] ?? false;
        const overlap =
          state.mode === "meeting"
            ? meetingOverlap[index]
            : cityIndex === 0
              ? referenceBaseOverlap[index]
              : (baseOverlap[city.id]?.[index] ?? false);

        return {
          label: localLabelsByCityId[city.id]?.[index] ?? "",
          awake,
          overlap,
        };
      }),
    }));
  }, [cities, now, referenceCity, state.mode, state.timeFormat, state.wakeHour, state.sleepHour]);

  function addCity(cityId: string) {
    setState((current) => ({
      ...current,
      cityIds: current.cityIds.includes(cityId)
        ? current.cityIds
        : [...current.cityIds, cityId],
    }));
  }

  function removeCity(cityId: string) {
    setState((current) => {
      if (current.cityIds.length === 1) {
        return current;
      }

      return {
        ...current,
        cityIds: current.cityIds.filter((id) => id !== cityId),
      };
    });
  }

  function promoteCity(cityId: string) {
    setState((current) => {
      if (current.cityIds[0] === cityId) {
        return current;
      }

      return {
        ...current,
        cityIds: [cityId, ...current.cityIds.filter((id) => id !== cityId)],
      };
    });
  }

  if (!referenceCity) {
    return null;
  }

  const hintText =
    state.mode === "meeting"
      ? "Green cells = everyone awake"
      : "Green cells = awake overlap with the reference city";

  return (
    <main className="page-shell">
      <div className="page-shell__backdrop" />
      <section className="hero-card">
        <div className="hero-card__headline">
          <p className="eyebrow">Remote schedule atlas</p>
          <h1>GPT 5.4</h1>
          <p className="hero-copy">
            Compare distributed schedules against a single reference day and surface
            meeting windows before the chat thread turns into arithmetic.
          </p>
        </div>
        <div className="hero-card__stats">
          <div className="hero-stat">
            <span className="hero-stat__label">Reference city</span>
            <strong>{referenceCity.city}</strong>
          </div>
          <div className="hero-stat">
            <span className="hero-stat__label">Cities</span>
            <strong>{cities.length}</strong>
          </div>
          <div className="hero-stat">
            <span className="hero-stat__label">Awake window</span>
            <strong>
              {state.wakeHour}:00 → {state.sleepHour}:00
            </strong>
          </div>
        </div>
      </section>

      <section className="control-grid">
        <div className="control-card">
          <p className="eyebrow">Mode</p>
          <div className="segmented-control" role="tablist" aria-label="Overlap mode">
            <button
              className={state.mode === "meeting" ? "segment segment--active" : "segment"}
              type="button"
              onClick={() => setState((current) => ({ ...current, mode: "meeting" }))}
            >
              Meeting Mode
            </button>
            <button
              className={state.mode === "base" ? "segment segment--active" : "segment"}
              type="button"
              onClick={() => setState((current) => ({ ...current, mode: "base" }))}
            >
              Base Mode
            </button>
          </div>
          <p className="control-card__copy">
            {state.mode === "meeting"
              ? "One shared overlap window across the whole group."
              : "Each non-reference city gets its own overlap against the first row."}
          </p>
        </div>

        <div className="control-card">
          <p className="eyebrow">Availability</p>
          <div className="settings-grid">
            <label className="field">
              <span className="field-label">Wake-up hour</span>
              <select
                className="select-field"
                value={state.wakeHour}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    wakeHour: Number(event.target.value),
                  }))
                }
              >
                {HOUR_OPTIONS.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour.toString().padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Sleep hour</span>
              <select
                className="select-field"
                value={state.sleepHour}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    sleepHour: Number(event.target.value),
                  }))
                }
              >
                {HOUR_OPTIONS.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour.toString().padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Time format</span>
              <select
                className="select-field"
                value={state.timeFormat}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    timeFormat: event.target.value as TimeFormat,
                  }))
                }
              >
                <option value="12h">12-hour</option>
                <option value="24h">24-hour</option>
              </select>
            </label>
          </div>
          <p className="control-card__copy">
            Overnight schedules are supported. Matching wake and sleep hours means
            always awake.
          </p>
        </div>

        <div className="control-card">
          <CityPicker availableCities={availableCities} onAddCity={addCity} />
          <p className="control-card__copy">
            Pick from a curated list of cities spanning all major regions. Duplicates
            are blocked automatically.
          </p>
        </div>
      </section>

      <TimezoneGrid
        cities={boardData}
        mode={state.mode}
        timeFormat={state.timeFormat}
        referenceDateLabel={formatReferenceDate(now, referenceCity.timeZone)}
        referenceCityName={referenceCity.city}
        onPromoteCity={promoteCity}
        onRemoveCity={removeCity}
      />

      <p className="legend-note">{hintText}</p>
    </main>
  );
}
