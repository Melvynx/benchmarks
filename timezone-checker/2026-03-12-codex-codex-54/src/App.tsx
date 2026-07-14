import { useEffect, useState } from 'react'

import { CityPicker } from './components/CityPicker'
import { DesktopBoard } from './components/DesktopBoard'
import { MobileBoard } from './components/MobileBoard'
import { OverlapSummary } from './components/OverlapSummary'
import { SettingsPanel } from './components/SettingsPanel'
import { CITY_LOOKUP } from './data/cities'
import {
  buildReferenceTimeline,
  compressOverlapWindows,
  countActiveHours,
  formatHourBoundary,
  formatOffsetLabel,
  formatReferenceDate,
  getTimeZoneOffsetMinutes,
  getZonedParts,
  isHourAwake,
} from './lib/timezone'
import type { AppState, CityRow, SummaryLine } from './lib/types'

const MODEL_NAME = 'GPT-5 Codex'
const STORAGE_KEY = 'gpt-5-codex-timezone-checker:v1'

const DEFAULT_STATE: AppState = {
  selectedCityIds: ['san-francisco', 'denpasar', 'geneva'],
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: 12,
  mode: 'meeting',
}

function sanitizeState(candidate: unknown): AppState {
  if (!candidate || typeof candidate !== 'object') {
    return DEFAULT_STATE
  }

  const maybeState = candidate as Partial<AppState>
  const selectedCityIds = Array.isArray(maybeState.selectedCityIds)
    ? maybeState.selectedCityIds
        .filter((cityId): cityId is string => typeof cityId === 'string')
        .filter((cityId, index, collection) => collection.indexOf(cityId) === index)
        .filter((cityId) => cityId in CITY_LOOKUP)
    : DEFAULT_STATE.selectedCityIds

  const wakeHour =
    typeof maybeState.wakeHour === 'number' &&
    Number.isInteger(maybeState.wakeHour) &&
    maybeState.wakeHour >= 0 &&
    maybeState.wakeHour <= 23
      ? maybeState.wakeHour
      : DEFAULT_STATE.wakeHour

  const sleepHour =
    typeof maybeState.sleepHour === 'number' &&
    Number.isInteger(maybeState.sleepHour) &&
    maybeState.sleepHour >= 0 &&
    maybeState.sleepHour <= 23
      ? maybeState.sleepHour
      : DEFAULT_STATE.sleepHour

  const timeFormat =
    maybeState.timeFormat === 12 || maybeState.timeFormat === 24
      ? maybeState.timeFormat
      : DEFAULT_STATE.timeFormat

  const mode =
    maybeState.mode === 'meeting' || maybeState.mode === 'base'
      ? maybeState.mode
      : DEFAULT_STATE.mode

  return {
    selectedCityIds:
      selectedCityIds.length > 0 ? selectedCityIds : DEFAULT_STATE.selectedCityIds,
    wakeHour,
    sleepHour,
    timeFormat,
    mode,
  }
}

function readInitialState() {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY)

  if (!storedValue) {
    return DEFAULT_STATE
  }

  try {
    return sanitizeState(JSON.parse(storedValue))
  } catch {
    return DEFAULT_STATE
  }
}

function App() {
  const [state, setState] = useState<AppState>(() => readInitialState())

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const selectedCities = state.selectedCityIds
    .map((cityId) => CITY_LOOKUP[cityId])
    .filter(Boolean)

  const referenceCity = selectedCities[0]

  if (!referenceCity) {
    return null
  }

  const referenceTimeline = buildReferenceTimeline(referenceCity.timeZone)
  const now = new Date()

  const baseRows = selectedCities.map((city) => ({
    city,
    isReference: city.id === referenceCity.id,
    offsetLabel: formatOffsetLabel(getTimeZoneOffsetMinutes(city.timeZone, now)),
    cells: referenceTimeline.map((slot) => {
      const localTime = getZonedParts(slot.instant, city.timeZone)
      const isAwake = isHourAwake(
        localTime.hour,
        state.wakeHour,
        state.sleepHour,
      )

      return {
        referenceHour: slot.referenceHour,
        localHour: localTime.hour,
        isAwake,
        isOverlap: false,
      }
    }),
  }))

  const referenceRow = baseRows[0]
  const meetingFlags = referenceTimeline.map((_, index) =>
    baseRows.every((row) => row.cells[index].isAwake),
  )

  const pairwiseFlags = Object.fromEntries(
    baseRows.map((row, rowIndex) => {
      if (rowIndex === 0) {
        return [row.city.id, referenceTimeline.map(() => false)]
      }

      const flags = referenceTimeline.map(
        (_, index) =>
          referenceRow.cells[index].isAwake && row.cells[index].isAwake,
      )

      return [row.city.id, flags]
    }),
  ) as Record<string, boolean[]>

  const referenceBaseFlags =
    baseRows.length === 1
      ? referenceRow.cells.map((cell) => cell.isAwake)
      : referenceTimeline.map((_, index) =>
          baseRows.slice(1).some((row) => pairwiseFlags[row.city.id][index]),
        )

  const rows: CityRow[] = baseRows.map((row, rowIndex) => ({
    ...row,
    cells: row.cells.map((cell, index) => {
      const overlap =
        state.mode === 'meeting'
          ? meetingFlags[index]
          : rowIndex === 0
            ? referenceBaseFlags[index]
            : pairwiseFlags[row.city.id][index]

      return {
        ...cell,
        isOverlap: overlap && cell.isAwake,
      }
    }),
  }))

  const meetingSummary: SummaryLine = {
    count: countActiveHours(meetingFlags),
    windows: compressOverlapWindows(meetingFlags),
  }

  const baseSummaries: SummaryLine[] = rows
    .filter((row) => !row.isReference)
    .map((row) => {
      const flags = pairwiseFlags[row.city.id]

      return {
        city: row.city,
        count: countActiveHours(flags),
        windows: compressOverlapWindows(flags),
      }
    })

  const referenceDateLabel = formatReferenceDate(referenceCity.timeZone)
  const hint =
    state.mode === 'meeting'
      ? 'Green cells = everyone awake'
      : 'Green cells = reference + that city awake'

  function updateState(patch: Partial<AppState>) {
    setState((currentState) => ({ ...currentState, ...patch }))
  }

  function addCity(cityId: string) {
    setState((currentState) => {
      if (currentState.selectedCityIds.includes(cityId)) {
        return currentState
      }

      return {
        ...currentState,
        selectedCityIds: [...currentState.selectedCityIds, cityId],
      }
    })
  }

  function promoteCity(cityId: string) {
    setState((currentState) => {
      if (currentState.selectedCityIds[0] === cityId) {
        return currentState
      }

      return {
        ...currentState,
        selectedCityIds: [
          cityId,
          ...currentState.selectedCityIds.filter((id) => id !== cityId),
        ],
      }
    })
  }

  function removeCity(cityId: string) {
    setState((currentState) => {
      if (currentState.selectedCityIds.length === 1) {
        return currentState
      }

      return {
        ...currentState,
        selectedCityIds: currentState.selectedCityIds.filter((id) => id !== cityId),
      }
    })
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero__copy">
          <p className="hero__eyebrow">Reference-first timezone coordination</p>
          <h1>{MODEL_NAME}</h1>
          <p className="hero__lede">
            Compare distributed schedules against a single anchor city, reveal
            overlap instantly, and keep the board stable through daylight saving
            changes and fractional offsets.
          </p>
        </div>

        <div className="hero__meta">
          <div>
            <span>Reference city</span>
            <strong>{referenceCity.name}</strong>
          </div>
          <div>
            <span>Reference date</span>
            <strong>{referenceDateLabel}</strong>
          </div>
          <div>
            <span>Awake window</span>
            <strong>
              {formatHourBoundary(state.wakeHour, state.timeFormat)} →{' '}
              {formatHourBoundary(state.sleepHour, state.timeFormat)}
            </strong>
          </div>
        </div>
      </section>

      <section className="controls-grid">
        <CityPicker
          selectedCityIds={state.selectedCityIds}
          onAddCity={addCity}
        />

        <SettingsPanel
          mode={state.mode}
          wakeHour={state.wakeHour}
          sleepHour={state.sleepHour}
          timeFormat={state.timeFormat}
          onModeChange={(mode) => updateState({ mode })}
          onWakeHourChange={(wakeHour) => updateState({ wakeHour })}
          onSleepHourChange={(sleepHour) => updateState({ sleepHour })}
          onTimeFormatChange={(timeFormat) => updateState({ timeFormat })}
        />
      </section>

      {rows.length >= 2 ? (
        <OverlapSummary
          mode={state.mode}
          referenceCity={referenceCity}
          timeFormat={state.timeFormat}
          meetingSummary={meetingSummary}
          baseSummaries={baseSummaries}
        />
      ) : null}

      <DesktopBoard
        rows={rows}
        timeFormat={state.timeFormat}
        onPromoteCity={promoteCity}
        onRemoveCity={removeCity}
        canRemoveCities={rows.length > 1}
      />

      <MobileBoard
        rows={rows}
        timeFormat={state.timeFormat}
        onPromoteCity={promoteCity}
        onRemoveCity={removeCity}
        canRemoveCities={rows.length > 1}
      />

      <footer className="footer-note">
        <span>{hint}</span>
        <span>Everything on this page persists locally in your browser.</span>
      </footer>
    </main>
  )
}

export default App
