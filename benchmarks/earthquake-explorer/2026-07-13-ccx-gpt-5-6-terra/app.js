const FEEDS = {
  hour: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
  day: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  week: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
  month: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson',
};

const PERIOD_LABELS = { hour: 'past hour', day: 'past day', week: 'past 7 days', month: 'past 30 days' };
const INITIAL_CENTER = [18, 12];
const INITIAL_ZOOM = 2;
const MAX_LIST_ITEMS = 60;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  status: $('#status-text'),
  refresh: $('#refresh-button'),
  share: $('#share-button'),
  search: $('#place-search'),
  locate: $('#locate-button'),
  magnitude: $('#magnitude-range'),
  magnitudeOutput: $('#magnitude-output'),
  depth: $('#depth-filter'),
  area: $('#area-filter'),
  advanced: $('#advanced-filters'),
  moreFilters: $('#more-filters-button'),
  resultCount: $('#result-count'),
  reset: $('#reset-button'),
  mapReset: $('#map-reset-button'),
  mapEmpty: $('#map-empty'),
  detail: $('#detail-content'),
  closeDetail: $('#close-detail-button'),
  timeline: $('#timeline-chart'),
  timelineMetric: $('#timeline-metric'),
  timelineDescription: $('#timeline-description'),
  timelineA11y: $('#timeline-a11y'),
  clearTime: $('#clear-time-focus'),
  list: $('#event-list'),
  streamEmpty: $('#stream-empty'),
  emptyReset: $('#empty-reset-button'),
  showMore: $('#show-more-button'),
  sort: $('#sort-select'),
  activitySummary: $('#activity-summary'),
  userLocation: $('#user-location-button'),
  toast: $('#toast'),
};

const defaultFilters = () => ({
  period: 'week',
  minMagnitude: 0,
  depth: 'all',
  area: 'all',
  alerts: [],
  tsunami: 'all',
  review: 'all',
  search: '',
  sort: 'time',
  timeBucket: '',
  selectedId: '',
});

function readURLState() {
  const params = new URLSearchParams(window.location.search);
  const validPeriod = ['hour', 'day', 'week', 'month'].includes(params.get('period')) ? params.get('period') : 'week';
  const validDepth = ['all', 'shallow', 'intermediate', 'deep'].includes(params.get('depth')) ? params.get('depth') : 'all';
  const validArea = ['all', 'americas', 'pacific', 'europe-africa', 'asia-oceania'].includes(params.get('area')) ? params.get('area') : 'all';
  const validTsunami = ['all', 'yes', 'no'].includes(params.get('tsunami')) ? params.get('tsunami') : 'all';
  const validReview = ['all', 'reviewed', 'automatic'].includes(params.get('review')) ? params.get('review') : 'all';
  const validSort = ['time', 'magnitude', 'significance', 'depth-asc', 'depth-desc'].includes(params.get('sort')) ? params.get('sort') : 'time';
  const minMagnitude = Math.min(7, Math.max(0, Number(params.get('m')) || 0));
  const alerts = (params.get('alerts') || '').split(',').filter((value) => ['green', 'yellow', 'orange', 'red', 'none'].includes(value));
  return {
    ...defaultFilters(),
    period: validPeriod,
    minMagnitude,
    depth: validDepth,
    area: validArea,
    alerts,
    tsunami: validTsunami,
    review: validReview,
    search: (params.get('q') || '').slice(0, 120),
    sort: validSort,
    timeBucket: (params.get('bucket') || '').slice(0, 40),
    selectedId: (params.get('event') || '').slice(0, 120),
  };
}

let state = {
  events: [],
  generatedAt: null,
  loadedAt: null,
  error: null,
  loading: true,
  refreshing: false,
  filters: readURLState(),
  listLimit: MAX_LIST_ITEMS,
};

let map;
let markerLayer;
let markerById = new Map();
let fetchController;
let toastTimer;
let timelineCache = null;

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeFeature(feature) {
  const properties = feature?.properties || {};
  const coordinates = feature?.geometry?.coordinates || [];
  const longitude = asNumber(coordinates[0]);
  const latitude = asNumber(coordinates[1]);
  const depth = asNumber(coordinates[2]);
  const time = asNumber(properties.time);
  if (!feature?.id || longitude === null || latitude === null || time === null) return null;

  return {
    id: String(feature.id),
    magnitude: asNumber(properties.mag),
    place: properties.place ? String(properties.place) : 'Location not reported',
    time,
    updated: asNumber(properties.updated),
    longitude,
    latitude,
    depth,
    felt: asNumber(properties.felt),
    significance: asNumber(properties.sig),
    alert: properties.alert ? String(properties.alert).toLowerCase() : null,
    tsunami: Number(properties.tsunami) === 1,
    status: properties.status ? String(properties.status).toLowerCase() : null,
    type: properties.type ? String(properties.type) : 'earthquake',
    url: properties.url ? String(properties.url) : null,
    detail: properties.detail ? String(properties.detail) : null,
    title: properties.title ? String(properties.title) : null,
  };
}

function initializeMap() {
  if (!window.L) {
    $('#map').innerHTML = '<div class="map-library-error"><strong>The map library did not load.</strong><span>Use the accessible event stream below to explore the live records.</span></div>';
    return;
  }

  map = L.map('map', { zoomControl: false, worldCopyJump: true, preferCanvas: true }).setView(INITIAL_CENTER, INITIAL_ZOOM);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.control.scale({ position: 'bottomleft', imperial: false, maxWidth: 130 }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  markerLayer = L.markerClusterGroup({
    maxClusterRadius: 52,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    removeOutsideVisibleBounds: true,
    iconCreateFunction(cluster) {
      const count = cluster.getChildCount();
      const scale = count > 100 ? 'large' : count > 20 ? 'medium' : 'small';
      return L.divIcon({
        html: `<span>${count}</span>`,
        className: `cluster-icon ${scale}`,
        iconSize: [42, 42],
      });
    },
  });
  map.addLayer(markerLayer);
}

function updateURL() {
  const { filters } = state;
  const params = new URLSearchParams();
  if (filters.period !== 'week') params.set('period', filters.period);
  if (filters.minMagnitude > 0) params.set('m', String(filters.minMagnitude));
  if (filters.depth !== 'all') params.set('depth', filters.depth);
  if (filters.area !== 'all') params.set('area', filters.area);
  if (filters.alerts.length) params.set('alerts', filters.alerts.join(','));
  if (filters.tsunami !== 'all') params.set('tsunami', filters.tsunami);
  if (filters.review !== 'all') params.set('review', filters.review);
  if (filters.search) params.set('q', filters.search);
  if (filters.sort !== 'time') params.set('sort', filters.sort);
  if (filters.timeBucket) params.set('bucket', filters.timeBucket);
  if (filters.selectedId) params.set('event', filters.selectedId);
  const nextURL = `${window.location.pathname}${params.size ? `?${params}` : ''}`;
  window.history.replaceState({}, '', nextURL);
}

function setFilter(next) {
  state.filters = { ...state.filters, ...next };
  timelineCache = null;
  state.listLimit = MAX_LIST_ITEMS;
  updateURL();
  render();
}

function clearFilters({ keepPeriod = false } = {}) {
  const period = keepPeriod ? state.filters.period : 'week';
  state.filters = { ...defaultFilters(), period };
  timelineCache = null;
  state.listLimit = MAX_LIST_ITEMS;
  syncControls();
  updateURL();
  render();
}

function getRegion(event) {
  const { latitude, longitude } = event;
  if (longitude >= -170 && longitude <= -30 && latitude >= -60 && latitude <= 75) return 'americas';
  if ((longitude >= 100 || longitude <= -130) && latitude >= -60 && latitude <= 65) return 'pacific';
  if (longitude >= -25 && longitude <= 65 && latitude >= -38 && latitude <= 72) return 'europe-africa';
  return 'asia-oceania';
}

function matchesFilters(event, { includeTimeBucket = true } = {}) {
  const { filters } = state;
  const query = filters.search.trim().toLowerCase();
  if (filters.minMagnitude > 0 && event.magnitude !== null && event.magnitude < filters.minMagnitude) return false;
  if (event.magnitude === null && filters.minMagnitude > 0) return false;
  if (filters.depth === 'shallow' && !(event.depth !== null && event.depth < 70)) return false;
  if (filters.depth === 'intermediate' && !(event.depth !== null && event.depth >= 70 && event.depth < 300)) return false;
  if (filters.depth === 'deep' && !(event.depth !== null && event.depth >= 300)) return false;
  if (filters.area !== 'all' && getRegion(event) !== filters.area) return false;
  if (filters.alerts.length && !filters.alerts.includes(event.alert || 'none')) return false;
  if (filters.tsunami === 'yes' && !event.tsunami) return false;
  if (filters.tsunami === 'no' && event.tsunami) return false;
  if (filters.review === 'reviewed' && event.status !== 'reviewed') return false;
  if (filters.review === 'automatic' && event.status !== 'automatic') return false;
  if (query && !`${event.place} ${event.title || ''}`.toLowerCase().includes(query)) return false;
  if (includeTimeBucket && filters.timeBucket && bucketIdForEvent(event) !== filters.timeBucket) return false;
  return true;
}

function getBaseEvents() {
  return state.events.filter((event) => matchesFilters(event, { includeTimeBucket: false }));
}

function sortEvents(events) {
  const sorted = [...events];
  const numeric = (value) => value === null ? -Infinity : value;
  sorted.sort((a, b) => {
    if (state.filters.sort === 'magnitude') return numeric(b.magnitude) - numeric(a.magnitude) || b.time - a.time;
    if (state.filters.sort === 'significance') return numeric(b.significance) - numeric(a.significance) || b.time - a.time;
    if (state.filters.sort === 'depth-asc') return (a.depth ?? Infinity) - (b.depth ?? Infinity) || b.time - a.time;
    if (state.filters.sort === 'depth-desc') return numeric(b.depth) - numeric(a.depth) || b.time - a.time;
    return b.time - a.time;
  });
  return sorted;
}

function formatMagnitude(event) {
  return event.magnitude === null ? 'M —' : `M ${event.magnitude.toFixed(1)}`;
}

function formatDepth(depth) {
  return depth === null ? 'Depth not reported' : `${Math.round(depth)} km deep`;
}

function formatShortDepth(depth) {
  return depth === null ? '— km' : `${Math.round(depth)} km`;
}

function formatLocalTime(timestamp) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(timestamp));
}

function formatUTC(timestamp) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' }).format(new Date(timestamp));
}

function relativeTime(timestamp) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'moments ago';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function magnitudeClass(event) {
  const magnitude = event.magnitude || 0;
  if (magnitude >= 6) return 'magnitude-major';
  if (magnitude >= 5) return 'magnitude-strong';
  if (magnitude >= 4) return 'magnitude-moderate';
  if (magnitude >= 3) return 'magnitude-light';
  return 'magnitude-minor';
}

function depthClass(event) {
  if (event.depth === null) return 'depth-unknown';
  if (event.depth >= 300) return 'depth-deep';
  if (event.depth >= 70) return 'depth-middle';
  return 'depth-shallow';
}

function eventAssessment(event) {
  if (event.alert === 'red' || (event.magnitude !== null && event.magnitude >= 7)) return { label: 'Major event', detail: 'High-magnitude event. Check the official USGS record for updates.', tone: 'critical' };
  if (event.alert === 'orange' || (event.magnitude !== null && event.magnitude >= 6)) return { label: 'Significant event', detail: 'A strong event worth following as reviewed information arrives.', tone: 'serious' };
  if (event.alert === 'yellow' || event.tsunami || (event.magnitude !== null && event.magnitude >= 5)) return { label: 'Notable event', detail: 'This event has a notable signal in the selected field.', tone: 'warning' };
  return { label: 'Routine activity', detail: 'Magnitude alone does not indicate impact or predict damage.', tone: 'quiet' };
}

function buildTimeline() {
  const { filters } = state;
  const cacheKey = [
    state.loadedAt,
    filters.period,
    filters.minMagnitude,
    filters.depth,
    filters.area,
    filters.alerts.join(','),
    filters.tsunami,
    filters.review,
    filters.search,
  ].join('|');
  if (timelineCache?.key === cacheKey) return timelineCache.buckets;

  const baseEvents = getBaseEvents();
  const periodMs = { hour: 60 * 60 * 1000, day: 24 * 60 * 60 * 1000, week: 7 * 24 * 60 * 60 * 1000, month: 30 * 24 * 60 * 60 * 1000 }[filters.period];
  const bucketCount = filters.period === 'hour' ? 6 : filters.period === 'day' ? 8 : filters.period === 'week' ? 7 : 10;
  const latest = state.events.length ? Math.max(...state.events.map((event) => event.time)) : Date.now();
  const end = Math.max(Date.now(), latest + 10 * 60 * 1000);
  const start = end - periodMs;
  const step = periodMs / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    id: `${filters.period}-${index}`,
    start: start + index * step,
    end: start + (index + 1) * step,
    events: [],
  }));
  baseEvents.forEach((event) => {
    if (event.time < start || event.time > end) return;
    const index = Math.min(bucketCount - 1, Math.max(0, Math.floor((event.time - start) / step)));
    buckets[index].events.push(event);
  });
  timelineCache = { key: cacheKey, buckets };
  return buckets;
}

function bucketIdForEvent(event) {
  const buckets = buildTimeline();
  return buckets.find((bucket) => event.time >= bucket.start && event.time < bucket.end)?.id || '';
}

function timeRangeLabel(bucket) {
  const formatter = new Intl.DateTimeFormat(undefined, state.filters.period === 'hour' ? { hour: 'numeric', minute: '2-digit' } : { month: 'short', day: 'numeric', hour: 'numeric' });
  return `${formatter.format(new Date(bucket.start))} – ${formatter.format(new Date(bucket.end))}`;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = window.setTimeout(() => { elements.toast.hidden = true; }, 2800);
}

async function fetchEarthquakes({ background = false } = {}) {
  if (fetchController) fetchController.abort();
  fetchController = new AbortController();
  state.loading = !background && state.events.length === 0;
  state.refreshing = background || state.events.length > 0;
  state.error = null;
  renderStatus();

  try {
    const response = await fetch(FEEDS[state.filters.period], { signal: fetchController.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`USGS responded with ${response.status}`);
    const feed = await response.json();
    if (!Array.isArray(feed.features)) throw new Error('USGS returned an unexpected feed format');
    state.events = feed.features.map(normalizeFeature).filter(Boolean);
    state.generatedAt = asNumber(feed.metadata?.generated);
    state.loadedAt = Date.now();
    state.error = null;
    if (state.filters.selectedId && !state.events.some((event) => event.id === state.filters.selectedId)) {
      state.filters.selectedId = '';
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
    state.error = error instanceof Error ? error.message : 'Unable to reach the USGS feed';
  } finally {
    state.loading = false;
    state.refreshing = false;
    render();
  }
}

function selectEvent(id, { pan = true, focusDetail = false } = {}) {
  const event = state.events.find((item) => item.id === id);
  if (!event) return;
  state.filters.selectedId = id;
  updateURL();
  render();

  if (map && pan) {
    map.flyTo([event.latitude, event.longitude], Math.max(map.getZoom(), 5), { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0.55 });
    const marker = markerById.get(id);
    if (marker) marker.openPopup();
  }
  if (focusDetail) $('#selected-panel').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
}

function renderStatus() {
  const age = state.loadedAt ? relativeTime(state.loadedAt) : '';
  if (state.loading) elements.status.textContent = 'Loading live USGS feed…';
  else if (state.error && state.events.length) elements.status.textContent = `Showing saved data · update failed ${age}`;
  else if (state.error) elements.status.textContent = 'Live feed unavailable';
  else if (state.refreshing) elements.status.textContent = `Refreshing · last loaded ${age}`;
  else elements.status.textContent = `USGS live feed · refreshed ${age}`;
  elements.refresh.disabled = state.loading || state.refreshing;
  elements.refresh.classList.toggle('is-spinning', state.refreshing);
}

function syncControls() {
  $$('.time-button').forEach((button) => {
    const active = button.dataset.period === state.filters.period;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  elements.search.value = state.filters.search;
  elements.magnitude.value = state.filters.minMagnitude;
  elements.magnitudeOutput.textContent = state.filters.minMagnitude ? `M ${Number(state.filters.minMagnitude).toFixed(1)}+` : 'All';
  elements.depth.value = state.filters.depth;
  elements.area.value = state.filters.area;
  elements.sort.value = state.filters.sort;
  $$('input[name="alert"]').forEach((input) => { input.checked = state.filters.alerts.includes(input.value); });
  $$('input[name="tsunami"]').forEach((input) => { input.checked = input.value === state.filters.tsunami; });
  $$('input[name="review"]').forEach((input) => { input.checked = input.value === state.filters.review; });
}

function renderHeadline(baseEvents) {
  const strongest = [...baseEvents].sort((a, b) => (b.magnitude ?? -1) - (a.magnitude ?? -1))[0];
  if (state.loading) {
    elements.activitySummary.innerHTML = '<span class="summary-skeleton"></span><span class="summary-skeleton short"></span>';
    return;
  }
  if (state.error && !state.events.length) {
    elements.activitySummary.innerHTML = `<strong>Live connection interrupted</strong><button type="button" data-retry>Try again</button>`;
    return;
  }
  if (!baseEvents.length) {
    elements.activitySummary.innerHTML = '<strong>Quiet field</strong><span>No events match the current filters.</span>';
    return;
  }
  const assessment = strongest ? eventAssessment(strongest) : null;
  elements.activitySummary.innerHTML = `
    <div class="summary-strongest"><span>Strongest signal</span><strong>${escapeHTML(formatMagnitude(strongest))}</strong><em>${escapeHTML(strongest.place)}</em></div>
    <div class="summary-reading"><span class="reading-dot ${assessment.tone}"></span><span>${escapeHTML(assessment.label)}<small>${baseEvents.length.toLocaleString()} records in view</small></span></div>`;
}

function renderMap(events) {
  if (!map || !markerLayer) return;
  markerLayer.clearLayers();
  markerById = new Map();
  const selectedId = state.filters.selectedId;

  events.forEach((event) => {
    const icon = L.divIcon({
      className: 'event-marker-shell',
      html: `<span class="event-marker ${magnitudeClass(event)} ${depthClass(event)} ${event.id === selectedId ? 'is-selected' : ''}" style="--marker-scale:${Math.min(1.5, 0.72 + (event.magnitude || 0) * 0.12)}"><b>${escapeHTML(event.magnitude === null ? '?' : event.magnitude.toFixed(1))}</b></span>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -18],
    });
    const marker = L.marker([event.latitude, event.longitude], { icon, title: `${formatMagnitude(event)}, ${event.place}`, keyboard: true, riseOnHover: true });
    const assessment = eventAssessment(event);
    marker.bindPopup(`
      <article class="map-popup">
        <span class="popup-magnitude">${escapeHTML(formatMagnitude(event))}</span>
        <strong>${escapeHTML(event.place)}</strong>
        <p>${escapeHTML(formatLocalTime(event.time))} · ${escapeHTML(formatDepth(event.depth))}</p>
        <button type="button" data-event-id="${escapeHTML(event.id)}">Inspect event <span aria-hidden="true">→</span></button>
      </article>`, { closeButton: true, maxWidth: 280 });
    marker.on('click', () => selectEvent(event.id, { pan: false }));
    markerLayer.addLayer(marker);
    markerById.set(event.id, marker);
  });

  elements.mapEmpty.hidden = events.length !== 0 || state.loading;
}

function renderDetail() {
  const event = state.events.find((item) => item.id === state.filters.selectedId);
  $('#selected-panel').classList.toggle('has-selection', Boolean(event));
  if (!event) {
    elements.detail.innerHTML = `
      <div class="detail-empty">
        <span class="detail-orbit" aria-hidden="true"></span>
        <strong>${state.loading ? 'Receiving the field' : 'Select a signal'}</strong>
        <p>${state.loading ? 'USGS events will appear here as the field resolves.' : 'Choose a map point, timeline bar, or event in the stream to read the complete record.'}</p>
      </div>`;
    return;
  }
  const assessment = eventAssessment(event);
  const alertLabel = event.alert ? event.alert[0].toUpperCase() + event.alert.slice(1) : 'No alert assigned';
  const reviewLabel = event.status ? event.status[0].toUpperCase() + event.status.slice(1) : 'Status pending';
  const felt = event.felt === null ? 'No felt reports listed' : event.felt.toLocaleString();
  elements.detail.innerHTML = `
    <div class="detail-hero">
      <div class="detail-magnitude ${magnitudeClass(event)}"><span>Magnitude</span><strong>${escapeHTML(event.magnitude === null ? '—' : event.magnitude.toFixed(1))}</strong><small>Magnitude is one measure of event size, not a damage forecast.</small></div>
      <div class="assessment ${assessment.tone}"><span>${escapeHTML(assessment.label)}</span><p>${escapeHTML(assessment.detail)}</p></div>
    </div>
    <h2>${escapeHTML(event.place)}</h2>
    <p class="detail-time"><strong>${escapeHTML(formatLocalTime(event.time))}</strong><span>Your local time · ${escapeHTML(formatUTC(event.time))}</span></p>
    <div class="detail-grid">
      <div><span>Depth</span><strong>${escapeHTML(formatShortDepth(event.depth))}</strong><small>Below ground level</small></div>
      <div><span>Significance</span><strong>${event.significance === null ? '—' : escapeHTML(event.significance.toLocaleString())}</strong><small>USGS score</small></div>
      <div><span>Felt reports</span><strong>${escapeHTML(felt)}</strong><small>${event.felt === null ? 'Not available' : 'Community reports'}</small></div>
      <div><span>Coordinates</span><strong>${event.latitude.toFixed(3)}°, ${event.longitude.toFixed(3)}°</strong><small>Lat · long</small></div>
    </div>
    <div class="detail-flags">
      <span class="flag ${event.tsunami ? 'is-flagged' : ''}"><b>${event.tsunami ? 'Tsunami flag' : 'No tsunami flag'}</b><small>${event.tsunami ? 'USGS flag on this event' : 'No USGS tsunami flag listed'}</small></span>
      <span class="flag alert-${event.alert || 'none'}"><b>${escapeHTML(alertLabel)}</b><small>USGS alert level</small></span>
      <span class="flag"><b>${escapeHTML(reviewLabel)}</b><small>Review status</small></span>
    </div>
    <div class="detail-actions">
      ${event.url ? `<a href="${escapeHTML(event.url)}" target="_blank" rel="noreferrer">Open official USGS page <span aria-hidden="true">↗</span></a>` : ''}
      <button type="button" data-center-event="${escapeHTML(event.id)}">Center on map</button>
    </div>`;
}

function renderTimeline() {
  const buckets = buildTimeline();
  const maxCount = Math.max(...buckets.map((bucket) => bucket.events.length), 1);
  const total = buckets.reduce((sum, bucket) => sum + bucket.events.length, 0);
  const focused = state.filters.timeBucket;
  const bucketWord = buckets.length === 1 ? 'time interval' : 'time intervals';
  elements.timelineMetric.textContent = `${total.toLocaleString()} events · ${buckets.length} ${bucketWord}`;
  elements.timelineDescription.textContent = focused ? 'This time slice is illuminating matching events across the map and stream.' : 'Choose a time slice to illuminate its events across the map and stream.';
  elements.clearTime.hidden = !focused;
  elements.timeline.style.setProperty('--columns', String(buckets.length));
  elements.timeline.innerHTML = buckets.map((bucket, index) => {
    const count = bucket.events.length;
    const maxMagnitude = bucket.events.reduce((max, event) => Math.max(max, event.magnitude ?? 0), 0);
    const height = count ? Math.max(7, Math.round((count / maxCount) * 100)) : 3;
    const isActive = focused === bucket.id;
    const hasSelected = bucket.events.some((event) => event.id === state.filters.selectedId);
    const label = timeRangeLabel(bucket);
    return `<button class="timeline-bar ${isActive ? 'is-active' : ''} ${hasSelected ? 'has-selected' : ''}" type="button" data-bucket="${bucket.id}" aria-pressed="${isActive}" title="${escapeHTML(label)}: ${count} earthquakes${count ? `, strongest magnitude ${maxMagnitude.toFixed(1)}` : ''}" aria-label="${escapeHTML(label)}: ${count} earthquakes, strongest ${count ? `magnitude ${maxMagnitude.toFixed(1)}` : 'no events'}${hasSelected ? ', contains the focused event' : ''}">
      <span class="bar-hit" style="height:${height}%"><i style="--intensity:${Math.min(1, maxMagnitude / 7)}"></i></span>
      <span class="bar-count">${count ? count : ''}</span>
      <span class="bar-label">${escapeHTML(timelineLabel(bucket, index, buckets.length))}</span>
    </button>`;
  }).join('');
  elements.timelineA11y.textContent = `${total} events are represented over ${PERIOD_LABELS[state.filters.period]}. ${focused ? `Showing only the selected time slice in the map and register.` : 'Select an interval to focus it.'}`;
}

function timelineLabel(bucket, index, total) {
  if (state.filters.period === 'hour') return index % 2 === 0 ? new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).format(new Date(bucket.start)) : '';
  if (state.filters.period === 'day') return index % 2 === 0 ? new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).format(new Date(bucket.start)) : '';
  if (state.filters.period === 'week') return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(bucket.start));
  return index === 0 || index === total - 1 || index % 2 === 0 ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(bucket.start)) : '';
}

function renderList(events) {
  if (state.loading) {
    elements.list.innerHTML = Array.from({ length: 7 }, () => '<div class="event-skeleton"><span></span><i></i><i></i></div>').join('');
    elements.streamEmpty.hidden = true;
    elements.showMore.hidden = true;
    return;
  }
  if (!events.length) {
    elements.list.innerHTML = '';
    elements.streamEmpty.hidden = false;
    elements.showMore.hidden = true;
    return;
  }
  elements.streamEmpty.hidden = true;
  const visible = events.slice(0, state.listLimit);
  elements.list.innerHTML = visible.map((event) => {
    const assessment = eventAssessment(event);
    const selected = event.id === state.filters.selectedId;
    return `<button class="event-row ${selected ? 'is-selected' : ''}" type="button" role="listitem" data-event-id="${escapeHTML(event.id)}" aria-pressed="${selected}">
      <span class="event-symbol ${magnitudeClass(event)} ${depthClass(event)}"><b>${escapeHTML(event.magnitude === null ? '—' : event.magnitude.toFixed(1))}</b></span>
      <span class="event-primary"><strong>${escapeHTML(event.place)}</strong><small>${escapeHTML(formatLocalTime(event.time))} · ${escapeHTML(formatDepth(event.depth))}</small></span>
      <span class="event-meta"><b>${escapeHTML(relativeTime(event.time))}</b><small>${event.tsunami ? 'Tsunami flag' : assessment.label}</small></span>
      <span class="row-arrow" aria-hidden="true">→</span>
    </button>`;
  }).join('');
  elements.showMore.hidden = events.length <= state.listLimit;
  elements.showMore.textContent = `Show ${Math.min(MAX_LIST_ITEMS, events.length - state.listLimit).toLocaleString()} more of ${events.length.toLocaleString()} events`;
}

function renderError() {
  const existing = $('#error-banner');
  if (!state.error) {
    existing?.remove();
    return;
  }
  if (existing) existing.remove();
  const banner = document.createElement('section');
  banner.id = 'error-banner';
  banner.className = 'error-banner';
  banner.setAttribute('role', 'alert');
  banner.innerHTML = `<strong>${state.events.length ? 'Live update unavailable' : 'Could not load the live USGS feed'}</strong><span>${escapeHTML(state.error)}${state.events.length ? '. The last loaded records remain visible.' : '. Check the connection, then retry.'}</span><button type="button" data-retry>Retry live feed</button>`;
  $('.filter-ribbon').after(banner);
}

function render() {
  syncControls();
  renderStatus();
  renderError();
  const baseEvents = getBaseEvents();
  const visibleEvents = sortEvents(state.events.filter((event) => matchesFilters(event)));
  const selectedVisible = visibleEvents.some((event) => event.id === state.filters.selectedId);
  if (state.filters.selectedId && !selectedVisible && state.events.some((event) => event.id === state.filters.selectedId)) {
    // Keep the selection context but make its filtering relationship explicit in the detail panel.
  }
  renderHeadline(baseEvents);
  const periodPhrase = state.filters.timeBucket ? 'in selected time slice' : `over ${PERIOD_LABELS[state.filters.period]}`;
  elements.resultCount.textContent = `${visibleEvents.length.toLocaleString()} ${visibleEvents.length === 1 ? 'event' : 'events'} ${periodPhrase}`;
  renderMap(visibleEvents);
  renderDetail();
  renderTimeline();
  renderList(visibleEvents);
}

async function locatePlace() {
  const query = elements.search.value.trim();
  if (query.length < 2) {
    showToast('Enter a city, region, or country to locate it on the map.');
    elements.search.focus();
    return;
  }
  const oldText = elements.locate.textContent;
  elements.locate.textContent = 'Finding…';
  elements.locate.disabled = true;
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Place lookup failed');
    const results = await response.json();
    if (!results.length) throw new Error('No place found');
    const place = results[0];
    if (map) map.flyTo([Number(place.lat), Number(place.lon)], Math.max(map.getZoom(), 5), { duration: 0.7 });
    showToast(`Centered on ${place.display_name.split(',').slice(0, 2).join(',')}.`);
  } catch {
    showToast('Could not locate that place. Event search remains active.');
  } finally {
    elements.locate.textContent = oldText;
    elements.locate.disabled = false;
  }
}

function locateUser() {
  if (!navigator.geolocation) {
    showToast('Location is not available in this browser.');
    return;
  }
  elements.userLocation.disabled = true;
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      if (map) map.flyTo([coords.latitude, coords.longitude], Math.max(map.getZoom(), 5), { duration: 0.7 });
      elements.userLocation.disabled = false;
      showToast('Centered on your approximate location.');
    },
    () => {
      elements.userLocation.disabled = false;
      showToast('Location access was unavailable.');
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
  );
}

async function shareView() {
  updateURL();
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
    showToast('Link copied — this view and selected event are included.');
  } catch {
    window.prompt('Copy this link to share the current field:', url);
  }
}

function bindEvents() {
  $$('.time-button').forEach((button) => button.addEventListener('click', () => {
    const period = button.dataset.period;
    if (period === state.filters.period) return;
    state.filters = { ...state.filters, period, timeBucket: '', selectedId: '' };
    state.listLimit = MAX_LIST_ITEMS;
    updateURL();
    syncControls();
    fetchEarthquakes();
  }));

  elements.refresh.addEventListener('click', () => fetchEarthquakes({ background: state.events.length > 0 }));
  elements.share.addEventListener('click', shareView);
  elements.search.addEventListener('input', (event) => setFilter({ search: event.target.value }));
  elements.search.addEventListener('keydown', (event) => { if (event.key === 'Enter') locatePlace(); });
  elements.locate.addEventListener('click', locatePlace);
  elements.magnitude.addEventListener('input', (event) => setFilter({ minMagnitude: Number(event.target.value) }));
  elements.depth.addEventListener('change', (event) => setFilter({ depth: event.target.value }));
  elements.area.addEventListener('change', (event) => setFilter({ area: event.target.value }));
  elements.sort.addEventListener('change', (event) => setFilter({ sort: event.target.value }));
  elements.reset.addEventListener('click', () => clearFilters());
  elements.mapReset.addEventListener('click', () => clearFilters({ keepPeriod: true }));
  elements.emptyReset.addEventListener('click', () => clearFilters({ keepPeriod: true }));
  elements.closeDetail.addEventListener('click', () => setFilter({ selectedId: '' }));
  elements.clearTime.addEventListener('click', () => setFilter({ timeBucket: '' }));
  elements.showMore.addEventListener('click', () => { state.listLimit += MAX_LIST_ITEMS; renderList(sortEvents(state.events.filter((event) => matchesFilters(event)))); });
  elements.userLocation.addEventListener('click', locateUser);

  elements.moreFilters.addEventListener('click', () => {
    const nowOpen = elements.advanced.hidden;
    elements.advanced.hidden = !nowOpen;
    elements.moreFilters.setAttribute('aria-expanded', String(nowOpen));
    elements.moreFilters.lastElementChild.textContent = nowOpen ? '−' : '+';
  });

  $$('input[name="alert"]').forEach((input) => input.addEventListener('change', () => {
    setFilter({ alerts: $$('input[name="alert"]:checked').map((item) => item.value) });
  }));
  $$('input[name="tsunami"]').forEach((input) => input.addEventListener('change', (event) => setFilter({ tsunami: event.target.value })));
  $$('input[name="review"]').forEach((input) => input.addEventListener('change', (event) => setFilter({ review: event.target.value })));

  elements.timeline.addEventListener('click', (event) => {
    const button = event.target.closest('[data-bucket]');
    if (!button) return;
    setFilter({ timeBucket: state.filters.timeBucket === button.dataset.bucket ? '' : button.dataset.bucket });
  });
  elements.list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-event-id]');
    if (button) selectEvent(button.dataset.eventId, { pan: true, focusDetail: true });
  });
  document.addEventListener('click', (event) => {
    const eventButton = event.target.closest('.map-popup [data-event-id]');
    if (eventButton) selectEvent(eventButton.dataset.eventId, { pan: true, focusDetail: true });
    const centerButton = event.target.closest('[data-center-event]');
    if (centerButton) selectEvent(centerButton.dataset.centerEvent, { pan: true });
    if (event.target.matches('[data-retry]')) fetchEarthquakes({ background: state.events.length > 0 });
  });
}

initializeMap();
bindEvents();
syncControls();
render();
fetchEarthquakes();
