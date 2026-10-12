import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight, Check, ChevronDown, CircleAlert, Clock3, Globe2,
  GitCompareArrows, Moon, Plus, Search, Settings2, Sun, UsersRound, X,
} from 'lucide-react'
import { CITIES, CITY_BY_ID, type City } from './cities'
import {
  buildSchedule, formatCellTime, formatClock, formatOffset, formatRange,
  getLocalTime, getRanges, type CityRow, type Mode, type Settings, type TimeFormat,
} from './time'

type AppConfig = { cityIds: string[]; mode: Mode; settings: Settings }

const STORAGE_KEY = 'gpt6-timezone-overlap.v1'
const DEFAULT_CONFIG: AppConfig = {
  cityIds: ['san-francisco', 'denpasar', 'geneva'],
  mode: 'meeting',
  settings: { wakeHour: 7, sleepHour: 23, timeFormat: '12h' },
}

function validHour(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 23
}

function restoreConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONFIG
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return DEFAULT_CONFIG
    const config = parsed as Partial<AppConfig>
    const cityIds = Array.isArray(config.cityIds)
      ? [...new Set(config.cityIds.filter((id): id is string => typeof id === 'string' && CITY_BY_ID.has(id)))]
      : DEFAULT_CONFIG.cityIds
    return {
      cityIds,
      mode: config.mode === 'base' ? 'base' : 'meeting',
      settings: {
        wakeHour: validHour(config.settings?.wakeHour) ? config.settings.wakeHour : DEFAULT_CONFIG.settings.wakeHour,
        sleepHour: validHour(config.settings?.sleepHour) ? config.settings.sleepHour : DEFAULT_CONFIG.settings.sleepHour,
        timeFormat: config.settings?.timeFormat === '24h' ? '24h' : '12h',
      },
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const refresh = () => setNow(new Date())
    const timer = window.setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  return now
}

function searchableText(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase()
}

function RangeBadges({ hours, format }: { hours: boolean[]; format: TimeFormat }) {
  const ranges = getRanges(hours)
  if (!ranges.length) return <span className="no-overlap"><CircleAlert size={15} /> No shared awake hours</span>
  return <div className="range-list">{ranges.map(range => (
    <span className="range-badge" key={`${range.start}-${range.end}`}><Clock3 size={13} />{formatRange(range, format)}</span>
  ))}</div>
}

function countHours(hours: boolean[]) {
  const count = hours.filter(Boolean).length
  return `${count} ${count === 1 ? 'hour' : 'hours'}`
}

function CityName({ city, reference, onPromote }: { city: City; reference: boolean; onPromote: (id: string) => void }) {
  return (
    <button
      className={`city-name ${reference ? 'is-reference' : ''}`}
      onClick={() => onPromote(city.id)}
      title={reference ? `${city.name} is the reference city` : `Make ${city.name} the reference city`}
      aria-label={reference ? `${city.name}, reference city` : `Make ${city.name} the reference city`}
    >
      {city.name}
      {reference && <span className="ref-badge">REF</span>}
    </button>
  )
}

function HourTile({ row, hour, format }: { row: CityRow; hour: number; format: TimeFormat }) {
  const cell = row.cells[hour]
  if (cell.skipped || !cell.local) return <div className="hour-tile skipped" title="This reference hour does not occur today because the clock changes" aria-label={`${row.city.name}, skipped reference hour`}>—</div>
  const state = cell.overlap ? 'overlap' : cell.awake ? 'awake' : 'sleeping'
  const date = `${cell.local.year}-${String(cell.local.month).padStart(2, '0')}-${String(cell.local.day).padStart(2, '0')}`
  return (
    <div
      className={`hour-tile ${state}`}
      title={`${row.city.name} · ${date} · ${formatClock(cell.local.hour, cell.local.minute, format)} · ${cell.overlap ? 'Shared awake time' : cell.awake ? 'Awake' : 'Sleeping'}`}
      aria-label={`${row.city.name}, ${formatClock(cell.local.hour, cell.local.minute, format)}, ${state}`}
    >{formatCellTime(cell.local, format)}</div>
  )
}

function DesktopGrid({ rows, format, onPromote, onRemove }: {
  rows: CityRow[]; format: TimeFormat; onPromote: (id: string) => void; onRemove: (id: string) => void
}) {
  return (
    <div className="desktop-grid-scroll">
      <div className="desktop-grid">
        <div className="grid-line grid-heading">
          <span className="grid-city-heading">CITY / LOCAL TIME</span>
          <div className="hour-track">{Array.from({ length: 24 }, (_, hour) => <span className="hour-heading" key={hour}>{formatCellTime({ hour, minute: 0, year: 0, month: 0, day: 0 }, format)}</span>)}</div>
          <span />
        </div>
        {rows.map((row, index) => (
          <div className={`grid-line city-line ${index === 0 ? 'reference-line' : ''}`} key={row.city.id}>
            <div className="grid-city">
              <CityName city={row.city} reference={index === 0} onPromote={onPromote} />
              <span className="city-meta">{row.city.country} <span className="meta-dot">·</span> {formatOffset(row.offsetMinutes)}</span>
            </div>
            <div className="hour-track">{row.cells.map((_, hour) => <HourTile row={row} hour={hour} format={format} key={hour} />)}</div>
            <button className="remove-city" onClick={() => onRemove(row.city.id)} aria-label={`Remove ${row.city.name}`} title={`Remove ${row.city.name}`}><X size={17} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

function MobileGrid({ rows, format, onPromote, onRemove }: {
  rows: CityRow[]; format: TimeFormat; onPromote: (id: string) => void; onRemove: (id: string) => void
}) {
  const columns = { gridTemplateColumns: `64px repeat(${rows.length}, minmax(116px, 1fr))`, minWidth: `${64 + rows.length * 116}px` }
  return (
    <div className="mobile-grid-scroll">
      <div className="mobile-grid" style={columns}>
        <div className="mobile-corner">REF<br />HOUR</div>
        {rows.map((row, index) => (
          <div className={`mobile-city-heading ${index === 0 ? 'mobile-ref-heading' : ''}`} key={row.city.id}>
            <div className="mobile-city-top"><CityName city={row.city} reference={index === 0} onPromote={onPromote} /><button className="mobile-remove" onClick={() => onRemove(row.city.id)} aria-label={`Remove ${row.city.name}`}><X size={14} /></button></div>
            <span>{formatOffset(row.offsetMinutes)}</span>
          </div>
        ))}
        {Array.from({ length: 24 }, (_, hour) => (
          <div className="mobile-hour-row" key={hour} style={{ display: 'contents' }}>
            <div className="mobile-time">{formatCellTime({ hour, minute: 0, year: 0, month: 0, day: 0 }, format)}</div>
            {rows.map(row => <HourTile row={row} hour={hour} format={format} key={row.city.id} />)}
          </div>
        ))}
      </div>
    </div>
  )
}

function CityPicker({ selectedIds, onAdd }: { selectedIds: string[]; onAdd: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const container = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const available = useMemo(() => CITIES.filter(city => !selectedIds.includes(city.id)), [selectedIds])
  const matches = useMemo(() => available.filter(city => searchableText(`${city.name} ${city.country} ${city.region}`).includes(searchableText(query.trim()))), [available, query])

  useEffect(() => {
    if (open) input.current?.focus()
  }, [open])
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (container.current && !container.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])

  const add = (id: string) => {
    onAdd(id)
    setQuery('')
    setActiveIndex(0)
    setOpen(false)
  }

  return (
    <div className="picker-wrap" ref={container}>
      <button className="add-city-button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="city-options" disabled={!available.length}>
        <Plus size={17} strokeWidth={2.2} /> Add city <ChevronDown size={15} className={open ? 'rotated' : ''} />
      </button>
      {open && <div className="city-popover" id="city-options">
        <div className="search-field"><Search size={17} /><input
          ref={input}
          value={query}
          placeholder="Search city or country"
          aria-label="Search city or country"
          role="combobox"
          aria-expanded={open}
          aria-controls="city-listbox"
          aria-activedescendant={matches[activeIndex] ? `city-option-${matches[activeIndex].id}` : undefined}
          onChange={event => { setQuery(event.target.value); setActiveIndex(0) }}
          onKeyDown={event => {
            if (event.key === 'Escape') setOpen(false)
            if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex(index => Math.min(matches.length - 1, index + 1)) }
            if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(index => Math.max(0, index - 1)) }
            if (event.key === 'Enter' && matches[activeIndex]) add(matches[activeIndex].id)
          }}
        /></div>
        <div className="picker-caption">{matches.length} {matches.length === 1 ? 'city' : 'cities'} available</div>
        <div className="city-options" id="city-listbox" role="listbox" aria-label="Available cities">
          {matches.length ? matches.map((city, index) => <button
            className={`city-option ${index === activeIndex ? 'active' : ''}`}
            id={`city-option-${city.id}`}
            key={city.id}
            role="option"
            aria-selected={index === activeIndex}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => add(city.id)}
          ><span><strong>{city.name}</strong><small>{city.country} · {city.region}</small></span><Plus size={15} /></button>)
            : <div className="no-cities">No matching cities</div>}
        </div>
      </div>}
    </div>
  )
}

function SettingsPanel({ settings, onChange }: { settings: Settings; onChange: (settings: Settings) => void }) {
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (container.current && !container.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])

  const options = Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{formatClock(hour, 0, settings.timeFormat)}</option>)
  return <div className="settings-wrap" ref={container}>
    <button className={`settings-button ${open ? 'active' : ''}`} onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="settings-panel" aria-label="Availability settings"><Settings2 size={19} /></button>
    {open && <div className="settings-panel" id="settings-panel">
      <div className="panel-heading"><div><span className="eyebrow">YOUR DAILY RHYTHM</span><h3>Availability settings</h3></div><button className="panel-close" onClick={() => setOpen(false)} aria-label="Close settings"><X size={18} /></button></div>
      <p className="panel-description">The same awake window applies to everyone. Overnight hours work too. Matching wake and sleep times mean all day.</p>
      <label className="setting-row"><span><Sun size={18} /> Wake up</span><select value={settings.wakeHour} onChange={event => onChange({ ...settings, wakeHour: Number(event.target.value) })}>{options}</select></label>
      <label className="setting-row"><span><Moon size={18} /> Go to sleep</span><select value={settings.sleepHour} onChange={event => onChange({ ...settings, sleepHour: Number(event.target.value) })}>{options}</select></label>
      <div className="format-setting"><span>Time format</span><div className="format-toggle"><button className={settings.timeFormat === '12h' ? 'selected' : ''} onClick={() => onChange({ ...settings, timeFormat: '12h' })} aria-pressed={settings.timeFormat === '12h'}>12h</button><button className={settings.timeFormat === '24h' ? 'selected' : ''} onClick={() => onChange({ ...settings, timeFormat: '24h' })} aria-pressed={settings.timeFormat === '24h'}>24h</button></div></div>
      <div className="settings-note"><Check size={15} /> Changes update the grid instantly</div>
    </div>}
  </div>
}

export default function App() {
  const [config, setConfig] = useState<AppConfig>(restoreConfig)
  const now = useClock()
  const cities = useMemo(() => config.cityIds.map(id => CITY_BY_ID.get(id)).filter((city): city is City => Boolean(city)), [config.cityIds])
  const schedule = useMemo(() => buildSchedule(cities, config.settings, config.mode, now), [cities, config.settings, config.mode, now])
  const reference = cities[0]
  const referenceNow = reference ? getLocalTime(reference.timeZone, now) : null
  const dateLabel = reference ? new Intl.DateTimeFormat('en-US', { timeZone: reference.timeZone, weekday: 'long', month: 'long', day: 'numeric' }).format(now) : ''

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)) } catch { /* Private browsing can disable storage. */ }
  }, [config])

  const addCity = (id: string) => setConfig(current => ({ ...current, cityIds: current.cityIds.includes(id) ? current.cityIds : [...current.cityIds, id] }))
  const removeCity = (id: string) => setConfig(current => ({ ...current, cityIds: current.cityIds.filter(cityId => cityId !== id) }))
  const promoteCity = (id: string) => setConfig(current => ({ ...current, cityIds: [id, ...current.cityIds.filter(cityId => cityId !== id)] }))

  return <div className="app-shell">
    <header className="site-header">
      <div className="brand-mark"><Globe2 size={23} strokeWidth={1.8} /><span>TIME / TOGETHER</span></div>
      <div className="header-meta"><span className="live-dot" /> Built for the hours we share</div>
    </header>

    <main className="main-content">
      <div className="hero">
        <div><div className="section-kicker"><span className="kicker-line" /> THE WORLD, IN SYNC</div><h1>GPT-6</h1><p>Find the hours that work for everyone, wherever work takes you.</p></div>
        <div className="date-card"><span>REFERENCE DAY</span><strong>{reference ? dateLabel : 'Choose a city'}</strong><small>{reference && referenceNow ? `${reference.name} · ${formatClock(referenceNow.hour, referenceNow.minute, config.settings.timeFormat)}` : 'Add a city to begin'}</small></div>
      </div>

      <section className="control-card" aria-label="Schedule controls">
        <div className="mode-control"><span className="control-label">COMPARE BY</span><div className="mode-toggle" role="group" aria-label="Comparison mode">
          <button className={config.mode === 'meeting' ? 'selected' : ''} onClick={() => setConfig(current => ({ ...current, mode: 'meeting' }))} aria-pressed={config.mode === 'meeting'}><UsersRound size={17} /> Meeting mode</button>
          <button className={config.mode === 'base' ? 'selected' : ''} onClick={() => setConfig(current => ({ ...current, mode: 'base' }))} aria-pressed={config.mode === 'base'}><GitCompareArrows size={17} /> Base mode</button>
        </div></div>
        <div className="control-divider" />
        <div className="availability-control"><div><span className="control-label">AWAKE WINDOW</span><strong><Sun size={16} /> {formatClock(config.settings.wakeHour, 0, config.settings.timeFormat)} <ArrowRight size={15} /> <Moon size={15} /> {formatClock(config.settings.sleepHour, 0, config.settings.timeFormat)}</strong></div><SettingsPanel settings={config.settings} onChange={settings => setConfig(current => ({ ...current, settings }))} /></div>
      </section>

      {cities.length > 1 && <section className="summary-card" aria-label="Overlap summary">
        <div className="summary-intro"><span className="summary-icon"><UsersRound size={21} /></span><div><span className="eyebrow">{config.mode === 'meeting' ? 'EVERYONE, TOGETHER' : `FROM ${reference.name.toLocaleUpperCase()}`}</span><h2>{config.mode === 'meeting' ? 'Shared availability' : 'One-to-one availability'}</h2><p>Times shown in {reference.name}</p></div></div>
        {config.mode === 'meeting' ? <div className="meeting-result" aria-live="polite"><strong className="hours-count">{countHours(schedule.meetingHours)}</strong><RangeBadges hours={schedule.meetingHours} format={config.settings.timeFormat} /></div>
          : <div className="base-results" aria-live="polite">{schedule.rows.slice(1).map(row => <div className="base-result" key={row.city.id}><span className="base-city-name">{row.city.name}</span><strong>{countHours(schedule.baseHours[row.city.id])}</strong><RangeBadges hours={schedule.baseHours[row.city.id]} format={config.settings.timeFormat} /></div>)}</div>}
      </section>}

      <section className="schedule-card" aria-label="Timezone comparison grid">
        <div className="schedule-heading"><div><span className="eyebrow">THE 24-HOUR VIEW</span><h2>Across the clock <span className="city-count">{cities.length} {cities.length === 1 ? 'city' : 'cities'}</span></h2><p>{reference ? `Each column follows ${reference.name}'s day. Select a city name to make it the reference.` : 'Add your first city to start comparing time.'}</p></div><CityPicker selectedIds={config.cityIds} onAdd={addCity} /></div>
        {schedule.rows.length ? <>
          <DesktopGrid rows={schedule.rows} format={config.settings.timeFormat} onPromote={promoteCity} onRemove={removeCity} />
          <MobileGrid rows={schedule.rows} format={config.settings.timeFormat} onPromote={promoteCity} onRemove={removeCity} />
        </> : <div className="empty-state"><Globe2 size={34} /><strong>Where should we start?</strong><span>Add a city above to map your day.</span></div>}
        <div className="grid-footer"><div className="legend"><span><i className="legend-swatch overlap-swatch" /> Shared awake time</span><span><i className="legend-swatch awake-swatch" /> Awake</span><span><i className="legend-swatch sleep-swatch" /> Sleeping</span></div><span className="footer-hint">{config.mode === 'meeting' ? 'Green cells = everyone awake' : 'Green cells = awake with the reference city'}</span></div>
        {schedule.clockChangeDay && <p className="clock-change-note">Clock change today: this 24-column view uses one cell per clock hour. A skipped hour appears as —; a repeated hour is shown once.</p>}
      </section>
      <footer className="page-footer"><span><span className="footer-star">✳</span> Good timing changes everything.</span><span>YOUR SCHEDULE STAYS IN THIS BROWSER</span></footer>
    </main>
  </div>
}
