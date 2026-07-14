import { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const CITY_LIBRARY = {
  'new-york': {
    id: 'new-york',
    city: 'New York',
    country: 'United States',
    code: 'NYC',
    zone: 'EDT',
    offset: -4,
    color: '#ff876f',
    soft: '#fff0ec',
  },
  london: {
    id: 'london',
    city: 'London',
    country: 'United Kingdom',
    code: 'LON',
    zone: 'BST',
    offset: 1,
    color: '#94d4ff',
    soft: '#edf8ff',
  },
  berlin: {
    id: 'berlin',
    city: 'Berlin',
    country: 'Germany',
    code: 'BER',
    zone: 'CEST',
    offset: 2,
    color: '#b1a5ff',
    soft: '#f2f0ff',
  },
  'san-francisco': {
    id: 'san-francisco',
    city: 'San Francisco',
    country: 'United States',
    code: 'SFO',
    zone: 'PDT',
    offset: -7,
    color: '#f6c766',
    soft: '#fff8e8',
  },
  singapore: {
    id: 'singapore',
    city: 'Singapore',
    country: 'Singapore',
    code: 'SIN',
    zone: 'SGT',
    offset: 8,
    color: '#64d8b0',
    soft: '#ebfaf5',
  },
  tokyo: {
    id: 'tokyo',
    city: 'Tokyo',
    country: 'Japan',
    code: 'TYO',
    zone: 'JST',
    offset: 9,
    color: '#e7a5de',
    soft: '#fdf0fa',
  },
  sydney: {
    id: 'sydney',
    city: 'Sydney',
    country: 'Australia',
    code: 'SYD',
    zone: 'AEST',
    offset: 10,
    color: '#8fd8a4',
    soft: '#effbf1',
  },
}

const DEFAULT_SCHEDULES = {
  'new-york': { start: '09:00', end: '17:00' },
  london: { start: '09:00', end: '17:00' },
  berlin: { start: '09:00', end: '17:00' },
  'san-francisco': { start: '09:00', end: '17:00' },
  singapore: { start: '09:00', end: '17:00' },
  tokyo: { start: '09:00', end: '17:00' },
  sydney: { start: '09:00', end: '17:00' },
}

const INITIAL_CITIES = ['new-york', 'london', 'berlin']

function minutesFromTime(value) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function formatOffset(offset) {
  if (offset === 0) return 'UTC'
  return `UTC${offset > 0 ? '+' : ''}${offset}`
}

function formatTime(totalMinutes, twelveHour = false) {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  if (!twelveHour) return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour = hours % 12 || 12
  return `${hour}:${String(minutes).padStart(2, '0')} ${suffix}`
}

function localTimeFromUtc(utcMinutes, offset) {
  return utcMinutes + offset * 60
}

function utcRanges(city, schedule) {
  const start = minutesFromTime(schedule.start) - city.offset * 60
  const end = minutesFromTime(schedule.end) - city.offset * 60
  const normalizedStart = ((start % 1440) + 1440) % 1440
  const normalizedEnd = ((end % 1440) + 1440) % 1440

  if (normalizedStart < normalizedEnd) return [{ start: normalizedStart, end: normalizedEnd }]
  if (normalizedStart > normalizedEnd) {
    return [
      { start: normalizedStart, end: 1440 },
      { start: 0, end: normalizedEnd },
    ]
  }
  return []
}

function isMinuteInRanges(minute, ranges) {
  return ranges.some((range) => minute >= range.start && minute <= range.end)
}

function getBestOverlap(cities, schedules) {
  if (!cities.length) return null
  const ranges = cities.map((city) => utcRanges(city, schedules[city.id]))
  if (ranges.some((cityRanges) => cityRanges.length === 0)) return null
  const boundaries = [...new Set([0, 1440, ...ranges.flatMap((cityRanges) => cityRanges.flatMap((range) => [range.start, range.end]))])].sort((a, b) => a - b)
  const candidates = []

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index]
    const end = boundaries[index + 1]
    const middle = start + (end - start) / 2
    if (ranges.every((cityRanges) => isMinuteInRanges(middle, cityRanges))) candidates.push({ start, end })
  }

  if (!candidates.length) return null
  return candidates.reduce((longest, candidate) => (candidate.end - candidate.start > longest.end - longest.start ? candidate : longest))
}

function Icon({ name, size = 18 }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m7 7 10 10M17 7 7 17" />,
    chevron: <path d="m7 10 5 5 5-5" />,
    pin: <><path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" /><circle cx="12" cy="10" r="2" /></>,
    copy: <><rect x="8" y="8" width="10" height="10" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
    calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
    arrow: <><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></>,
  }
  return <svg aria-hidden="true" className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function App() {
  const [selectedCities, setSelectedCities] = useState(INITIAL_CITIES)
  const [schedules, setSchedules] = useState(DEFAULT_SCHEDULES)
  const [selectedDate, setSelectedDate] = useState('2026-07-12')
  const [twelveHour, setTwelveHour] = useState(false)
  const [showAddCity, setShowAddCity] = useState(false)
  const [toast, setToast] = useState('')

  const cities = selectedCities.map((id) => CITY_LIBRARY[id])
  const overlap = useMemo(() => getBestOverlap(cities, schedules), [cities, schedules])
  const nowUtc = useMemo(() => {
    const now = new Date()
    return now.getUTCHours() * 60 + now.getUTCMinutes()
  }, [])

  const formattedDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${selectedDate}T12:00:00Z`))
  const shortDate = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${selectedDate}T12:00:00Z`))

  function removeCity(cityId) {
    if (selectedCities.length <= 1) {
      showToast('Keep at least one city on the board')
      return
    }
    setSelectedCities((current) => current.filter((id) => id !== cityId))
  }

  function addCity(cityId) {
    if (selectedCities.includes(cityId)) return
    setSelectedCities((current) => [...current, cityId])
    setShowAddCity(false)
  }

  function updateSchedule(cityId, key, value) {
    setSchedules((current) => ({ ...current, [cityId]: { ...current[cityId], [key]: value } }))
  }

  function showToast(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2400)
  }

  function copyInvite() {
    const windowLabel = overlap ? `${formatTime(overlap.start)}–${formatTime(overlap.end)} UTC` : 'no shared working-hours window'
    const cityLabel = cities.map((city) => city.city).join(', ')
    const text = `Crosswind · ${windowLabel} · ${cityLabel}`
    if (navigator.clipboard) navigator.clipboard.writeText(text)
    showToast('Invite details copied')
  }

  const availableCities = Object.values(CITY_LIBRARY).filter((city) => !selectedCities.includes(city.id))
  const timelineHours = Array.from({ length: 13 }, (_, index) => index * 2)
  const currentPercent = (nowUtc / 1440) * 100
  const overlapLeft = overlap ? (overlap.start / 1440) * 100 : 0
  const overlapWidth = overlap ? ((overlap.end - overlap.start) / 1440) * 100 : 0

  return (
    <div className="app-shell">
      <div className="ambient-glow ambient-glow--top" />
      <div className="ambient-glow ambient-glow--bottom" />

      <header className="topbar">
        <a className="brand" href="#top" aria-label="Crosswind home">
          <span className="brand-mark">↗</span>
          <span>
            <strong>crosswind</strong>
            <small>timezone planner</small>
          </span>
        </a>
        <div className="topbar-meta">
          <span className="live-dot" />
          <span>Live board</span>
          <span className="meta-divider" />
          <span className="topbar-date">{shortDate}</span>
        </div>
      </header>

      <main id="top" className="page-content">
        <section className="intro-section">
          <div className="eyebrow"><span className="eyebrow-line" /> Coordinate the far apart</div>
          <div className="intro-copy">
            <div>
              <h1>Find your <em>shared hour.</em></h1>
              <p>One clear view of the working day, wherever the team is waking up.</p>
            </div>
            <div className="intro-signal">
              <span className="signal-label">Today’s signal</span>
              <strong>{overlap ? `${Math.round((overlap.end - overlap.start) / 60)}h` : '—'}</strong>
              <span>of breathing room</span>
            </div>
          </div>
        </section>

        <section className="control-panel" aria-label="Planner controls">
          <div className="control-date">
            <span className="control-label">Plan for</span>
            <label className="date-field">
              <Icon name="calendar" size={16} />
              <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} aria-label="Choose a date" />
            </label>
            <span className="date-spelled">{formattedDate}</span>
          </div>
          <div className="control-divider" />
          <div className="city-selector">
            <span className="control-label">Comparing</span>
            <div className="city-chips">
              {cities.map((city) => (
                <span className="city-chip" key={city.id} style={{ '--chip-color': city.color }}>
                  <span className="chip-initials">{city.code.slice(0, 2)}</span>
                  <span>{city.city}</span>
                  <button type="button" onClick={() => removeCity(city.id)} aria-label={`Remove ${city.city}`}><Icon name="close" size={13} /></button>
                </span>
              ))}
              <div className="add-city-wrap">
                <button type="button" className="add-city-button" onClick={() => setShowAddCity((current) => !current)} aria-expanded={showAddCity}>
                  <Icon name="plus" size={15} /> Add city <Icon name="chevron" size={13} />
                </button>
                {showAddCity && (
                  <div className="city-menu">
                    <span className="menu-label">Add a city</span>
                    {availableCities.length ? availableCities.map((city) => (
                      <button type="button" key={city.id} className="city-menu-item" onClick={() => addCity(city.id)}>
                        <span className="menu-color" style={{ background: city.color }} />
                        <span>{city.city}</span>
                        <small>{formatOffset(city.offset)}</small>
                      </button>
                    )) : <span className="empty-menu">All cities are on the board</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="planner-layout">
          <div className="board-card">
            <div className="board-heading">
              <div>
                <span className="section-kicker">Overlap board</span>
                <h2>When can everyone show up?</h2>
              </div>
              <div className="view-toggle" role="group" aria-label="Time format">
                <button type="button" className={!twelveHour ? 'is-active' : ''} onClick={() => setTwelveHour(false)}>24h</button>
                <button type="button" className={twelveHour ? 'is-active' : ''} onClick={() => setTwelveHour(true)}>AM / PM</button>
              </div>
            </div>

            <div className="board-meta-row">
              <span><span className="legend-dot legend-dot--overlap" /> Shared working time</span>
              <span><span className="legend-dot legend-dot--office" /> Office hours</span>
              <span className="board-timezone"><Icon name="clock" size={14} /> Timeline shown in UTC</span>
            </div>

            <div className="timeline-board">
              <div className="timeline-head">
                <div className="city-column-label">CITY / LOCAL TIME</div>
                <div className="axis-column">
                  <div className="axis-grid">
                    {timelineHours.map((hour) => <span key={hour}>{formatTime(hour * 60, twelveHour)}</span>)}
                  </div>
                  <div className="day-marker day-marker--start">midnight</div>
                  <div className="day-marker day-marker--end">midnight</div>
                </div>
              </div>

              <div className="timeline-body">
                <div className="timeline-overlay" aria-hidden="true">
                  {overlap && <div className="overlap-band" style={{ left: `${overlapLeft}%`, width: `${overlapWidth}%` }}><span>sweet spot</span></div>}
                  <div className="now-line" style={{ left: `${currentPercent}%` }}><span>now</span></div>
                </div>
                {cities.map((city) => {
                  const ranges = utcRanges(city, schedules[city.id])
                  const localNow = localTimeFromUtc(nowUtc, city.offset)
                  return (
                    <div className="timeline-row" key={city.id}>
                      <div className="city-label" style={{ '--city-color': city.color, '--city-soft': city.soft }}>
                        <span className="city-avatar">{city.code.slice(0, 2)}</span>
                        <span className="city-label-copy"><strong>{city.city}</strong><small>{formatTime(localNow, twelveHour)} · {city.zone}</small></span>
                      </div>
                      <div className="timeline-track">
                        <div className="track-grid" aria-hidden="true">{timelineHours.map((hour) => <i key={hour} />)}</div>
                        {ranges.map((range, index) => {
                          const rangeStart = range.start / 1440 * 100
                          const rangeWidth = (range.end - range.start) / 1440 * 100
                          const rangeIsOverlap = overlap && range.start <= overlap.start && range.end >= overlap.end
                          return <div key={`${city.id}-${index}`} className={`office-range ${rangeIsOverlap ? 'office-range--overlap' : ''}`} style={{ left: `${rangeStart}%`, width: `${rangeWidth}%`, '--range-color': city.color }}><span>{formatTime((range.start + city.offset * 60 + 1440) % 1440, twelveHour)}–{formatTime((range.end + city.offset * 60) % 1440, twelveHour)}</span></div>
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="board-footer"><span><Icon name="sun" size={15} /> Sun arc is a guide — not a constraint.</span><span>Drag-free clarity for your next invite.</span></div>
          </div>

          <aside className="insight-column">
            <div className="sweet-spot-card">
              <div className="card-topline"><span className="sun-badge"><Icon name="sun" size={17} /></span><span>Best shared window</span><span className="sparkle">✦</span></div>
              {overlap ? (
                <>
                  <div className="overlap-time">{formatTime(overlap.start, twelveHour)} <span>→</span> {formatTime(overlap.end, twelveHour)}</div>
                  <div className="overlap-zone">{twelveHour ? 'local conversions below' : 'UTC · your anchor for the invite'}</div>
                  <div className="local-conversions">
                    {cities.map((city) => <div className="conversion-row" key={city.id}><span className="conversion-city"><i style={{ background: city.color }} />{city.city}</span><strong>{formatTime(localTimeFromUtc(overlap.start, city.offset), twelveHour)}–{formatTime(localTimeFromUtc(overlap.end, city.offset), twelveHour)}</strong></div>)}
                  </div>
                  <button type="button" className="primary-action" onClick={copyInvite}><Icon name="copy" size={16} /> Copy invite details</button>
                </>
              ) : (
                <>
                  <div className="overlap-time overlap-time--empty">No shared window</div>
                  <div className="overlap-zone">Try widening one team’s working hours.</div>
                  <button type="button" className="primary-action" onClick={() => showToast('Adjust the working hours to find a window')}><Icon name="clock" size={16} /> Find a window</button>
                </>
              )}
            </div>

            <div className="hours-card">
              <div className="hours-heading"><div><span className="section-kicker">Team rhythm</span><h3>Working hours</h3></div><span className="hours-note">local time</span></div>
              <div className="hours-list">
                {cities.map((city) => (
                  <div className="hours-row" key={city.id}>
                    <div className="hours-city"><span className="hours-dot" style={{ background: city.color }} /><strong>{city.code}</strong></div>
                    <div className="hours-inputs">
                      <input type="time" value={schedules[city.id].start} onChange={(event) => updateSchedule(city.id, 'start', event.target.value)} aria-label={`${city.city} start time`} />
                      <span>—</span>
                      <input type="time" value={schedules[city.id].end} onChange={(event) => updateSchedule(city.id, 'end', event.target.value)} aria-label={`${city.city} end time`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="tip-card"><span className="tip-mark">↗</span><div><strong>Small team, wide world?</strong><p>Keep the shared hour for decisions. Leave updates async.</p></div></div>
          </aside>
        </section>
      </main>
      {toast && <div className="toast" role="status"><span className="toast-check">✓</span>{toast}</div>}
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
