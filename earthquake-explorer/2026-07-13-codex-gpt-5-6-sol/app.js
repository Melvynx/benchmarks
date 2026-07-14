import {
  FEEDS, PERIOD_LABELS, normalizeCollection, filterEvents, sortEvents, buildBins,
  project, classifyMagnitude, formatMagnitude, formatDepth, formatCount, relativeTime, periodStart
} from './lib.mjs';

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const svgNS = 'http://www.w3.org/2000/svg';
const state = {
  period: 'week', events: [], filtered: [], metadata: null, isLoading: false, error: null,
  stale: false, selectedId: null, hoveredId: null, brushedRange: null, activeBin: null,
  sort: 'significance', filters: { search: '', magnitude: 0, depth: 'all', alert: 'all', review: 'all', tsunami: false },
  map: { zoom: 1, x: 500, y: 250 }, renderedRows: 150, controller: null
};

const elements = {
  app: $('#app'), liveStatus: $('#live-status'), updated: $('#updated-time'), refresh: $('#refresh-button'),
  filterButton: $('#filter-button'), filterPanel: $('#filter-panel'), filterCount: $('#filter-count'),
  search: $('#search-input'), magnitude: $('#magnitude-filter'), magnitudeOutput: $('#magnitude-output'),
  depth: $('#depth-filter'), alert: $('#alert-filter'), review: $('#review-filter'), tsunami: $('#tsunami-filter'),
  sort: $('#sort-select'), map: $('#map'), mapSvg: $('#map-svg'), marks: $('#event-marks'), tooltip: $('#map-tooltip'),
  list: $('#event-list'), empty: $('#empty-state'), emptyExplanation: $('#empty-explanation'),
  streamCount: $('#stream-count'), resultSummary: $('#result-summary'), timeline: $('#timeline'),
  timelineStart: $('#timeline-start'), timelineNow: $('#timeline-now'), clearBrush: $('#clear-time-brush'),
  strongest: $('#strongest-event'), strongestMeta: $('#strongest-meta'), focusStrongest: $('#focus-strongest'),
  activeFilters: $('#active-filters'), detail: $('#detail-panel'), detailContent: $('#detail-content'),
  toast: $('#toast'), announcer: $('#announcer'), mobileCount: $('#mobile-count')
};

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function setupMapBase() {
  const graticule = $('.graticule');
  for (let longitude = -150; longitude <= 150; longitude += 30) {
    const x = project(longitude, 0).x;
    graticule.insertAdjacentHTML('beforeend', `<path d="M${x} 0V500"/>`);
  }
  for (let latitude = -60; latitude <= 60; latitude += 30) {
    const y = project(0, latitude).y;
    graticule.insertAdjacentHTML('beforeend', `<path d="M0 ${y}H1000"/>`);
  }
  $('.land').innerHTML = `
    <path d="M36 115 62 82 120 54 180 61 222 91 215 126 186 147 170 182 139 197 110 176 81 178 55 151Z"/>
    <path d="M202 183 230 201 258 244 267 296 250 361 224 414 204 374 190 314 179 258 166 220Z"/>
    <path d="M442 77 481 55 527 60 545 85 531 113 493 122 466 108Z"/>
    <path d="M460 124 494 111 529 128 551 174 574 207 560 270 529 326 500 310 478 261 451 216 436 169Z"/>
    <path d="M530 105 578 74 655 65 718 78 768 94 824 105 886 132 922 168 899 202 850 188 809 205 776 182 739 198 706 170 664 174 631 151 598 160 570 138Z"/>
    <path d="M735 190 760 202 773 235 752 270 724 251 717 216Z"/>
    <path d="M808 293 849 276 895 288 927 321 916 357 879 376 838 361 811 334Z"/>
    <path d="M946 335 960 351 953 376 938 360Z"/>
    <path d="M0 458 92 444 184 453 280 446 379 459 475 448 581 457 675 445 782 456 889 443 1000 455V500H0Z"/>
    <path class="contour" d="M55 124Q130 92 205 120M186 230Q228 278 218 354M469 170Q520 195 544 268M582 114Q690 94 801 136M822 318Q868 296 911 331"/>
    <path class="contour" d="M72 144Q137 118 188 139M198 248Q241 298 222 375M482 186Q520 215 531 281M603 129Q695 112 786 148M834 337Q873 313 901 344"/>`;
  $('.plates').innerHTML = `
    <path d="M18 88Q86 140 156 208T238 346Q262 417 325 468"/>
    <path d="M904 74Q873 132 888 188T927 281Q957 334 944 412"/>
    <path d="M785 81Q806 124 790 171T814 251Q833 281 818 309"/>
    <path d="M397 49Q417 114 405 181T424 320Q455 383 451 462"/>
    <path d="M538 134Q584 142 628 172T722 189"/>`;
}

function loadStateFromUrl() {
  const params = new URLSearchParams(location.search);
  if (FEEDS[params.get('period')]) state.period = params.get('period');
  state.filters.search = params.get('q') || '';
  state.filters.magnitude = Math.min(8, Math.max(0, Number(params.get('mag')) || 0));
  if (['shallow', 'intermediate', 'deep'].includes(params.get('depth'))) state.filters.depth = params.get('depth');
  if (['green', 'yellow', 'orange', 'red', 'none'].includes(params.get('alert'))) state.filters.alert = params.get('alert');
  if (['reviewed', 'automatic'].includes(params.get('review'))) state.filters.review = params.get('review');
  state.filters.tsunami = params.get('tsunami') === '1';
  if (['newest', 'magnitude', 'depth'].includes(params.get('sort'))) state.sort = params.get('sort');
  state.selectedId = params.get('event');
  const zoom = Number(params.get('z'));
  if (zoom >= 1 && zoom <= 5) state.map.zoom = zoom;
  elements.search.value = state.filters.search;
  elements.magnitude.value = state.filters.magnitude;
  elements.magnitudeOutput.value = `${state.filters.magnitude.toFixed(1)}+`;
  elements.depth.value = state.filters.depth;
  elements.alert.value = state.filters.alert;
  elements.review.value = state.filters.review;
  elements.tsunami.checked = state.filters.tsunami;
  elements.sort.value = state.sort;
  $$('[data-period]').forEach((button) => {
    const active = button.dataset.period === state.period;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function syncUrl() {
  const params = new URLSearchParams();
  if (state.period !== 'week') params.set('period', state.period);
  if (state.filters.search) params.set('q', state.filters.search);
  if (state.filters.magnitude) params.set('mag', state.filters.magnitude);
  if (state.filters.depth !== 'all') params.set('depth', state.filters.depth);
  if (state.filters.alert !== 'all') params.set('alert', state.filters.alert);
  if (state.filters.review !== 'all') params.set('review', state.filters.review);
  if (state.filters.tsunami) params.set('tsunami', '1');
  if (state.sort !== 'significance') params.set('sort', state.sort);
  if (state.selectedId) params.set('event', state.selectedId);
  if (state.map.zoom !== 1) params.set('z', state.map.zoom);
  history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}`);
}

async function fetchEvents({ background = false } = {}) {
  if (state.controller) state.controller.abort();
  state.controller = new AbortController();
  state.isLoading = true;
  state.error = null;
  elements.refresh.classList.add('is-loading');
  elements.refresh.disabled = true;
  if (!background || !state.events.length) {
    elements.app.setAttribute('aria-busy', 'true');
    $('.map-skeleton').hidden = false;
  }
  setStatus('loading');
  try {
    const response = await fetch(FEEDS[state.period], { signal: state.controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`USGS request failed with status ${response.status}.`);
    const payload = await response.json();
    const events = normalizeCollection(payload);
    state.events = events;
    state.metadata = { generated: payload.metadata?.generated || Date.now(), title: payload.metadata?.title || 'USGS earthquake feed', fetchedAt: Date.now() };
    state.stale = false;
    try { localStorage.setItem(`groundwave:${state.period}`, JSON.stringify({ events, metadata: state.metadata })); } catch {}
    applyAndRender();
    announce(`Loaded ${formatCount(events.length)} earthquakes from the ${PERIOD_LABELS[state.period]}.`);
  } catch (error) {
    if (error.name === 'AbortError') return;
    const cached = readCache();
    state.error = error.message;
    if (cached) {
      state.events = cached.events;
      state.metadata = cached.metadata;
      state.stale = true;
      applyAndRender();
      announce(`Live data unavailable. Showing saved USGS data from ${formatDateTime(state.metadata.fetchedAt)}.`);
    } else {
      state.events = [];
      applyAndRender();
      showNoDataError();
      announce('Earthquake data could not be loaded. Use Refresh to try again.');
    }
  } finally {
    state.isLoading = false;
    elements.refresh.classList.remove('is-loading');
    elements.refresh.disabled = false;
    elements.app.setAttribute('aria-busy', 'false');
    $('.map-skeleton').hidden = true;
    setStatus(state.error ? (state.stale ? 'stale' : 'error') : 'live');
  }
}

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(`groundwave:${state.period}`));
    if (Array.isArray(cached?.events) && cached.events.length && cached.metadata) return cached;
  } catch {}
  return null;
}

function setStatus(status) {
  elements.liveStatus.className = `live-status ${status === 'live' ? 'is-live' : status === 'error' ? 'is-error' : ''}`;
  if (status === 'loading') elements.liveStatus.innerHTML = '<i></i>Contacting USGS';
  if (status === 'live') elements.liveStatus.innerHTML = '<i></i>Live USGS data';
  if (status === 'stale') elements.liveStatus.innerHTML = '<i></i>Saved data';
  if (status === 'error') elements.liveStatus.innerHTML = '<i></i>USGS unavailable';
  if (state.metadata) {
    const age = relativeTime(state.metadata.fetchedAt);
    elements.updated.textContent = state.stale ? `Saved ${age} · refresh failed` : `Refreshed ${age}`;
    elements.updated.title = formatDateTime(state.metadata.fetchedAt);
  } else elements.updated.textContent = status === 'loading' ? 'Loading latest feed' : 'No earthquake data loaded';
}

function applyAndRender() {
  state.filtered = sortEvents(filterEvents(state.events, state.filters, state.brushedRange), state.sort);
  if (state.selectedId && state.events.length && !state.events.some((event) => event.id === state.selectedId)) state.selectedId = null;
  renderSummary();
  renderMap();
  renderTimeline();
  renderList();
  renderActiveFilters();
  renderDetail();
  syncUrl();
}

function renderSummary() {
  const count = state.filtered.length;
  elements.resultSummary.textContent = `${formatCount(count)} ${count === 1 ? 'event' : 'events'} · ${PERIOD_LABELS[state.period]}`;
  elements.streamCount.textContent = `${formatCount(count)} matching ${count === 1 ? 'event' : 'events'}`;
  elements.mobileCount.textContent = formatCount(count);
  const strongest = [...state.filtered].sort((a, b) => (b.magnitude ?? -Infinity) - (a.magnitude ?? -Infinity))[0];
  if (strongest) {
    elements.strongest.textContent = `M ${formatMagnitude(strongest.magnitude)} · ${strongest.place}`;
    elements.strongestMeta.textContent = `${relativeTime(strongest.time)} · ${formatDepth(strongest.depth)} deep`;
    elements.focusStrongest.disabled = false;
    elements.focusStrongest.dataset.eventId = strongest.id;
  } else {
    elements.strongest.textContent = state.events.length ? 'No event matches the current constraints' : 'Live activity unavailable';
    elements.strongestMeta.textContent = state.events.length ? 'Reset filters to restore the global view' : 'Use Refresh to try the USGS feed again';
    elements.focusStrongest.disabled = true;
  }
}

function renderMap() {
  updateViewBox();
  elements.marks.textContent = '';
  if (!state.filtered.length) return;
  const groups = clusterEvents(state.filtered);
  for (const group of groups) {
    if (group.events.length > 1) renderCluster(group);
    else renderMark(group.events[0], group.point);
  }
}

function clusterEvents(events) {
  const cellSize = 24 / state.map.zoom;
  const groups = new Map();
  for (const event of events) {
    const point = project(event.longitude, event.latitude);
    const key = event.id === state.selectedId || event.id === state.hoveredId ? `event:${event.id}` : `${Math.floor(point.x / cellSize)}:${Math.floor(point.y / cellSize)}`;
    if (!groups.has(key)) groups.set(key, { point: { x: 0, y: 0 }, events: [] });
    const group = groups.get(key);
    group.events.push(event); group.point.x += point.x; group.point.y += point.y;
  }
  return [...groups.values()].map((group) => ({ ...group, point: { x: group.point.x / group.events.length, y: group.point.y / group.events.length } }));
}

function renderMark(event, point) {
  const group = document.createElementNS(svgNS, 'g');
  const magnitude = Math.max(0, event.magnitude ?? 0);
  const radius = Math.max(3.5, Math.min(16, 3 + magnitude * 1.65)) / Math.sqrt(state.map.zoom);
  group.setAttribute('class', `quake-mark ${magnitude >= 6 ? 'is-major' : ''} ${event.id === state.selectedId ? 'is-selected' : ''} ${event.id === state.hoveredId ? 'is-hovered' : ''}`);
  group.setAttribute('transform', `translate(${point.x} ${point.y})`);
  group.dataset.eventId = event.id;
  const circle = document.createElementNS(svgNS, 'circle'); circle.setAttribute('r', radius);
  group.append(circle);
  if ((event.depth ?? 0) >= 70) {
    const ring = document.createElementNS(svgNS, 'circle'); ring.setAttribute('r', Math.max(1, radius - 2 / state.map.zoom)); ring.setAttribute('class', 'depth-ring'); group.append(ring);
  }
  group.addEventListener('pointerenter', (pointerEvent) => setHovered(event.id, pointerEvent));
  group.addEventListener('pointerleave', () => setHovered(null));
  group.addEventListener('click', () => selectEvent(event.id));
  elements.marks.append(group);
}

function renderCluster(group) {
  const node = document.createElementNS(svgNS, 'g');
  const maxMagnitude = Math.max(...group.events.map((event) => event.magnitude ?? 0));
  const radius = Math.min(19, 8 + Math.log2(group.events.length + 1) * 2) / Math.sqrt(state.map.zoom);
  node.setAttribute('class', 'quake-mark quake-cluster');
  node.setAttribute('transform', `translate(${group.point.x} ${group.point.y})`);
  node.dataset.eventIds = group.events.map((event) => event.id).join(',');
  const circle = document.createElementNS(svgNS, 'circle'); circle.setAttribute('r', radius); node.append(circle);
  const text = document.createElementNS(svgNS, 'text'); text.textContent = group.events.length > 99 ? '99+' : String(group.events.length); text.setAttribute('text-anchor', 'middle'); text.setAttribute('dy', '.35em'); text.setAttribute('font-size', Math.max(5, 9 / Math.sqrt(state.map.zoom))); text.setAttribute('font-weight', '750'); text.setAttribute('fill', 'currentColor'); node.append(text);
  node.addEventListener('pointerenter', (event) => showTooltip(event, `<strong>${group.events.length} nearby events</strong>Strongest M ${formatMagnitude(maxMagnitude)}. Select to zoom in.`));
  node.addEventListener('pointerleave', hideTooltip);
  node.addEventListener('click', () => { state.map.zoom = Math.min(5, state.map.zoom + 1); state.map.x = group.point.x; state.map.y = group.point.y; renderMap(); syncUrl(); });
  elements.marks.append(node);
}

function updateViewBox() {
  const width = 1000 / state.map.zoom, height = 500 / state.map.zoom;
  state.map.x = Math.max(width / 2, Math.min(1000 - width / 2, state.map.x));
  state.map.y = Math.max(height / 2, Math.min(500 - height / 2, state.map.y));
  elements.mapSvg.setAttribute('viewBox', `${state.map.x - width / 2} ${state.map.y - height / 2} ${width} ${height}`);
}

function renderTimeline() {
  elements.timeline.textContent = '';
  const end = Date.now(), start = periodStart(state.period, end);
  const binCount = innerWidth < 560 ? 24 : 48;
  const bins = buildBins(filterEvents(state.events, { ...state.filters, search: state.filters.search }, null), start, end, binCount);
  const selectedEvent = state.events.find((event) => event.id === state.selectedId);
  const maxCount = Math.max(1, ...bins.map((bin) => bin.count));
  bins.forEach((bin, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'timeline-bar'; button.setAttribute('role', 'option');
    button.classList.toggle('contains-selected', Boolean(selectedEvent && selectedEvent.time >= bin.start && selectedEvent.time <= bin.end));
    button.setAttribute('aria-selected', String(index === state.activeBin));
    button.style.height = `${Math.max(4, (bin.count / maxCount) * 100)}%`;
    button.style.setProperty('--cap', magnitudeColor(bin.maxMagnitude));
    button.setAttribute('aria-label', `${bin.count} ${bin.count === 1 ? 'event' : 'events'} from ${formatDateTime(bin.start)} to ${formatDateTime(bin.end)}. Strongest magnitude ${formatMagnitude(bin.maxMagnitude)}.`);
    button.title = `${bin.count} events · max M ${formatMagnitude(bin.maxMagnitude)}`;
    button.addEventListener('pointerenter', () => highlightRange([bin.start, bin.end]));
    button.addEventListener('pointerleave', () => highlightRange(state.brushedRange));
    button.addEventListener('focus', () => highlightRange([bin.start, bin.end]));
    button.addEventListener('blur', () => highlightRange(state.brushedRange));
    button.addEventListener('click', () => {
      if (state.activeBin === index) { state.activeBin = null; state.brushedRange = null; }
      else { state.activeBin = index; state.brushedRange = [bin.start, bin.end]; }
      elements.clearBrush.hidden = !state.brushedRange;
      applyAndRender();
      announce(state.brushedRange ? `Timeline window selected with ${state.filtered.length} events.` : 'Showing the full selected period.');
    });
    elements.timeline.append(button);
  });
  elements.timelineStart.textContent = state.period === 'hour' ? '1 hour ago' : state.period === 'day' ? '24 hours ago' : state.period === 'week' ? '7 days ago' : '30 days ago';
  elements.timelineNow.textContent = 'Now';
  elements.clearBrush.hidden = !state.brushedRange;
}

function highlightRange(range) {
  $$('.quake-mark[data-event-id]', elements.marks).forEach((mark) => {
    const event = state.events.find((item) => item.id === mark.dataset.eventId);
    mark.classList.toggle('is-muted', Boolean(range && event && (event.time < range[0] || event.time > range[1])));
  });
  $$('.quake-cluster[data-event-ids]', elements.marks).forEach((mark) => {
    const ids = mark.dataset.eventIds.split(',');
    const hasEventInRange = ids.some((id) => { const event = state.events.find((item) => item.id === id); return event && (!range || (event.time >= range[0] && event.time <= range[1])); });
    mark.classList.toggle('is-muted', Boolean(range && !hasEventInRange));
  });
  $$('.event-row', elements.list).forEach((row) => {
    const event = state.events.find((item) => item.id === row.dataset.eventId);
    row.style.opacity = range && event && (event.time < range[0] || event.time > range[1]) ? '.25' : '1';
  });
}

function renderList() {
  const previousScroll = elements.list.scrollTop;
  elements.list.textContent = '';
  const visible = state.filtered.slice(0, state.renderedRows);
  for (const event of visible) elements.list.append(createEventRow(event));
  if (state.filtered.length > visible.length) {
    const loadMore = document.createElement('button');
    loadMore.type = 'button'; loadMore.className = 'load-more';
    loadMore.textContent = `Show ${Math.min(150, state.filtered.length - visible.length)} more events`;
    loadMore.addEventListener('click', () => { state.renderedRows += 150; renderList(); });
    elements.list.append(loadMore);
  }
  elements.empty.hidden = state.filtered.length > 0 || Boolean(state.error && !state.stale);
  if (!state.filtered.length && state.events.length) {
    const constraints = activeFilterLabels();
    elements.emptyExplanation.textContent = constraints.length ? `No USGS events match ${constraints.join(', ')}.` : 'No USGS events occurred in the selected timeline window.';
  }
  elements.list.scrollTop = previousScroll;
}

function createEventRow(event) {
  const button = document.createElement('button');
  const classification = classifyMagnitude(event.magnitude);
  button.type = 'button'; button.className = `event-row ${event.id === state.hoveredId ? 'is-hovered' : ''}`;
  button.dataset.eventId = event.id;
  if (event.id === state.selectedId) button.setAttribute('aria-current', 'true');
  const tags = [
    `<span class="tag">↧ ${escapeHtml(formatDepth(event.depth))}</span>`,
    event.alert ? `<span class="tag alert-${event.alert}">● ${escapeHtml(event.alert)} alert</span>` : '',
    event.tsunami ? '<span class="tag">△ Tsunami flag</span>' : '',
    event.status === 'reviewed' ? '<span class="tag">✓ Reviewed</span>' : ''
  ].join('');
  button.innerHTML = `<span class="mag-disc ${classification.level}">${formatMagnitude(event.magnitude)}</span><span class="event-main"><strong>${escapeHtml(event.place)}</strong><span>${escapeHtml(classification.label)} · ${escapeHtml(formatUtc(event.time))}</span><span class="event-tags">${tags}</span></span><span class="event-time">${escapeHtml(relativeTime(event.time))}</span>`;
  button.setAttribute('aria-label', `Magnitude ${formatMagnitude(event.magnitude)}, ${event.place}, ${relativeTime(event.time)}, depth ${formatDepth(event.depth)}. Open details.`);
  button.addEventListener('mouseenter', () => setHovered(event.id, null, true));
  button.addEventListener('mouseleave', () => setHovered(null, null, true));
  button.addEventListener('focus', () => setHovered(event.id, null, true));
  button.addEventListener('blur', () => setHovered(null, null, true));
  button.addEventListener('click', () => selectEvent(event.id));
  return button;
}

function renderActiveFilters() {
  elements.activeFilters.textContent = '';
  const chips = [];
  if (state.filters.search) chips.push(['search', `Place: ${state.filters.search}`]);
  if (state.filters.magnitude) chips.push(['magnitude', `M ${state.filters.magnitude.toFixed(1)}+`]);
  if (state.filters.depth !== 'all') chips.push(['depth', `${capitalize(state.filters.depth)} depth`]);
  if (state.filters.alert !== 'all') chips.push(['alert', `Alert: ${state.filters.alert}`]);
  if (state.filters.review !== 'all') chips.push(['review', capitalize(state.filters.review)]);
  if (state.filters.tsunami) chips.push(['tsunami', 'Tsunami flag']);
  if (state.brushedRange) chips.push(['time', 'Timeline window']);
  for (const [key, label] of chips) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'filter-chip'; button.textContent = `${label} ×`; button.setAttribute('aria-label', `Remove filter ${label}`);
    button.addEventListener('click', () => clearFilter(key)); elements.activeFilters.append(button);
  }
  const count = chips.length;
  elements.filterCount.hidden = count === 0; elements.filterCount.textContent = String(count);
}

function activeFilterLabels() {
  const labels = [];
  if (state.filters.search) labels.push(`place “${state.filters.search}”`);
  if (state.filters.magnitude) labels.push(`magnitude ${state.filters.magnitude.toFixed(1)} or greater`);
  if (state.filters.depth !== 'all') labels.push(`${state.filters.depth} depth`);
  if (state.filters.alert !== 'all') labels.push(`${state.filters.alert} alert`);
  if (state.filters.review !== 'all') labels.push(`${state.filters.review} status`);
  if (state.filters.tsunami) labels.push('tsunami flag');
  if (state.brushedRange) labels.push('the selected timeline window');
  return labels;
}

function clearFilter(key) {
  if (key === 'search') { state.filters.search = ''; elements.search.value = ''; }
  if (key === 'magnitude') { state.filters.magnitude = 0; elements.magnitude.value = 0; elements.magnitudeOutput.value = '0.0+'; }
  if (key === 'depth') { state.filters.depth = 'all'; elements.depth.value = 'all'; }
  if (key === 'alert') { state.filters.alert = 'all'; elements.alert.value = 'all'; }
  if (key === 'review') { state.filters.review = 'all'; elements.review.value = 'all'; }
  if (key === 'tsunami') { state.filters.tsunami = false; elements.tsunami.checked = false; }
  if (key === 'time') { state.brushedRange = null; state.activeBin = null; }
  state.renderedRows = 150; applyAndRender();
}

function resetFilters() {
  state.filters = { search: '', magnitude: 0, depth: 'all', alert: 'all', review: 'all', tsunami: false };
  state.brushedRange = null; state.activeBin = null; state.renderedRows = 150;
  elements.search.value = ''; elements.magnitude.value = 0; elements.magnitudeOutput.value = '0.0+';
  elements.depth.value = 'all'; elements.alert.value = 'all'; elements.review.value = 'all'; elements.tsunami.checked = false;
  applyAndRender(); announce(`Filters reset. ${state.filtered.length} events shown.`);
}

function setHovered(id, pointerEvent, revealOnMap = false) {
  const changed = state.hoveredId !== id;
  state.hoveredId = id;
  if (revealOnMap && changed) renderMap();
  $$('.quake-mark[data-event-id]', elements.marks).forEach((mark) => mark.classList.toggle('is-hovered', mark.dataset.eventId === id));
  $$('.event-row', elements.list).forEach((row) => row.classList.toggle('is-hovered', row.dataset.eventId === id));
  if (id && pointerEvent?.clientX) {
    const event = state.events.find((item) => item.id === id);
    if (event) showTooltip(pointerEvent, `<strong>M ${formatMagnitude(event.magnitude)} · ${escapeHtml(event.place)}</strong>${relativeTime(event.time)} · ${formatDepth(event.depth)} deep`);
  } else hideTooltip();
}

function showTooltip(pointerEvent, html) {
  elements.tooltip.innerHTML = html; elements.tooltip.hidden = false;
  const rect = elements.map.getBoundingClientRect();
  elements.tooltip.style.left = `${Math.min(rect.width - 270, Math.max(8, pointerEvent.clientX - rect.left + 12))}px`;
  elements.tooltip.style.top = `${Math.min(rect.height - 70, Math.max(8, pointerEvent.clientY - rect.top + 12))}px`;
}
function hideTooltip() { elements.tooltip.hidden = true; }

function selectEvent(id, { focus = true } = {}) {
  state.selectedId = id;
  renderMap(); renderList(); renderDetail(); syncUrl();
  if (innerWidth <= 720) document.body.dataset.mobileView = 'events';
  if (focus) requestAnimationFrame(() => $('#close-detail')?.focus());
  const event = state.events.find((item) => item.id === id);
  if (event) announce(`Selected magnitude ${formatMagnitude(event.magnitude)} earthquake, ${event.place}.`);
}

function renderDetail() {
  const event = state.events.find((item) => item.id === state.selectedId);
  elements.detail.hidden = !event;
  if (!event) { elements.detailContent.textContent = ''; return; }
  const classification = classifyMagnitude(event.magnitude);
  const felt = event.felt === null ? 'Not reported' : formatCount(event.felt);
  const significance = event.significance === null ? 'Not reported' : event.significance.toLocaleString();
  const assessment = assessmentCopy(event);
  elements.detailContent.innerHTML = `
    <section class="detail-hero"><div class="magnitude-line"><span class="mag-disc ${classification.level}">${formatMagnitude(event.magnitude)}</span><div><strong>${escapeHtml(classification.label)}</strong><p>${escapeHtml(relativeTime(event.time))}</p></div></div><h2 id="detail-title">${escapeHtml(event.place)}</h2><p>Your local time: ${escapeHtml(formatDateTime(event.time))}<br>Universal time: ${escapeHtml(formatUtc(event.time))}</p></section>
    <div class="assessment"><strong>${escapeHtml(assessment.title)}</strong><p>${escapeHtml(assessment.body)}</p></div>
    <div class="detail-grid">
      <div class="detail-stat"><span>Depth</span><strong>${escapeHtml(formatDepth(event.depth))}</strong></div>
      <div class="detail-stat"><span>USGS significance</span><strong>${escapeHtml(significance)}</strong></div>
      <div class="detail-stat"><span>Felt reports</span><strong>${escapeHtml(felt)}</strong></div>
      <div class="detail-stat"><span>Alert level</span><strong>${event.alert ? `${capitalize(event.alert)} alert` : 'Not assigned'}</strong></div>
      <div class="detail-stat"><span>Tsunami flag</span><strong>${event.tsunami ? 'Flagged for review' : 'Not flagged'}</strong></div>
      <div class="detail-stat"><span>Review status</span><strong>${event.status ? capitalize(event.status) : 'Not reported'}</strong></div>
    </div>
    <section class="detail-section"><h3>Location and record</h3><dl class="definition-list"><div><dt>Coordinates</dt><dd>${formatCoordinate(event.latitude, 'N', 'S')}, ${formatCoordinate(event.longitude, 'E', 'W')}</dd></div><div><dt>Event type</dt><dd>${escapeHtml(capitalize(event.type))}</dd></div><div><dt>Last revised</dt><dd>${escapeHtml(event.updated ? formatDateTime(event.updated) : 'Not reported')}</dd></div></dl></section>
    <section class="detail-section"><h3>How to read this</h3><p>Magnitude describes energy released. Depth, distance, local geology, building conditions, and other factors also affect how shaking is experienced. Magnitude alone does not predict damage.</p><p>USGS significance combines magnitude with factors such as felt reports and estimated impact. Alert levels are assigned only when impact products are available.</p></section>
    ${event.url ? `<a class="usgs-link" href="${escapeHtml(event.url)}" target="_blank" rel="noreferrer">Open official USGS event page ↗</a>` : '<p class="detail-section">An official USGS page was not provided for this record.</p>'}`;
}

function assessmentCopy(event) {
  if (event.alert === 'red' || event.alert === 'orange') return { title: 'Elevated reported impact', body: 'USGS has assigned an elevated alert level. Review the official event page and follow local authorities for authoritative information.' };
  if ((event.magnitude ?? 0) >= 7 || event.tsunami) return { title: 'Deserves closer attention', body: `This event is ${event.tsunami ? 'flagged by USGS for tsunami review' : 'large in magnitude'}. This is not a safety determination; check official sources for current information.` };
  if ((event.significance ?? 0) >= 600 || (event.felt ?? 0) >= 1000) return { title: 'Notable reporting signal', body: 'USGS significance or felt reporting is elevated relative to many events in this feed. Reports and values may be revised.' };
  return { title: 'Within the ordinary feed range', body: 'No elevated USGS alert is shown for this event. That does not determine local safety or impact, and the record may change after review.' };
}

function showNoDataError() {
  elements.list.innerHTML = `<div class="network-error"><strong>Live USGS data could not be loaded</strong><p>${escapeHtml(state.error || 'Network request failed.')} Your selected period and filters are preserved.</p><button type="button" id="inline-retry">Try loading again</button></div>`;
  $('#inline-retry').addEventListener('click', () => fetchEvents());
  elements.empty.hidden = true;
}

function bindEvents() {
  $$('[data-period]').forEach((button) => button.addEventListener('click', () => {
    if (button.dataset.period === state.period) return;
    state.period = button.dataset.period; state.brushedRange = null; state.activeBin = null; state.renderedRows = 150;
    $$('[data-period]').forEach((item) => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
    syncUrl(); fetchEvents();
  }));
  let searchTimer;
  elements.search.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.filters.search = elements.search.value.trim(); state.renderedRows = 150; applyAndRender(); }, 180); });
  elements.magnitude.addEventListener('input', () => { elements.magnitudeOutput.value = `${Number(elements.magnitude.value).toFixed(1)}+`; });
  elements.magnitude.addEventListener('change', () => { state.filters.magnitude = Number(elements.magnitude.value); state.renderedRows = 150; applyAndRender(); });
  elements.depth.addEventListener('change', () => { state.filters.depth = elements.depth.value; applyAndRender(); });
  elements.alert.addEventListener('change', () => { state.filters.alert = elements.alert.value; applyAndRender(); });
  elements.review.addEventListener('change', () => { state.filters.review = elements.review.value; applyAndRender(); });
  elements.tsunami.addEventListener('change', () => { state.filters.tsunami = elements.tsunami.checked; applyAndRender(); });
  elements.sort.addEventListener('change', () => { state.sort = elements.sort.value; applyAndRender(); });
  elements.filterButton.addEventListener('click', () => { const open = elements.filterPanel.hidden; elements.filterPanel.hidden = !open; elements.filterButton.setAttribute('aria-expanded', String(open)); });
  $('#filter-done').addEventListener('click', () => { elements.filterPanel.hidden = true; elements.filterButton.setAttribute('aria-expanded', 'false'); elements.filterButton.focus(); });
  elements.filterPanel.addEventListener('click', (event) => { if (innerWidth <= 720 && event.target === elements.filterPanel) { elements.filterPanel.hidden = true; elements.filterButton.setAttribute('aria-expanded', 'false'); elements.filterButton.focus(); } });
  $('#reset-filters').addEventListener('click', resetFilters); $('#empty-reset').addEventListener('click', resetFilters);
  elements.refresh.addEventListener('click', () => fetchEvents({ background: state.events.length > 0 }));
  elements.focusStrongest.addEventListener('click', () => selectEvent(elements.focusStrongest.dataset.eventId));
  elements.clearBrush.addEventListener('click', () => { state.brushedRange = null; state.activeBin = null; applyAndRender(); });
  $('#close-detail').addEventListener('click', closeDetail);
  $('#copy-link').addEventListener('click', copyLink);
  $('#zoom-in').addEventListener('click', () => changeZoom(1)); $('#zoom-out').addEventListener('click', () => changeZoom(-1));
  $('#reset-map').addEventListener('click', () => { state.map = { zoom: 1, x: 500, y: 250 }; renderMap(); syncUrl(); });
  $$('.mobile-view-switch button').forEach((button) => button.addEventListener('click', () => switchMobileView(button.dataset.view)));
  document.addEventListener('keydown', handleKeydown);
  window.addEventListener('online', () => { showToast('Back online. Refreshing USGS data.'); fetchEvents({ background: state.events.length > 0 }); });
  window.addEventListener('offline', () => { state.stale = Boolean(state.events.length); state.error = 'This device is offline.'; setStatus(state.stale ? 'stale' : 'error'); announce('You are offline. Existing earthquake data remains visible.'); });
  bindMapPan();
}

function bindMapPan() {
  let start = null;
  elements.map.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.map-controls') || event.target.closest('.quake-mark')) return;
    start = { x: event.clientX, y: event.clientY, cx: state.map.x, cy: state.map.y };
    elements.map.setPointerCapture(event.pointerId);
  });
  elements.map.addEventListener('pointermove', (event) => {
    if (!start) return;
    const rect = elements.map.getBoundingClientRect();
    state.map.x = start.cx - (event.clientX - start.x) / rect.width * (1000 / state.map.zoom);
    state.map.y = start.cy - (event.clientY - start.y) / rect.height * (500 / state.map.zoom);
    updateViewBox();
  });
  elements.map.addEventListener('pointerup', () => { if (start) { start = null; renderMap(); syncUrl(); } });
  elements.map.addEventListener('wheel', (event) => { event.preventDefault(); changeZoom(event.deltaY < 0 ? 1 : -1); }, { passive: false });
}

function changeZoom(direction) { state.map.zoom = Math.max(1, Math.min(5, state.map.zoom + direction)); renderMap(); syncUrl(); }
function switchMobileView(view) { document.body.dataset.mobileView = view; $$('.mobile-view-switch button').forEach((button) => { const active = button.dataset.view === view; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); }); }

function closeDetail() {
  const id = state.selectedId; state.selectedId = null; renderMap(); renderList(); renderDetail(); syncUrl();
  requestAnimationFrame(() => elements.list.querySelector(`[data-event-id="${CSS.escape(id || '')}"]`)?.focus());
}

async function copyLink() {
  syncUrl();
  try { await navigator.clipboard.writeText(location.href); showToast('Event link copied.'); }
  catch { showToast('Copy unavailable. Use the browser address bar.'); }
}

function handleKeydown(event) {
  const target = event.target;
  if (event.key === '/' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) { event.preventDefault(); elements.search.focus(); }
  if (event.key === 'Escape') {
    if (!elements.detail.hidden) closeDetail();
    else if (!elements.filterPanel.hidden) { elements.filterPanel.hidden = true; elements.filterButton.setAttribute('aria-expanded', 'false'); elements.filterButton.focus(); }
    else if (state.brushedRange) { state.brushedRange = null; state.activeBin = null; applyAndRender(); }
  }
  if (target.classList?.contains('event-row') && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault(); const rows = $$('.event-row', elements.list), index = rows.indexOf(target); rows[Math.max(0, Math.min(rows.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))]?.focus();
  }
  if (target === elements.map && ['+', '='].includes(event.key)) { event.preventDefault(); changeZoom(1); }
  if (target === elements.map && event.key === '-') { event.preventDefault(); changeZoom(-1); }
}

function formatDateTime(timestamp) {
  if (!timestamp) return 'Time not reported';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'long' }).format(timestamp);
}
function formatUtc(timestamp) {
  if (!timestamp) return 'UTC time not reported';
  return `${new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'UTC', hour12: false }).format(timestamp)} UTC`;
}
function formatCoordinate(value, positive, negative) { return value === null ? 'Not reported' : `${Math.abs(value).toFixed(3)}°${value >= 0 ? positive : negative}`; }
function magnitudeColor(magnitude) { return magnitude === null ? 'var(--line-strong)' : magnitude >= 6 ? 'var(--danger)' : magnitude >= 4.5 ? 'var(--accent)' : 'var(--primary-dark)'; }
function capitalize(value) { return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''; }
function announce(message) { elements.announcer.textContent = ''; setTimeout(() => { elements.announcer.textContent = message; }, 20); }
function showToast(message) { elements.toast.textContent = message; elements.toast.hidden = false; clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { elements.toast.hidden = true; }, 2800); }

setupMapBase();
loadStateFromUrl();
bindEvents();
fetchEvents();
setInterval(() => { if (!document.hidden && !state.isLoading) fetchEvents({ background: true }); }, 5 * 60 * 1000);
