"use client";

import { useEffect, useState } from "react";
import { AddCityCombobox } from "@/components/add-city-combobox";
import { DesktopGrid } from "@/components/desktop-grid";
import { MobileGrid } from "@/components/mobile-grid";
import { SettingsPanel } from "@/components/settings-panel";
import { SummaryPanel } from "@/components/summary-panel";
import { CITY_CATALOG, CITY_INDEX, DEFAULT_CITY_IDS } from "@/lib/city-catalog";
import {
  buildCityRows,
  buildMeetingSummary,
  buildPerCitySummary,
  sanitizeState,
} from "@/lib/timezone";
import type { AppMode, AppState, TimeFormat } from "@/lib/types";

const STORAGE_KEY = "gpt5-timezone-checker-state";

const DEFAULT_STATE: AppState = {
  cityIds: DEFAULT_CITY_IDS,
  mode: "meeting",
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: "12h",
};

function loadInitialState(): AppState {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_STATE;
    }

    const parsed = JSON.parse(raw) as Partial<AppState>;
    return sanitizeState(parsed, DEFAULT_STATE);
  } catch {
    return DEFAULT_STATE;
  }
}

export function TimezoneChecker() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setState(loadInitialState());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [isHydrated, state]);

  const selectedCities = state.cityIds.map((id) => CITY_INDEX[id]).filter(Boolean);
  const referenceCity = selectedCities[0];
  const cityRows = referenceCity
    ? buildCityRows(selectedCities, state.mode, state.wakeHour, state.sleepHour, state.timeFormat)
    : [];
  const meetingSummary = referenceCity
    ? buildMeetingSummary(selectedCities, state.wakeHour, state.sleepHour, state.timeFormat)
    : null;
  const perCitySummary = referenceCity
    ? buildPerCitySummary(selectedCities, state.wakeHour, state.sleepHour, state.timeFormat)
    : [];
  const availableCityIds = new Set(state.cityIds);

  function updateMode(mode: AppMode) {
    setState((current) => ({ ...current, mode }));
  }

  function updateWakeHour(wakeHour: number) {
    setState((current) => ({ ...current, wakeHour }));
  }

  function updateSleepHour(sleepHour: number) {
    setState((current) => ({ ...current, sleepHour }));
  }

  function updateTimeFormat(timeFormat: TimeFormat) {
    setState((current) => ({ ...current, timeFormat }));
  }

  function addCity(cityId: string) {
    if (availableCityIds.has(cityId)) {
      return;
    }

    setState((current) => ({
      ...current,
      cityIds: [...current.cityIds, cityId],
    }));
  }

  function removeCity(cityId: string) {
    if (state.cityIds.length === 1) {
      return;
    }

    setState((current) => ({
      ...current,
      cityIds: current.cityIds.filter((id) => id !== cityId),
    }));
  }

  function promoteCity(cityId: string) {
    if (state.cityIds[0] === cityId) {
      return;
    }

    setState((current) => ({
      ...current,
      cityIds: [cityId, ...current.cityIds.filter((id) => id !== cityId)],
    }));
  }

  return (
    <main className="page-shell">
      <div className="page-backdrop" />
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Timezone Overlap Checker</p>
          <h1>GPT-5</h1>
          <p className="hero-text">
            Compare common working windows across a distributed team, anchored to one reference
            city.
          </p>
        </div>
        <div className="hero-meta">
          <div className="metric-card">
            <span className="metric-label">Mode</span>
            <strong>{state.mode === "meeting" ? "Meeting" : "Base"}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Cities</span>
            <strong>{selectedCities.length}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Awake Window</span>
            <strong>
              {state.wakeHour}:00 to {state.sleepHour}:00
            </strong>
          </div>
        </div>
      </section>

      <section className="control-strip">
        <AddCityCombobox
          cities={CITY_CATALOG}
          onAddCity={addCity}
          selectedCityIds={availableCityIds}
        />
        <SettingsPanel
          mode={state.mode}
          wakeHour={state.wakeHour}
          sleepHour={state.sleepHour}
          timeFormat={state.timeFormat}
          onModeChange={updateMode}
          onWakeHourChange={updateWakeHour}
          onSleepHourChange={updateSleepHour}
          onTimeFormatChange={updateTimeFormat}
        />
      </section>

      {selectedCities.length >= 2 && referenceCity ? (
        <SummaryPanel
          mode={state.mode}
          referenceCity={referenceCity}
          meetingSummary={meetingSummary}
          perCitySummary={perCitySummary}
        />
      ) : null}

      <section className="legend-row" aria-label="Legend">
        <div className="legend-item">
          <span className="legend-swatch legend-swatch-sleeping" />
          Sleeping
        </div>
        <div className="legend-item">
          <span className="legend-swatch legend-swatch-awake" />
          Awake
        </div>
        <div className="legend-item">
          <span className="legend-swatch legend-swatch-overlap" />
          Overlap
        </div>
      </section>

      <DesktopGrid
        rows={cityRows}
        canRemove={selectedCities.length > 1}
        onPromoteCity={promoteCity}
        onRemoveCity={removeCity}
      />

      <MobileGrid
        rows={cityRows}
        canRemove={selectedCities.length > 1}
        onPromoteCity={promoteCity}
        onRemoveCity={removeCity}
      />

      <p className="footer-hint">
        {state.mode === "meeting"
          ? "Green cells = everyone awake"
          : "Green cells = the reference city and that city are both awake"}
      </p>
    </main>
  );
}
