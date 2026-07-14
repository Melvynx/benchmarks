import type { AlertLevel, FeedResult, Period, Quake } from "../types";

const FEED_BASE = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary";

export const FEED_URLS: Record<Period, string> = {
  hour: `${FEED_BASE}/all_hour.geojson`,
  day: `${FEED_BASE}/all_day.geojson`,
  week: `${FEED_BASE}/all_week.geojson`,
  month: `${FEED_BASE}/all_month.geojson`,
};

export const PERIOD_MS: Record<Period, number> = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

export const PERIOD_LABEL: Record<Period, string> = {
  hour: "Past hour",
  day: "Past 24 hours",
  week: "Past 7 days",
  month: "Past 30 days",
};

const ALERT_LEVELS = new Set(["green", "yellow", "orange", "red"]);

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseFeature(feature: any): Quake | null {
  if (!feature || typeof feature !== "object") return null;
  const props = feature.properties;
  const coords = feature.geometry?.coordinates;
  if (!props || !Array.isArray(coords) || coords.length < 2) return null;
  const lon = toNumber(coords[0]);
  const lat = toNumber(coords[1]);
  const time = toNumber(props.time);
  if (lon == null || lat == null || time == null || typeof feature.id !== "string") return null;

  const alertRaw = typeof props.alert === "string" ? props.alert.toLowerCase() : null;
  return {
    id: feature.id,
    mag: toNumber(props.mag),
    place: typeof props.place === "string" && props.place.trim() ? props.place.trim() : null,
    time,
    updated: toNumber(props.updated) ?? time,
    url: typeof props.url === "string" ? props.url : null,
    detail: typeof props.detail === "string" ? props.detail : null,
    felt: toNumber(props.felt),
    cdi: toNumber(props.cdi),
    mmi: toNumber(props.mmi),
    alert: alertRaw && ALERT_LEVELS.has(alertRaw) ? (alertRaw as AlertLevel) : null,
    status: typeof props.status === "string" ? props.status : null,
    tsunami: props.tsunami === 1,
    sig: toNumber(props.sig),
    type: typeof props.type === "string" ? props.type : "earthquake",
    title: typeof props.title === "string" ? props.title : "Seismic event",
    lon,
    lat,
    depth: toNumber(coords[2]),
  };
}

export async function fetchFeed(period: Period, signal?: AbortSignal): Promise<FeedResult> {
  const res = await fetch(FEED_URLS[period], { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`USGS feed responded with ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (!Array.isArray(data?.features)) throw new Error("USGS feed returned an unexpected shape");
  const quakes = (data.features as unknown[])
    .map(parseFeature)
    .filter((q): q is Quake => q !== null)
    .sort((a, b) => b.time - a.time);
  return {
    quakes,
    generated: toNumber(data.metadata?.generated),
    fetchedAt: Date.now(),
    title: typeof data.metadata?.title === "string" ? data.metadata.title : null,
  };
}

export type GeocodeHit = {
  id: string;
  label: string;
  lon: number;
  lat: number;
  bbox: [number, number, number, number] | null; // W, S, E, N
};

export async function geocode(query: string, signal?: AbortSignal): Promise<GeocodeHit[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("q", query);
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .map((hit: any, i: number): GeocodeHit | null => {
      const lon = Number(hit?.lon);
      const lat = Number(hit?.lat);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
      let bbox: GeocodeHit["bbox"] = null;
      if (Array.isArray(hit.boundingbox) && hit.boundingbox.length === 4) {
        const [s, n, w, e] = hit.boundingbox.map(Number);
        if ([s, n, w, e].every(Number.isFinite)) bbox = [w, s, e, n];
      }
      return {
        id: `${hit?.place_id ?? i}`,
        label: typeof hit?.display_name === "string" ? hit.display_name : `${lat}, ${lon}`,
        lon,
        lat,
        bbox,
      };
    })
    .filter((h): h is GeocodeHit => h !== null);
}
