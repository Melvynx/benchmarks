import type { AreaDefinition, EarthquakeFeature, Filters, Period, TimeWindow } from './types';

export const FEEDS: Record<Period, string> = {
  hour: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
  day: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  week: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
  month: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson',
};

export const PERIOD_LABELS: Record<Period, string> = {
  hour: 'Past hour', day: '24 hours', week: '7 days', month: '30 days',
};

export const AREAS: Record<string, AreaDefinition> = {
  global: { label: 'Worldwide' },
  americas: { label: 'Americas', bounds: [-170, -60, -30, 75] },
  europe: { label: 'Europe', bounds: [-25, 34, 45, 72] },
  africa: { label: 'Africa', bounds: [-20, -37, 55, 38] },
  asia: { label: 'Asia', bounds: [25, -10, 180, 80] },
  oceania: { label: 'Oceania', bounds: [105, -55, 180, 5] },
  arctic: { label: 'Arctic', bounds: [-180, 66, 180, 90] },
};

export const DEFAULT_FILTERS: Filters = {
  minMagnitude: 0,
  maxDepth: 700,
  alert: 'all',
  tsunami: 'all',
  status: 'all',
  area: 'global',
};

export function eventMatches(event: EarthquakeFeature, filters: Filters, timeWindow: TimeWindow | null, customBounds?: [number, number, number, number] | null) {
  const { mag, alert, tsunami, status, time } = event.properties;
  const [lng, lat, depth] = event.geometry.coordinates;
  const bounds = customBounds ?? AREAS[filters.area]?.bounds;
  return (mag ?? -10) >= filters.minMagnitude
    && depth <= filters.maxDepth
    && (filters.alert === 'all' || (filters.alert === 'issued' ? alert !== null : alert === filters.alert))
    && (filters.tsunami === 'all' || Boolean(tsunami) === (filters.tsunami === 'yes'))
    && (filters.status === 'all' || status === filters.status)
    && (!bounds || (lng >= bounds[0] && lat >= bounds[1] && lng <= bounds[2] && lat <= bounds[3]))
    && (!timeWindow || (time >= timeWindow.start && time < timeWindow.end));
}

export function magnitudeClass(mag: number | null) {
  if (mag === null) return 'unknown';
  if (mag >= 6) return 'major';
  if (mag >= 4.5) return 'strong';
  if (mag >= 2.5) return 'light';
  return 'minor';
}

export function magnitudeLabel(mag: number | null) {
  if (mag === null) return 'Magnitude pending';
  if (mag >= 7) return 'Major earthquake';
  if (mag >= 6) return 'Strong earthquake';
  if (mag >= 4.5) return 'Moderate earthquake';
  if (mag >= 2.5) return 'Light earthquake';
  return 'Minor earthquake';
}

export function formatMagnitude(mag: number | null) { return mag === null ? '—' : mag.toFixed(1); }
export function formatDepth(depth: number) { return `${depth < 10 ? depth.toFixed(1) : Math.round(depth)} km`; }
export function formatRelative(timestamp: number) {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function eventLocalTime(event: EarthquakeFeature) {
  const [, lng] = [event.geometry.coordinates[1], event.geometry.coordinates[0]];
  const approxOffset = Math.max(-12, Math.min(14, Math.round(lng / 15)));
  const shifted = new Date(event.properties.time + approxOffset * 3_600_000);
  return `${shifted.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' })} (approx. UTC${approxOffset >= 0 ? '+' : ''}${approxOffset})`;
}

export function exactUtcTime(timestamp: number) {
  return new Date(timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'long', timeZone: 'UTC' });
}
