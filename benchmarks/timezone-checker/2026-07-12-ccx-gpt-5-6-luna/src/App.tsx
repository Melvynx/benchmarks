import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  Globe2,
  Minus,
  Plus,
  Search,
  Settings2,
  Sparkles,
  SunMedium,
  X,
} from 'lucide-react'
import { CITIES, DEFAULT_CITY_IDS, getCity, type City } from './data/cities'
import {
  countryFlag,
  formatHour,
  formatHourRange,
  formatOffset,
  getCityCellMap,
  getOffsetMinutes,
  getRanges,
  getTodayLabel,
  isAwake,
  type TimeCell,
} from './lib/timezone'
import './styles.css'

type Mode = 'meeting' | 'base'
type TimeFormat = '12h' | '24h'

type AppState = {
  cityIds: string[]
  mode: Mode
  wakeHour: number
  sleepHour: number
  timeFormat: TimeFormat
}

type CityRow = {
  city: City
  cells: TimeCell[]
  offset: number
  overlapHours: Set<number>
}

const DEFAULT_STATE: AppState = {
  cityIds: DEFAULT_CITY_IDS,
  mode: 'meeting',
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: '12h',
}

const STORAGE_KEY = 'gpt-5-6-luna-timezone-checker'

function readStoredState(): AppState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<AppState> | null
    const cityIds = Array.isArray(parsed?.cityIds)
      ? parsed.cityIds.filter((id): id is string => typeof id === 'string' && Boolean(getCity(id)))
      : DEFAULT_STATE.cityIds
    return {
      cityIds: cityIds.length ? [...new Set(cityIds)] : DEFAULT_STATE.cityIds,
      mode: parsed?.mode === 'base' ? 'base' : 'meeting',
      wakeHour: typeof parsed?.wakeHour === 'number' && parsed.wakeHour >= 0 && parsed.wakeHour <= 23 ? parsed.wakeHour : DEFAULT_STATE.wakeHour,
      sleepHour: typeof parsed?.sleepHour === 'number' && parsed.sleepHour >= 0 && parsed.sleepHour <= 23 ? parsed.sleepHour : DEFAULT_STATE.sleepHour,
      timeFormat: parsed?.timeFormat === '24h' ? '24h' : '12h',
    }
  } catch {
    return DEFAULT_STATE
  }
}

function getRangeLabel(start: number, end: number, format: TimeFormat): string {
  return formatHourRange(start, end, format)
}

function getRangeLabels(hours: Set<number>, format: TimeFormat): string[] {
  return getRanges([...hours]).map(({ start, end }) => getRangeLabel(start, end, format))
}

function modeDescription(mode: Mode): string {
  return mode === 'meeting'
    ? 'Find the hours everyone can be awake at once.'
    : 'Compare each city independently against your reference.'
}

function HourCell({ cell, hour, format }: { cell: TimeCell; hour: number; format: TimeFormat }) {
  const status = cell.overlap && cell.awake ? 'overlap' : cell.awake ? 'awake' : 'sleeping'
  const title = `${formatHour(hour, format)} reference · ${cell.label} local · ${status === 'overlap' ? 'overlap' : status === 'awake' ? 'awake' : 'sleeping'}`

  return (
    <div className={`hour-cell ${status}`} title={title} aria-label={title}>
      <span>{cell.label}</span>
      {status === 'overlap' && <Check size={12} strokeWidth={2.8} aria-hidden="true" />}
    </div>
  )
}

function OverlapSummary({
  mode,
  referenceCity,
  rows,
  overlapByCity,
  cityIds,
  format,
}: {
  mode: Mode
  referenceCity: City
  rows: CityRow[]
  overlapByCity: Map<string, Set<number>>
  cityIds: string[]
  format: TimeFormat
}) {
  if (cityIds.length < 2) {
    return (
      <section className="summary-card summary-card--quiet" aria-label="Overlap summary">
        <div className="summary-icon"><Globe2 size={18} /></div>
        <div>
          <p className="summary-kicker">One city selected</p>
          <p className="summary-copy">Add another city to see shared awake hours.</p>
        </div>
        <ArrowRight className="summary-arrow" size={18} aria-hidden="true" />
      </section>
    )
  }

  if (mode === 'meeting') {
    const overlap = overlapByCity.get('meeting') ?? new Set<number>()
    const ranges = getRangeLabels(overlap, format)
    return (
      <section className={`summary-card ${overlap.size ? 'summary-card--active' : 'summary-card--warning'}`} aria-label="Meeting overlap summary">
        <div className="summary-icon"><Sparkles size={18} /></div>
        <div className="summary-main">
          <p className="summary-kicker">Shared availability · Meeting mode</p>
          <div className="summary-line">
            <strong>{overlap.size} {overlap.size === 1 ? 'hour' : 'hours'}</strong>
            <span>everyone is awake in {referenceCity.name}</span>
          </div>
          {overlap.size ? (
            <div className="range-list">
              {ranges.map((range) => <span className="range-pill" key={range}>{range}</span>)}
            </div>
          ) : (
            <p className="warning-copy">No common awake window. Try widening the awake window or switching to Base mode.</p>
          )}
        </div>
        <div className="summary-side-stat"><span>ANCHOR</span><strong>{referenceCity.name}</strong></div>
      </section>
    )
  }

  const nonReferenceRows = rows.filter((row) => row.city.id !== referenceCity.id)
  return (
    <section className="base-summary" aria-label="Base mode overlap summary">
      <div className="base-summary-heading">
        <div>
          <p className="summary-kicker">Independent availability · Base mode</p>
          <p className="base-summary-copy">Each line compares against <strong>{referenceCity.name}</strong>.</p>
        </div>
        <span className="base-summary-ref"><span className="ref-dot" /> {referenceCity.name} is base</span>
      </div>
      <div className="base-summary-list">
        {nonReferenceRows.map((row) => {
          const overlap = overlapByCity.get(row.city.id) ?? new Set<number>()
          const ranges = getRangeLabels(overlap, format)
          return (
            <div className={`base-summary-row ${overlap.size ? '' : 'base-summary-row--warning'}`} key={row.city.id}>
              <div className="base-city-label"><span className="city-swatch" style={{ backgroundColor: row.city.accent }} /> <strong>{row.city.name}</strong><span>{countryFlag(row.city.countryCode)}</span></div>
              {overlap.size ? (
                <div className="base-summary-detail"><strong>{overlap.size}h overlap</strong>{ranges.map((range) => <span className="range-pill range-pill--small" key={range}>{range}</span>)}</div>
              ) : <span className="base-warning-text">No overlap — adjust the window</span>}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function CityPicker({ selectedIds, onAdd }: { selectedIds: string[]; onAdd: (cityId: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const availableCities = CITIES.filter((city) => !selectedIds.includes(city.id))
  const filteredCities = availableCities.filter((city) => `${city.name} ${city.country} ${city.region}`.toLowerCase().includes(query.toLowerCase()))
  const grouped = filteredCities.reduce<Record<string, City[]>>((acc, city) => {
    acc[city.region] ??= []
    acc[city.region].push(city)
    return acc
  }, {})

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  return (
    <div className="picker-wrap">
      <button className="add-city-button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <Plus size={16} strokeWidth={2.5} /> Add city <ChevronDown size={15} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <div className="city-picker" role="dialog" aria-label="Add a city">
          <div className="picker-search"><Search size={15} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search cities or countries" /></div>
          <div className="picker-list">
            {Object.entries(grouped).map(([region, cities]) => (
              <div key={region} className="picker-region">
                <div className="picker-region-label">{region}</div>
                {cities.map((city) => (
                  <button className="picker-option" key={city.id} onClick={() => { onAdd(city.id); setOpen(false) }}>
                    <span className="picker-flag">{countryFlag(city.countryCode)}</span>
                    <span><strong>{city.name}</strong><small>{city.country}</small></span>
                    <Plus size={15} />
                  </button>
                ))}
              </div>
            ))}
            {!filteredCities.length && <p className="picker-empty">No cities match that search.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsDrawer({ state, onChange, onClose }: { state: AppState; onChange: (next: Partial<AppState>) => void; onClose: () => void }) {
  const hours = Array.from({ length: 24 }, (_, hour) => hour)
  return (
    <div className="drawer-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <aside className="settings-drawer" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="drawer-header">
          <div><p className="eyebrow">Personal schedule</p><h2 id="settings-title">Awake window</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close settings"><X size={18} /></button>
        </div>
        <p className="drawer-intro">Use one shared sleep schedule for every city in the comparison.</p>
        <div className="setting-block">
          <label htmlFor="wake-hour">Wake-up hour</label>
          <div className="select-wrap"><SunMedium size={16} /><select id="wake-hour" value={state.wakeHour} onChange={(event) => onChange({ wakeHour: Number(event.target.value) })}>{hours.map((hour) => <option key={hour} value={hour}>{formatHour(hour, state.timeFormat)}</option>)}</select><ChevronDown size={15} /></div>
        </div>
        <div className="setting-block">
          <label htmlFor="sleep-hour">Sleep hour</label>
          <div className="select-wrap"><Clock3 size={16} /><select id="sleep-hour" value={state.sleepHour} onChange={(event) => onChange({ sleepHour: Number(event.target.value) })}>{hours.map((hour) => <option key={hour} value={hour}>{formatHour(hour, state.timeFormat)}</option>)}</select><ChevronDown size={15} /></div>
        </div>
        <div className="setting-block">
          <span className="setting-label">Time format</span>
          <div className="format-toggle" role="group" aria-label="Time format">
            {(['12h', '24h'] as TimeFormat[]).map((format) => <button key={format} className={state.timeFormat === format ? 'active' : ''} onClick={() => onChange({ timeFormat: format })}>{format}</button>)}
          </div>
        </div>
        <div className="schedule-preview"><div className="schedule-preview-top"><span>Current window</span><strong>{formatHour(state.wakeHour, state.timeFormat)} — {formatHour(state.sleepHour, state.timeFormat)}</strong></div><div className="schedule-track">{state.wakeHour === state.sleepHour ? <div className="schedule-track-fill" style={{ left: '0%', width: '100%' }} /> : state.wakeHour < state.sleepHour ? <div className="schedule-track-fill" style={{ left: `${state.wakeHour / 24 * 100}%`, width: `${(state.sleepHour - state.wakeHour) / 24 * 100}%` }} /> : <><div className="schedule-track-fill" style={{ left: `${state.wakeHour / 24 * 100}%`, width: `${(24 - state.wakeHour) / 24 * 100}%` }} /><div className="schedule-track-fill" style={{ left: '0%', width: `${state.sleepHour / 24 * 100}%` }} /></>}</div><div className="schedule-axis"><span>midnight</span><span>noon</span><span>midnight</span></div></div>
        <div className="drawer-note"><Sparkles size={16} /><span>Overnight windows work too — try 10pm to 6am for a night shift.</span></div>
      </aside>
    </div>
  )
}

function DesktopGrid({ rows, referenceCity, format, mode, onPromote, onRemove }: { rows: CityRow[]; referenceCity: City; format: TimeFormat; mode: Mode; onPromote: (id: string) => void; onRemove: (id: string) => void }) {
  return (
    <div className="desktop-grid" style={{ '--city-columns': `minmax(210px, 1.25fr) repeat(24, minmax(31px, 1fr)) 44px` } as React.CSSProperties}>
      <div className="grid-corner"><span>Reference day</span><strong>{referenceCity.name}</strong></div>
      {Array.from({ length: 24 }, (_, hour) => <div key={hour} className={`grid-hour-head ${hour === 12 ? 'grid-hour-head--noon' : ''}`}><span>{formatHour(hour, format)}</span></div>)}
      <div className="grid-action-head"><span>EDIT</span></div>
      {rows.map((row, index) => (
        <div className="grid-row" key={row.city.id}>
          <div className={`city-cell ${index === 0 ? 'city-cell--reference' : ''}`}>
            <div className="city-leading"><span className="city-avatar" style={{ backgroundColor: row.city.accent }}>{row.city.name.charAt(0)}</span><div className="city-meta"><button className="city-name-button" onClick={() => onPromote(row.city.id)} title={index === 0 ? 'Reference city' : `Make ${row.city.name} the reference city`}>{row.city.name}</button><span>{countryFlag(row.city.countryCode)} {row.city.country}</span></div></div>
            <div className="city-trailing">{index === 0 && <span className="ref-badge">REF</span>}<span className="city-offset">{formatOffset(row.offset)}</span></div>
          </div>
          {row.cells.map((cell, hour) => <HourCell key={`${row.city.id}-${hour}`} cell={cell} hour={hour} format={format} />)}
          <div className="row-action"><button className="remove-button" onClick={() => onRemove(row.city.id)} disabled={rows.length === 1} aria-label={`Remove ${row.city.name}`} title={rows.length === 1 ? 'Keep at least one city' : `Remove ${row.city.name}`}><Minus size={15} /></button></div>
        </div>
      ))}
      <div className="grid-footer-spacer" /><div className="grid-footer-note" style={{ gridColumn: '2 / span 24' }}><span className="footer-dash" /> reference city's day · each cell is one hour</div><div />
    </div>
  )
}

function MobileGrid({ rows, referenceCity, format, onPromote, onRemove }: { rows: CityRow[]; referenceCity: City; format: TimeFormat; onPromote: (id: string) => void; onRemove: (id: string) => void }) {
  return (
    <div className="mobile-grid" aria-label="Mobile timezone grid">
      <div className="mobile-grid-head"><div className="mobile-hour-corner"><span>HOUR</span><strong>{referenceCity.name}</strong></div>{rows.map((row, index) => <div className={`mobile-city-head ${index === 0 ? 'mobile-city-head--reference' : ''}`} key={row.city.id}><span className="city-avatar" style={{ backgroundColor: row.city.accent }}>{row.city.name.charAt(0)}</span><button onClick={() => onPromote(row.city.id)}>{row.city.name}</button><div className="mobile-city-status">{index === 0 && <span className="ref-badge">REF</span>}<span className="city-offset">{formatOffset(row.offset)}</span></div><button className="mobile-remove" onClick={() => onRemove(row.city.id)} disabled={rows.length === 1} aria-label={`Remove ${row.city.name}`}><X size={13} /></button></div>)}</div>
      {Array.from({ length: 24 }, (_, hour) => <div className="mobile-grid-row" key={hour}><div className="mobile-hour-label"><strong>{formatHour(hour, format)}</strong><span>{hour === 0 ? 'start' : hour === 12 ? 'noon' : ''}</span></div>{rows.map((row) => <HourCell key={`${row.city.id}-${hour}`} cell={row.cells[hour]} hour={hour} format={format} />)}</div>)}
    </div>
  )
}

export default function App() {
  const [state, setState] = useState<AppState>(readStoredState)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [now] = useState(() => new Date())

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    document.title = 'GPT-5.6 Luna'
  }, [])

  const cities = useMemo(() => state.cityIds.map(getCity).filter((city): city is City => Boolean(city)), [state.cityIds])
  const referenceCity = cities[0] ?? CITIES[0]
  const offsets = useMemo(() => new Map(cities.map((city) => [city.id, getOffsetMinutes(city.timezone, now)])), [cities, now])
  const referenceOffset = offsets.get(referenceCity.id) ?? getOffsetMinutes(referenceCity.timezone, now)

  const overlapByCity = useMemo(() => {
    const map = new Map<string, Set<number>>()
    if (state.mode === 'meeting') {
      const hours = new Set<number>()
      for (let hour = 0; hour < 24; hour += 1) {
        const everyoneAwake = cities.every((city) => {
          const offset = offsets.get(city.id) ?? 0
          const localHour = Math.floor((((hour * 60 + offset - referenceOffset) % 1440) + 1440) % 1440 / 60)
          return isAwake(localHour, state.wakeHour, state.sleepHour)
        })
        if (everyoneAwake) hours.add(hour)
      }
      map.set('meeting', hours)
      cities.forEach((city) => map.set(city.id, new Set(hours)))
      return map
    }

    const referenceAwake = new Set<number>()
    for (let hour = 0; hour < 24; hour += 1) {
      const localHour = Math.floor((((hour * 60) % 1440) + 1440) % 1440 / 60)
      if (isAwake(localHour, state.wakeHour, state.sleepHour)) referenceAwake.add(hour)
    }
    const unionForReference = new Set<number>()
    map.set(referenceCity.id, unionForReference)
    cities.filter((city) => city.id !== referenceCity.id).forEach((city) => {
      const offset = offsets.get(city.id) ?? 0
      const overlap = new Set<number>()
      for (let hour = 0; hour < 24; hour += 1) {
        const localHour = Math.floor((((hour * 60 + offset - referenceOffset) % 1440) + 1440) % 1440 / 60)
        if (referenceAwake.has(hour) && isAwake(localHour, state.wakeHour, state.sleepHour)) {
          overlap.add(hour)
          unionForReference.add(hour)
        }
      }
      map.set(city.id, overlap)
    })
    return map
  }, [cities, offsets, referenceCity.id, referenceOffset, state.mode, state.sleepHour, state.wakeHour])

  const rows = useMemo<CityRow[]>(() => cities.map((city) => ({
    city,
    offset: offsets.get(city.id) ?? 0,
    overlapHours: overlapByCity.get(city.id) ?? new Set<number>(),
    cells: getCityCellMap(city, referenceCity, offsets, state.wakeHour, state.sleepHour, overlapByCity.get(city.id) ?? new Set<number>(), state.timeFormat),
  })), [cities, offsets, overlapByCity, referenceCity, state.sleepHour, state.timeFormat, state.wakeHour])

  const updateState = (next: Partial<AppState>) => setState((current) => ({ ...current, ...next }))
  const addCity = (cityId: string) => setState((current) => current.cityIds.includes(cityId) ? current : { ...current, cityIds: [...current.cityIds, cityId] })
  const removeCity = (cityId: string) => setState((current) => current.cityIds.length === 1 ? current : { ...current, cityIds: current.cityIds.filter((id) => id !== cityId) })
  const promoteCity = (cityId: string) => setState((current) => ({ ...current, cityIds: [cityId, ...current.cityIds.filter((id) => id !== cityId)] }))

  return (
    <div className="app-shell">
      <div className="ambient-shape ambient-shape--one" />
      <div className="ambient-shape ambient-shape--two" />
      <header className="topbar">
        <div className="wordmark"><span className="wordmark-mark"><Globe2 size={15} /></span><span>LUNA / CLOCKWORK</span></div>
        <div className="topbar-status"><span className="live-dot" /> LIVE OFFSET DATA <span className="topbar-divider" /> <span className="topbar-date">{getTodayLabel(now)}</span></div>
      </header>

      <main className="main-content">
        <section className="hero">
          <div className="hero-copy"><p className="eyebrow"><span className="eyebrow-line" /> Distributed work, aligned</p><h1>GPT-5.6 Luna</h1><p className="hero-subtitle">Find the hour where your team lines up<span className="hero-period">.</span></p><p className="hero-description">A calm way to spot shared awake time across the cities your workday touches.</p></div>
          <div className="hero-signal"><div className="signal-orbit"><span className="signal-sun"><SunMedium size={20} /></span><span className="signal-dot signal-dot--a" /><span className="signal-dot signal-dot--b" /><span className="signal-dot signal-dot--c" /></div><div><span className="signal-label">RIGHT NOW</span><strong>{cities.length} {cities.length === 1 ? 'city' : 'cities'} in view</strong></div></div>
        </section>

        <section className="control-deck" aria-label="Comparison controls">
          <div className="mode-control"><span className="control-label">VIEW</span><div className="mode-toggle" role="group" aria-label="Comparison mode"><button className={state.mode === 'meeting' ? 'active' : ''} onClick={() => updateState({ mode: 'meeting' })}><span className="mode-icon mode-icon--meeting"><Sparkles size={13} /></span>Meeting</button><button className={state.mode === 'base' ? 'active' : ''} onClick={() => updateState({ mode: 'base' })}><span className="mode-icon mode-icon--base"><ArrowRight size={13} /></span>Base</button></div><span className="mode-description">{modeDescription(state.mode)}</span></div>
          <div className="control-actions"><span className="window-badge"><span className="window-dot" /> {formatHour(state.wakeHour, state.timeFormat)} — {formatHour(state.sleepHour, state.timeFormat)} awake</span><button className="settings-button" onClick={() => setSettingsOpen(true)}><Settings2 size={16} /> Schedule settings</button></div>
        </section>

        <OverlapSummary mode={state.mode} referenceCity={referenceCity} rows={rows} overlapByCity={overlapByCity} cityIds={state.cityIds} format={state.timeFormat} />

        <section className="cities-section">
          <div className="section-heading"><div><p className="eyebrow">Your clock map</p><h2>Compare cities <span>{String(cities.length).padStart(2, '0')}</span></h2></div><div className="section-heading-actions"><span className="reference-note"><span className="ref-dot" /> Click a city name to make it the reference</span><CityPicker selectedIds={state.cityIds} onAdd={addCity} /></div></div>
          <div className="grid-card"><div className="grid-card-top"><div className="grid-card-title"><span className="grid-card-icon"><Clock3 size={16} /></span><div><strong>Day alignment</strong><span>Each column is one hour in {referenceCity.name}</span></div></div><div className="grid-legend"><span><i className="legend-swatch legend-swatch--sleeping" /> Sleeping</span><span><i className="legend-swatch legend-swatch--awake" /> Awake</span><span><i className="legend-swatch legend-swatch--overlap" /> Overlap</span></div></div><DesktopGrid rows={rows} referenceCity={referenceCity} format={state.timeFormat} mode={state.mode} onPromote={promoteCity} onRemove={removeCity} /><MobileGrid rows={rows} referenceCity={referenceCity} format={state.timeFormat} onPromote={promoteCity} onRemove={removeCity} /></div>
          <div className="grid-footnote"><span className="footnote-icon"><Sparkles size={13} /></span><span>Green cells = everyone awake<span className="footnote-separator">·</span>UTC offsets reflect today, including DST</span></div>
        </section>
      </main>

      <footer className="page-footer"><span>Built for the spaces between <em>“what time works?”</em> and <em>“see you there.”</em></span><span>GPT-5.6 Luna <span className="footer-dot">•</span> Clockwork utility</span></footer>
      {settingsOpen && <SettingsDrawer state={state} onChange={updateState} onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
