"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { CITY_CATALOG, CITY_LOOKUP, DEFAULT_CITY_IDS, type CityOption } from "@/data/cities";
import {
  STORAGE_KEY,
  buildCityCells,
  buildReferenceHours,
  collectRanges,
  formatCurrentTime,
  formatHourLabel,
  formatHourRange,
  formatOffset,
  type AppMode,
  type PersistedState,
  type TimeFormat,
} from "@/lib/timezone";
import styles from "./timezone-checker.module.css";

type CityRow = {
  city: CityOption;
  currentTime: string;
  offsetLabel: string;
  overlapCount: number;
  overlapHours: boolean[];
  cells: ReturnType<typeof buildCityCells>;
};

type BaseSummaryItem = {
  city: CityOption;
  overlapCount: number;
  ranges: Array<{ start: number; end: number }>;
};

const DEFAULT_STATE: PersistedState = {
  cityIds: [...DEFAULT_CITY_IDS],
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: 12,
  mode: "meeting",
};

const EMPTY_HOURS = Array.from({ length: 24 }, () => false);

export default function TimezoneChecker() {
  const [initialState] = useState<PersistedState>(() => getInitialState());
  const [cityIds, setCityIds] = useState<string[]>(initialState.cityIds);
  const [wakeHour, setWakeHour] = useState(initialState.wakeHour);
  const [sleepHour, setSleepHour] = useState(initialState.sleepHour);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(initialState.timeFormat);
  const [mode, setMode] = useState<AppMode>(initialState.mode);
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [now, setNow] = useState(() => DateTime.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(DateTime.now());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const stateToPersist: PersistedState = {
      cityIds,
      wakeHour,
      sleepHour,
      timeFormat,
      mode,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersist));
  }, [cityIds, wakeHour, sleepHour, timeFormat, mode]);

  const selectedCities = useMemo(
    () => cityIds.map((id) => CITY_LOOKUP.get(id)).filter((city): city is CityOption => Boolean(city)),
    [cityIds],
  );

  const availableCities = useMemo(() => {
    const selectedIds = new Set(cityIds);
    const normalizedQuery = query.trim().toLowerCase();

    return CITY_CATALOG.filter((city) => {
      if (selectedIds.has(city.id)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return `${city.name} ${city.country} ${city.region}`.toLowerCase().includes(normalizedQuery);
    });
  }, [cityIds, query]);

  const derived = useMemo(() => {
    if (selectedCities.length === 0) {
      return null;
    }

    const referenceCity = selectedCities[0];
    const cityCellsById = new Map(
      selectedCities.map((city) => [
        city.id,
        buildCityCells(referenceCity.zone, city.zone, now, wakeHour, sleepHour, timeFormat),
      ]),
    );

    const referenceCells = cityCellsById.get(referenceCity.id) ?? [];
    const referenceHours = buildReferenceHours(referenceCity.zone, now);

    const meetingOverlap = referenceHours.map((_, hourIndex) =>
      selectedCities.every((city) => cityCellsById.get(city.id)?.[hourIndex]?.isAwake),
    );

    const baseOverlapByCity = new Map(
      selectedCities.slice(1).map((city) => [
        city.id,
        referenceHours.map((_, hourIndex) => {
          const referenceIsAwake = referenceCells[hourIndex]?.isAwake ?? false;
          const cityIsAwake = cityCellsById.get(city.id)?.[hourIndex]?.isAwake ?? false;
          return referenceIsAwake && cityIsAwake;
        }),
      ]),
    );

    const baseReferenceOverlap = referenceHours.map((_, hourIndex) =>
      selectedCities.slice(1).some((city) => baseOverlapByCity.get(city.id)?.[hourIndex]),
    );

    const rows: CityRow[] = selectedCities.map((city) => {
      const cells = cityCellsById.get(city.id) ?? [];
      const overlapHours =
        mode === "meeting"
          ? meetingOverlap
          : city.id === referenceCity.id
            ? baseReferenceOverlap
            : baseOverlapByCity.get(city.id) ?? EMPTY_HOURS;

      return {
        city,
        currentTime: formatCurrentTime(city.zone, now, timeFormat),
        offsetLabel: formatOffset(now.setZone(city.zone).offset),
        overlapCount: overlapHours.filter(Boolean).length,
        overlapHours,
        cells,
      };
    });

    const meetingRanges = collectRanges(meetingOverlap);
    const baseSummaries: BaseSummaryItem[] = selectedCities.slice(1).map((city) => {
      const overlapHours = baseOverlapByCity.get(city.id) ?? EMPTY_HOURS;

      return {
        city,
        overlapCount: overlapHours.filter(Boolean).length,
        ranges: collectRanges(overlapHours),
      };
    });

    return {
      referenceCity,
      referenceHours,
      rows,
      meetingOverlap,
      meetingRanges,
      baseSummaries,
      referenceDateLabel: now.setZone(referenceCity.zone).toFormat("cccc, d LLLL"),
    };
  }, [mode, now, selectedCities, sleepHour, timeFormat, wakeHour]);

  const hintText =
    mode === "meeting"
      ? "Green cells = everyone awake"
      : "Green cells = the reference city and that city are both awake";

  const addCity = (cityId: string) => {
    setCityIds((currentIds) => {
      if (currentIds.includes(cityId)) {
        return currentIds;
      }

      return [...currentIds, cityId];
    });
    setQuery("");
    setPickerOpen(false);
  };

  const removeCity = (cityId: string) => {
    setCityIds((currentIds) => currentIds.filter((id) => id !== cityId));
  };

  const promoteCity = (cityId: string) => {
    setCityIds((currentIds) => [cityId, ...currentIds.filter((id) => id !== cityId)]);
  };

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Timezone overlap checker</p>
          <h1>GPT-5.4</h1>
          <p className={styles.lead}>
            Compare shared waking hours across a distributed team, anchored to one reference city so meeting
            windows stay obvious at a glance.
          </p>
        </div>

        <div className={styles.heroMeta}>
          <span>{selectedCities.length} cities</span>
          <span>{mode === "meeting" ? "Meeting mode" : "Base mode"}</span>
          {derived ? <span>{derived.referenceDateLabel}</span> : null}
        </div>
      </section>

      <section className={styles.controls}>
        <div className={styles.controlBlock}>
          <span className={styles.controlLabel}>Mode</span>
          <div className={styles.segmented}>
            <button
              className={mode === "meeting" ? styles.segmentedActive : styles.segmentedButton}
              onClick={() => setMode("meeting")}
              type="button"
            >
              Meeting
            </button>
            <button
              className={mode === "base" ? styles.segmentedActive : styles.segmentedButton}
              onClick={() => setMode("base")}
              type="button"
            >
              Base
            </button>
          </div>
        </div>

        <div className={styles.controlBlock}>
          <span className={styles.controlLabel}>Wake</span>
          <select
            className={styles.select}
            onChange={(event) => setWakeHour(Number(event.target.value))}
            value={wakeHour}
          >
            {Array.from({ length: 24 }, (_, hour) => (
              <option key={`wake-${hour}`} value={hour}>
                {formatHourLabel(hour, timeFormat)}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.controlBlock}>
          <span className={styles.controlLabel}>Sleep</span>
          <select
            className={styles.select}
            onChange={(event) => setSleepHour(Number(event.target.value))}
            value={sleepHour}
          >
            {Array.from({ length: 24 }, (_, hour) => (
              <option key={`sleep-${hour}`} value={hour}>
                {formatHourLabel(hour, timeFormat)}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.controlBlock}>
          <span className={styles.controlLabel}>Time format</span>
          <div className={styles.segmented}>
            <button
              className={timeFormat === 12 ? styles.segmentedActive : styles.segmentedButton}
              onClick={() => setTimeFormat(12)}
              type="button"
            >
              12h
            </button>
            <button
              className={timeFormat === 24 ? styles.segmentedActive : styles.segmentedButton}
              onClick={() => setTimeFormat(24)}
              type="button"
            >
              24h
            </button>
          </div>
        </div>

        <div className={styles.controlBlockGrow}>
          <span className={styles.controlLabel}>Cities</span>
          <div className={styles.cityPicker}>
            <button className={styles.addButton} onClick={() => setPickerOpen((open) => !open)} type="button">
              Add city
            </button>

            {pickerOpen ? (
              <div className={styles.pickerPopover}>
                <input
                  autoFocus
                  className={styles.searchInput}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search city or country"
                  value={query}
                />

                <div className={styles.searchResults}>
                  {availableCities.length > 0 ? (
                    availableCities.map((city) => (
                      <button
                        className={styles.searchResult}
                        key={city.id}
                        onClick={() => addCity(city.id)}
                        type="button"
                      >
                        <span>{city.name}</span>
                        <small>
                          {city.country} · {city.region}
                        </small>
                      </button>
                    ))
                  ) : (
                    <p className={styles.emptySearch}>No matching cities left in the catalog.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {derived && selectedCities.length >= 2 ? (
        <section className={styles.summaryCard}>
          <div className={styles.summaryHeader}>
            <div>
              <p className={styles.summaryEyebrow}>Overlap summary</p>
              <h2>
                {mode === "meeting"
                  ? `Shared availability in ${derived.referenceCity.name}`
                  : `Base city: ${derived.referenceCity.name}`}
              </h2>
            </div>
            <span className={styles.referencePill}>{derived.referenceCity.name} reference time</span>
          </div>

          {mode === "meeting" ? (
            <div className={styles.summaryLine}>
              <span className={styles.summaryMetric}>
                {derived.meetingOverlap.filter(Boolean).length} {pluralizeHour(derived.meetingOverlap.filter(Boolean).length)}
              </span>
              {derived.meetingRanges.length > 0 ? (
                <div className={styles.rangeList}>
                  {derived.meetingRanges.map((range) => (
                    <span className={styles.rangeBadge} key={`${range.start}-${range.end}`}>
                      {formatHourRange(range.start, range.end, timeFormat)}
                    </span>
                  ))}
                </div>
              ) : (
                <span className={styles.warning}>No shared awake window across all selected cities.</span>
              )}
            </div>
          ) : (
            <div className={styles.baseSummaryList}>
              {derived.baseSummaries.map((item) => (
                <div className={styles.summaryLine} key={item.city.id}>
                  <span className={styles.summaryMetric}>
                    {item.city.name}: {item.overlapCount} {pluralizeHour(item.overlapCount)}
                  </span>
                  {item.ranges.length > 0 ? (
                    <div className={styles.rangeList}>
                      {item.ranges.map((range) => (
                        <span className={styles.rangeBadge} key={`${item.city.id}-${range.start}-${range.end}`}>
                          {formatHourRange(range.start, range.end, timeFormat)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className={styles.warning}>No overlap with {derived.referenceCity.name}.</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className={styles.matrixPanel}>
        <div className={styles.matrixIntro}>
          <div>
            <p className={styles.summaryEyebrow}>Reference city</p>
            <h2>{derived ? derived.referenceCity.name : "Add a city to begin"}</h2>
          </div>
          <p className={styles.matrixCopy}>
            Each column is one hour in the reference city. Each cell shows the local time in that city at that exact
            moment.
          </p>
        </div>

        {derived ? (
          <>
            <div className={styles.desktopMatrix} role="table" aria-label="Timezone overlap grid">
              <div className={styles.desktopHeaderSpacer}>Cities</div>
              {derived.referenceHours.map((_, hour) => (
                <div className={styles.hourHeader} key={`desktop-hour-${hour}`}>
                  {formatHourLabel(hour, timeFormat)}
                </div>
              ))}
              <div className={styles.desktopHeaderSpacer}> </div>

              {derived.rows.map((row, rowIndex) => (
                <div className={styles.desktopRow} key={row.city.id}>
                  <button
                    className={styles.cityCard}
                    onClick={() => promoteCity(row.city.id)}
                    type="button"
                  >
                    <span className={styles.cityTitleRow}>
                      <span className={styles.cityName}>{row.city.name}</span>
                      {rowIndex === 0 ? <span className={styles.refBadge}>REF</span> : null}
                    </span>
                    <span className={styles.cityMeta}>
                      {row.city.country} · {row.offsetLabel}
                    </span>
                    <span className={styles.cityMeta}>Now {row.currentTime}</span>
                  </button>

                  {row.cells.map((cell) => (
                    <div
                      className={getCellClassName({
                        awake: cell.isAwake,
                        overlap: row.overlapHours[cell.referenceHour],
                        styles,
                      })}
                      key={`${row.city.id}-${cell.referenceHour}`}
                    >
                      <span>{cell.localLabel}</span>
                      {cell.dayOffset !== 0 ? (
                        <small>{cell.dayOffset > 0 ? `+${cell.dayOffset}` : cell.dayOffset}</small>
                      ) : null}
                    </div>
                  ))}

                  <button
                    aria-label={`Remove ${row.city.name}`}
                    className={styles.removeButton}
                    onClick={() => removeCity(row.city.id)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div
              className={styles.mobileMatrix}
              role="table"
              aria-label="Timezone overlap grid mobile"
              style={{ gridTemplateColumns: `4rem repeat(${derived.rows.length}, minmax(8.25rem, 1fr))` }}
            >
              <div className={styles.mobileCorner}>Ref</div>
              {derived.rows.map((row, rowIndex) => (
                <div className={styles.mobileCityHeader} key={`mobile-header-${row.city.id}`}>
                  <button className={styles.mobileCityButton} onClick={() => promoteCity(row.city.id)} type="button">
                    <span>{row.city.name}</span>
                    {rowIndex === 0 ? <span className={styles.refBadge}>REF</span> : null}
                  </button>
                  <small>
                    {row.offsetLabel} · {row.currentTime}
                  </small>
                  <button
                    aria-label={`Remove ${row.city.name}`}
                    className={styles.mobileRemoveButton}
                    onClick={() => removeCity(row.city.id)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))}

              {derived.referenceHours.map((_, hour) => (
                <FragmentHourRow
                  hour={hour}
                  key={`mobile-row-${hour}`}
                  rows={derived.rows}
                  timeFormat={timeFormat}
                />
              ))}
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <p>No cities selected yet.</p>
            <p>Add at least one city from the catalog to render the reference grid.</p>
          </div>
        )}
      </section>

      <footer className={styles.footerNote}>{hintText}</footer>
    </main>
  );
}

function FragmentHourRow({
  hour,
  rows,
  timeFormat,
}: {
  hour: number;
  rows: CityRow[];
  timeFormat: TimeFormat;
}) {
  return (
    <>
      <div className={styles.mobileHourHeader}>{formatHourLabel(hour, timeFormat)}</div>
      {rows.map((row) => {
        const cell = row.cells[hour];

        return (
          <div
            className={getCellClassName({
              awake: cell.isAwake,
              overlap: row.overlapHours[hour],
              styles,
            })}
            key={`mobile-cell-${row.city.id}-${hour}`}
          >
            <span>{cell.localLabel}</span>
            {cell.dayOffset !== 0 ? <small>{cell.dayOffset > 0 ? `+${cell.dayOffset}` : cell.dayOffset}</small> : null}
          </div>
        );
      })}
    </>
  );
}

function normalizeState(value: unknown): PersistedState {
  const candidate = (value ?? {}) as Partial<PersistedState>;
  const uniqueCityIds = Array.isArray(candidate.cityIds)
    ? Array.from(new Set(candidate.cityIds.filter((id): id is string => typeof id === "string")))
        .filter((id) => CITY_LOOKUP.has(id))
    : [...DEFAULT_CITY_IDS];

  return {
    cityIds: uniqueCityIds.length > 0 ? uniqueCityIds : [...DEFAULT_CITY_IDS],
    wakeHour: normalizeHour(candidate.wakeHour, DEFAULT_STATE.wakeHour),
    sleepHour: normalizeHour(candidate.sleepHour, DEFAULT_STATE.sleepHour),
    timeFormat: candidate.timeFormat === 24 ? 24 : 12,
    mode: candidate.mode === "base" ? "base" : "meeting",
  };
}

function getInitialState(): PersistedState {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }

  const rawState = window.localStorage.getItem(STORAGE_KEY);

  if (!rawState) {
    return DEFAULT_STATE;
  }

  try {
    return normalizeState(JSON.parse(rawState));
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return DEFAULT_STATE;
  }
}

function normalizeHour(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23 ? value : fallback;
}

function pluralizeHour(count: number): string {
  return count === 1 ? "hour" : "hours";
}

function getCellClassName({
  awake,
  overlap,
  styles,
}: {
  awake: boolean;
  overlap: boolean;
  styles: Record<string, string>;
}) {
  if (overlap) {
    return `${styles.cell} ${styles.cellOverlap}`;
  }

  if (awake) {
    return `${styles.cell} ${styles.cellAwake}`;
  }

  return `${styles.cell} ${styles.cellSleeping}`;
}
