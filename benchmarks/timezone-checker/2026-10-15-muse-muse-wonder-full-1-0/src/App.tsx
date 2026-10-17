import { useEffect, useMemo, useRef, useState } from 'react'
import { CITY_CATALOG, DEFAULT_CITY_IDS, cityById, type City } from './data/cities'
import {
  formatCell, formatHour, formatOffset, formatRange, getOffsetMinutes, groupRanges, isAwakeAt,
  type CellState, type Mode, type TimeFormat,
} from './lib/time'

const STORAGE_KEY = 'timezone-overlap-v1'
const HOURS = Array.from({ length: 24 }, (_, i) => i)

type Persisted = { cityIds: string[]; mode: Mode; wake: number; sleep: number; format: TimeFormat }

function loadPersisted(): Persisted {
  const fallback: Persisted = { cityIds: DEFAULT_CITY_IDS, mode: 'meeting', wake: 7, sleep: 23, format: '12h' }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<Persisted>
    const cityIds = Array.isArray(parsed.cityIds)
      ? [...new Set(parsed.cityIds.filter((id) => cityById.has(id)))]
      : fallback.cityIds
    return {
      cityIds: cityIds.length ? cityIds : fallback.cityIds,
      mode: parsed.mode === 'base' ? 'base' : 'meeting',
      wake: Number.isInteger(parsed.wake) && parsed.wake! >= 0 && parsed.wake! <= 23 ? parsed.wake! : 7,
      sleep: Number.isInteger(parsed.sleep) && parsed.sleep! >= 0 && parsed.sleep! <= 23 ? parsed.sleep! : 23,
      format: parsed.format === '24h' ? '24h' : '12h',
    }
  } catch {
    return fallback
  }
}

export default function App() {
  const [initial] = useState(loadPersisted)
  const [cityIds, setCityIds] = useState<string[]>(initial.cityIds)
  const [mode, setMode] = useState<Mode>(initial.mode)
  const [wake, setWake] = useState(initial.wake)
  const [sleep, setSleep] = useState(initial.sleep)
  const [format, setFormat] = useState<TimeFormat>(initial.format)
  const [query, setQuery] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cityIds, mode, wake, sleep, format } satisfies Persisted))
  }, [cityIds, mode, wake, sleep, format])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const cities = useMemo(
    () => cityIds.map((id) => cityById.get(id)!).filter(Boolean),
    [cityIds],
  )
  const reference: City | undefined = cities[0]

  const offsets = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of cities) map.set(c.id, getOffsetMinutes(c.timeZone))
    return map
  }, [cities])

  const refOffset = reference ? (offsets.get(reference.id) ?? 0) : 0

  // awake[cityId][refHour] and localMinutes[cityId][refHour]
  const { awake, localMinutes } = useMemo(() => {
    const awakeMap = new Map<string, boolean[]>()
    const localMap = new Map<string, number[]>()
    for (const c of cities) {
      const diff = (offsets.get(c.id) ?? 0) - refOffset
      const locals = HOURS.map((h) => h * 60 + diff)
      localMap.set(c.id, locals)
      awakeMap.set(c.id, locals.map((m) => isAwakeAt(m, wake, sleep)))
    }
    return { awake: awakeMap, localMinutes: localMap }
  }, [cities, offsets, refOffset, wake, sleep])

  const meetingOverlap = useMemo(
    () => (cities.length ? HOURS.filter((h) => cities.every((c) => awake.get(c.id)?.[h])) : []),
    [cities, awake],
  )

  const baseOverlap = useMemo(() => {
    const map = new Map<string, number[]>()
    if (!reference) return map
    const refAwake = awake.get(reference.id) ?? []
    for (const c of cities.slice(1)) {
      map.set(c.id, HOURS.filter((h) => refAwake[h] && awake.get(c.id)?.[h]))
    }
    return map
  }, [cities, awake, reference])

  function cellState(city: City, h: number): CellState {
    if (!awake.get(city.id)?.[h]) return 'sleep'
    if (mode === 'meeting') return meetingOverlap.includes(h) ? 'overlap' : 'awake'
    if (city.id === reference?.id) return 'awake'
    return baseOverlap.get(city.id)?.includes(h) ? 'overlap' : 'awake'
  }

  const available = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CITY_CATALOG.filter((c) => !cityIds.includes(c.id))
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q) || c.region.toLowerCase().includes(q))
  }, [query, cityIds])

  const addCity = (id: string) => {
    setCityIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setQuery('')
    setPickerOpen(false)
  }
  const removeCity = (id: string) => setCityIds((prev) => prev.filter((c) => c !== id))
  const promote = (id: string) => setCityIds((prev) => [id, ...prev.filter((c) => c !== id)])

  const meetingRanges = groupRanges(meetingOverlap)

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>muse-wonder-full-1.0</h1>
          <p className="subtitle">Timezone overlap checker — find the hours when everyone is awake.</p>
        </div>
        <div className="mode-toggle" role="group" aria-label="Mode">
          <button
            type="button"
            className={mode === 'meeting' ? 'mode-btn active' : 'mode-btn'}
            aria-pressed={mode === 'meeting'}
            onClick={() => setMode('meeting')}
          >
            Meeting Mode
          </button>
          <button
            type="button"
            className={mode === 'base' ? 'mode-btn active' : 'mode-btn'}
            aria-pressed={mode === 'base'}
            onClick={() => setMode('base')}
          >
            Base Mode
          </button>
        </div>
      </header>

      <p className="mode-help">
        {mode === 'meeting'
          ? 'Meeting Mode: one shared window where every selected city is awake at the same time.'
          : `Base Mode: each city is compared independently against ${reference ? reference.name : 'the reference city'}.`}
      </p>

      <section className="controls" aria-label="Controls">
        <div className="picker" ref={pickerRef}>
          <label htmlFor="city-search">Add a city</label>
          <input
            id="city-search"
            type="text"
            placeholder="Search by city or country…"
            aria-label="Search cities"
            value={query}
            onFocus={() => setPickerOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Escape') setPickerOpen(false) }}
            onBlur={(e) => {
              if (!pickerRef.current?.contains(e.relatedTarget as Node)) {
                window.setTimeout(() => setPickerOpen(false), 150)
              }
            }}
            onChange={(e) => { setQuery(e.target.value); setPickerOpen(true) }}
          />
          {pickerOpen && (
            <ul className="picker-list" role="listbox" aria-label="Available cities">
              {available.length === 0 && <li className="picker-empty">No cities match your search.</li>}
              {available.map((c) => (
                <li key={c.id}>
                  <button type="button" className="picker-item" onClick={() => addCity(c.id)}>
                    <span className="picker-city">{c.name}</span>
                    <span className="picker-meta">{c.country} · {formatOffset(getOffsetMinutes(c.timeZone))}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <fieldset className="settings">
          <legend>Awake window</legend>
          <label>
            Wake-up
            <select aria-label="Wake-up hour" value={wake} onChange={(e) => setWake(Number(e.target.value))}>
              {HOURS.map((h) => <option key={h} value={h}>{formatHour(h, format)}</option>)}
            </select>
          </label>
          <label>
            Sleep
            <select aria-label="Sleep hour" value={sleep} onChange={(e) => setSleep(Number(e.target.value))}>
              {HOURS.map((h) => <option key={h} value={h}>{formatHour(h, format)}</option>)}
            </select>
          </label>
          <div className="format-toggle" role="group" aria-label="Time format">
            <button type="button" aria-pressed={format === '12h'} className={format === '12h' ? 'fmt-btn active' : 'fmt-btn'} onClick={() => setFormat('12h')}>12h</button>
            <button type="button" aria-pressed={format === '24h'} className={format === '24h' ? 'fmt-btn active' : 'fmt-btn'} onClick={() => setFormat('24h')}>24h</button>
          </div>
        </fieldset>
      </section>

      {cities.length >= 2 && reference && (
        <section className="summary" aria-label="Overlap summary">
          {mode === 'meeting' ? (
            meetingOverlap.length === 0 ? (
              <p className="warning" role="status">⚠ No overlap — there is no hour when everyone is awake. Try widening the awake window or removing a city.</p>
            ) : (
              <div className="summary-line">
                <strong>{meetingOverlap.length} overlap {meetingOverlap.length === 1 ? 'hour' : 'hours'}</strong>{' '}
                <span className="summary-in">in {reference.name} time:</span>{' '}
                {meetingRanges.map((r) => (
                  <span key={`${r.start}-${r.end}`}>{' '}<span className="range-badge">{formatRange(r, format)}</span></span>
                ))}
              </div>
            )
          ) : (
            <ul className="base-summary">
              {cities.slice(1).map((c) => {
                const hours = baseOverlap.get(c.id) ?? []
                const ranges = groupRanges(hours)
                return (
                  <li key={c.id} className="summary-line">
                    <strong>{c.name}</strong>{' '}
                    {hours.length === 0 ? (
                      <span className="warning-inline">⚠ No overlap with {reference.name}</span>
                    ) : (
                      <>
                        <span>{hours.length} overlap {hours.length === 1 ? 'hour' : 'hours'}</span>{' '}
                        <span className="summary-in">in {reference.name} time:</span>{' '}
                        {ranges.map((r) => (
                          <span key={`${r.start}-${r.end}`}>{' '}<span className="range-badge">{formatRange(r, format)}</span></span>
                        ))}
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {cities.length < 2 && (
        <p className="warning" role="status">Add at least two cities to see an overlap.</p>
      )}

      {/* Desktop layout: cities as rows, hours as columns */}
      <div className="desktop-grid" data-layout="desktop">
        <div className="d-row d-header-row">
          <div className="d-city-col header-cell">{reference ? `Hours in ${reference.name} →` : ''}</div>
          {HOURS.map((h) => (
            <div key={h} className="d-hour header-cell">{formatHour(h, format)}</div>
          ))}
          <div className="d-action header-cell" />
        </div>
        {cities.map((city, idx) => (
          <div key={city.id} className="d-row" data-city-row={city.id}>
            <div className="d-city-col">
              <button
                type="button"
                className="city-name"
                title={idx === 0 ? 'Reference city' : `Make ${city.name} the reference city`}
                aria-label={idx === 0 ? `${city.name} (reference)` : `Make ${city.name} the reference city`}
                onClick={() => promote(city.id)}
              >
                {city.name}
              </button>
              {idx === 0 && <span className="ref-badge">REF</span>}
              <span className="city-meta">{city.country}</span>
              <span className="city-offset">{formatOffset(offsets.get(city.id) ?? 0)}</span>
            </div>
            {HOURS.map((h) => {
              const state = cellState(city, h)
              const local = localMinutes.get(city.id)?.[h] ?? 0
              return (
                <div
                  key={h}
                  className={`cell state-${state}`}
                  data-city={city.id}
                  data-ref-hour={h}
                  data-state={state}
                  title={`${city.name}: ${formatCell(local, format)} when it is ${formatHour(h, format)} in ${reference?.name}`}
                >
                  {formatCell(local, format)}
                </div>
              )
            })}
            <div className="d-action">
              <button type="button" className="remove-btn" aria-label={`Remove ${city.name}`} onClick={() => removeCity(city.id)}>×</button>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile layout: cities as columns, hours as rows */}
      <div className="mobile-grid" data-layout="mobile" style={{ ['--city-count' as string]: cities.length }}>
        <div className="m-row m-header-row">
          <div className="m-hour-col header-cell">{reference?.name ?? ''}</div>
          {cities.map((city, idx) => (
            <div key={city.id} className="m-city-head">
              <button type="button" className="city-name" onClick={() => promote(city.id)} aria-label={idx === 0 ? `${city.name} (reference)` : `Make ${city.name} the reference city`}>
                {city.name}
              </button>
              {idx === 0 && <span className="ref-badge">REF</span>}
              <span className="city-offset">{formatOffset(offsets.get(city.id) ?? 0)}</span>
              <button type="button" className="remove-btn" aria-label={`Remove ${city.name}`} onClick={() => removeCity(city.id)}>×</button>
            </div>
          ))}
        </div>
        {HOURS.map((h) => (
          <div key={h} className="m-row">
            <div className="m-hour-col header-cell">{formatHour(h, format)}</div>
            {cities.map((city) => {
              const state = cellState(city, h)
              const local = localMinutes.get(city.id)?.[h] ?? 0
              return (
                <div key={city.id} className={`cell state-${state}`} data-city={city.id} data-ref-hour={h} data-state={state}>
                  {formatCell(local, format)}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <footer className="footer">
        <div className="legend">
          <span><span className="swatch state-overlap" /> Overlap</span>
          <span><span className="swatch state-awake" /> Awake</span>
          <span><span className="swatch state-sleep" /> Sleeping</span>
        </div>
        <p className="hint">
          {mode === 'meeting' ? 'Green cells = everyone awake' : `Green cells = awake at the same time as ${reference?.name ?? 'the reference city'}`}
        </p>
        <p className="hint-sub">Click a city name to make it the reference. Times use current UTC offsets, so daylight saving is handled automatically.</p>
      </footer>
    </div>
  )
}
