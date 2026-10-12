import { useEffect, useMemo, useState } from 'react'
import { CITIES, DEFAULT_CITY_IDS, type City } from './cities'
import {
  formatHourLabel,
  formatTime,
  getCityTimes,
  getRanges,
  isAwake,
  localMinutesAtReferenceHour,
  type TimeFormat,
} from './time'

type Mode = 'meeting' | 'base'
type Settings = { wakeHour: number; sleepHour: number; timeFormat: TimeFormat }
type SavedState = { cityIds: string[]; mode: Mode; settings: Settings }
type Overlap = { hours: boolean[]; ranges: Array<{ start: number; end: number }>; count: number }

const STORAGE_KEY = 'gpt6-timezone-overlap-v1'
const DEFAULT_SETTINGS: Settings = { wakeHour: 7, sleepHour: 23, timeFormat: '12h' }

function readSavedState(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedState>
      const cityIds = Array.isArray(parsed.cityIds)
        ? [...new Set(parsed.cityIds.filter((id): id is string => typeof id === 'string' && CITIES.some((city) => city.id === id)))]
        : DEFAULT_CITY_IDS
      const wakeHour = Number(parsed.settings?.wakeHour)
      const sleepHour = Number(parsed.settings?.sleepHour)
      const timeFormat = parsed.settings?.timeFormat === '24h' ? '24h' : '12h'
      return {
        cityIds,
        mode: parsed.mode === 'base' ? 'base' : 'meeting',
        settings: {
          wakeHour: Number.isInteger(wakeHour) && wakeHour >= 0 && wakeHour <= 23 ? wakeHour : 7,
          sleepHour: Number.isInteger(sleepHour) && sleepHour >= 0 && sleepHour <= 23 ? sleepHour : 23,
          timeFormat,
        },
      }
    }
  } catch {
    // Ignore unavailable storage or invalid saved data and use the defaults.
  }
  return { cityIds: DEFAULT_CITY_IDS, mode: 'meeting', settings: DEFAULT_SETTINGS }
}

function getCircularRanges(hours: boolean[]): Array<{ start: number; end: number }> {
  const ranges = getRanges(hours)
  if (ranges.length > 1 && ranges[0].start === 0 && ranges[ranges.length - 1].end === 24) {
    const first = ranges.shift()!
    const last = ranges.pop()!
    return [...ranges, { start: last.start, end: 24 + first.end }].sort((a, b) => a.start - b.start)
  }
  return ranges
}

function countHours(hours: boolean[]) {
  return hours.filter(Boolean).length
}

function hourRangeLabel(range: { start: number; end: number }, format: TimeFormat) {
  const startLabel = formatTime(range.start % 24, 0, format)
  const endLabel = formatTime(range.end % 24, 0, format)
  return `${startLabel} – ${endLabel}${range.end > 24 || (range.start === 0 && range.end === 24) ? ' +1d' : ''}`
}

function CityGlyph({ code }: { code: string }) {
  const tones: Record<string, string> = { US: 'blue', ID: 'coral', CH: 'violet' }
  return <span className={`city-glyph ${tones[code] ?? ''}`} aria-hidden="true"><span>{code.slice(0, 1)}</span></span>
}

function App() {
  const [saved] = useState(readSavedState)
  const [cityIds, setCityIds] = useState(saved.cityIds)
  const [mode, setMode] = useState<Mode>(saved.mode)
  const [settings, setSettings] = useState<Settings>(saved.settings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ cityIds, mode, settings } satisfies SavedState))
    } catch {
      // Keep the current session usable when browser storage is restricted.
    }
  }, [cityIds, mode, settings])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60 * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!pickerOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPickerOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pickerOpen])

  const cities = useMemo(() => cityIds.flatMap((id) => {
    const city = CITIES.find((entry) => entry.id === id)
    return city ? [city] : []
  }), [cityIds])
  const cityTimes = useMemo(() => getCityTimes(cities), [cities, now])
  const referenceCity = cities[0]
  const referenceOffset = referenceCity ? cityTimes[referenceCity.id].offsetMinutes : 0

  const awakeByCity = useMemo(() => Object.fromEntries(cities.map((city) => {
    const offset = cityTimes[city.id].offsetMinutes
    const hours = Array.from({ length: 24 }, (_, hour) => {
      const local = localMinutesAtReferenceHour(hour, offset, referenceOffset)
      return isAwake(local, settings.wakeHour, settings.sleepHour)
    })
    return [city.id, hours]
  })), [cities, cityTimes, referenceOffset, settings.wakeHour, settings.sleepHour])

  const meetingOverlap = useMemo<Overlap>(() => {
    const hours = Array.from({ length: 24 }, (_, hour) => cities.length > 0 && cities.every((city) => awakeByCity[city.id]?.[hour]))
    return { hours, count: countHours(hours), ranges: getCircularRanges(hours) }
  }, [cities, awakeByCity])

  const baseOverlaps = useMemo(() => Object.fromEntries(cities.slice(1).map((city) => {
    const hours = Array.from({ length: 24 }, (_, hour) => Boolean(awakeByCity[referenceCity?.id ?? '']?.[hour] && awakeByCity[city.id]?.[hour]))
    return [city.id, { hours, count: countHours(hours), ranges: getCircularRanges(hours) } satisfies Overlap]
  })), [cities, awakeByCity, referenceCity])

  const referenceBaseHours = Array.from({ length: 24 }, (_, hour) => cities.slice(1).some((city) => baseOverlaps[city.id]?.hours[hour]))
  const availableCities = CITIES.filter((city) => !cityIds.includes(city.id) && `${city.name} ${city.country}`.toLowerCase().includes(query.trim().toLowerCase()))

  function addCity(city: City) {
    setCityIds((ids) => ids.includes(city.id) ? ids : [...ids, city.id])
    setQuery('')
    setPickerOpen(false)
  }

  function removeCity(id: string) {
    setCityIds((ids) => ids.filter((cityId) => cityId !== id))
  }

  function promoteCity(id: string) {
    setCityIds((ids) => ids[0] === id ? ids : [id, ...ids.filter((cityId) => cityId !== id)])
  }

  function cellState(city: City, hour: number): 'sleeping' | 'awake' | 'overlap' {
    if (!awakeByCity[city.id]?.[hour]) return 'sleeping'
    const overlap = mode === 'meeting'
      ? meetingOverlap.hours[hour]
      : city.id === referenceCity?.id
        ? referenceBaseHours[hour]
        : Boolean(baseOverlaps[city.id]?.hours[hour])
    return overlap ? 'overlap' : 'awake'
  }

  function cellTime(city: City, hour: number) {
    const minutes = localMinutesAtReferenceHour(hour, cityTimes[city.id].offsetMinutes, referenceOffset)
    const localHour = Math.floor(minutes / 60)
    const localMinute = minutes % 60
    const full = formatTime(localHour, localMinute, settings.timeFormat)
    return { compact: settings.timeFormat === '12h' ? `${localHour % 12 || 12}${localMinute ? `:${String(localMinute).padStart(2, '0')}` : ''}${localHour >= 12 ? 'p' : 'a'}` : `${String(localHour).padStart(2, '0')}${localMinute ? `:${String(localMinute).padStart(2, '0')}` : ''}`, full }
  }

  function cityHeader(city: City, mobile = false, includeRemove = true) {
    const isReference = city.id === referenceCity?.id
    return (
      <div className={`city-heading ${mobile ? 'mobile-city-heading' : ''}`} key={city.id}>
        <button className="city-name-button" onClick={() => promoteCity(city.id)} title={isReference ? 'Reference city' : `Make ${city.name} the reference city`}>
          {!mobile && <CityGlyph code={city.countryCode} />}
          <span className="city-title-copy">
            <span className="city-title-line"><strong>{city.name}</strong>{isReference && <span className="ref-badge">REF</span>}</span>
            <span className="city-subline">{mobile ? cityTimes[city.id].offsetLabel : `${city.country} · ${cityTimes[city.id].offsetLabel}`}</span>
          </span>
        </button>
        {includeRemove && <button className="remove-city" onClick={() => removeCity(city.id)} aria-label={`Remove ${city.name}`} title={`Remove ${city.name}`}>
          <span aria-hidden="true">×</span>
        </button>}
      </div>
    )
  }

  function summaryRow(city: City, overlap: Overlap) {
    return (
      <div className="summary-row" key={city.id}>
        <div className="summary-person"><span className="summary-marker" />{city.name}</div>
        {overlap.count > 0 ? (
          <div className="summary-detail"><strong>{overlap.count} {overlap.count === 1 ? 'hour' : 'hours'}</strong><div className="range-list">{overlap.ranges.map((range) => <span className="time-range" key={`${range.start}-${range.end}`}>{hourRangeLabel(range, settings.timeFormat)}</span>)}</div></div>
        ) : <div className="summary-empty">No shared hours. Try widening the awake window.</div>}
      </div>
    )
  }

  const dayLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="GPT-6 home"><span className="brand-mark"><span /></span><span>MERIDIAN</span></a>
        <div className="topbar-note"><span className="live-dot" /> LIVE OFFSET DATA <span className="topbar-divider" /> {dayLabel.toUpperCase()}</div>
        <button className="settings-button" onClick={() => setSettingsOpen((open) => !open)} aria-expanded={settingsOpen} aria-controls="settings-panel"><span className="settings-icon" aria-hidden="true">☷</span><span>Schedule</span><span className="setting-summary">{formatTime(settings.wakeHour, 0, settings.timeFormat)}–{formatTime(settings.sleepHour, 0, settings.timeFormat)}</span><span className="chevron" aria-hidden="true">{settingsOpen ? '⌃' : '⌄'}</span></button>
      </header>

      <main id="top" className="main-content">
        <section className="hero">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> TIMEZONE PLANNER</div>
            <h1>GPT-6</h1>
            <p className="hero-copy">A little closer, wherever work takes you.</p>
          </div>
          <div className="hero-aside"><span className="hero-aside-label">YOUR TEAM, IN SYNC</span><span className="hero-aside-copy">Find a good hour for<br />everyone to show up.</span></div>
        </section>

        {settingsOpen && <section className="settings-panel" id="settings-panel" aria-label="Schedule settings">
          <div className="settings-heading"><div><span className="panel-kicker">YOUR DAY</span><h2>Set your shared awake window</h2></div><button className="panel-close" onClick={() => setSettingsOpen(false)} aria-label="Close schedule settings">×</button></div>
          <div className="settings-controls">
            <label className="setting-select"><span>Wake up</span><select value={settings.wakeHour} onChange={(event) => setSettings((value) => ({ ...value, wakeHour: Number(event.target.value) }))}>{Array.from({ length: 24 }, (_, hour) => <option value={hour} key={hour}>{formatTime(hour, 0, settings.timeFormat)}</option>)}</select></label>
            <span className="settings-arrow" aria-hidden="true">→</span>
            <label className="setting-select"><span>Sleep</span><select value={settings.sleepHour} onChange={(event) => setSettings((value) => ({ ...value, sleepHour: Number(event.target.value) }))}>{Array.from({ length: 24 }, (_, hour) => <option value={hour} key={hour}>{formatTime(hour, 0, settings.timeFormat)}</option>)}</select></label>
            <div className="format-setting"><span>Time format</span><div className="format-switch" role="group" aria-label="Time format"><button className={settings.timeFormat === '12h' ? 'selected' : ''} onClick={() => setSettings((value) => ({ ...value, timeFormat: '12h' }))}>12h</button><button className={settings.timeFormat === '24h' ? 'selected' : ''} onClick={() => setSettings((value) => ({ ...value, timeFormat: '24h' }))}>24h</button></div></div>
            <span className="settings-note">Same sleep schedule for everyone · overnight hours supported</span>
          </div>
        </section>}

        <section className="workspace-card">
          <div className="workspace-toolbar">
            <div className="mode-control" role="tablist" aria-label="Overlap mode">
              <button role="tab" aria-selected={mode === 'meeting'} className={mode === 'meeting' ? 'active' : ''} onClick={() => setMode('meeting')}><span className="mode-icon" aria-hidden="true">◉</span>Meeting mode</button>
              <button role="tab" aria-selected={mode === 'base'} className={mode === 'base' ? 'active' : ''} onClick={() => setMode('base')}><span className="mode-icon base-icon" aria-hidden="true">⌖</span>Base mode</button>
            </div>
            <div className="city-actions">
              <span className="city-count">{cities.length} {cities.length === 1 ? 'CITY' : 'CITIES'}</span>
              <div className="picker-wrap">
                <button className="add-city-button" aria-expanded={pickerOpen} onClick={() => { setPickerOpen((open) => !open); setQuery('') }}><span aria-hidden="true">＋</span> Add city</button>
                {pickerOpen && <div className="city-picker">
                  <label className="search-box"><span aria-hidden="true">⌕</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search city or country" aria-label="Search cities" /><kbd>ESC</kbd></label>
                  <div className="picker-results">{availableCities.length ? availableCities.map((city) => <button className="picker-option" key={city.id} onClick={() => addCity(city)}><CityGlyph code={city.countryCode} /><span><strong>{city.name}</strong><small>{city.country}</small></span><span className="picker-plus" aria-hidden="true">＋</span></button>) : <div className="no-results">No matching cities</div>}</div>
                  <div className="picker-footer">{CITIES.length} CITIES · WORLDWIDE</div>
                </div>}
              </div>
            </div>
          </div>

          {cities.length >= 2 && <section className={`overlap-summary ${mode === 'base' ? 'base-summary' : ''}`} aria-live="polite">
            <div className="summary-heading"><span className="summary-icon" aria-hidden="true">✳</span><div><span className="panel-kicker">{mode === 'meeting' ? 'THE SWEET SPOT' : 'ONE-ON-ONE WINDOWS'}</span><h2>{mode === 'meeting' ? 'Everyone’s awake' : `Around ${referenceCity?.name ?? 'your base'}`}</h2></div></div>
            {mode === 'meeting' ? (
              meetingOverlap.count > 0 ? <div className="meeting-stat"><strong className="total-hours">{meetingOverlap.count}<span>{meetingOverlap.count === 1 ? 'hour' : 'hours'}</span></strong><div className="range-list">{meetingOverlap.ranges.map((range) => <span className="time-range" key={`${range.start}-${range.end}`}>{hourRangeLabel(range, settings.timeFormat)}</span>)}</div></div> : <div className="summary-warning"><span>↗</span><div><strong>No common awake hours</strong><p>Try widening the awake window in your schedule.</p></div></div>
            ) : <div className="summary-rows">{cities.slice(1).map((city) => summaryRow(city, baseOverlaps[city.id]))}</div>}
          </section>}

          <div className="grid-heading">
            <div><span className="panel-kicker">{mode === 'meeting' ? 'SHARED AVAILABILITY' : 'LOCAL AVAILABILITY'}</span><h2>{mode === 'meeting' ? 'Find your common hours' : 'Compare against your base'}</h2></div>
            <div className="grid-legend"><span><i className="legend-overlap" />{mode === 'meeting' ? 'Everyone awake' : 'Overlap'}</span><span><i className="legend-awake" />Awake</span><span><i className="legend-sleep" />Sleeping</span></div>
          </div>

          {cities.length > 0 ? <>
            <div className="desktop-grid-scroll"><div className="desktop-grid">
              <div className="desktop-grid-header"><div className="city-column-label">CITY <span>↓</span></div>{Array.from({ length: 24 }, (_, hour) => <div className={`hour-heading ${hour === 0 ? 'day-start' : ''} ${hour === 12 ? 'noon-start' : ''}`} key={hour}><span>{formatHourLabel(hour, settings.timeFormat)}</span><small>{hour === 0 ? settings.timeFormat === '12h' ? 'am' : 'h' : hour === 12 ? settings.timeFormat === '12h' ? 'pm' : 'h' : ''}</small></div>)}<div className="remove-column-label" /> </div>
              {cities.map((city) => <div className="desktop-city-row" key={city.id}>
                {cityHeader(city, false, false)}
                {Array.from({ length: 24 }, (_, hour) => {
                  const state = cellState(city, hour)
                  const time = cellTime(city, hour)
                  return <div className={`hour-cell ${state} ${hour === 0 ? 'day-start' : ''} ${hour === 12 ? 'noon-start' : ''}`} key={hour} title={`${city.name}: ${time.full}${state === 'overlap' ? ' · shared awake hour' : ''}`}><span>{time.compact}</span></div>
                })}
                <div className="row-remove-cell"><button className="remove-city" onClick={() => removeCity(city.id)} aria-label={`Remove ${city.name}`} title={`Remove ${city.name}`}><span aria-hidden="true">×</span></button></div>
              </div>)}
            </div></div>

            <div className="mobile-grid-scroll"><div className="mobile-grid">
              <div className="mobile-city-row" style={{ gridTemplateColumns: `57px repeat(${cities.length}, 88px)` }}><div className="mobile-time-head">LOCAL TIME</div>{cities.map((city) => cityHeader(city, true))}</div>
              {Array.from({ length: 24 }, (_, hour) => <div className={`mobile-hour-row ${hour === 0 ? 'day-start' : ''} ${hour === 12 ? 'noon-start' : ''}`} style={{ gridTemplateColumns: `57px repeat(${cities.length}, 88px)` }} key={hour}>
                <div className="mobile-reference-time"><strong>{formatHourLabel(hour, settings.timeFormat)}</strong><small>{hour === 0 ? settings.timeFormat === '12h' ? 'am' : 'h' : hour === 12 ? settings.timeFormat === '12h' ? 'pm' : 'h' : ''}</small></div>
                {cities.map((city) => {
                  const state = cellState(city, hour)
                  const time = cellTime(city, hour)
                  return <div className={`mobile-hour-cell ${state}`} key={city.id} title={`${city.name}: ${time.full}`}><span>{time.compact}</span></div>
                })}
              </div>)}
            </div></div>
          </> : <div className="empty-state"><span className="empty-illustration" aria-hidden="true">＋</span><strong>Your world, your call</strong><p>Add a city to start finding the hours that work.</p><button className="add-city-button" onClick={() => setPickerOpen(true)}>＋ Add your first city</button></div>}

          <div className="grid-footer"><div className="footer-tip"><span className="tip-sparkle" aria-hidden="true">✳</span><span>{mode === 'meeting' ? 'Green cells = everyone awake' : 'Green cells = shared awake hours'}</span></div><div className="footer-note">Click a city name to make it your reference <span>·</span> All hours follow its local day</div></div>
        </section>

        <footer className="page-footer"><span>MADE FOR PEOPLE, EVERYWHERE</span><span>YOUR TIME IS YOURS <i>✳</i></span></footer>
      </main>
    </div>
  )
}

export default App
