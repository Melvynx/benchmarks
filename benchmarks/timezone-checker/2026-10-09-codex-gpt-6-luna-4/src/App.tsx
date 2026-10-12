import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

type City = { id: string; name: string; country: string; countryCode: string; zone: string; region: string }
type Mode = 'meeting' | 'base'
type Preferences = { cities: string[]; wake: number; sleep: number; format: '12h' | '24h'; mode: Mode }
type ZonedTime = { year: number; month: number; day: number; hour: number; minute: number; second: number }

const CITIES: City[] = [
  { id: 'vancouver', name: 'Vancouver', country: 'Canada', countryCode: 'CA', zone: 'America/Vancouver', region: 'North America' },
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', countryCode: 'US', zone: 'America/Los_Angeles', region: 'North America' },
  { id: 'chicago', name: 'Chicago', country: 'United States', countryCode: 'US', zone: 'America/Chicago', region: 'North America' },
  { id: 'new-york', name: 'New York', country: 'United States', countryCode: 'US', zone: 'America/New_York', region: 'North America' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', countryCode: 'MX', zone: 'America/Mexico_City', region: 'North America' },
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', countryCode: 'CO', zone: 'America/Bogota', region: 'South America' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', countryCode: 'BR', zone: 'America/Sao_Paulo', region: 'South America' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', countryCode: 'AR', zone: 'America/Argentina/Buenos_Aires', region: 'South America' },
  { id: 'santiago', name: 'Santiago', country: 'Chile', countryCode: 'CL', zone: 'America/Santiago', region: 'South America' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', countryCode: 'PT', zone: 'Europe/Lisbon', region: 'Europe' },
  { id: 'london', name: 'London', country: 'United Kingdom', countryCode: 'GB', zone: 'Europe/London', region: 'Europe' },
  { id: 'paris', name: 'Paris', country: 'France', countryCode: 'FR', zone: 'Europe/Paris', region: 'Europe' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', countryCode: 'CH', zone: 'Europe/Zurich', region: 'Europe' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', countryCode: 'DE', zone: 'Europe/Berlin', region: 'Europe' },
  { id: 'istanbul', name: 'Istanbul', country: 'Türkiye', countryCode: 'TR', zone: 'Europe/Istanbul', region: 'Europe' },
  { id: 'casablanca', name: 'Casablanca', country: 'Morocco', countryCode: 'MA', zone: 'Africa/Casablanca', region: 'Africa' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', countryCode: 'NG', zone: 'Africa/Lagos', region: 'Africa' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', countryCode: 'EG', zone: 'Africa/Cairo', region: 'Africa' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', countryCode: 'KE', zone: 'Africa/Nairobi', region: 'Africa' },
  { id: 'cape-town', name: 'Cape Town', country: 'South Africa', countryCode: 'ZA', zone: 'Africa/Johannesburg', region: 'Africa' },
  { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', countryCode: 'SA', zone: 'Asia/Riyadh', region: 'Middle East' },
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', zone: 'Asia/Dubai', region: 'Middle East' },
  { id: 'tehran', name: 'Tehran', country: 'Iran', countryCode: 'IR', zone: 'Asia/Tehran', region: 'Middle East' },
  { id: 'mumbai', name: 'Mumbai', country: 'India', countryCode: 'IN', zone: 'Asia/Kolkata', region: 'Asia' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', countryCode: 'NP', zone: 'Asia/Kathmandu', region: 'Asia' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', countryCode: 'TH', zone: 'Asia/Bangkok', region: 'Asia' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', countryCode: 'SG', zone: 'Asia/Singapore', region: 'Asia' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', countryCode: 'ID', zone: 'Asia/Makassar', region: 'Asia' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'China', countryCode: 'HK', zone: 'Asia/Hong_Kong', region: 'Asia' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', countryCode: 'JP', zone: 'Asia/Tokyo', region: 'Asia' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', countryCode: 'KR', zone: 'Asia/Seoul', region: 'Asia' },
  { id: 'perth', name: 'Perth', country: 'Australia', countryCode: 'AU', zone: 'Australia/Perth', region: 'Oceania' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', countryCode: 'AU', zone: 'Australia/Sydney', region: 'Oceania' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', countryCode: 'NZ', zone: 'Pacific/Auckland', region: 'Oceania' },
]

const DEFAULTS: Preferences = { cities: ['san-francisco', 'denpasar', 'geneva'], wake: 7, sleep: 23, format: '12h', mode: 'meeting' }
const STORAGE_KEY = 'gpt6-timezone-overlap-v1'

function readPreferences(): Preferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULTS
    const value = JSON.parse(stored) as Partial<Preferences>
    const allowed = new Set(CITIES.map((city) => city.id))
    const cities = Array.isArray(value.cities) ? [...new Set(value.cities.filter((id): id is string => typeof id === 'string' && allowed.has(id)))] : DEFAULTS.cities
    return {
      cities,
      wake: Number.isInteger(value.wake) && value.wake! >= 0 && value.wake! <= 23 ? value.wake! : DEFAULTS.wake,
      sleep: Number.isInteger(value.sleep) && value.sleep! >= 0 && value.sleep! <= 23 ? value.sleep! : DEFAULTS.sleep,
      format: value.format === '24h' ? '24h' : '12h',
      mode: value.mode === 'base' ? 'base' : 'meeting',
    }
  } catch {
    return DEFAULTS
  }
}

function timeParts(date: Date, zone: string): ZonedTime {
  const values = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: string) => Number(values.find((item) => item.type === type)?.value ?? 0)
  return { year: part('year'), month: part('month'), day: part('day'), hour: part('hour') % 24, minute: part('minute'), second: part('second') }
}

function offsetAt(date: Date, zone: string) {
  const local = timeParts(date, zone)
  const utcAsLocal = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second)
  return Math.round((utcAsLocal - date.getTime()) / 60_000)
}

function instantForWallHour(zone: string, year: number, month: number, day: number, hour: number) {
  const wall = Date.UTC(year, month - 1, day, hour)
  let timestamp = wall
  for (let index = 0; index < 3; index += 1) timestamp = wall - offsetAt(new Date(timestamp), zone) * 60_000
  return new Date(timestamp)
}

function isAwake(time: ZonedTime, wake: number, sleep: number) {
  if (wake === sleep) return true
  const value = time.hour + time.minute / 60
  return wake < sleep ? value >= wake && value < sleep : value >= wake || value < sleep
}

function formatHour(hour: number, format: Preferences['format'], minute = 0) {
  const normalized = ((hour % 24) + 24) % 24
  const h = Math.floor(normalized)
  const mins = minute || Math.round((normalized - h) * 60)
  if (format === '24h') return `${String(h).padStart(2, '0')}${mins ? `:${String(mins).padStart(2, '0')}` : ''}`
  const shown = h % 12 || 12
  return `${shown}${mins ? `:${String(mins).padStart(2, '0')}` : ''}${h < 12 ? 'a' : 'p'}`
}

function formatCurrentTime(time: ZonedTime, format: Preferences['format']) {
  if (format === '24h') return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`
  return `${time.hour % 12 || 12}:${String(time.minute).padStart(2, '0')} ${time.hour < 12 ? 'AM' : 'PM'}`
}

function formatOffset(minutes: number) {
  const sign = minutes < 0 ? '−' : '+'
  const absolute = Math.abs(minutes)
  const hours = Math.floor(absolute / 60)
  const mins = absolute % 60
  return `UTC${sign}${hours}${mins ? `:${String(mins).padStart(2, '0')}` : ''}`
}

function makeRanges(hours: boolean[], format: Preferences['format']) {
  const count = hours.filter(Boolean).length
  if (count === 0) return { count, ranges: [] as string[] }
  if (count === 24) return { count, ranges: [`${formatHour(0, format)} — ${formatHour(24, format)}`] }
  const ranges: string[] = []
  let start = -1
  for (let hour = 0; hour <= 24; hour += 1) {
    const active = hour < 24 && hours[hour]
    if (active && start === -1) start = hour
    if (!active && start !== -1) {
      ranges.push(`${formatHour(start, format)} — ${formatHour(hour, format)}`)
      start = -1
    }
  }
  if (hours[0] && hours[23] && ranges.length > 1) {
    const first = ranges.shift()!
    const last = ranges.pop()!
    const from = last.split(' — ')[0]
    const to = first.split(' — ')[1]
    ranges.push(`${from} — ${to} +1d`)
  }
  return { count, ranges }
}

function flag(code: string) {
  return String.fromCodePoint(...[...code].map((letter) => letter.charCodeAt(0) + 127397))
}

function Icon({ name, size = 18 }: { name: 'globe' | 'plus' | 'search' | 'close' | 'settings' | 'sun' | 'moon' | 'chevron' | 'arrow'; size?: number }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const }
  const paths = {
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3.5 9h17M3.5 15h17M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.2 4.2" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    settings: <><path d="M12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z" /><path d="m19.4 13.5 1.1.8-1.3 2.3-1.3-.5a7.8 7.8 0 0 1-1.3.8l-.2 1.4h-2.7l-.3-1.4a7.8 7.8 0 0 1-1.4-.8l-1.3.5-1.3-2.3 1.1-.8a6.8 6.8 0 0 1 0-1.6l-1.1-.8 1.3-2.3 1.3.5a7.8 7.8 0 0 1 1.4-.8l.3-1.4h2.7l.2 1.4a7.8 7.8 0 0 1 1.3.8l1.3-.5 1.3 2.3-1.1.8a6.8 6.8 0 0 1 0 1.6Z" transform="translate(-1.2 -1.2)" /></>,
    sun: <><circle cx="12" cy="12" r="3.6" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></>,
    moon: <path d="M19.7 15.1A8.6 8.6 0 0 1 8.9 4.3 8.7 8.7 0 1 0 19.7 15Z" />,
    chevron: <path d="m7 10 5 5 5-5" />,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
  }
  return <svg {...props}>{paths[name]}</svg>
}

function App() {
  const [preferences, setPreferences] = useState<Preferences>(readPreferences)
  const [now, setNow] = useState(() => new Date())
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const searchBox = useRef<HTMLDivElement>(null)
  const settingsBox = useRef<HTMLDivElement>(null)
  const cities = preferences.cities.map((id) => CITIES.find((city) => city.id === id)).filter((city): city is City => Boolean(city))
  const reference = cities[0]

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  }, [preferences])

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (searchBox.current && !searchBox.current.contains(target)) setSearchOpen(false)
      if (settingsBox.current && !settingsBox.current.contains(target)) setSettingsOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutside)
    return () => document.removeEventListener('mousedown', closeOnOutside)
  }, [])

  const today = reference ? timeParts(now, reference.zone) : timeParts(now, 'UTC')
  const dateLabel = new Intl.DateTimeFormat('en-US', { timeZone: reference?.zone ?? 'UTC', weekday: 'long', month: 'long', day: 'numeric' }).format(now)
  const weekLabel = new Intl.DateTimeFormat('en-US', { timeZone: reference?.zone ?? 'UTC', weekday: 'short' }).format(now)
  const model = useMemo(() => {
    if (!reference) return { hours: [] as number[], localTimes: [] as ZonedTime[][], awake: [] as boolean[][], offsets: [] as number[], meeting: [] as boolean[], pairs: [] as boolean[][] }
    const hours = Array.from({ length: 24 }, (_, hour) => hour)
    const instants = hours.map((hour) => instantForWallHour(reference.zone, today.year, today.month, today.day, hour))
    const localTimes = cities.map((city) => instants.map((instant) => timeParts(instant, city.zone)))
    const awake = localTimes.map((times) => times.map((time) => isAwake(time, preferences.wake, preferences.sleep)))
    const meeting = hours.map((_, hour) => awake.every((cityHours) => cityHours[hour]))
    const pairs = awake.slice(1).map((cityHours) => hours.map((_, hour) => awake[0][hour] && cityHours[hour]))
    return { hours, localTimes, awake, offsets: cities.map((city) => offsetAt(now, city.zone)), meeting, pairs }
  }, [reference, cities, today.year, today.month, today.day, preferences.wake, preferences.sleep, now])

  const searchResults = CITIES.filter((city) => !preferences.cities.includes(city.id) && `${city.name} ${city.country} ${city.region}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 7)
  const rangeForMode = (cityIndex: number) => preferences.mode === 'meeting' ? model.meeting : cityIndex === 0 ? [] : model.pairs[cityIndex - 1] ?? []
  const meetingRange = makeRanges(model.meeting, preferences.format)

  const update = (changes: Partial<Preferences>) => setPreferences((previous) => ({ ...previous, ...changes }))
  const addCity = (city: City) => {
    update({ cities: [...preferences.cities, city.id] })
    setQuery('')
    setSearchOpen(false)
  }
  const removeCity = (id: string) => update({ cities: preferences.cities.filter((cityId) => cityId !== id) })
  const promoteCity = (id: string) => update({ cities: [id, ...preferences.cities.filter((cityId) => cityId !== id)] })

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brandmark" aria-hidden="true"><Icon name="globe" size={20} /></div>
        <div className="brand-copy"><span className="brand-kicker">WORLD CLOCK STUDIO</span><span className="brand-caption">A little more in sync.</span></div>
        <div className="topbar-right"><span className="live-dot" /> LOCAL TIMES, LIVE <span className="topbar-divider" /> <span className="date-top">{dateLabel}</span></div>
      </header>

      <main className="page-content">
        <section className="hero-row">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-rule" /> YOUR TEAM, IN EVERY TIME ZONE</div>
            <h1>GPT-6</h1>
            <p className="hero-subtitle">Find the hours that bring everyone together.</p>
          </div>
          <div className="hero-aside"><div className="date-card-icon"><span className="calendar-dot" /><span className="calendar-bars" /></div><div><span className="date-label">REFERENCE DAY</span><strong>{weekLabel}, {today.month}/{today.day}</strong></div></div>
        </section>

        <section className="toolbar" aria-label="Compare time zones">
          <div className="mode-switch" role="tablist" aria-label="Availability mode">
            <button className={preferences.mode === 'meeting' ? 'mode-button selected' : 'mode-button'} onClick={() => update({ mode: 'meeting' })} role="tab" aria-selected={preferences.mode === 'meeting'}>
              <span className="mode-icon meeting-icon"><span /><span /><span /></span><span>Meeting</span>
            </button>
            <button className={preferences.mode === 'base' ? 'mode-button selected' : 'mode-button'} onClick={() => update({ mode: 'base' })} role="tab" aria-selected={preferences.mode === 'base'}>
              <span className="mode-icon base-icon"><span /><span /></span><span>Base</span>
            </button>
          </div>
          <div className="toolbar-spacer" />
          <div className="search-wrap" ref={searchBox}>
            <div className={searchOpen ? 'city-search focused' : 'city-search'}>
              <Icon name="search" size={17} />
              <input aria-label="Search cities and countries" value={query} placeholder="Add a city or country" onFocus={() => setSearchOpen(true)} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true) }} onKeyDown={(event) => { if (event.key === 'Escape') setSearchOpen(false); if (event.key === 'Enter' && searchResults[0]) addCity(searchResults[0]) }} />
              <button className="add-city-button" aria-label="Add first matching city" onClick={() => searchResults[0] && addCity(searchResults[0])}><Icon name="plus" size={17} /></button>
            </div>
            {searchOpen && <div className="search-dropdown">
              {searchResults.length ? <>{query.trim() && <div className="dropdown-label">MATCHING CITIES</div>}{searchResults.map((city) => <button key={city.id} className="search-result" onClick={() => addCity(city)}><span className="result-flag">{flag(city.countryCode)}</span><span className="result-name">{city.name}<small>{city.country}</small></span><span className="result-region">{city.region}</span><Icon name="plus" size={15} /></button>)}</> : <div className="empty-search">{query.trim() ? 'No more cities match that search.' : 'All catalog cities are already added.'}</div>}
            </div>}
          </div>
          <div className="settings-wrap" ref={settingsBox}>
            <button className={settingsOpen ? 'settings-button is-open' : 'settings-button'} onClick={() => setSettingsOpen((open) => !open)} aria-expanded={settingsOpen} aria-label="Open availability settings"><Icon name="settings" size={18} /><span>Settings</span></button>
            {settingsOpen && <div className="settings-popover">
              <div className="popover-heading"><div><span className="dropdown-label">PERSONAL HOURS</span><h2>Availability</h2></div><button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><Icon name="close" size={16} /></button></div>
              <p className="popover-copy">Everyone shares the same awake window.</p>
              <div className="settings-fields">
                <label><span><Icon name="sun" size={16} /> Wake-up</span><select value={preferences.wake} onChange={(event) => update({ wake: Number(event.target.value) })}>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{formatHour(hour, preferences.format)}</option>)}</select></label>
                <label><span><Icon name="moon" size={16} /> Wind down</span><select value={preferences.sleep} onChange={(event) => update({ sleep: Number(event.target.value) })}>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{formatHour(hour, preferences.format)}</option>)}</select></label>
              </div>
              <div className="format-control"><span>TIME FORMAT</span><div className="format-options"><button className={preferences.format === '12h' ? 'active' : ''} onClick={() => update({ format: '12h' })}>12 hour</button><button className={preferences.format === '24h' ? 'active' : ''} onClick={() => update({ format: '24h' })}>24 hour</button></div></div>
              <div className="awake-preview"><span className="preview-sun"><Icon name="sun" size={17} /></span><span>Awake from <b>{formatHour(preferences.wake, preferences.format)}</b> to <b>{formatHour(preferences.sleep, preferences.format)}</b></span></div>
            </div>}
          </div>
        </section>

        {preferences.mode === 'meeting' ? <section className="summary meeting-summary" aria-live="polite">
          <div className="summary-symbol"><span /><span /><span /></div>
          <div className="summary-main"><div className="summary-heading">{cities.length > 1 ? 'SHARED AWAKE HOURS' : 'ADD A CITY TO FIND OVERLAP'}<span className="summary-date">{reference ? `${reference.name.toUpperCase()} TIME` : 'NO REFERENCE CITY'}</span></div>
            {cities.length < 2 ? <strong className="summary-message">Add another city to compare schedules.</strong> : meetingRange.count ? <div className="range-row"><strong className="summary-hours">{meetingRange.count}<small> {meetingRange.count === 1 ? 'hour' : 'hours'}</small></strong><div className="range-divider" />{meetingRange.ranges.map((range) => <span className="range-badge" key={range}>{range}</span>)}</div> : <strong className="summary-message warning">No shared awake hours — try Base mode or adjust availability.</strong>}
          </div>
          <div className="summary-note"><span className="sparkle">✳</span> {cities.length > 1 ? 'Everyone is awake' : 'Start comparing'}</div>
        </section> : <section className="summary base-summary" aria-live="polite">
          <div className="base-summary-head"><div className="summary-symbol base-summary-symbol"><span /><span /></div><div><div className="summary-heading">ONE-TO-ONE WINDOWS</div><p>Each city compared with <b>{reference?.name ?? 'your base'}</b></p></div><span className="base-summary-date">{reference ? `${reference.name.toUpperCase()} TIME` : 'NO REFERENCE CITY'}</span></div>
          <div className="pair-summary-list">{cities.length < 2 ? <div className="pair-summary-empty">Add another city to compare against your base.</div> : cities.slice(1).map((city, index) => {
            const result = makeRanges(model.pairs[index] ?? [], preferences.format)
            return <div className="pair-summary-row" key={city.id}><span className="pair-city"><span>{flag(city.countryCode)}</span>{city.name}</span>{result.count ? <><strong>{result.count}<small> {result.count === 1 ? 'hr' : 'hrs'}</small></strong><div className="pair-ranges">{result.ranges.map((range) => <span className="range-badge" key={range}>{range}</span>)}</div></> : <strong className="pair-warning">No shared awake hours</strong>}</div>
          })}</div>
        </section>}

        <section className="schedule-card" aria-label="Timezone availability grid">
          <div className="schedule-topline"><div><span className="schedule-title">DAILY OVERLAP</span><span className="schedule-date">{dateLabel} <span>·</span> {reference ? formatCurrentTime(today, preferences.format) : 'Choose a city to begin'}</span></div><div className="legend"><span><i className="legend-swatch overlap-swatch" />{preferences.mode === 'meeting' ? 'Everyone awake' : 'Shared with base'}</span><span><i className="legend-swatch awake-swatch" />Awake</span><span><i className="legend-swatch sleep-swatch" />Asleep</span></div></div>
          {cities.length ? <>
            <div className="desktop-grid-wrap">
              <div className="desktop-grid">
                <div className="grid-head city-head"><span>CITY / CURRENT TIME</span></div>
                {model.hours.map((hour) => <div className={hour === today.hour ? 'hour-head current-hour' : 'hour-head'} key={hour}><span>{formatHour(hour, preferences.format)}</span>{hour === today.hour && <i />}</div>)}
                <div className="grid-head remove-head" />
                {cities.map((city, cityIndex) => <CityGridRow key={city.id} city={city} cityIndex={cityIndex} times={model.localTimes[cityIndex] ?? []} awake={model.awake[cityIndex] ?? []} offsets={model.offsets[cityIndex] ?? 0} overlap={rangeForMode(cityIndex)} now={now} format={preferences.format} onPromote={() => cityIndex > 0 && promoteCity(city.id)} onRemove={() => removeCity(city.id)} />)}
              </div>
            </div>
            <div className="mobile-grid-wrap">
              <div className="mobile-grid" style={{ '--city-count': cities.length } as CSSProperties}>
                <div className="mobile-hour-head"><span>REFERENCE</span>{cities.map((city, index) => <div className="mobile-city-head" key={city.id}><span className="mobile-city-flag">{flag(city.countryCode)}</span><button onClick={() => index > 0 && promoteCity(city.id)}>{city.name}</button>{index === 0 && <span className="ref-badge">REF</span>}<small>{formatOffset(model.offsets[index] ?? 0)}</small><button className="mobile-remove" aria-label={`Remove ${city.name}`} onClick={() => removeCity(city.id)}><Icon name="close" size={14} /></button></div>)}</div>
                {model.hours.map((hour) => <div className="mobile-grid-row" key={hour}><div className={hour === today.hour ? 'mobile-ref-hour is-current' : 'mobile-ref-hour'}>{formatHour(hour, preferences.format)}{hour === today.hour && <span>NOW</span>}</div>{cities.map((city, cityIndex) => {
                  const time = model.localTimes[cityIndex]?.[hour]
                  const awake = model.awake[cityIndex]?.[hour] ?? false
                  const overlap = preferences.mode === 'meeting' ? model.meeting[hour] : cityIndex > 0 && (model.pairs[cityIndex - 1]?.[hour] ?? false)
                  return <div className={`mobile-time-cell ${awake ? 'awake' : 'sleeping'} ${overlap ? 'overlap' : ''}`} key={`${city.id}-${hour}`}><span>{time ? formatHour(time.hour + time.minute / 60, preferences.format) : '—'}</span>{overlap && <i />}</div>
                })}</div>)}
              </div>
            </div>
          </> : <div className="empty-schedule"><div className="empty-globe"><Icon name="globe" size={26} /></div><strong>Your world clock starts here.</strong><p>Add a city above to build your comparison.</p></div>}
          <div className="schedule-footer"><div className="footer-hint"><span className="hint-check">✓</span><span><b>Green cells = {preferences.mode === 'meeting' ? 'everyone awake' : 'shared awake time with base'}</b><small>Hours run in {reference?.name ?? 'reference city'} time. Click a city name to make it your base.</small></span></div><div className="schedule-footer-right"><span>UTC OFFSETS UPDATE WITH DST</span><button onClick={() => update({ cities: DEFAULTS.cities, mode: DEFAULTS.mode, wake: DEFAULTS.wake, sleep: DEFAULTS.sleep, format: DEFAULTS.format })}>Reset to default <Icon name="arrow" size={13} /></button></div></div>
        </section>
        <footer className="page-footer"><span>MADE FOR TEAMS AROUND THE WORLD</span><span>All times reflect current local offsets</span></footer>
      </main>
    </div>
  )
}

function CityGridRow({ city, cityIndex, times, awake, offsets, overlap, now, format, onPromote, onRemove }: {
  city: City; cityIndex: number; times: ZonedTime[]; awake: boolean[]; offsets: number; overlap: boolean[]; now: Date; format: Preferences['format']; onPromote: () => void; onRemove: () => void
}) {
  const current = timeParts(now, city.zone)
  return <>
    <div className="city-info">
      <span className="city-flag">{flag(city.countryCode)}</span>
      <div className="city-name-group"><div className="city-name-line"><button className={cityIndex === 0 ? 'city-name reference-name' : 'city-name'} onClick={onPromote} title={cityIndex === 0 ? 'Current reference city' : `Make ${city.name} the reference city`}>{city.name}</button>{cityIndex === 0 && <span className="ref-badge">REF</span>}</div><div className="city-meta">{city.country}<span />{formatOffset(offsets)}</div></div>
      <div className="city-local-now"><span>NOW</span><strong>{formatCurrentTime(current, format)}</strong></div>
    </div>
    {times.map((time, hour) => {
      const isOverlap = cityIndex === 0 ? overlap[hour] : overlap[hour]
      const state = !awake[hour] ? 'sleeping' : isOverlap ? 'overlap' : 'awake'
      const shown = formatHour(time.hour + time.minute / 60, format)
      return <div className={`time-cell ${state}`} key={`${city.id}-${hour}`} title={`${city.name}: ${formatCurrentTime(time, format)}${state === 'overlap' ? ' · shared awake time' : state === 'sleeping' ? ' · asleep' : ' · awake'}`}><span>{shown}</span>{hour === 12 && <small>LOCAL</small>}</div>
    })}
    <div className="row-actions"><button aria-label={`Remove ${city.name}`} title={`Remove ${city.name}`} onClick={onRemove}><Icon name="close" size={15} /></button></div>
  </>
}

export default App
