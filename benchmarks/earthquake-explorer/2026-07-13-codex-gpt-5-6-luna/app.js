const FEEDS = {
  hour: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
  day: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  week: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
  month: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson',
}

const PERIODS = {
  hour: { label: 'Past hour', short: '1H', bins: 8, duration: 60 * 60 * 1000 },
  day: { label: 'Past day', short: '24H', bins: 12, duration: 24 * 60 * 60 * 1000 },
  week: { label: 'Past 7 days', short: '7D', bins: 14, duration: 7 * 24 * 60 * 60 * 1000 },
  month: { label: 'Past 30 days', short: '30D', bins: 15, duration: 30 * 24 * 60 * 60 * 1000 },
}

const DEFAULT_FILTERS = { minMagnitude: 0, maxDepth: 'all', alert: 'all', tsunami: 'all', review: 'all', query: '' }
const params = new URLSearchParams(window.location.search)
const initialPeriod = PERIODS[params.get('period')] ? params.get('period') : 'week'

const state = {
  period: initialPeriod,
  events: [],
  filtered: [],
  selectedId: params.get('event') || null,
  timelineFocus: params.get('focus') ? Number(params.get('focus')) : null,
  filtersOpen: false,
  aboutOpen: false,
  loading: false,
  error: null,
  refreshedAt: null,
  filters: {
    minMagnitude: clampNumber(params.get('min'), 0, 9.9, 0),
    maxDepth: ['30', '70', '300', '700'].includes(params.get('depth')) ? params.get('depth') : 'all',
    alert: ['red', 'orange', 'yellow', 'green', 'none'].includes(params.get('alert')) ? params.get('alert') : 'all',
    tsunami: ['yes', 'no'].includes(params.get('tsunami')) ? params.get('tsunami') : 'all',
    review: ['reviewed', 'automatic'].includes(params.get('review')) ? params.get('review') : 'all',
    query: params.get('q') || '',
  },
  sort: ['recent', 'magnitude', 'significance'].includes(params.get('sort')) ? params.get('sort') : 'recent',
}

const root = document.querySelector('#root')
let loadRequest = 0

const land = [
  'M67 142 L78 111 L110 91 L145 92 L163 73 L212 73 L231 94 L277 104 L294 126 L272 143 L244 145 L226 164 L205 163 L190 184 L164 176 L153 157 L126 161 L105 151 L83 158 Z',
  'M282 235 L307 230 L322 250 L320 278 L337 304 L325 340 L308 367 L296 400 L276 419 L261 399 L263 366 L246 340 L252 307 L239 284 L257 259 Z',
  'M438 130 L457 111 L491 110 L511 97 L550 96 L568 104 L600 101 L630 111 L669 105 L703 116 L727 114 L761 127 L793 127 L821 146 L857 157 L883 174 L872 190 L843 192 L831 181 L806 188 L781 178 L748 183 L721 171 L687 175 L667 165 L632 169 L607 153 L575 158 L547 146 L512 153 L493 141 L461 150 Z',
  'M442 171 L466 172 L487 190 L489 211 L473 230 L450 232 L438 216 L423 212 L430 190 Z',
  'M384 186 L407 179 L425 192 L419 217 L397 244 L378 255 L366 238 L371 213 Z',
  'M478 247 L507 242 L530 254 L548 280 L548 309 L532 333 L520 365 L500 391 L479 397 L468 377 L476 350 L462 326 L470 299 L456 275 Z',
  'M820 320 L849 311 L873 325 L884 350 L872 374 L849 389 L823 381 L814 357 Z',
]

function clampNumber(value, min, max, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character])
}

function icon(name, size = 18) {
  const paths = {
    pulse: '<polyline points="2 10 5 10 7.2 4 10.6 16 13 9 16 9 18 10"/>',
    refresh: '<path d="M20 11a8.1 8.1 0 0 0-14.8-4L3 10"/><path d="M3 4v6h6"/><path d="M4 13a8.1 8.1 0 0 0 14.8 4L21 14"/><path d="M21 20v-6h-6"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    alert: '<path d="M10.3 4.8 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.8a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  }
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.info}</svg>`
}

function normalizeFeature(feature, index) {
  const properties = feature?.properties || {}
  const coordinates = feature?.geometry?.coordinates
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null
  const [longitude, latitude, rawDepth] = coordinates
  const time = Number(properties.time)
  const updated = Number(properties.updated)
  return {
    id: feature.id || `usgs-${index}-${time}`,
    magnitude: Number.isFinite(Number(properties.mag)) ? Number(properties.mag) : null,
    place: properties.place || 'Unknown location',
    time: Number.isFinite(time) ? time : null,
    updated: Number.isFinite(updated) ? updated : null,
    longitude: Number(longitude),
    latitude: Number(latitude),
    depth: Number.isFinite(Number(rawDepth)) ? Number(rawDepth) : null,
    felt: Number.isFinite(Number(properties.felt)) ? Number(properties.felt) : null,
    significance: Number.isFinite(Number(properties.sig)) ? Number(properties.sig) : null,
    alert: properties.alert || null,
    tsunami: Number(properties.tsunami) === 1,
    status: properties.status || null,
    type: properties.type || 'earthquake',
    title: properties.title || feature.id || 'USGS event',
    detail: properties.detail || null,
    url: properties.url || null,
  }
}

function formatMagnitude(magnitude) {
  return magnitude === null ? 'n/a' : magnitude.toFixed(1)
}

function formatDepth(depth) {
  return depth === null ? 'Depth not reported' : `${Math.round(depth)} km deep`
}

function formatCoordinate(value, positive, negative) {
  if (!Number.isFinite(value)) return 'n/a'
  return `${Math.abs(value).toFixed(2)}° ${value >= 0 ? positive : negative}`
}

function formatDate(timestamp, options = {}) {
  if (!timestamp) return 'Time not reported'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', ...options }).format(new Date(timestamp))
}

function formatUtc(timestamp) {
  if (!timestamp) return 'UTC time not reported'
  return new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' }).format(new Date(timestamp))
}

function formatRelative(timestamp) {
  if (!timestamp) return 'time unavailable'
  const delta = Math.max(0, Date.now() - timestamp)
  const minutes = Math.floor(delta / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatFreshness(timestamp) {
  if (!timestamp) return 'Waiting for first refresh'
  const age = Date.now() - timestamp
  if (age < 60000) return 'Updated just now'
  if (age < 3600000) return `Updated ${Math.floor(age / 60000)} min ago`
  return `Updated ${Math.floor(age / 3600000)} hr ago`
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#096;')
}

function project(longitude, latitude) {
  return { x: ((longitude + 180) / 360) * 1000, y: ((90 - latitude) / 180) * 520 }
}

function magnitudeClass(magnitude) {
  if (magnitude === null) return 'unknown'
  if (magnitude >= 6) return 'major'
  if (magnitude >= 4.5) return 'notable'
  return 'ordinary'
}

function signalLabel(event) {
  if (event.alert === 'red' || (event.magnitude !== null && event.magnitude >= 6.5) || (event.tsunami && event.magnitude !== null && event.magnitude >= 6)) {
    return { label: 'Potentially concerning', tone: 'hot', note: 'Catalog signal only, not a damage forecast.' }
  }
  if ((event.significance !== null && event.significance >= 500) || (event.magnitude !== null && event.magnitude >= 4.5) || event.felt) {
    return { label: 'Notable', tone: 'warm', note: 'Worth a closer look in the event record.' }
  }
  return { label: 'Ordinary', tone: 'quiet', note: 'Within the usual range of this catalogue window.' }
}

function applyFilters() {
  const { minMagnitude, maxDepth, alert, tsunami, review, query } = state.filters
  const normalizedQuery = query.trim().toLowerCase()
  state.filtered = state.events.filter((event) => {
    if (event.magnitude !== null && event.magnitude < minMagnitude) return false
    if (event.magnitude === null && minMagnitude > 0) return false
    if (maxDepth !== 'all' && (event.depth === null || event.depth > Number(maxDepth))) return false
    if (alert !== 'all' && (alert === 'none' ? event.alert !== null : event.alert !== alert)) return false
    if (tsunami !== 'all' && (tsunami === 'yes' ? !event.tsunami : event.tsunami)) return false
    if (review !== 'all' && (review === 'reviewed' ? event.status !== 'reviewed' : event.status !== 'automatic')) return false
    if (normalizedQuery && !event.place.toLowerCase().includes(normalizedQuery)) return false
    return true
  })
  state.filtered.sort((a, b) => {
    if (state.sort === 'magnitude') return (b.magnitude ?? -Infinity) - (a.magnitude ?? -Infinity) || (b.time ?? 0) - (a.time ?? 0)
    if (state.sort === 'significance') return (b.significance ?? -Infinity) - (a.significance ?? -Infinity) || (b.time ?? 0) - (a.time ?? 0)
    return (b.time ?? 0) - (a.time ?? 0)
  })
  if (state.selectedId && !state.filtered.some((event) => event.id === state.selectedId)) state.selectedId = state.filtered[0]?.id || null
}

function activeFilterCount() {
  const { minMagnitude, maxDepth, alert, tsunami, review, query } = state.filters
  return Number(minMagnitude > 0) + Number(maxDepth !== 'all') + Number(alert !== 'all') + Number(tsunami !== 'all') + Number(review !== 'all') + Number(Boolean(query.trim()))
}

function setUrlState() {
  const next = new URLSearchParams()
  if (state.period !== 'week') next.set('period', state.period)
  if (state.filters.minMagnitude > 0) next.set('min', String(state.filters.minMagnitude))
  if (state.filters.maxDepth !== 'all') next.set('depth', state.filters.maxDepth)
  if (state.filters.alert !== 'all') next.set('alert', state.filters.alert)
  if (state.filters.tsunami !== 'all') next.set('tsunami', state.filters.tsunami)
  if (state.filters.review !== 'all') next.set('review', state.filters.review)
  if (state.filters.query.trim()) next.set('q', state.filters.query.trim())
  if (state.sort !== 'recent') next.set('sort', state.sort)
  if (state.selectedId) next.set('event', state.selectedId)
  if (state.timelineFocus) next.set('focus', String(state.timelineFocus))
  const query = next.toString()
  window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
}

function getEvent(id) {
  return state.events.find((event) => event.id === id) || null
}

function pickDefaultEvent() {
  return [...state.filtered].sort((a, b) => (b.magnitude ?? -Infinity) - (a.magnitude ?? -Infinity) || (b.time ?? 0) - (a.time ?? 0))[0] || null
}

function timelineBins() {
  const period = PERIODS[state.period]
  const end = Date.now()
  const start = end - period.duration
  const width = period.duration / period.bins
  return Array.from({ length: period.bins }, (_, index) => {
    const binStart = start + index * width
    const binEnd = index === period.bins - 1 ? end + 1 : binStart + width
    const events = state.filtered.filter((event) => event.time !== null && event.time >= binStart && event.time < binEnd)
    return { index, start: binStart, end: binEnd, events, count: events.length, maxMagnitude: Math.max(...events.map((event) => event.magnitude ?? 0), 0) }
  })
}

function activeTimelineBin() {
  if (!state.timelineFocus) return null
  return timelineBins().find((bin) => state.timelineFocus >= bin.start && state.timelineFocus < bin.end) || null
}

function selectionTimelineIndex(event) {
  if (!event?.time) return null
  return timelineBins().find((bin) => event.time >= bin.start && event.time < bin.end)?.index ?? null
}

function renderTimeline() {
  const bins = timelineBins()
  const maxCount = Math.max(...bins.map((bin) => bin.count), 1)
  const active = activeTimelineBin()
  const bars = bins.map((bin) => {
    const isActive = active?.index === bin.index
    const height = bin.count ? Math.max(12, Math.round((bin.count / maxCount) * 74)) : 5
    const label = `${formatDate(bin.start, { dateStyle: 'short', timeStyle: 'short' })}, ${bin.count} event${bin.count === 1 ? '' : 's'}${bin.maxMagnitude ? `, strongest M${bin.maxMagnitude.toFixed(1)}` : ''}`
    return `<button class="timeline-bar ${isActive ? 'is-active' : ''}" data-action="focus-time" data-focus="${bin.start}" style="--bar-height:${height}px" aria-label="${escapeAttribute(label)}" aria-pressed="${isActive}"><span class="timeline-bar-fill" style="height:${height}px"></span></button>`
  }).join('')
  const first = bins[0]?.start
  const last = bins.at(-1)?.end
  const selectedCopy = active ? `${active.count} event${active.count === 1 ? '' : 's'} in this interval` : 'Select a bar to illuminate its events'
  return `<section class="timeline-panel" aria-labelledby="timeline-title">
    <div class="section-heading timeline-heading">
      <div><span class="section-index">TIME / ${PERIODS[state.period].short}</span><h2 id="timeline-title">Activity through time</h2></div>
      <div class="timeline-caption">${active ? `<button class="text-button" data-action="clear-focus">Clear time focus</button>` : selectedCopy}</div>
    </div>
    <div class="timeline-chart" role="group" aria-label="Earthquake event distribution over ${PERIODS[state.period].label.toLowerCase()}">${bars}</div>
    <div class="timeline-axis"><span>${first ? formatDate(first, { dateStyle: 'short', timeStyle: 'short' }) : 'Start'}</span><span>${selectedCopy}</span><span>${last ? formatDate(last, { dateStyle: 'short', timeStyle: 'short' }) : 'Now'}</span></div>
  </section>`
}

function renderMap() {
  const displayEvents = state.filtered.slice(0, 250)
  const selected = getEvent(state.selectedId)
  const active = activeTimelineBin()
  const landPaths = land.map((path) => `<path class="land" d="${path}"/>`).join('')
  const graticule = [
    ...[-60, -30, 0, 30, 60].map((latitude) => { const y = project(0, latitude).y; return `<path class="grid-line" d="M0 ${y}H1000"/>` }),
    ...[-120, -60, 0, 60, 120].map((longitude) => { const x = project(longitude, 0).x; return `<path class="grid-line" d="M${x} 0V520"/>` }),
  ].join('')
  const markers = displayEvents.map((event, index) => {
    const point = project(event.longitude, event.latitude)
    const duplicateOffset = index % 4 === 0 ? 0 : ((index % 4) - 1.5) * 3
    const x = point.x + duplicateOffset
    const y = point.y + duplicateOffset
    const selectedClass = selected?.id === event.id ? 'is-selected' : ''
    const dimmedClass = active && !(event.time >= active.start && event.time < active.end) ? 'is-dimmed' : ''
    const radius = event.magnitude === null ? 4 : Math.min(18, 3 + Math.max(0, event.magnitude) * 1.7)
    const label = `${event.title}, magnitude ${formatMagnitude(event.magnitude)}, ${formatDepth(event.depth)}`
    return `<circle class="map-marker ${magnitudeClass(event.magnitude)} ${selectedClass} ${dimmedClass}" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius.toFixed(1)}" data-event-id="${escapeAttribute(event.id)}" tabindex="0" role="button" aria-label="${escapeAttribute(label)}"><title>${escapeHtml(label)}</title></circle>`
  }).join('')
  const emptyMap = displayEvents.length === 0 ? '<text class="map-empty" x="500" y="270" text-anchor="middle">No events match the current constraints</text>' : ''
  return `<div class="map-frame" aria-label="Global earthquake map with a text alternative in the event stream">
    <div class="map-topline"><div><span class="section-index">FIELD VIEW / GLOBAL</span><h2>Where the ground moved</h2></div><span class="map-count">${displayEvents.length === state.filtered.length ? `${state.filtered.length.toLocaleString()} plotted` : `${displayEvents.length} plotted · ${state.filtered.length - displayEvents.length} beyond view`}</span></div>
    <div class="map-canvas"><svg viewBox="0 0 1000 520" role="img" aria-label="Global map showing filtered USGS earthquake locations">${graticule}${landPaths}<path class="equator" d="M0 260H1000"/>${markers}${emptyMap}</svg><div class="map-legend"><span><i class="legend-dot ordinary"></i> M &lt; 4.5</span><span><i class="legend-dot notable"></i> M 4.5–5.9</span><span><i class="legend-dot major"></i> M 6.0+</span></div><div class="map-note">Circle size shows magnitude. Position shows epicentre. Depth and alert status are in the record.</div></div>
    <div class="map-footer"><span>${selected ? `Selected: <strong>${escapeHtml(selected.place)}</strong>` : 'Select a point or record to inspect it'}</span><span>${state.filtered.length > 250 ? 'Map limited to 250 events for clarity' : 'All matching events plotted'}</span></div>
  </div>`
}

function renderEventRow(event) {
  const selected = event.id === state.selectedId
  const active = activeTimelineBin()
  const inFocus = active && event.time >= active.start && event.time < active.end
  const level = signalLabel(event)
  return `<button class="event-row ${selected ? 'is-selected' : ''} ${active && !inFocus ? 'is-dimmed' : ''}" data-action="select-event" data-event-id="${escapeAttribute(event.id)}" aria-pressed="${selected}">
    <span class="event-magnitude ${magnitudeClass(event.magnitude)}">${formatMagnitude(event.magnitude)}</span>
    <span class="event-copy"><strong>${escapeHtml(event.place)}</strong><span>${formatRelative(event.time)} · ${formatDepth(event.depth)}</span></span>
    <span class="event-signal ${level.tone}" aria-label="${level.label}"></span>
  </button>`
}

function renderEventStream() {
  const limit = 80
  const rows = state.filtered.slice(0, limit).map(renderEventRow).join('')
  const countCopy = `${state.filtered.length.toLocaleString()} result${state.filtered.length === 1 ? '' : 's'}`
  const sortOptions = [['recent', 'Most recent'], ['magnitude', 'Largest magnitude'], ['significance', 'USGS significance']].map(([value, label]) => `<option value="${value}" ${state.sort === value ? 'selected' : ''}>${label}</option>`).join('')
  if (!state.filtered.length) return `<section class="stream-panel" aria-labelledby="stream-title"><div class="section-heading"><div><span class="section-index">CATALOGUE</span><h2 id="stream-title">Event stream</h2></div></div><div class="empty-state"><div class="empty-mark">∅</div><h3>No events in this view</h3><p>Try widening the magnitude, depth, or place constraints. The live catalogue remains available in the current period.</p><button class="button button-secondary" data-action="reset-filters">Reset filters</button></div></section>`
  return `<section class="stream-panel" aria-labelledby="stream-title"><div class="section-heading stream-heading"><div><span class="section-index">CATALOGUE</span><h2 id="stream-title">Event stream</h2></div><span class="result-count" aria-live="polite">${countCopy}</span></div><div class="stream-controls"><label class="sr-only" for="sort-select">Sort events</label><select id="sort-select" class="control-select compact-select" data-input="sort">${sortOptions}</select><span class="stream-limit">${state.filtered.length > limit ? `showing ${limit}` : 'all results'}</span></div><div class="event-list" tabindex="0" aria-label="Earthquake events">${rows}</div></section>`
}

function renderDetail() {
  const event = getEvent(state.selectedId)
  if (!event) return `<aside class="detail-panel detail-empty" aria-labelledby="detail-title"><div class="section-index">EVENT RECORD</div><div class="detail-empty-mark">+</div><h2 id="detail-title">Choose an event</h2><p>Pick a point on the map or a row in the stream. The record will stay in context as you explore the catalogue.</p></aside>`
  const level = signalLabel(event)
  const status = event.status === 'reviewed' ? 'Reviewed' : event.status === 'automatic' ? 'Automatic review' : 'Review status not reported'
  const alert = event.alert ? event.alert[0].toUpperCase() + event.alert.slice(1) : 'No alert level reported'
  const detailLink = event.url || event.detail
  return `<aside class="detail-panel ${level.tone}" aria-labelledby="detail-title"><div class="detail-top"><div><span class="section-index">EVENT RECORD</span><span class="detail-id">${escapeHtml(event.id)}</span></div><button class="icon-button" data-action="close-event" aria-label="Clear selected event">${icon('close', 18)}</button></div><div class="detail-hero"><div class="detail-magnitude ${magnitudeClass(event.magnitude)}">${formatMagnitude(event.magnitude)}</div><div><span class="detail-unit">MAGNITUDE</span><span class="detail-classification ${level.tone}">${level.label}</span></div></div><h2 id="detail-title">${escapeHtml(event.place)}</h2><p class="detail-time">${formatDate(event.time)} <span>your local time</span><br><small>${formatUtc(event.time)}</small></p><p class="detail-note">${level.note}</p><dl class="detail-grid"><div><dt>Depth</dt><dd>${event.depth === null ? 'Not reported' : `${event.depth.toFixed(1)} km`}</dd></div><div><dt>Significance</dt><dd>${event.significance === null ? 'Not reported' : `${event.significance} / 1000`}</dd></div><div><dt>Felt reports</dt><dd>${event.felt === null ? 'Not reported' : event.felt.toLocaleString()}</dd></div><div><dt>Event type</dt><dd>${escapeHtml(event.type)}</dd></div><div><dt>Alert level</dt><dd>${escapeHtml(alert)}</dd></div><div><dt>Tsunami flag</dt><dd>${event.tsunami ? 'Yes' : 'No'}</dd></div><div><dt>Review status</dt><dd>${escapeHtml(status)}</dd></div><div><dt>Coordinates</dt><dd>${formatCoordinate(event.latitude, 'N', 'S')}<br>${formatCoordinate(event.longitude, 'E', 'W')}</dd></div></dl><div class="detail-actions"><a class="button button-primary" href="${escapeAttribute(detailLink || 'https://earthquake.usgs.gov/earthquakes/') }" target="_blank" rel="noreferrer">Open USGS record ${icon('external', 15)}</a><button class="button button-secondary" data-action="share-event">Copy event link</button></div><p class="detail-footnote">USGS values may be revised as the event is reviewed. Magnitude alone does not predict damage.</p></aside>`
}

function renderFilters() {
  const active = activeFilterCount()
  const chips = [
    state.filters.minMagnitude > 0 ? `M ≥ ${state.filters.minMagnitude.toFixed(1)}` : '',
    state.filters.maxDepth !== 'all' ? `Depth ≤ ${state.filters.maxDepth} km` : '',
    state.filters.alert !== 'all' ? `Alert: ${state.filters.alert === 'none' ? 'none' : state.filters.alert}` : '',
    state.filters.tsunami !== 'all' ? `Tsunami: ${state.filters.tsunami}` : '',
    state.filters.review !== 'all' ? `${state.filters.review === 'reviewed' ? 'Reviewed' : 'Automatic'}` : '',
    state.filters.query.trim() ? `Place: ${state.filters.query.trim()}` : '',
  ].filter(Boolean).map((chip) => `<span class="filter-chip">${escapeHtml(chip)}</span>`).join('')
  return `<section class="filter-section ${state.filtersOpen ? 'is-open' : ''}" aria-label="Event filters"><div class="filter-bar"><button class="filter-trigger ${active ? 'has-active' : ''}" data-action="toggle-filters" aria-expanded="${state.filtersOpen}">${icon('filter', 17)}<span>${active ? `${active} active filter${active === 1 ? '' : 's'}` : 'Filter the catalogue'}</span>${icon('chevron', 16)}</button><div class="filter-chips">${chips || '<span class="filter-summary">All event types · no constraints</span>'}</div>${active ? '<button class="text-button reset-trigger" data-action="reset-filters">Reset</button>' : ''}</div><div class="filter-drawer"><div class="filter-control magnitude-control"><label for="magnitude-range">Minimum magnitude <output id="magnitude-output">${state.filters.minMagnitude.toFixed(1)}</output></label><input id="magnitude-range" type="range" min="0" max="8" step="0.1" value="${state.filters.minMagnitude}" data-input="minMagnitude" /><div class="range-labels"><span>All</span><span>4.5 notable</span><span>8.0</span></div></div><div class="filter-control"><label for="depth-select">Maximum depth</label><select id="depth-select" class="control-select" data-input="maxDepth"><option value="all" ${state.filters.maxDepth === 'all' ? 'selected' : ''}>Any depth</option><option value="30" ${state.filters.maxDepth === '30' ? 'selected' : ''}>Shallow · ≤ 30 km</option><option value="70" ${state.filters.maxDepth === '70' ? 'selected' : ''}>Moderate · ≤ 70 km</option><option value="300" ${state.filters.maxDepth === '300' ? 'selected' : ''}>Deep · ≤ 300 km</option><option value="700" ${state.filters.maxDepth === '700' ? 'selected' : ''}>All catalogued · ≤ 700 km</option></select></div><div class="filter-control"><label for="alert-select">Alert level</label><select id="alert-select" class="control-select" data-input="alert"><option value="all">Any alert level</option><option value="red" ${state.filters.alert === 'red' ? 'selected' : ''}>Red</option><option value="orange" ${state.filters.alert === 'orange' ? 'selected' : ''}>Orange</option><option value="yellow" ${state.filters.alert === 'yellow' ? 'selected' : ''}>Yellow</option><option value="green" ${state.filters.alert === 'green' ? 'selected' : ''}>Green</option><option value="none" ${state.filters.alert === 'none' ? 'selected' : ''}>No alert reported</option></select></div><div class="filter-control"><label for="tsunami-select">Tsunami flag</label><select id="tsunami-select" class="control-select" data-input="tsunami"><option value="all">Any tsunami flag</option><option value="yes" ${state.filters.tsunami === 'yes' ? 'selected' : ''}>Flagged yes</option><option value="no" ${state.filters.tsunami === 'no' ? 'selected' : ''}>Flagged no</option></select></div><div class="filter-control"><label for="review-select">Review status</label><select id="review-select" class="control-select" data-input="review"><option value="all">Any review status</option><option value="reviewed" ${state.filters.review === 'reviewed' ? 'selected' : ''}>Reviewed</option><option value="automatic" ${state.filters.review === 'automatic' ? 'selected' : ''}>Automatic</option></select></div><div class="filter-control place-control"><label for="place-search">Place or region</label><div class="search-control">${icon('search', 16)}<input id="place-search" type="search" value="${escapeAttribute(state.filters.query)}" placeholder="e.g. Japan, Alaska, Tonga" data-input="query" /></div><span class="control-help">Searches place names in the USGS catalogue.</span></div></div></section>`
}

function renderHeader() {
  const period = PERIODS[state.period]
  const topEvent = pickDefaultEvent()
  const level = topEvent ? signalLabel(topEvent) : null
  const statusClass = state.error ? 'error' : state.loading ? 'loading' : 'live'
  return `<header class="app-header"><a class="brand" href="${window.location.pathname}" aria-label="Seismic Observatory home"><span class="brand-mark">${icon('pulse', 21)}</span><span><strong>SEISMIC</strong><small>OBSERVATORY</small></span></a><div class="header-context"><span class="status-dot ${statusClass}"></span><span>${state.error ? 'Refresh failed' : state.loading ? 'Refreshing catalogue' : 'USGS live catalogue'}</span><span class="header-divider"></span><span>${formatFreshness(state.refreshedAt)}</span></div><div class="header-actions"><button class="button button-secondary refresh-button ${state.loading ? 'is-loading' : ''}" data-action="refresh" ${state.loading ? 'aria-busy="true"' : ''}>${icon('refresh', 16)}<span>${state.loading ? 'Refreshing' : 'Refresh'}</span></button><button class="icon-button about-button" data-action="toggle-about" aria-label="About this data" aria-expanded="${state.aboutOpen}">${icon('info', 18)}</button></div></header><div class="about-panel ${state.aboutOpen ? 'is-open' : ''}" role="note"><strong>Live catalogue, interpreted carefully.</strong><span>Earthquake data comes from the <a href="https://earthquake.usgs.gov/" target="_blank" rel="noreferrer">USGS</a> and may be revised. This is an exploration tool, not an emergency alert service. For authoritative local guidance, use local authorities and the official USGS record.</span></div><section class="intro"><div><span class="section-index">GLOBAL ACTIVITY / ${period.short}</span><h1>What the earth is doing <em>now.</em></h1><p>Explore recent earthquakes by place, time, depth, and catalogue significance. Start with the strongest signal, then follow its trace through the field.</p></div><div class="hero-signal">${topEvent ? `<span class="hero-signal-label">Strongest in view</span><button data-action="select-event" data-event-id="${escapeAttribute(topEvent.id)}"><strong>M${formatMagnitude(topEvent.magnitude)}</strong><span>${escapeHtml(topEvent.place)}</span><small>${formatRelative(topEvent.time)} · ${level.label}</small></button>` : '<span class="hero-signal-label">Strongest in view</span><strong>Waiting for data</strong>'}</div></section>`
}

function renderOverview() {
  const count = state.filtered.length
  const strongest = pickDefaultEvent()
  const averageDepth = state.filtered.filter((event) => event.depth !== null).reduce((sum, event) => sum + event.depth, 0) / (state.filtered.filter((event) => event.depth !== null).length || 1)
  const recent = state.filtered.filter((event) => event.time && event.time > Date.now() - 24 * 60 * 60 * 1000).length
  return `<section class="overview-strip" aria-label="Current catalogue summary"><div class="overview-item overview-count"><span class="overview-label">Matching events</span><strong>${count.toLocaleString()}</strong><span>in ${PERIODS[state.period].label.toLowerCase()}</span></div><div class="overview-item"><span class="overview-label">Last 24 hours</span><strong>${recent.toLocaleString()}</strong><span>within this view</span></div><div class="overview-item"><span class="overview-label">Strongest signal</span><strong>${formatMagnitude(strongest?.magnitude ?? null)}</strong><span>${strongest ? escapeHtml(strongest.place) : 'No event selected'}</span></div><div class="overview-item"><span class="overview-label">Mean depth</span><strong>${state.filtered.length ? `${Math.round(averageDepth)} km` : 'n/a'}</strong><span>where reported</span></div><div class="overview-trust"><span>${icon('layers', 17)}</span><p>Data from USGS<br><small>may be revised after review</small></p></div></section>`
}

function renderPeriodControls() {
  return `<div class="period-bar"><div class="period-label"><span class="section-index">TIME WINDOW</span><strong>${PERIODS[state.period].label}</strong></div><div class="period-buttons" role="group" aria-label="Choose time window">${Object.entries(PERIODS).map(([value, period]) => `<button class="period-button ${value === state.period ? 'is-active' : ''}" data-action="set-period" data-period="${value}" aria-pressed="${value === state.period}">${period.short}<span>${period.label.replace('Past ', '')}</span></button>`).join('')}</div><span class="period-copy">${state.events.length ? `${state.events.length.toLocaleString()} USGS records loaded` : 'Loading USGS records'}</span></div>`
}

function renderLoading() {
  return `<div class="loading-state"><div class="skeleton skeleton-map"></div><div class="skeleton skeleton-stream"></div><div class="loading-copy"><span class="status-dot loading"></span><strong>Reading the USGS catalogue</strong><span>Live records will appear as soon as they arrive.</span></div></div>`
}

function renderError() {
  if (!state.error) return ''
  const inline = state.events.length ? ' refresh again to update this view.' : ''
  return `<div class="error-banner" role="alert"><span class="error-icon">!</span><p><strong>USGS data could not be refreshed.</strong> ${escapeHtml(state.error)}${inline} ${state.events.length ? `<span class="stale-copy">Showing the last successful catalogue from ${formatFreshness(state.refreshedAt).toLowerCase()}.</span>` : ''}</p><button class="button button-secondary" data-action="refresh">Try again</button></div>`
}

function renderApp() {
  applyFilters()
  const hasData = state.events.length > 0
  root.innerHTML = `<div class="app-shell">${renderHeader()}${renderError()}${hasData ? `${renderOverview()}${renderPeriodControls()}${renderFilters()}<main class="workspace"><div class="primary-column">${renderMap()}${renderTimeline()}</div><div class="stream-column">${renderEventStream()}</div><div class="detail-column">${renderDetail()}</div></main><footer class="app-footer"><span>Seismic Observatory</span><span>Source: <a href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson" target="_blank" rel="noreferrer">USGS Earthquake Hazards Program</a></span><span>Catalogue values can change after review.</span></footer>` : state.loading ? renderLoading() : `<div class="first-error"><div class="empty-mark">⌁</div><h2>No live catalogue loaded</h2><p>${state.error ? 'The first request did not complete. Check your connection and try again.' : 'Connect to the USGS feed to begin exploring recent activity.'}</p><button class="button button-primary" data-action="refresh">Load live data ${icon('arrow', 16)}</button></div>`}</div>`
  updateLiveRegions()
}

function updateLiveRegions() {
  const title = document.querySelector('.stream-heading .result-count')
  if (title) title.setAttribute('aria-live', 'polite')
}

function setTimelineFocus(timestamp) {
  state.timelineFocus = Number(timestamp) || null
  setUrlState()
  renderApp()
}

function selectEvent(id) {
  const event = getEvent(id)
  if (!event) return
  state.selectedId = id
  const binIndex = selectionTimelineIndex(event)
  const bins = timelineBins()
  state.timelineFocus = binIndex === null ? null : bins[binIndex].start
  setUrlState()
  renderApp()
  window.requestAnimationFrame(() => {
    const selectedRow = document.querySelector('.event-row.is-selected')
    if (window.innerWidth < 800) selectedRow?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    document.querySelector('.detail-panel')?.setAttribute('data-just-selected', 'true')
  })
}

function resetFilters() {
  state.filters = { ...DEFAULT_FILTERS }
  state.timelineFocus = null
  setUrlState()
  renderApp()
}

async function loadData({ preserveSelection = true } = {}) {
  const request = ++loadRequest
  state.loading = true
  state.error = null
  renderApp()
  try {
    const response = await fetch(FEEDS[state.period], { cache: 'no-store' })
    if (!response.ok) throw new Error(`USGS returned HTTP ${response.status}.`)
    const payload = await response.json()
    const events = Array.isArray(payload.features) ? payload.features.map(normalizeFeature).filter(Boolean) : []
    if (!events.length) throw new Error('The feed returned no usable event records.')
    if (request !== loadRequest) return
    state.events = events
    state.refreshedAt = Date.now()
    state.loading = false
    state.error = null
    applyFilters()
    if (!preserveSelection || !state.selectedId || !state.filtered.some((event) => event.id === state.selectedId)) state.selectedId = pickDefaultEvent()?.id || null
    setUrlState()
    renderApp()
  } catch (error) {
    if (request !== loadRequest) return
    state.loading = false
    state.error = error instanceof Error ? error.message : 'Unknown network error.'
    renderApp()
  }
}

function updateFilter(input) {
  const key = input.dataset.input
  if (!key) return
  if (key === 'sort') state.sort = input.value
  else state.filters[key] = key === 'minMagnitude' ? Number(input.value) : input.value
  if (key === 'minMagnitude') {
    const output = document.querySelector('#magnitude-output')
    if (output) output.textContent = Number(input.value).toFixed(1)
  }
  setUrlState()
  renderApp()
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]')
  if (!target) return
  const action = target.dataset.action
  if (action === 'refresh') loadData()
  if (action === 'toggle-filters') { state.filtersOpen = !state.filtersOpen; renderApp() }
  if (action === 'toggle-about') { state.aboutOpen = !state.aboutOpen; renderApp() }
  if (action === 'reset-filters') resetFilters()
  if (action === 'clear-focus') { state.timelineFocus = null; setUrlState(); renderApp() }
  if (action === 'focus-time') setTimelineFocus(target.dataset.focus)
  if (action === 'set-period' && PERIODS[target.dataset.period]) { state.period = target.dataset.period; state.timelineFocus = null; state.selectedId = null; setUrlState(); loadData({ preserveSelection: false }) }
  if (action === 'select-event') selectEvent(target.dataset.eventId)
  if (action === 'close-event') { state.selectedId = null; state.timelineFocus = null; setUrlState(); renderApp() }
  if (action === 'share-event') {
    const shareUrl = window.location.href
    const copyPromise = navigator.clipboard?.writeText ? navigator.clipboard.writeText(shareUrl) : Promise.reject(new Error('Clipboard is unavailable'))
    copyPromise.then(() => { target.textContent = 'Link copied'; window.setTimeout(() => { if (target.isConnected) target.textContent = 'Copy event link' }, 1600) }).catch(() => { target.textContent = shareUrl })
  }
})

document.addEventListener('input', (event) => {
  if (event.target.matches('[data-input="minMagnitude"]')) updateFilter(event.target)
  if (event.target.matches('[data-input="query"]')) {
    window.clearTimeout(window.__queryTimer)
    window.__queryTimer = window.setTimeout(() => updateFilter(event.target), 180)
  }
})

document.addEventListener('change', (event) => {
  if (event.target.matches('[data-input]') && !event.target.matches('[data-input="minMagnitude"], [data-input="query"]')) updateFilter(event.target)
})

document.addEventListener('keydown', (event) => {
  if (event.target.matches('.map-marker') && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); selectEvent(event.target.dataset.eventId) }
  if (event.key === 'Escape' && state.aboutOpen) { state.aboutOpen = false; renderApp() }
})

window.addEventListener('online', () => { if (state.error) loadData() })
window.addEventListener('offline', () => { if (state.events.length) { state.error = 'Your connection is offline.'; renderApp() } })
window.setInterval(() => { if (state.events.length && !state.loading) renderApp() }, 60000)

renderApp()
loadData()
