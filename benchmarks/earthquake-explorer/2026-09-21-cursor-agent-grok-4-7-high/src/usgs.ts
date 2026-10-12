import type { AlertLevel, FeedMeta, Quake, WindowId } from './types';

const FEEDS: Record<WindowId, string> = {
  hour: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
  day: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  week: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
  month: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson',
};

const ALERTS = new Set<AlertLevel>(['green', 'yellow', 'orange', 'red']);

export type FeedResult = {
  quakes: Quake[];
  meta: FeedMeta;
};

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseAlert(value: unknown): AlertLevel | null {
  return typeof value === 'string' && ALERTS.has(value as AlertLevel) ? (value as AlertLevel) : null;
}

function parseFeature(feature: unknown): Quake | null {
  if (!feature || typeof feature !== 'object') return null;
  const record = feature as {
    id?: unknown;
    properties?: Record<string, unknown>;
    geometry?: { type?: unknown; coordinates?: unknown };
  };
  const properties = record.properties;
  const coordinates = record.geometry?.coordinates;
  if (!properties || !Array.isArray(coordinates) || coordinates.length < 2) return null;
  const mag = num(properties.mag);
  const lon = num(coordinates[0]);
  const lat = num(coordinates[1]);
  const time = num(properties.time);
  if (mag === null || lon === null || lat === null || time === null) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  const id = typeof record.id === 'string' ? record.id : typeof properties.code === 'string' ? properties.code : '';
  if (!id) return null;
  const place = typeof properties.place === 'string' && properties.place.trim() ? properties.place.trim() : 'Unknown place';
  return {
    id,
    mag,
    place,
    time,
    updated: num(properties.updated) ?? time,
    url: typeof properties.url === 'string' ? properties.url : `https://earthquake.usgs.gov/earthquakes/eventpage/${id}`,
    felt: num(properties.felt),
    cdi: num(properties.cdi),
    mmi: num(properties.mmi),
    alert: parseAlert(properties.alert),
    status: typeof properties.status === 'string' ? properties.status : 'unknown',
    tsunami: properties.tsunami === 1,
    sig: num(properties.sig) ?? 0,
    magType: typeof properties.magType === 'string' ? properties.magType : 'mag',
    type: typeof properties.type === 'string' ? properties.type : 'earthquake',
    nst: num(properties.nst),
    rms: num(properties.rms),
    gap: num(properties.gap),
    dmin: num(properties.dmin),
    lon,
    lat,
    depth: num(coordinates[2]) ?? 0,
  };
}

export function parseFeed(payload: unknown): FeedResult {
  if (!payload || typeof payload !== 'object') throw new Error('USGS returned an unreadable feed.');
  const root = payload as { metadata?: Record<string, unknown>; features?: unknown[] };
  const features = Array.isArray(root.features) ? root.features : [];
  const quakes: Quake[] = [];
  for (const feature of features) {
    const quake = parseFeature(feature);
    if (quake) quakes.push(quake);
  }
  const metadata = root.metadata ?? {};
  return {
    quakes,
    meta: {
      generated: num(metadata.generated) ?? Date.now(),
      title: typeof metadata.title === 'string' ? metadata.title : 'USGS earthquakes',
      count: num(metadata.count) ?? quakes.length,
    },
  };
}

export async function loadFeed(windowId: WindowId, signal: AbortSignal): Promise<FeedResult> {
  const response = await fetch(FEEDS[windowId], {
    signal,
    cache: 'no-store',
    headers: { Accept: 'application/geojson, application/json' },
  });
  if (!response.ok) throw new Error(`USGS feed failed (${response.status}).`);
  return parseFeed(await response.json());
}
