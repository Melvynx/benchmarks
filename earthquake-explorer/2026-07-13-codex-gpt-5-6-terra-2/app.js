const FEEDS = {
  hour: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
  day: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  week: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
  month: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson',
};

const PERIOD_LABELS = { hour: 'the past hour', day: 'the past day', week: 'the past 7 days', month: 'the past 30 days' };
const defaultState = { period: 'week', magnitude: '0', depth: 'all', alert: 'all', tsunami: 'all', review: 'all', area: '', sort: 'recent', selectedId: null, timeFocus: null };
const state = { ...defaultState };
let allEvents = [];
let feedGeneratedAt = null;
let map;
let eventLayer;
let refreshController;
let isRefreshing = false;
let mapAvailable = false;
let shouldAutoSelect = !state.selectedId;

const $ = (selector) => document.querySelector(selector);
const els = {
  map: $('#map'), mapLoading: $('#map-loading'), mapEventCount: $('#map-event-count'), sourceStatus: $('#source-status'),
  periodContext: $('#period-context'), magnitude: $('#magnitude-filter'), depth: $('#depth-filter'), alert: $('#alert-filter'),
  tsunami: $('#tsunami-filter'), review: $('#review-filter'), area: $('#area-filter'), sort: $('#sort-select'),
  reset: $('#reset-filters'), activeFilterCount: $('#active-filter-count'), activeConstraints: $('#active-constraints'),
  eventList: $('#event-list'), resultCount: $('#result-count'), timeline: $('#timeline'), timelineReadout: $('#timeline-readout'),
  timelineSummary: $('#timeline-summary'), timelineText: $('#timeline-text'), clearTimeFocus: $('#clear-time-focus'),
  detailEmpty: $('#detail-empty'), eventDetail: $('#event-detail'), refresh: $('#refresh-button'), toast: $('#toast'),
  about: $('#about-button'), aboutPopover: $('#about-popover'), showList: $('#show-list'),
};

function parseUrl() {
  const p = new URLSearchParams(location.search);
  const read = (key, allowed) => allowed.includes(p.get(key)) ? p.get(key) : undefined;
  state.period = read('period', Object.keys(FEEDS)) || defaultState.period;
  state.magnitude = read('mag', ['0', '2.5', '4.5', '6']) || '0';
  state.depth = read('depth', ['all', 'shallow', 'intermediate', 'deep']) || 'all';
  state.alert = read('alert', ['all', 'green', 'yellow', 'orange', 'red', 'none']) || 'all';
  state.tsunami = read('tsunami', ['all', 'yes', 'no']) || 'all';
  state.review = read('review', ['all', 'reviewed', 'automatic']) || 'all';
  state.sort = read('sort', ['recent', 'strongest', 'significance', 'shallow']) || 'recent';
  state.area = (p.get('area') || '').slice(0, 80);
  state.selectedId = p.get('event') || null;
  state.timeFocus = p.get('time') || null;
}

function persistUrl() {
  const p = new URLSearchParams();
  if (state.period !== 'week') p.set('period', state.period);
  if (state.magnitude !== '0') p.set('mag', state.magnitude);
  if (state.depth !== 'all') p.set('depth', state.depth);
  if (state.alert !== 'all') p.set('alert', state.alert);
  if (state.tsunami !== 'all') p.set('tsunami', state.tsunami);
  if (state.review !== 'all') p.set('review', state.review);
  if (state.area) p.set('area', state.area);
  if (state.sort !== 'recent') p.set('sort', state.sort);
  if (state.selectedId) p.set('event', state.selectedId);
  if (state.timeFocus) p.set('time', state.timeFocus);
  history.replaceState(null, '', `${location.pathname}${p.size ? `?${p}` : ''}`);
}

function eventFromFeature(feature) {
  const props = feature.properties || {};
  const coordinates = feature.geometry?.coordinates || [];
  return {
    id: feature.id || props.code,
    magnitude: Number.isFinite(props.mag) ? props.mag : null,
    place: props.place || 'Location not specified',
    time: props.time ? new Date(props.time) : null,
    updated: props.updated ? new Date(props.updated) : null,
    longitude: Number.isFinite(coordinates[0]) ? coordinates[0] : null,
    latitude: Number.isFinite(coordinates[1]) ? coordinates[1] : null,
    depth: Number.isFinite(coordinates[2]) ? coordinates[2] : null,
    significance: Number.isFinite(props.sig) ? props.sig : null,
    felt: Number.isFinite(props.felt) ? props.felt : null,
    alert: props.alert || null,
    tsunami: props.tsunami === 1,
    status: props.status || null,
    type: props.type || 'earthquake',
    title: props.title || null,
    url: props.url || null,
    detail: props.detail || null,
  };
}

function getFilteredEvents() {
  const area = state.area.trim().toLocaleLowerCase();
  const minMagnitude = Number(state.magnitude);
  return allEvents.filter((event) => {
    if (event.magnitude === null || event.magnitude < minMagnitude) return false;
    if (state.depth === 'shallow' && !(event.depth >= 0 && event.depth < 70)) return false;
    if (state.depth === 'intermediate' && !(event.depth >= 70 && event.depth < 300)) return false;
    if (state.depth === 'deep' && !(event.depth >= 300)) return false;
    if (state.alert === 'none' && event.alert) return false;
    if (state.alert !== 'all' && state.alert !== 'none' && event.alert !== state.alert) return false;
    if (state.tsunami === 'yes' && !event.tsunami) return false;
    if (state.tsunami === 'no' && event.tsunami) return false;
    if (state.review === 'reviewed' && event.status !== 'reviewed') return false;
    if (state.review === 'automatic' && event.status !== 'automatic') return false;
    return !area || event.place.toLocaleLowerCase().includes(area);
  }).sort((a, b) => {
    if (state.sort === 'strongest') return (b.magnitude ?? -Infinity) - (a.magnitude ?? -Infinity) || b.time - a.time;
    if (state.sort === 'significance') return (b.significance ?? -Infinity) - (a.significance ?? -Infinity) || b.time - a.time;
    if (state.sort === 'shallow') return (a.depth ?? Infinity) - (b.depth ?? Infinity) || b.time - a.time;
    return b.time - a.time;
  });
}

function timeFocused(event) {
  return !state.timeFocus || bucketId(event.time) === state.timeFocus;
}

function bucketCount() { return state.period === 'hour' ? 12 : state.period === 'day' ? 24 : state.period === 'week' ? 28 : 30; }
function startForPeriod() {
  const now = Date.now();
  const ms = state.period === 'hour' ? 3600000 : state.period === 'day' ? 86400000 : state.period === 'week' ? 604800000 : 2592000000;
  return now - ms;
}
function bucketInfo(date) {
  const count = bucketCount(); const start = startForPeriod(); const span = (Date.now() - start) / count;
  const index = Math.max(0, Math.min(count - 1, Math.floor((date.getTime() - start) / span)));
  return { index, id: `t${index}`, start: new Date(start + index * span), end: new Date(start + (index + 1) * span) };
}
function bucketId(date) { return date ? bucketInfo(date).id : null; }

function magnitudeClass(magnitude) { return magnitude >= 6 ? 'high' : magnitude >= 4 ? 'medium' : 'low'; }
function formatMagnitude(magnitude) { return magnitude === null ? 'M —' : `M ${magnitude.toFixed(1)}`; }
function formatDepth(depth) { return depth === null ? 'Depth unavailable' : `${depth.toFixed(depth < 10 ? 1 : 0)} km deep`; }
function formatNumber(number) { return Number.isFinite(number) ? new Intl.NumberFormat().format(number) : 'Not reported'; }
function localTime(date, includeDate = true) {
  if (!date || Number.isNaN(date.getTime())) return 'Time not reported';
  return new Intl.DateTimeFormat(undefined, { month: includeDate ? 'short' : undefined, day: includeDate ? 'numeric' : undefined, hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' }).format(date);
}
function relativeTime(date) {
  if (!date) return 'Time not reported'; const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'just now'; if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`; if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`; return `${Math.round(seconds / 86400)}d ago`;
}
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
function titleCase(value) { return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Not reported'; }

function initMap() {
  if (!window.L) { showMapFailure(); return; }
  map = L.map(els.map, { zoomControl: false, minZoom: 2, maxZoom: 11, worldCopyJump: true, preferCanvas: true, attributionControl: true }).setView([19, 8], 2);
  mapAvailable = true;
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors', crossOrigin: true }).addTo(map);
  eventLayer = L.layerGroup().addTo(map);
  map.on('moveend zoomend', () => renderMapMarkers(getFilteredEvents()));
}

function showMapFailure() {
  els.mapLoading.innerHTML = '<p><strong>Map unavailable.</strong><br>The keyboard-accessible event stream below remains available when the map library cannot load.</p>';
  els.mapLoading.classList.remove('is-hidden');
}

function markerHtml(event, selected, focused) {
  const magnitude = event.magnitude === null ? '—' : event.magnitude.toFixed(1);
  return `<span data-event-id="${escapeHtml(event.id)}" class="quake-marker ${magnitudeClass(event.magnitude ?? 0)} ${selected ? 'is-selected' : ''} ${focused ? 'is-focused' : 'is-muted'}" style="--size:${Math.max(25, Math.min(48, 18 + (event.magnitude ?? 0) * 4))}px"><b>${magnitude}</b></span>`;
}

function renderMapMarkers(events) {
  if (!eventLayer || !map) return;
  eventLayer.clearLayers();
  const zoom = map.getZoom();
  const cell = Math.max(0.13, 24 / Math.pow(2, Math.max(0, zoom - 2)));
  const groups = new Map();
  events.filter((e) => e.latitude !== null && e.longitude !== null).forEach((event) => {
    const key = `${Math.round(event.latitude / cell)}:${Math.round(event.longitude / cell)}`;
    groups.set(key, [...(groups.get(key) || []), event]);
  });
  groups.forEach((eventsAtLocation) => {
    if (eventsAtLocation.length === 1) {
      const event = eventsAtLocation[0];
      const icon = L.divIcon({ className: 'quake-icon', html: markerHtml(event, event.id === state.selectedId, timeFocused(event)), iconSize: [50, 50], iconAnchor: [25, 25] });
      L.marker([event.latitude, event.longitude], { icon, keyboard: false, riseOnHover: true })
        .on('click', () => selectEvent(event.id, 'map'))
        .on('mouseover', () => highlightListRow(event.id, true))
        .on('mouseout', () => highlightListRow(event.id, false))
        .addTo(eventLayer);
      return;
    }
    const strongest = eventsAtLocation.reduce((winner, event) => (event.magnitude ?? 0) > (winner.magnitude ?? 0) ? event : winner, eventsAtLocation[0]);
    const hasFocus = eventsAtLocation.some(timeFocused);
    const icon = L.divIcon({ className: 'cluster-icon', html: `<button class="quake-cluster ${magnitudeClass(strongest.magnitude ?? 0)} ${hasFocus ? '' : 'is-muted'}" tabindex="-1" aria-label="${eventsAtLocation.length} earthquakes clustered here"><strong>${eventsAtLocation.length}</strong><small>events</small></button>`, iconSize: [56, 56], iconAnchor: [28, 28] });
    const lat = eventsAtLocation.reduce((sum, e) => sum + e.latitude, 0) / eventsAtLocation.length;
    const lng = eventsAtLocation.reduce((sum, e) => sum + e.longitude, 0) / eventsAtLocation.length;
    L.marker([lat, lng], { icon, keyboard: false }).on('click', () => {
      const bounds = L.latLngBounds(eventsAtLocation.map((e) => [e.latitude, e.longitude]));
      if (bounds.isValid() && map.getZoom() < 11) map.fitBounds(bounds.pad(0.55), { maxZoom: Math.min(11, map.getZoom() + 3) });
      else selectEvent(strongest.id, 'map');
    }).addTo(eventLayer);
  });
  els.mapEventCount.textContent = `${events.length.toLocaleString()} EVENTS`;
}

function renderTimeline(events) {
  const count = bucketCount(); const bins = Array.from({ length: count }, (_, index) => ({ index, id: `t${index}`, events: [], strongest: 0 }));
  events.forEach((event) => { if (!event.time) return; const bin = bins[bucketInfo(event.time).index]; bin.events.push(event); bin.strongest = Math.max(bin.strongest, event.magnitude ?? 0); });
  const maximum = Math.max(1, ...bins.map((bin) => bin.events.length));
  const populated = bins.filter((bin) => bin.events.length).length;
  els.timeline.innerHTML = bins.map((bin) => {
    const info = bucketInfo(bin.start); const height = bin.events.length ? Math.max(8, Math.round((bin.events.length / maximum) * 100)) : 3;
    const selected = state.timeFocus === bin.id;
    const hasSelectedEvent = bin.events.some((event) => event.id === state.selectedId);
    const label = `${bin.events.length} event${bin.events.length === 1 ? '' : 's'} between ${localTime(info.start)} and ${localTime(info.end)}`;
    return `<button class="timeline-bin ${selected ? 'is-selected' : ''} ${hasSelectedEvent ? 'has-selected-event' : ''} ${bin.events.length ? '' : 'is-empty'}" type="button" role="listitem" data-time-bin="${bin.id}" aria-pressed="${selected}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><span class="timeline-bar magnitude-${magnitudeClass(bin.strongest)}" style="height:${height}%"></span></button>`;
  }).join('');
  els.timeline.querySelectorAll('[data-time-bin]').forEach((button) => button.addEventListener('click', () => setTimeFocus(button.dataset.timeBin)));
  const focused = bins.find((bin) => bin.id === state.timeFocus);
  els.timelineReadout.textContent = focused ? `${focused.events.length} events in this interval` : `${events.length.toLocaleString()} events observed`;
  els.timelineSummary.textContent = `${populated} active intervals across ${PERIOD_LABELS[state.period]}; bar height shows event count and tone reflects the strongest recorded magnitude.`;
  els.timelineText.textContent = els.timelineSummary.textContent;
  els.clearTimeFocus.hidden = !state.timeFocus;
}

function filterLabels() {
  const labels = [];
  if (state.magnitude !== '0') labels.push(`M ${state.magnitude}+`);
  if (state.depth !== 'all') labels.push(`${titleCase(state.depth)} depth`);
  if (state.alert !== 'all') labels.push(state.alert === 'none' ? 'No alert issued' : `${titleCase(state.alert)} alert`);
  if (state.tsunami !== 'all') labels.push(state.tsunami === 'yes' ? 'Tsunami flagged' : 'No tsunami flag');
  if (state.review !== 'all') labels.push(titleCase(state.review));
  if (state.area) labels.push(`Area: ${state.area}`);
  return labels;
}

function renderFilterState(events) {
  const labels = filterLabels();
  els.activeFilterCount.textContent = `${labels.length} filter${labels.length === 1 ? '' : 's'}`;
  els.activeFilterCount.hidden = !labels.length;
  els.reset.hidden = !labels.length;
  els.activeConstraints.innerHTML = labels.length ? `<span>Showing ${escapeHtml(labels.join(' · '))}</span>` : `<span>Showing every recorded earthquake in ${PERIOD_LABELS[state.period]}</span>`;
  els.resultCount.textContent = `(${events.length.toLocaleString()})`;
  els.periodContext.textContent = `${events.length.toLocaleString()} events in ${PERIOD_LABELS[state.period]}`;
}

function eventRow(event) {
  const selected = event.id === state.selectedId;
  const focus = timeFocused(event);
  const alert = event.alert ? `<span class="alert-tag alert-${event.alert}"><span aria-hidden="true">◆</span>${event.alert} alert</span>` : '';
  const tsunami = event.tsunami ? `<span class="tsunami-tag">Tsunami flagged</span>` : '';
  return `<button class="event-row ${selected ? 'is-selected' : ''} ${focus ? '' : 'is-time-muted'}" type="button" data-event-id="${escapeHtml(event.id)}" aria-pressed="${selected}">
    <span class="event-magnitude ${magnitudeClass(event.magnitude ?? 0)}">${escapeHtml(formatMagnitude(event.magnitude).replace('M ', ''))}<small>MAG</small></span>
    <span class="event-main"><strong>${escapeHtml(event.place)}</strong><span>${escapeHtml(relativeTime(event.time))} · ${escapeHtml(localTime(event.time))}</span></span>
    <span class="event-measures"><span>${escapeHtml(formatDepth(event.depth))}</span><span>Sig. ${event.significance ?? '—'}</span></span>
    <span class="event-flags">${alert}${tsunami}</span><span class="row-arrow" aria-hidden="true">→</span>
  </button>`;
}

function renderEventList(events) {
  const oldScroll = els.eventList.scrollTop;
  if (!events.length) {
    const constraints = filterLabels();
    els.eventList.innerHTML = `<div class="empty-state"><span aria-hidden="true">∿</span><h3>No events match this field view</h3><p>${constraints.length ? `The current constraints (${escapeHtml(constraints.join(', '))}) excluded all available USGS records.` : 'There are no USGS records in this observation period.'}</p>${constraints.length ? '<button class="reset-empty" type="button">Clear filters</button>' : ''}</div>`;
    els.eventList.querySelector('.reset-empty')?.addEventListener('click', resetFilters);
    return;
  }
  els.eventList.innerHTML = events.map(eventRow).join('');
  els.eventList.scrollTop = oldScroll;
  els.eventList.querySelectorAll('[data-event-id]').forEach((row) => {
    row.addEventListener('click', () => selectEvent(row.dataset.eventId, 'list'));
    row.addEventListener('mouseenter', () => highlightMapMarker(row.dataset.eventId, true));
    row.addEventListener('mouseleave', () => highlightMapMarker(row.dataset.eventId, false));
    row.addEventListener('focus', () => highlightMapMarker(row.dataset.eventId, true));
    row.addEventListener('blur', () => highlightMapMarker(row.dataset.eventId, false));
  });
}

function highlightMapMarker(id, active) {
  const marker = els.map.querySelector(`[data-event-id="${CSS.escape(id)}"]`);
  marker?.classList.toggle('is-hovered', active);
}
function highlightListRow(id, active) {
  const row = els.eventList.querySelector(`[data-event-id="${CSS.escape(id)}"]`);
  row?.classList.toggle('is-hovered', active);
}

function renderDetail() {
  const event = allEvents.find((item) => item.id === state.selectedId);
  if (!event) { state.selectedId = null; els.detailEmpty.hidden = false; els.eventDetail.hidden = true; return; }
  els.detailEmpty.hidden = true; els.eventDetail.hidden = false;
  const severity = event.alert || (event.magnitude !== null && event.magnitude >= 6 ? 'notable' : 'observed');
  const warning = event.tsunami ? '<p class="detail-notice"><strong>Tsunami flag present.</strong> Check the linked USGS event page and official local authorities for authoritative updates.</p>' : '';
  const alertLine = event.alert ? `<span class="detail-chip alert-${event.alert}"><i aria-hidden="true">◆</i>${titleCase(event.alert)} alert</span>` : '<span class="detail-chip">No USGS alert</span>';
  const felt = event.felt === null ? 'Not reported' : `${formatNumber(event.felt)} report${event.felt === 1 ? '' : 's'}`;
  const coordinates = event.latitude === null || event.longitude === null ? 'Not reported' : `${Math.abs(event.latitude).toFixed(3)}° ${event.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(event.longitude).toFixed(3)}° ${event.longitude >= 0 ? 'E' : 'W'}`;
  els.eventDetail.innerHTML = `<div class="detail-top"><p class="eyebrow">${escapeHtml(severity)} event</p><button class="close-detail" type="button" aria-label="Close event details">×</button></div>
    <div class="detail-title"><span class="detail-magnitude ${magnitudeClass(event.magnitude ?? 0)}">${escapeHtml(formatMagnitude(event.magnitude))}</span><div><h2>${escapeHtml(event.place)}</h2><p>${escapeHtml(localTime(event.time))} <span>·</span> ${escapeHtml(relativeTime(event.time))}</p></div></div>
    <div class="detail-chips">${alertLine}${event.tsunami ? '<span class="detail-chip tsunami">Tsunami flagged</span>' : ''}<span class="detail-chip">${escapeHtml(titleCase(event.status))}</span></div>
    ${warning}
    <dl class="detail-facts"><div><dt>Depth</dt><dd>${escapeHtml(formatDepth(event.depth))}</dd></div><div><dt>USGS significance</dt><dd>${event.significance === null ? 'Not reported' : escapeHtml(String(event.significance))}</dd></div><div><dt>Felt reports</dt><dd>${escapeHtml(felt)}</dd></div><div><dt>Coordinates</dt><dd>${escapeHtml(coordinates)}</dd></div><div><dt>Last USGS update</dt><dd>${escapeHtml(localTime(event.updated))}</dd></div><div><dt>Event type</dt><dd>${escapeHtml(titleCase(event.type))}</dd></div></dl>
    <p class="detail-explainer"><strong>About these measures:</strong> Magnitude describes energy at the source; depth is measured below the surface. USGS significance is an event score, not a damage prediction.</p>
    ${event.url ? `<a class="usgs-link" href="${escapeHtml(event.url)}" target="_blank" rel="noreferrer">Open official USGS event page <span aria-hidden="true">↗</span></a>` : ''}`;
  els.eventDetail.querySelector('.close-detail').addEventListener('click', closeDetail);
}

function renderAll() {
  const events = getFilteredEvents();
  if (state.selectedId && !allEvents.some((event) => event.id === state.selectedId)) state.selectedId = null;
  renderFilterState(events); renderMapMarkers(events); renderTimeline(events); renderEventList(events); renderDetail();
}

function renderControls() {
  document.querySelectorAll('[data-period]').forEach((button) => button.setAttribute('aria-selected', String(button.dataset.period === state.period)));
  els.magnitude.value = state.magnitude; els.depth.value = state.depth; els.alert.value = state.alert; els.tsunami.value = state.tsunami; els.review.value = state.review; els.area.value = state.area; els.sort.value = state.sort;
}

function selectEvent(id, origin = 'list') {
  const event = allEvents.find((item) => item.id === id); if (!event) return;
  state.selectedId = id;
  const currentBucket = bucketId(event.time);
  if (state.timeFocus && state.timeFocus !== currentBucket) state.timeFocus = currentBucket;
  persistUrl(); renderAll();
  if (map && origin !== 'map' && event.latitude !== null && event.longitude !== null) map.flyTo([event.latitude, event.longitude], Math.max(map.getZoom(), 5), { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0.55 });
  announce(`Selected ${formatMagnitude(event.magnitude)}, ${event.place}. ${formatDepth(event.depth)}.`);
}

function closeDetail() { state.selectedId = null; shouldAutoSelect = false; persistUrl(); renderAll(); announce('Event details closed.'); }
function setTimeFocus(id) { state.timeFocus = state.timeFocus === id ? null : id; persistUrl(); renderAll(); announce(state.timeFocus ? 'Timeline interval focused. Corresponding events are illuminated on the map and stream.' : 'Timeline focus cleared.'); }
function resetFilters() { Object.assign(state, { magnitude: '0', depth: 'all', alert: 'all', tsunami: 'all', review: 'all', area: '', timeFocus: null }); persistUrl(); renderControls(); renderAll(); announce('Filters cleared.'); }

function ageText(date) {
  if (!date) return 'Last updated time unavailable'; const mins = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  return mins < 2 ? 'Updated just now' : `Updated ${mins}m ago`;
}
function setSourceStatus(mode) {
  const stale = feedGeneratedAt && Date.now() - feedGeneratedAt.getTime() > 2 * 3600000;
  const label = mode === 'refreshing' ? 'Refreshing USGS field data…' : mode === 'error' ? allEvents.length ? `Live refresh failed · showing ${ageText(feedGeneratedAt)}` : 'USGS feed unavailable' : `${ageText(feedGeneratedAt)} · USGS`;
  els.sourceStatus.className = `header-status ${mode === 'error' || stale ? 'is-stale' : ''}`;
  els.sourceStatus.innerHTML = `<span class="pulse" aria-hidden="true"></span><span>${escapeHtml(label)}</span>`;
}
function announce(message) { els.toast.textContent = message; els.toast.hidden = false; clearTimeout(announce.timeout); announce.timeout = setTimeout(() => { els.toast.hidden = true; }, 3600); }

async function loadFeed({ background = false } = {}) {
  if (refreshController) refreshController.abort(); refreshController = new AbortController(); isRefreshing = background;
  if (background) { els.refresh.disabled = true; els.refresh.innerHTML = '<span aria-hidden="true">↻</span> Refreshing'; setSourceStatus('refreshing'); }
  else { els.mapLoading.classList.remove('is-hidden'); setSourceStatus('refreshing'); }
  try {
    const response = await fetch(FEEDS[state.period], { signal: refreshController.signal, cache: 'no-store', headers: { Accept: 'application/geo+json, application/json' } });
    if (!response.ok) throw new Error(`USGS returned ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.features)) throw new Error('USGS returned an unexpected data format');
    allEvents = data.features.map(eventFromFeature).filter((event) => event.id && event.time).sort((a, b) => b.time - a.time);
    feedGeneratedAt = data.metadata?.generated ? new Date(data.metadata.generated) : new Date();
    if (!state.selectedId && shouldAutoSelect) {
      const strongestVisible = getFilteredEvents().reduce((strongest, event) => !strongest || (event.magnitude ?? -Infinity) > (strongest.magnitude ?? -Infinity) ? event : strongest, null);
      state.selectedId = strongestVisible?.id || null;
      persistUrl();
    }
    shouldAutoSelect = false;
    if (mapAvailable) els.mapLoading.classList.add('is-hidden'); setSourceStatus('ready'); renderAll();
    if (background) announce(`Live field refreshed: ${allEvents.length.toLocaleString()} USGS events loaded.`);
  } catch (error) {
    if (error.name === 'AbortError') return;
    if (!allEvents.length) {
      els.mapLoading.innerHTML = `<p><strong>USGS data could not be reached.</strong><br>Check your connection, then retry. No sample data is shown.</p><button type="button" class="retry-load">Retry live data</button>`;
      els.mapLoading.classList.remove('is-hidden'); els.mapLoading.querySelector('.retry-load').addEventListener('click', () => loadFeed());
      els.eventList.innerHTML = `<div class="empty-state error"><span aria-hidden="true">!</span><h3>Live data is unavailable</h3><p>The event stream will appear when the USGS feed responds. Your selected filters have been kept.</p><button class="reset-empty retry-list" type="button">Retry</button></div>`;
      els.eventList.querySelector('.retry-list').addEventListener('click', () => loadFeed());
    }
    setSourceStatus('error'); announce('Could not refresh USGS data. Your current view has been preserved.');
  } finally {
    isRefreshing = false; els.refresh.disabled = false; els.refresh.innerHTML = '<span aria-hidden="true">↻</span> Refresh';
  }
}

function bindControls() {
  document.querySelectorAll('[data-period]').forEach((button) => button.addEventListener('click', () => {
    if (button.dataset.period === state.period) return; state.period = button.dataset.period; state.timeFocus = null; state.selectedId = null; shouldAutoSelect = true; persistUrl(); renderControls(); loadFeed();
  }));
  [['magnitude', els.magnitude], ['depth', els.depth], ['alert', els.alert], ['tsunami', els.tsunami], ['review', els.review], ['sort', els.sort]].forEach(([key, control]) => control.addEventListener('change', () => { state[key] = control.value; state.timeFocus = null; if (state.selectedId && !getFilteredEvents().some((event) => event.id === state.selectedId)) state.selectedId = null; persistUrl(); renderAll(); }));
  let searchTimer;
  els.area.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.area = els.area.value.trim(); state.timeFocus = null; persistUrl(); renderAll(); }, 180); });
  els.reset.addEventListener('click', resetFilters); els.clearTimeFocus.addEventListener('click', () => setTimeFocus(null)); els.refresh.addEventListener('click', () => loadFeed({ background: true }));
  els.showList.addEventListener('click', () => $('#event-stream').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
  els.about.addEventListener('click', () => { const open = els.about.getAttribute('aria-expanded') === 'true'; els.about.setAttribute('aria-expanded', String(!open)); els.aboutPopover.hidden = open; });
  document.addEventListener('click', (event) => { if (!els.aboutPopover.hidden && !els.aboutPopover.contains(event.target) && event.target !== els.about) { els.aboutPopover.hidden = true; els.about.setAttribute('aria-expanded', 'false'); } });
  window.addEventListener('popstate', () => { parseUrl(); renderControls(); loadFeed(); });
}

parseUrl(); renderControls(); initMap(); bindControls(); loadFeed();
