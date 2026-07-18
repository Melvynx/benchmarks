const USGS_ROOT = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary";

const FEEDS = {
  hour: { file: "all_hour.geojson", label: "Past hour", short: "1 hour" },
  day: { file: "all_day.geojson", label: "Past 24 hours", short: "24 hours" },
  week: { file: "all_week.geojson", label: "Past 7 days", short: "7 days" },
  month: { file: "all_month.geojson", label: "Past 30 days", short: "30 days" },
};

const state = {
  range: "day",
  minMagnitude: 0,
  depth: "all",
  search: "",
  sort: "time",
  feltOnly: false,
  earthquakes: [],
  filtered: [],
  selectedId: null,
  loading: false,
  generatedAt: null,
  initialLoad: true,
};

let map;
let markerLayer;
let markerRenderer;
let activeTileLayer;
let requestController;
let refreshTimer;
let toastTimer;
let filterFrame;
const markerById = new Map();
const eventById = new Map();

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindControls();
  renderSkeletons();
  updateMagnitudeControl();
  initializeMapWhenReady();
  loadEarthquakes();
});

function cacheElements() {
  Object.assign(els, {
    sidebar: document.querySelector("#sidebar"),
    sidebarContent: document.querySelector("#sidebar-content"),
    mobileMenu: document.querySelector("#mobile-menu-button"),
    refresh: document.querySelector("#refresh-button"),
    feedStatus: document.querySelector("#feed-status"),
    eventCount: document.querySelector("#event-count"),
    strongestMag: document.querySelector("#strongest-mag"),
    strongestPlace: document.querySelector("#strongest-place"),
    timeControl: document.querySelector("#time-range-control"),
    magnitude: document.querySelector("#magnitude-filter"),
    magnitudeOutput: document.querySelector("#magnitude-output"),
    depthControl: document.querySelector("#depth-control"),
    search: document.querySelector("#place-search"),
    sort: document.querySelector("#sort-select"),
    feltOnly: document.querySelector("#felt-only"),
    resetFilters: document.querySelector("#reset-filters"),
    eventList: document.querySelector("#event-list"),
    resultSummary: document.querySelector("#result-summary"),
    mapLoading: document.querySelector("#map-loading"),
    mapContextTitle: document.querySelector("#map-context-title"),
    frameResults: document.querySelector("#frame-results"),
    resetView: document.querySelector("#reset-view"),
    dataError: document.querySelector("#data-error"),
    errorMessage: document.querySelector("#error-message"),
    errorRetry: document.querySelector("#error-retry"),
    detailPanel: document.querySelector("#detail-panel"),
    detailContent: document.querySelector("#detail-content"),
    detailClose: document.querySelector("#detail-close"),
    toast: document.querySelector("#toast"),
  });
}

function bindControls() {
  els.timeControl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-range]");
    if (!button || button.dataset.range === state.range) return;
    state.range = button.dataset.range;
    setPressedButton(els.timeControl, button);
    els.mapContextTitle.textContent = FEEDS[state.range].label;
    closeDetails();
    loadEarthquakes();
  });

  els.magnitude.addEventListener("input", () => {
    state.minMagnitude = Number(els.magnitude.value);
    updateMagnitudeControl();
    scheduleFilterUpdate();
  });

  els.depthControl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-depth]");
    if (!button || button.dataset.depth === state.depth) return;
    state.depth = button.dataset.depth;
    setPressedButton(els.depthControl, button);
    scheduleFilterUpdate();
  });

  els.search.addEventListener("input", () => {
    state.search = els.search.value.trim().toLowerCase();
    scheduleFilterUpdate();
  });

  els.sort.addEventListener("change", () => {
    state.sort = els.sort.value;
    scheduleFilterUpdate();
  });

  els.feltOnly.addEventListener("change", () => {
    state.feltOnly = els.feltOnly.checked;
    scheduleFilterUpdate();
  });

  els.refresh.addEventListener("click", () => loadEarthquakes({ announce: true }));
  els.errorRetry.addEventListener("click", () => loadEarthquakes({ announce: true }));
  els.resetFilters.addEventListener("click", resetFilters);
  els.frameResults.addEventListener("click", frameFilteredEvents);
  els.resetView.addEventListener("click", () => map?.flyTo([18, 0], 2, { duration: 0.8 }));
  els.detailClose.addEventListener("click", closeDetails);

  els.mobileMenu.addEventListener("click", () => {
    const isOpen = els.sidebar.classList.toggle("mobile-open");
    els.mobileMenu.setAttribute("aria-expanded", String(isOpen));
    els.mobileMenu.setAttribute("aria-label", isOpen ? "Close filters" : "Open filters");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (els.detailPanel.classList.contains("open")) closeDetails();
      if (els.sidebar.classList.contains("mobile-open")) {
        els.sidebar.classList.remove("mobile-open");
        els.mobileMenu.setAttribute("aria-expanded", "false");
      }
    }
  });
}

function initializeMapWhenReady(attempt = 0) {
  if (window.L) {
    initializeMap();
    return;
  }

  if (attempt < 80) {
    window.setTimeout(() => initializeMapWhenReady(attempt + 1), 100);
    return;
  }

  els.mapLoading.innerHTML = `
    <strong>Map tiles could not load</strong>
    <small>The event list will reconnect automatically when network access returns.</small>
  `;
}

function initializeMap() {
  map = L.map("map", {
    center: [18, 0],
    zoom: 2,
    minZoom: 2,
    maxZoom: 12,
    zoomControl: true,
    preferCanvas: true,
    worldCopyJump: true,
    attributionControl: true,
  });

  activeTileLayer = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
      subdomains: "abcd",
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  ).addTo(map);

  let tileErrors = 0;
  activeTileLayer.on("load", hideMapLoading);
  activeTileLayer.on("tileerror", () => {
    tileErrors += 1;
    if (tileErrors === 8) showToast("Basemap tiles are having trouble loading");
  });

  markerRenderer = L.canvas({ padding: 0.55, tolerance: 8 });
  markerLayer = L.layerGroup().addTo(map);
  window.setTimeout(hideMapLoading, 1800);

  if (state.filtered.length) renderMapMarkers();
}

function hideMapLoading() {
  els.mapLoading.classList.add("hidden");
}

async function loadEarthquakes({ announce = false } = {}) {
  if (state.loading) requestController?.abort();
  const currentController = new AbortController();
  requestController = currentController;
  state.loading = true;
  els.refresh.classList.add("loading");
  els.refresh.disabled = true;
  els.dataError.hidden = true;
  els.feedStatus.textContent = `Loading ${FEEDS[state.range].short} of activity…`;

  if (!state.earthquakes.length) renderSkeletons();

  try {
    const response = await fetch(`${USGS_ROOT}/${FEEDS[state.range].file}`, {
      cache: "no-store",
      signal: currentController.signal,
      headers: { Accept: "application/geo+json, application/json" },
    });

    if (!response.ok) throw new Error(`USGS responded with ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.features)) throw new Error("The USGS response did not include event data");

    const normalized = payload.features.map(normalizeFeature).filter(Boolean);
    state.earthquakes = normalized;
    state.generatedAt = payload.metadata?.generated || Date.now();
    state.initialLoad = false;

    eventById.clear();
    for (const earthquake of normalized) eventById.set(earthquake.id, earthquake);

    applyFilters();
    updateFeedStatus();
    if (announce) showToast(`Updated ${normalized.length.toLocaleString()} USGS events`);
    scheduleRefresh();
  } catch (error) {
    if (error.name === "AbortError") return;
    showDataError(error);
    if (!state.earthquakes.length) {
      state.loading = false;
      state.filtered = [];
      renderStats();
      renderEventList();
    }
  } finally {
    if (requestController === currentController) {
      state.loading = false;
      els.refresh.classList.remove("loading");
      els.refresh.disabled = false;
    }
  }
}

function normalizeFeature(feature, index) {
  const coordinates = feature?.geometry?.coordinates;
  const properties = feature?.properties || {};
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  const depth = Number(coordinates[2] ?? 0);
  if (![longitude, latitude, depth].every(Number.isFinite)) return null;
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) return null;

  const magnitude = Number(properties.mag);
  return {
    id: String(feature.id || `${properties.net || "us"}-${properties.code || index}`),
    longitude,
    latitude,
    depth,
    magnitude: Number.isFinite(magnitude) ? magnitude : 0,
    place: String(properties.place || "Unnamed seismic event"),
    time: Number(properties.time || 0),
    updated: Number(properties.updated || properties.time || 0),
    felt: Number(properties.felt || 0),
    cdi: finiteOrNull(properties.cdi),
    mmi: finiteOrNull(properties.mmi),
    significance: Number(properties.sig || 0),
    alert: properties.alert || null,
    status: String(properties.status || "automatic"),
    tsunami: Number(properties.tsunami || 0) === 1,
    url: String(properties.url || "https://earthquake.usgs.gov/earthquakes/map/"),
    type: String(properties.type || "earthquake"),
    magnitudeType: String(properties.magType || "magnitude"),
    network: String(properties.net || "USGS"),
    title: String(properties.title || properties.place || "Earthquake"),
  };
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function scheduleFilterUpdate() {
  cancelAnimationFrame(filterFrame);
  filterFrame = requestAnimationFrame(applyFilters);
}

function applyFilters() {
  const search = state.search;
  const filtered = state.earthquakes.filter((earthquake) => {
    if (state.minMagnitude > 0 && earthquake.magnitude < state.minMagnitude) return false;
    if (state.feltOnly && earthquake.felt < 1) return false;
    if (search && !earthquake.place.toLowerCase().includes(search)) return false;
    if (state.depth !== "all" && depthCategory(earthquake.depth) !== state.depth) return false;
    return true;
  });

  filtered.sort(sortComparator(state.sort));
  state.filtered = filtered;

  if (state.selectedId && !filtered.some((earthquake) => earthquake.id === state.selectedId)) {
    closeDetails();
  }

  renderStats();
  renderEventList();
  renderMapMarkers();
}

function sortComparator(sort) {
  if (sort === "magnitude") return (a, b) => b.magnitude - a.magnitude || b.time - a.time;
  if (sort === "depth") return (a, b) => b.depth - a.depth || b.time - a.time;
  if (sort === "felt") return (a, b) => b.felt - a.felt || b.magnitude - a.magnitude;
  return (a, b) => b.time - a.time;
}

function renderStats() {
  els.eventCount.textContent = state.filtered.length.toLocaleString();
  els.resultSummary.textContent = `${state.filtered.length.toLocaleString()} ${state.filtered.length === 1 ? "result" : "results"}`;

  const strongest = state.filtered.reduce(
    (best, earthquake) => (!best || earthquake.magnitude > best.magnitude ? earthquake : best),
    null,
  );

  els.strongestMag.textContent = strongest ? `M ${formatMagnitude(strongest.magnitude)}` : "—";
  els.strongestPlace.textContent = strongest ? strongest.place : state.loading ? "Waiting for data" : "No matching events";
}

function renderSkeletons() {
  els.eventList.innerHTML = Array.from({ length: 5 }, () => `
    <div class="event-skeleton" aria-hidden="true"><div class="skeleton-lines"></div></div>
  `).join("");
}

function renderEventList() {
  if (!state.filtered.length) {
    els.eventList.innerHTML = `
      <div class="list-empty">
        <span>${state.loading ? "Loading recent seismic activity…" : "No earthquakes match these filters. Try a wider time window or lower magnitude."}</span>
      </div>
    `;
    return;
  }

  const limit = 160;
  const rows = state.filtered.slice(0, limit).map((earthquake) => {
    const color = depthColor(earthquake.depth);
    const isSelected = earthquake.id === state.selectedId;
    return `
      <button class="event-row${isSelected ? " selected" : ""}" type="button" data-event-id="${escapeHtml(earthquake.id)}" aria-label="Magnitude ${formatMagnitude(earthquake.magnitude)}, ${escapeHtml(earthquake.place)}, ${formatRelativeTime(earthquake.time)}">
        <span class="event-mag" style="color:${color}">${formatMagnitude(earthquake.magnitude)}</span>
        <span class="event-copy">
          <strong>${escapeHtml(earthquake.place)}</strong>
          <span>${formatRelativeTime(earthquake.time)} · ${formatDepth(earthquake.depth)} deep${earthquake.felt ? ` · felt ${earthquake.felt.toLocaleString()}` : ""}</span>
        </span>
        <svg class="row-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>
      </button>
    `;
  });

  if (state.filtered.length > limit) {
    rows.push(`<div class="list-empty"><span>Showing the first ${limit.toLocaleString()} events. All ${state.filtered.length.toLocaleString()} remain individually visible and selectable on the map.</span></div>`);
  }

  els.eventList.innerHTML = rows.join("");
  els.eventList.querySelectorAll("[data-event-id]").forEach((button) => {
    button.addEventListener("click", () => selectEarthquake(button.dataset.eventId, { focusMap: true }));
  });
}

function renderMapMarkers() {
  if (!map || !markerLayer) return;

  markerLayer.clearLayers();
  markerById.clear();

  for (const earthquake of state.filtered) {
    const color = depthColor(earthquake.depth);
    const radius = markerRadius(earthquake.magnitude);
    const selected = earthquake.id === state.selectedId;
    const marker = L.circleMarker([earthquake.latitude, earthquake.longitude], {
      renderer: markerRenderer,
      radius: selected ? radius + 3 : radius,
      color: selected ? "#d9ff57" : "rgba(255,255,255,0.82)",
      weight: selected ? 3 : earthquake.magnitude >= 5 ? 1.5 : 0.85,
      opacity: 1,
      fillColor: color,
      fillOpacity: selected ? 1 : 0.82,
      bubblingMouseEvents: false,
      interactive: true,
      alt: `Magnitude ${formatMagnitude(earthquake.magnitude)} earthquake near ${earthquake.place}`,
    });

    marker.bindTooltip(tooltipMarkup(earthquake, color), {
      className: "quake-tooltip",
      direction: "top",
      offset: [0, -radius],
      opacity: 1,
      sticky: false,
    });

    marker.on("click", () => selectEarthquake(earthquake.id, { focusMap: false }));
    marker.on("mouseover", () => {
      if (earthquake.id !== state.selectedId) marker.setStyle({ fillOpacity: 1, weight: 2 });
    });
    marker.on("mouseout", () => {
      if (earthquake.id !== state.selectedId) marker.setStyle({ fillOpacity: 0.82, weight: earthquake.magnitude >= 5 ? 1.5 : 0.85 });
    });

    marker.addTo(markerLayer);
    markerById.set(earthquake.id, marker);
  }
}

function tooltipMarkup(earthquake, color) {
  return `
    <div class="tooltip-content" style="--tooltip-color:${color}">
      <span class="tooltip-mag">${formatMagnitude(earthquake.magnitude)}</span>
      <span class="tooltip-copy"><strong>${escapeHtml(earthquake.place)}</strong><span>${formatRelativeTime(earthquake.time)} · ${formatDepth(earthquake.depth)} deep</span></span>
    </div>
  `;
}

function selectEarthquake(id, { focusMap = false } = {}) {
  const earthquake = eventById.get(id);
  if (!earthquake) return;

  const previousId = state.selectedId;
  state.selectedId = id;

  updateMarkerSelection(previousId, false);
  updateMarkerSelection(id, true);
  updateSelectedListRow();
  renderDetails(earthquake);

  if (map) {
    const targetZoom = focusMap ? Math.max(map.getZoom(), 6) : map.getZoom();
    const target = [earthquake.latitude, earthquake.longitude];
    if (focusMap) map.flyTo(target, targetZoom, { duration: 0.9 });
    else map.panTo(target, { animate: true, duration: 0.55 });
  }

  if (window.innerWidth <= 760) {
    els.sidebar.classList.remove("mobile-open");
    els.mobileMenu.setAttribute("aria-expanded", "false");
  }
}

function updateMarkerSelection(id, selected) {
  if (!id) return;
  const marker = markerById.get(id);
  const earthquake = eventById.get(id);
  if (!marker || !earthquake) return;
  const radius = markerRadius(earthquake.magnitude);
  marker.setRadius(selected ? radius + 3 : radius);
  marker.setStyle({
    color: selected ? "#d9ff57" : "rgba(255,255,255,0.82)",
    weight: selected ? 3 : earthquake.magnitude >= 5 ? 1.5 : 0.85,
    fillOpacity: selected ? 1 : 0.82,
  });
  if (selected) marker.bringToFront();
}

function updateSelectedListRow() {
  els.eventList.querySelectorAll(".event-row.selected").forEach((row) => row.classList.remove("selected"));
  if (!state.selectedId) return;
  const row = [...els.eventList.querySelectorAll("[data-event-id]")].find((item) => item.dataset.eventId === state.selectedId);
  row?.classList.add("selected");
}

function renderDetails(earthquake) {
  const color = depthColor(earthquake.depth);
  const category = depthCategory(earthquake.depth);
  const intensity = earthquake.mmi ?? earthquake.cdi;
  const intensityLabel = earthquake.mmi !== null ? "Instrumental MMI" : earthquake.cdi !== null ? "Community CDI" : "No intensity data";
  const alertFlag = earthquake.alert
    ? `<span class="detail-flag alert-${escapeHtml(earthquake.alert)}">${escapeHtml(earthquake.alert)} alert</span>`
    : "";

  els.detailContent.innerHTML = `
    <div class="detail-hero" style="--depth-color:${color}">
      <span class="detail-kicker">${category} ${escapeHtml(earthquake.type)} · ${escapeHtml(earthquake.status)}</span>
      <div class="detail-heading-row"><strong>${formatMagnitude(earthquake.magnitude)}</strong><span>${escapeHtml(earthquake.magnitudeType)}</span></div>
      <h2>${escapeHtml(earthquake.place)}</h2>
    </div>
    <div class="detail-body">
      <p class="detail-time">${formatFullDate(earthquake.time)}<br>${formatRelativeTime(earthquake.time)} · Updated ${formatRelativeTime(earthquake.updated)}</p>
      <div class="detail-grid">
        <div class="detail-metric"><span>Depth</span><strong>${formatDepth(earthquake.depth)}</strong><small>${category} focus</small></div>
        <div class="detail-metric"><span>Felt reports</span><strong>${earthquake.felt ? earthquake.felt.toLocaleString() : "—"}</strong><small>USGS community responses</small></div>
        <div class="detail-metric"><span>Significance</span><strong>${earthquake.significance.toLocaleString()}</strong><small>USGS impact score</small></div>
        <div class="detail-metric"><span>Intensity</span><strong>${intensity === null ? "—" : intensity.toFixed(1)}</strong><small>${intensityLabel}</small></div>
      </div>
      <div class="detail-section">
        <h3>Epicenter</h3>
        <div class="detail-coordinates"><span>${formatCoordinate(earthquake.latitude, "N", "S")}</span><span>${formatCoordinate(earthquake.longitude, "E", "W")}</span></div>
        <div class="detail-flags">
          <span class="detail-flag">${escapeHtml(earthquake.network.toUpperCase())} network</span>
          ${earthquake.tsunami ? '<span class="detail-flag alert-orange">Tsunami flag</span>' : ""}
          ${alertFlag}
          <span class="detail-flag">${escapeHtml(earthquake.status)}</span>
        </div>
      </div>
      <div class="detail-footer">
        <a class="usgs-link" href="${escapeAttribute(earthquake.url)}" target="_blank" rel="noreferrer">
          Open official USGS event
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M18 13v6H5V6h6"/></svg>
        </a>
        <button class="copy-coordinates icon-button" type="button" data-copy-coordinates title="Copy coordinates" aria-label="Copy earthquake coordinates">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="1"/><path d="M16 8V5H5v11h3"/></svg>
        </button>
      </div>
    </div>
  `;

  els.detailPanel.classList.add("open");
  els.detailPanel.setAttribute("aria-hidden", "false");
  els.detailPanel.querySelector("[data-copy-coordinates]").addEventListener("click", () => {
    copyCoordinates(earthquake);
  });
}

function closeDetails() {
  const previousId = state.selectedId;
  state.selectedId = null;
  updateMarkerSelection(previousId, false);
  updateSelectedListRow();
  els.detailPanel.classList.remove("open");
  els.detailPanel.setAttribute("aria-hidden", "true");
}

async function copyCoordinates(earthquake) {
  const value = `${earthquake.latitude.toFixed(4)}, ${earthquake.longitude.toFixed(4)}`;
  try {
    await navigator.clipboard.writeText(value);
    showToast("Coordinates copied");
  } catch {
    showToast(value);
  }
}

function frameFilteredEvents() {
  if (!map || !state.filtered.length) {
    showToast(state.filtered.length ? "Map is still loading" : "No events to frame");
    return;
  }

  if (state.filtered.length === 1) {
    map.flyTo([state.filtered[0].latitude, state.filtered[0].longitude], 7, { duration: 0.9 });
    return;
  }

  const bounds = L.latLngBounds(state.filtered.map((earthquake) => [earthquake.latitude, earthquake.longitude]));
  map.flyToBounds(bounds, { padding: [45, 45], maxZoom: 7, duration: 0.9 });
}

function resetFilters() {
  state.minMagnitude = 0;
  state.depth = "all";
  state.search = "";
  state.sort = "time";
  state.feltOnly = false;

  els.magnitude.value = "0";
  els.search.value = "";
  els.sort.value = "time";
  els.feltOnly.checked = false;
  setPressedButton(els.depthControl, els.depthControl.querySelector('[data-depth="all"]'));
  updateMagnitudeControl();
  applyFilters();
  showToast("Filters reset");
}

function setPressedButton(container, activeButton) {
  container.querySelectorAll("button").forEach((button) => {
    const active = button === activeButton;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function updateMagnitudeControl() {
  const value = state.minMagnitude;
  els.magnitudeOutput.textContent = value === 0 ? "All" : `M ${value.toFixed(1)}+`;
  els.magnitude.style.setProperty("--range-progress", `${(value / 7) * 100}%`);
}

function updateFeedStatus() {
  const generated = new Date(state.generatedAt);
  const time = generated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
  els.feedStatus.textContent = `${state.earthquakes.length.toLocaleString()} USGS events · Updated ${time}`;
}

function showDataError(error) {
  els.dataError.hidden = false;
  els.errorMessage.textContent = navigator.onLine
    ? `${error.message}. Check the live USGS service and try again.`
    : "You appear to be offline. Reconnect to load live USGS activity.";
  els.feedStatus.textContent = "Unable to reach the live USGS feed";
}

function scheduleRefresh() {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => loadEarthquakes(), 5 * 60 * 1000);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), 2400);
}

function markerRadius(magnitude) {
  return Math.max(3.5, Math.min(18, 3.5 + Math.max(0, magnitude) * 1.65));
}

function depthCategory(depth) {
  if (depth < 70) return "shallow";
  if (depth < 300) return "intermediate";
  return "deep";
}

function depthColor(depth) {
  const stops = [
    [0, "#f3e64f"],
    [70, "#ff9a3d"],
    [300, "#e65073"],
    [700, "#9c6cff"],
  ];
  const clamped = Math.max(0, Math.min(700, depth));

  for (let index = 0; index < stops.length - 1; index += 1) {
    const [startValue, startColor] = stops[index];
    const [endValue, endColor] = stops[index + 1];
    if (clamped <= endValue) {
      const amount = (clamped - startValue) / (endValue - startValue);
      return interpolateHex(startColor, endColor, amount);
    }
  }
  return stops.at(-1)[1];
}

function interpolateHex(start, end, amount) {
  const from = parseInt(start.slice(1), 16);
  const to = parseInt(end.slice(1), 16);
  const channels = [16, 8, 0].map((shift) => {
    const a = (from >> shift) & 255;
    const b = (to >> shift) & 255;
    return Math.round(a + (b - a) * amount);
  });
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function formatMagnitude(magnitude) {
  return Number(magnitude).toFixed(1);
}

function formatDepth(depth) {
  return `${depth < 10 ? depth.toFixed(1) : Math.round(depth).toLocaleString()} km`;
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return "Time unavailable";
  const elapsed = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatFullDate(timestamp) {
  if (!timestamp) return "Time unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "long",
  }).format(new Date(timestamp));
}

function formatCoordinate(value, positive, negative) {
  return `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positive : negative}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  const safeUrl = String(value || "");
  if (!safeUrl.startsWith("https://earthquake.usgs.gov/")) return "https://earthquake.usgs.gov/earthquakes/map/";
  return escapeHtml(safeUrl);
}
