import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const CITIES = [
  ['San Francisco', 'United States', 'America/Los_Angeles'], ['New York', 'United States', 'America/New_York'], ['Chicago', 'United States', 'America/Chicago'], ['Mexico City', 'Mexico', 'America/Mexico_City'], ['Toronto', 'Canada', 'America/Toronto'], ['Vancouver', 'Canada', 'America/Vancouver'],
  ['São Paulo', 'Brazil', 'America/Sao_Paulo'], ['Buenos Aires', 'Argentina', 'America/Argentina/Buenos_Aires'], ['Bogotá', 'Colombia', 'America/Bogota'], ['Santiago', 'Chile', 'America/Santiago'],
  ['London', 'United Kingdom', 'Europe/London'], ['Geneva', 'Switzerland', 'Europe/Zurich'], ['Paris', 'France', 'Europe/Paris'], ['Berlin', 'Germany', 'Europe/Berlin'], ['Madrid', 'Spain', 'Europe/Madrid'], ['Rome', 'Italy', 'Europe/Rome'], ['Lisbon', 'Portugal', 'Europe/Lisbon'], ['Reykjavík', 'Iceland', 'Atlantic/Reykjavik'], ['Kyiv', 'Ukraine', 'Europe/Kyiv'],
  ['Cairo', 'Egypt', 'Africa/Cairo'], ['Lagos', 'Nigeria', 'Africa/Lagos'], ['Nairobi', 'Kenya', 'Africa/Nairobi'], ['Johannesburg', 'South Africa', 'Africa/Johannesburg'], ['Dubai', 'United Arab Emirates', 'Asia/Dubai'], ['Riyadh', 'Saudi Arabia', 'Asia/Riyadh'], ['Tel Aviv', 'Israel', 'Asia/Jerusalem'],
  ['Mumbai', 'India', 'Asia/Kolkata'], ['Kathmandu', 'Nepal', 'Asia/Kathmandu'], ['Singapore', 'Singapore', 'Asia/Singapore'], ['Bangkok', 'Thailand', 'Asia/Bangkok'], ['Hong Kong', 'Hong Kong', 'Asia/Hong_Kong'], ['Tokyo', 'Japan', 'Asia/Tokyo'], ['Seoul', 'South Korea', 'Asia/Seoul'], ['Shanghai', 'China', 'Asia/Shanghai'], ['Denpasar', 'Indonesia', 'Asia/Makassar'], ['Perth', 'Australia', 'Australia/Perth'], ['Sydney', 'Australia', 'Australia/Sydney'], ['Auckland', 'New Zealand', 'Pacific/Auckland']
].map(([name, country, zone]) => ({ name, country, zone }))

const DEFAULTS = { cityNames: ['San Francisco', 'Denpasar', 'Geneva'], wake: 7, sleep: 23, format: '12', mode: 'meeting' }
const byName = (name) => CITIES.find((city) => city.name === name)
const initial = () => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('worldtime-settings') || '{}') } } catch { return DEFAULTS }
}

function partsInZone(date, zone) {
  const values = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', minute: '2-digit' }).formatToParts(date)
  return Object.fromEntries(values.filter((x) => x.type !== 'literal').map((x) => [x.type, Number(x.value)]))
}
function offsetMinutes(date, zone) {
  const p = partsInZone(date, zone)
  return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - date.getTime()) / 60000)
}
function instantForRefHour(zone, y, m, d, hour) {
  const guess = Date.UTC(y, m - 1, d, hour)
  return new Date(guess - offsetMinutes(new Date(guess), zone) * 60000)
}
function isAwake(hour, wake, sleep) {
  if (wake === sleep) return true
  return wake < sleep ? hour >= wake && hour < sleep : hour >= wake || hour < sleep
}
function fmtHour(hour, format) {
  if (format === '24') return `${String(hour).padStart(2, '0')}:00`
  const suffix = hour < 12 ? 'am' : 'pm'; const h = hour % 12 || 12
  return `${h}${suffix}`
}
function currentOffset(zone) {
  const mins = offsetMinutes(new Date(), zone); const sign = mins >= 0 ? '+' : '−'; const abs = Math.abs(mins); const h = Math.floor(abs / 60); const m = abs % 60
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`
}
function ranges(hours, format) {
  if (!hours.length) return []
  const groups = []; let start = hours[0]; let previous = hours[0]
  for (const hour of hours.slice(1)) { if (hour !== previous + 1) { groups.push([start, previous + 1]); start = hour } previous = hour }
  groups.push([start, previous + 1])
  return groups.map(([a, b]) => `${fmtHour(a, format)} — ${b === 24 ? (format === '24' ? '24:00' : '12am') : fmtHour(b, format)}`)
}

function App() {
  const [saved, setSaved] = useState(initial)
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const cities = saved.cityNames.map(byName).filter(Boolean)
  const ref = cities[0]
  useEffect(() => { localStorage.setItem('worldtime-settings', JSON.stringify(saved)) }, [saved])
  const update = (patch) => setSaved((state) => ({ ...state, ...patch }))
  const computed = useMemo(() => {
    if (!ref) return { rows: [], overlap: [], perCity: new Map() }
    const today = partsInZone(new Date(), ref.zone)
    const instants = Array.from({ length: 24 }, (_, hour) => instantForRefHour(ref.zone, today.year, today.month, today.day, hour))
    const rows = cities.map((city) => ({ ...city, hours: instants.map((instant) => partsInZone(instant, city.zone).hour) }))
    const awakeByCity = rows.map((row) => row.hours.map((hour) => isAwake(hour, saved.wake, saved.sleep)))
    const overlap = Array.from({ length: 24 }, (_, hour) => awakeByCity.every((list) => list[hour]))
    const perCity = new Map(rows.slice(1).map((row, ix) => [row.name, Array.from({ length: 24 }, (_, hour) => awakeByCity[0][hour] && awakeByCity[ix + 1][hour])]))
    return { rows, overlap, perCity }
  }, [cities.map((city) => city.name).join('|'), saved.wake, saved.sleep])
  const promote = (name) => update({ cityNames: [name, ...saved.cityNames.filter((city) => city !== name)] })
  const remove = (name) => update({ cityNames: saved.cityNames.filter((city) => city !== name) })
  const add = (name) => { update({ cityNames: [...saved.cityNames, name] }); setQuery(''); setShowAdd(false) }
  const available = CITIES.filter((city) => !saved.cityNames.includes(city.name) && `${city.name} ${city.country}`.toLowerCase().includes(query.toLowerCase()))
  const modeOverlap = (row, hour) => saved.mode === 'meeting' ? computed.overlap[hour] : row.name !== ref?.name && computed.perCity.get(row.name)?.[hour]
  const summaryHours = computed.overlap.map((x, i) => x ? i : null).filter((x) => x !== null)

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top"><span className="brand-mark">◷</span> common time</a>
      <div className="top-actions">
        <button className="settings-button" onClick={() => setShowSettings(!showSettings)} aria-expanded={showSettings}>⚙ <span>Availability</span></button>
        <div className="mode-switch" aria-label="Overlap mode">
          <button className={saved.mode === 'meeting' ? 'active' : ''} onClick={() => update({ mode: 'meeting' })}>Meeting</button>
          <button className={saved.mode === 'base' ? 'active' : ''} onClick={() => update({ mode: 'base' })}>Base</button>
        </div>
      </div>
      {showSettings && <section className="settings-popover">
        <div className="popover-heading"><strong>Availability</strong><span>Applies to every city</span></div>
        <label>Wake up <select value={saved.wake} onChange={(e) => update({ wake: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{fmtHour(h, saved.format)}</option>)}</select></label>
        <label>Sleep <select value={saved.sleep} onChange={(e) => update({ sleep: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{fmtHour(h, saved.format)}</option>)}</select></label>
        <div className="format-toggle"><span>Time format</span><button className={saved.format === '12' ? 'chosen' : ''} onClick={() => update({ format: '12' })}>12h</button><button className={saved.format === '24' ? 'chosen' : ''} onClick={() => update({ format: '24' })}>24h</button></div>
      </section>}
    </header>

    <section className="intro" id="top">
      <p className="eyebrow">Find the moment that works</p>
      <h1>GPT-5.6 Terra</h1>
      <p>See every team member’s local day, aligned to your reference city.</p>
    </section>

    <section className="controls">
      <div className="reference-note"><span className="pulse-dot" /> <span><strong>{ref?.name || 'Choose a city'}</strong> is your reference</span></div>
      <div className="add-wrap">
        <button className="add-city" onClick={() => setShowAdd(!showAdd)}>+ Add city</button>
        {showAdd && <div className="city-picker">
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search cities or countries" />
          <div className="picker-results">{available.length ? available.slice(0, 7).map((city) => <button key={city.name} onClick={() => add(city.name)}><span>{city.name}</span><small>{city.country}</small></button>) : <p>No matching cities available.</p>}</div>
        </div>}
      </div>
    </section>

    {cities.length >= 2 && <section className={`summary ${saved.mode}`}>
      {saved.mode === 'meeting' ? <>
        <div className="summary-label">GROUP WINDOW</div>
        {summaryHours.length ? <><strong>{summaryHours.length} shared {summaryHours.length === 1 ? 'hour' : 'hours'}</strong><div className="range-list">{ranges(summaryHours, saved.format).map((range) => <span key={range}>{range}</span>)}</div></> : <p className="warning">No shared awake time. Try adjusting the awake window.</p>}
      </> : <>
        <div className="summary-label">BASE WINDOWS · {ref?.name}</div>
        <div className="base-lines">{computed.rows.slice(1).map((row) => { const hours = computed.perCity.get(row.name).map((x, i) => x ? i : null).filter((x) => x !== null); return <div className="base-line" key={row.name}><strong>{row.name}</strong>{hours.length ? <><span>{hours.length}h</span>{ranges(hours, saved.format).map((range) => <em key={range}>{range}</em>)}</> : <span className="no-window">No shared awake time</span>}</div> })}</div>
      </>}
    </section>}

    {!cities.length ? <section className="empty"><h2>Start with a city</h2><p>Add a city to build your time comparison.</p></section> : <>
      <section className="desktop-grid" aria-label="Timezone comparison grid">
        <div className="hour-strip"><div className="city-spacer">REFERENCE TIME<br /><strong>{ref.name}</strong></div><div className="hours">{Array.from({ length: 24 }, (_, h) => <span key={h}>{fmtHour(h, saved.format)}</span>)}</div><div className="remove-spacer" /></div>
        <div className="city-rows">{computed.rows.map((row) => <div className="city-row" key={row.name}>
          <button className="city-info" onClick={() => promote(row.name)} title={`Make ${row.name} the reference city`}><span className="city-name">{row.name} {row.name === ref.name && <b>REF</b>}</span><span>{row.country} · {currentOffset(row.zone)}</span></button>
          <div className="cells">{row.hours.map((localHour, h) => <div key={h} className={`cell ${isAwake(localHour, saved.wake, saved.sleep) ? 'awake' : 'sleep'} ${modeOverlap(row, h) ? 'overlap' : ''}`}><span>{fmtHour(localHour, saved.format)}</span></div>)}</div>
          <button className="remove" disabled={cities.length === 1} onClick={() => remove(row.name)} aria-label={`Remove ${row.name}`}>×</button>
        </div>)}</div>
      </section>
      <section className="mobile-grid" style={{ '--city-count': cities.length }} aria-label="Mobile timezone comparison grid">
        <div className="mobile-header"><div>REF<br /><strong>{ref.name}</strong></div>{computed.rows.map((row) => <button onClick={() => promote(row.name)} key={row.name} className={row.name === ref.name ? 'mobile-city ref-city' : 'mobile-city'}>{row.name === ref.name && <small>REF</small>}<span>{currentOffset(row.zone)}</span></button>)}</div>
        <div className="mobile-hours">{Array.from({ length: 24 }, (_, h) => <div className="mobile-hour-row" key={h}><time>{fmtHour(h, saved.format)}</time>{computed.rows.map((row) => <div key={row.name} className={`mobile-cell ${isAwake(row.hours[h], saved.wake, saved.sleep) ? 'awake' : 'sleep'} ${modeOverlap(row, h) ? 'overlap' : ''}`}>{fmtHour(row.hours[h], saved.format)}</div>)}</div>)}</div>
        <div className="mobile-removal">{cities.map((city) => <button disabled={cities.length === 1} key={city.name} onClick={() => remove(city.name)}>Remove {city.name} ×</button>)}</div>
      </section>
    </>}
    <footer><span className="legend"><i className="legend-overlap" /> Green cells = {saved.mode === 'meeting' ? 'everyone awake' : 'you and that city awake'}</span><span>Hours follow {ref?.name || 'your reference city'} · DST-aware</span></footer>
  </main>
}

createRoot(document.getElementById('root')).render(<App />)
