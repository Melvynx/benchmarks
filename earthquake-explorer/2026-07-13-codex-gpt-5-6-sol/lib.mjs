export const FEEDS = {
  hour: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
  day: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  week: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
  month: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson'
};

export const PERIOD_LABELS = { hour: 'past hour', day: 'past 24 hours', week: 'past 7 days', month: 'past 30 days' };

export function normalizeFeature(feature) {
  const p = feature?.properties || {};
  const c = feature?.geometry?.coordinates || [];
  return {
    id: String(feature?.id || ''),
    magnitude: Number.isFinite(p.mag) ? p.mag : null,
    place: p.place || 'Location not reported',
    time: Number.isFinite(p.time) ? p.time : null,
    updated: Number.isFinite(p.updated) ? p.updated : null,
    longitude: Number.isFinite(c[0]) ? c[0] : null,
    latitude: Number.isFinite(c[1]) ? c[1] : null,
    depth: Number.isFinite(c[2]) ? c[2] : null,
    felt: Number.isFinite(p.felt) ? p.felt : null,
    significance: Number.isFinite(p.sig) ? p.sig : null,
    alert: ['green', 'yellow', 'orange', 'red'].includes(p.alert) ? p.alert : null,
    tsunami: p.tsunami === 1,
    status: p.status || null,
    type: p.type || 'earthquake',
    title: p.title || p.place || 'Earthquake',
    url: typeof p.url === 'string' && p.url.startsWith('https://earthquake.usgs.gov/') ? p.url : null,
    detail: typeof p.detail === 'string' ? p.detail : null
  };
}

export function normalizeCollection(payload) {
  if (!payload || !Array.isArray(payload.features)) throw new Error('USGS returned an unexpected response.');
  return payload.features.map(normalizeFeature).filter((event) => event.id && event.time && event.latitude !== null && event.longitude !== null);
}

export function filterEvents(events, filters, brushedRange = null) {
  const query = filters.search.trim().toLocaleLowerCase();
  return events.filter((event) => {
    if (event.magnitude !== null && event.magnitude < filters.magnitude) return false;
    if (event.magnitude === null && filters.magnitude > 0) return false;
    if (filters.depth === 'shallow' && (event.depth === null || event.depth >= 70)) return false;
    if (filters.depth === 'intermediate' && (event.depth === null || event.depth < 70 || event.depth > 300)) return false;
    if (filters.depth === 'deep' && (event.depth === null || event.depth <= 300)) return false;
    if (filters.alert === 'none' && event.alert !== null) return false;
    if (!['all', 'none'].includes(filters.alert) && event.alert !== filters.alert) return false;
    if (filters.review === 'reviewed' && event.status !== 'reviewed') return false;
    if (filters.review === 'automatic' && event.status !== 'automatic') return false;
    if (filters.tsunami && !event.tsunami) return false;
    if (query && !`${event.place} ${event.title}`.toLocaleLowerCase().includes(query)) return false;
    if (brushedRange && (event.time < brushedRange[0] || event.time > brushedRange[1])) return false;
    return true;
  });
}

export function sortEvents(events, sort) {
  const copy = [...events];
  const value = (number) => number ?? -Infinity;
  if (sort === 'newest') return copy.sort((a, b) => value(b.time) - value(a.time));
  if (sort === 'magnitude') return copy.sort((a, b) => value(b.magnitude) - value(a.magnitude) || value(b.significance) - value(a.significance));
  if (sort === 'depth') return copy.sort((a, b) => value(b.depth) - value(a.depth));
  return copy.sort((a, b) => value(b.significance) - value(a.significance) || value(b.magnitude) - value(a.magnitude));
}

export function buildBins(events, start, end, count = 48) {
  const span = Math.max(1, end - start);
  const width = span / count;
  const bins = Array.from({ length: count }, (_, index) => ({ start: start + index * width, end: start + (index + 1) * width, count: 0, maxMagnitude: null, events: [] }));
  for (const event of events) {
    if (!event.time || event.time < start || event.time > end) continue;
    const index = Math.min(count - 1, Math.max(0, Math.floor((event.time - start) / width)));
    bins[index].events.push(event);
    bins[index].count += 1;
    if (event.magnitude !== null && (bins[index].maxMagnitude === null || event.magnitude > bins[index].maxMagnitude)) bins[index].maxMagnitude = event.magnitude;
  }
  return bins;
}

export function project(longitude, latitude) {
  return { x: ((longitude + 180) / 360) * 1000, y: ((90 - latitude) / 180) * 500 };
}

export function classifyMagnitude(magnitude) {
  if (magnitude === null) return { label: 'Unknown magnitude', level: 'unknown' };
  if (magnitude >= 7) return { label: 'Major earthquake', level: 'major' };
  if (magnitude >= 6) return { label: 'Strong earthquake', level: 'strong' };
  if (magnitude >= 5) return { label: 'Moderate earthquake', level: 'moderate' };
  if (magnitude >= 3) return { label: 'Light earthquake', level: 'light' };
  return { label: 'Minor earthquake', level: 'minor' };
}

export function formatMagnitude(value) { return value === null ? '—' : value.toFixed(1); }
export function formatDepth(value) { return value === null ? 'Not reported' : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`; }
export function formatCount(value) { return value.toLocaleString(); }

export function relativeTime(timestamp, now = Date.now()) {
  if (!timestamp) return 'Time not reported';
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function periodStart(period, now = Date.now()) {
  return now - ({ hour: 36e5, day: 864e5, week: 6048e5, month: 2592e6 }[period] || 6048e5);
}
