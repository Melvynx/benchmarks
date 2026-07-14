import { useEffect, useMemo, useRef, useState } from 'react'
import { CITY_DATABASE, MAX_ROWS, MIN_ROWS } from './data/cities'
import './App.css'

const STORAGE_KEY = 'gpt5-timezone-checker-settings'
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const REMOVAL_MS = 220

const DEFAULT_SETTINGS = {
  timeFormat: '24',
  workStart: 9,
  workEnd: 18,
  wakeStart: 7,
  wakeEnd: 9,
}

function safeHour(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 23 ? parsed : fallback
}

function loadSettings() {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    const timeFormat = parsed.timeFormat === '12' ? '12' : '24'

    return {
      timeFormat,
      workStart: safeHour(parsed.workStart, DEFAULT_SETTINGS.workStart),
      workEnd: safeHour(parsed.workEnd, DEFAULT_SETTINGS.workEnd),
      wakeStart: safeHour(parsed.wakeStart, DEFAULT_SETTINGS.wakeStart),
      wakeEnd: safeHour(parsed.wakeEnd, DEFAULT_SETTINGS.wakeEnd),
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function rowId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function rowFromCity(city) {
  return {
    id: rowId(),
    city: city.city,
    country: city.country,
    timeZone: city.timeZone,
  }
}

function cityNameFromTimeZone(timeZone) {
  const last = timeZone.split('/').pop() || 'Local'
  return last.replace(/_/g, ' ')
}

function createInitialRows() {
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const userCity = CITY_DATABASE.find((city) => city.timeZone === userTimeZone)

  const primary = rowFromCity(
    userCity || {
      city: cityNameFromTimeZone(userTimeZone),
      country: 'Detected',
      timeZone: userTimeZone,
    },
  )

  const backupTargets = ['America/New_York', 'Asia/Tokyo', 'Europe/London', 'America/Los_Angeles']
  const secondaryFromBackup = backupTargets
    .map((target) => CITY_DATABASE.find((city) => city.timeZone === target))
    .find((city) => city && city.timeZone !== userTimeZone)

  const secondary =
    secondaryFromBackup ||
    CITY_DATABASE.find((city) => city.timeZone !== userTimeZone) || {
      city: 'UTC',
      country: 'UTC',
      timeZone: 'UTC',
    }

  return [primary, rowFromCity(secondary)]
}

function getOffsetMinutes(timeZone, now) {
  const shortOffset = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    minute: '2-digit',
  })
    .formatToParts(now)
    .find((part) => part.type === 'timeZoneName')?.value

  const match = shortOffset?.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/)
  if (match) {
    const sign = match[1] === '-' ? -1 : 1
    const hours = Number(match[2])
    const minutes = Number(match[3] || 0)
    return sign * (hours * 60 + minutes)
  }

  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  const parts = dtf.formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const utcGuess = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  )

  return Math.round((utcGuess - now.getTime()) / 60000)
}

function formatOffset(minutes) {
  const sign = minutes >= 0 ? '+' : '-'
  const absolute = Math.abs(minutes)
  const hh = String(Math.floor(absolute / 60)).padStart(2, '0')
  const mm = String(absolute % 60).padStart(2, '0')
  return `UTC${sign}${hh}:${mm}`
}

function getLocalHour(timeZone, now) {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(now)

  return Number(hour)
}

function formatClock(timeZone, now, timeFormat) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    ...(timeFormat === '12' ? { hour12: true } : { hour12: false, hourCycle: 'h23' }),
  }).format(now)
}

function formatHourLabel(hour) {
  return `${String(hour).padStart(2, '0')}h`
}

function isHourInside(hour, start, end) {
  if (start === end) {
    return false
  }

  if (start < end) {
    return hour >= start && hour < end
  }

  return hour >= start || hour < end
}

function intervalsOverlap(startA, endA, startB, endB) {
  return Math.max(startA, startB) < Math.min(endA, endB)
}

function overlapsPrimaryHour(hour, rowOffset, primaryOffset, workStart, workEnd) {
  if (workStart === workEnd) {
    return false
  }

  let primaryStartUtc = workStart * 60 - primaryOffset
  let primaryEndUtc = workEnd * 60 - primaryOffset

  if (primaryEndUtc <= primaryStartUtc) {
    primaryEndUtc += 24 * 60
  }

  const rowStartUtc = hour * 60 - rowOffset
  const rowEndUtc = rowStartUtc + 60

  return [-24 * 60, 0, 24 * 60].some((shift) =>
    intervalsOverlap(rowStartUtc + shift, rowEndUtc + shift, primaryStartUtc, primaryEndUtc),
  )
}

function cellTone(hour, overlap, wakeStart, wakeEnd) {
  if (overlap) {
    return 'overlap'
  }

  if (isHourInside(hour, wakeStart, wakeEnd)) {
    return 'wake'
  }

  if (hour <= 6 || hour >= 20) {
    return 'night'
  }

  return 'day'
}

function App() {
  const [rows, setRows] = useState(() => createInitialRows())
  const [primaryId, setPrimaryId] = useState(null)
  const [query, setQuery] = useState('')
  const [now, setNow] = useState(new Date())
  const [settings, setSettings] = useState(loadSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [removingIds, setRemovingIds] = useState([])
  const removalTimers = useRef(new Map())

  const effectivePrimaryId = rows.some((row) => row.id === primaryId) ? primaryId : rows[0]?.id || null
  const primaryRow = rows.find((row) => row.id === effectivePrimaryId) || rows[0]

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(
    () => () => {
      removalTimers.current.forEach((timer) => clearTimeout(timer))
      removalTimers.current.clear()
    },
    [],
  )

  const selectedTimeZones = useMemo(() => new Set(rows.map((row) => row.timeZone)), [rows])

  const suggestions = useMemo(() => {
    if (!query.trim() || rows.length >= MAX_ROWS) {
      return []
    }

    const q = query.trim().toLowerCase()

    return CITY_DATABASE.filter((city) => {
      if (selectedTimeZones.has(city.timeZone)) {
        return false
      }

      return city.city.toLowerCase().includes(q) || city.country.toLowerCase().includes(q)
    }).slice(0, 12)
  }, [query, rows.length, selectedTimeZones])

  const primaryOffset = primaryRow ? getOffsetMinutes(primaryRow.timeZone, now) : 0

  const computedRows = useMemo(
    () =>
      rows.map((row) => {
        const offset = getOffsetMinutes(row.timeZone, now)
        const currentHour = getLocalHour(row.timeZone, now)
        const overlapMap = HOURS.map((hour) =>
          overlapsPrimaryHour(hour, offset, primaryOffset, settings.workStart, settings.workEnd),
        )

        return {
          ...row,
          offset,
          currentHour,
          localTime: formatClock(row.timeZone, now, settings.timeFormat),
          overlapMap,
          hasOverlap: overlapMap.some(Boolean),
        }
      }),
    [rows, now, primaryOffset, settings.workStart, settings.workEnd, settings.timeFormat],
  )

  function addCity(city) {
    if (rows.length >= MAX_ROWS) {
      return
    }

    setRows((previous) => [...previous, rowFromCity(city)])
    setQuery('')
  }

  function deleteRow(id) {
    if (rows.length <= MIN_ROWS || removingIds.includes(id)) {
      return
    }

    setRemovingIds((previous) => [...previous, id])

    const timer = setTimeout(() => {
      setRows((previous) => previous.filter((row) => row.id !== id))
      setRemovingIds((previous) => previous.filter((currentId) => currentId !== id))
      removalTimers.current.delete(id)
    }, REMOVAL_MS)

    removalTimers.current.set(id, timer)
  }

  function onSettingsChange(key, value) {
    setSettings((previous) => ({ ...previous, [key]: value }))
  }

  return (
    <main className="app-shell">
      <div className="ambient-glow ambient-left" />
      <div className="ambient-glow ambient-right" />

      <header className="topbar">
        <div>
          <h1>GPT-5</h1>
          <p className="subtitle">Timezone overlap checker</p>
        </div>

        <button
          className="settings-button"
          type="button"
          aria-label="Open settings"
          onClick={() => setSettingsOpen((open) => !open)}
        >
          ⚙
        </button>
      </header>

      <section className="search-panel">
        <label htmlFor="city-search" className="search-label">
          Add city ({rows.length}/{MAX_ROWS})
        </label>
        <input
          id="city-search"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="search-input"
          placeholder={rows.length >= MAX_ROWS ? 'Maximum reached' : 'Search by city or country'}
          disabled={rows.length >= MAX_ROWS}
        />

        {suggestions.length > 0 && (
          <ul className="suggestions" role="listbox" aria-label="City suggestions">
            {suggestions.map((city) => (
              <li key={`${city.city}-${city.country}-${city.timeZone}`}>
                <button type="button" onClick={() => addCity(city)}>
                  <span>{city.city}</span>
                  <small>
                    {city.country} • {city.timeZone}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="timeline-card">
        <div className="timeline-desktop" role="table" aria-label="Timezone comparison table">
          <div className="timeline-row timeline-head" role="row">
            <div className="meta-head" role="columnheader">
              Timezones
            </div>
            {HOURS.map((hour) => (
              <div className="hour-head" key={`head-${hour}`} role="columnheader">
                {formatHourLabel(hour)}
              </div>
            ))}
          </div>

          {computedRows.map((row) => {
            const isPrimary = effectivePrimaryId === row.id
            const isRemoving = removingIds.includes(row.id)

            return (
              <div
                className={`timeline-row timeline-data ${isPrimary ? 'is-primary' : ''} ${isRemoving ? 'is-removing' : ''}`}
                role="row"
                key={row.id}
              >
                <div
                  className="row-meta"
                  role="button"
                  tabIndex={0}
                  onClick={() => setPrimaryId(row.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setPrimaryId(row.id)
                    }
                  }}
                >
                  <div className="city-line">
                    <strong>{row.city}</strong>
                    {isPrimary && <span className="primary-pill">Primary</span>}
                  </div>
                  <div className="country-line">{row.country}</div>
                  <div className="status-line">
                    <span>{row.localTime}</span>
                    <span>{formatOffset(row.offset)}</span>
                    {!row.hasOverlap && <span className="no-overlap">No overlap</span>}
                  </div>

                  <button
                    type="button"
                    className="remove-row"
                    aria-label={`Delete ${row.city}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      deleteRow(row.id)
                    }}
                    disabled={rows.length <= MIN_ROWS}
                  >
                    ×
                  </button>
                </div>

                {HOURS.map((hour) => {
                  const tone = cellTone(hour, row.overlapMap[hour], settings.wakeStart, settings.wakeEnd)
                  const isNow = row.currentHour === hour

                  return (
                    <div
                      key={`${row.id}-${hour}`}
                      className={`hour-cell tone-${tone} ${isNow ? 'is-now' : ''}`}
                      role="cell"
                    />
                  )
                })}
              </div>
            )
          })}
        </div>

        <div className="timeline-mobile" aria-label="Timezone stacked view">
          {computedRows.map((row) => {
            const isPrimary = effectivePrimaryId === row.id
            const isRemoving = removingIds.includes(row.id)

            return (
              <article
                className={`mobile-row ${isPrimary ? 'is-primary' : ''} ${isRemoving ? 'is-removing' : ''}`}
                key={`mobile-${row.id}`}
              >
                <div
                  className="mobile-meta"
                  role="button"
                  tabIndex={0}
                  onClick={() => setPrimaryId(row.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setPrimaryId(row.id)
                    }
                  }}
                >
                  <div className="city-line">
                    <strong>{row.city}</strong>
                    {isPrimary && <span className="primary-pill">Primary</span>}
                  </div>
                  <div className="country-line">{row.country}</div>
                  <div className="status-line">
                    <span>{row.localTime}</span>
                    <span>{formatOffset(row.offset)}</span>
                    {!row.hasOverlap && <span className="no-overlap">No overlap</span>}
                  </div>

                  <button
                    type="button"
                    className="remove-row"
                    aria-label={`Delete ${row.city}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      deleteRow(row.id)
                    }}
                    disabled={rows.length <= MIN_ROWS}
                  >
                    ×
                  </button>
                </div>

                <div className="mobile-track-scroll">
                  <div className="mobile-hours">
                    {HOURS.map((hour) => (
                      <span key={`mh-${row.id}-${hour}`}>{formatHourLabel(hour)}</span>
                    ))}
                  </div>
                  <div className="mobile-cells">
                    {HOURS.map((hour) => {
                      const tone = cellTone(hour, row.overlapMap[hour], settings.wakeStart, settings.wakeEnd)
                      const isNow = row.currentHour === hour

                      return (
                        <div
                          key={`mc-${row.id}-${hour}`}
                          className={`hour-cell tone-${tone} ${isNow ? 'is-now' : ''}`}
                        />
                      )
                    })}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {settingsOpen && (
        <section className="settings-modal" role="dialog" aria-modal="true" aria-label="Settings">
          <div className="settings-content">
            <h2>Settings</h2>

            <label>
              Time format
              <select
                value={settings.timeFormat}
                onChange={(event) => onSettingsChange('timeFormat', event.target.value)}
              >
                <option value="24">24h</option>
                <option value="12">12h</option>
              </select>
            </label>

            <label>
              Working start
              <select
                value={settings.workStart}
                onChange={(event) => onSettingsChange('workStart', Number(event.target.value))}
              >
                {HOURS.map((hour) => (
                  <option key={`work-start-${hour}`} value={hour}>
                    {formatHourLabel(hour)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Working end
              <select
                value={settings.workEnd}
                onChange={(event) => onSettingsChange('workEnd', Number(event.target.value))}
              >
                {HOURS.map((hour) => (
                  <option key={`work-end-${hour}`} value={hour}>
                    {formatHourLabel(hour)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Wake-up start
              <select
                value={settings.wakeStart}
                onChange={(event) => onSettingsChange('wakeStart', Number(event.target.value))}
              >
                {HOURS.map((hour) => (
                  <option key={`wake-start-${hour}`} value={hour}>
                    {formatHourLabel(hour)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Wake-up end
              <select
                value={settings.wakeEnd}
                onChange={(event) => onSettingsChange('wakeEnd', Number(event.target.value))}
              >
                {HOURS.map((hour) => (
                  <option key={`wake-end-${hour}`} value={hour}>
                    {formatHourLabel(hour)}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" className="close-settings" onClick={() => setSettingsOpen(false)}>
              Close
            </button>
          </div>
        </section>
      )}
    </main>
  )
}

export default App
