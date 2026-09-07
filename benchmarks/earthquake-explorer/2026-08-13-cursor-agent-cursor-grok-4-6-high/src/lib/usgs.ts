import type { FeedMeta, Quake, WindowId } from "./types";

export const FEEDS: Record<WindowId, { url: string; label: string; durationMs: number }> = {
  hour: {
    url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson",
    label: "Past hour",
    durationMs: 60 * 60 * 1000,
  },
  day: {
    url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
    label: "Past day",
    durationMs: 24 * 60 * 60 * 1000,
  },
  week: {
    url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
    label: "Past week",
    durationMs: 7 * 24 * 60 * 60 * 1000,
  },
  month: {
    url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson",
    label: "Past month",
    durationMs: 30 * 24 * 60 * 60 * 1000,
  },
};

type UsgsFeature = {
  id?: string;
  properties?: {
    mag?: number | null;
    place?: string | null;
    time?: number | null;
    updated?: number | null;
    url?: string | null;
    felt?: number | null;
    cdi?: number | null;
    mmi?: number | null;
    alert?: string | null;
    status?: string | null;
    tsunami?: number | null;
    sig?: number | null;
    magType?: string | null;
    type?: string | null;
    net?: string | null;
    code?: string | null;
  };
  geometry?: {
    coordinates?: unknown;
  };
};

type UsgsCollection = {
  metadata?: {
    generated?: number;
    title?: string;
    count?: number;
    url?: string;
  };
  features?: UsgsFeature[];
};

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseQuake(feature: UsgsFeature): Quake | null {
  const coords = feature.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lon = asNumber(coords[0]);
  const lat = asNumber(coords[1]);
  if (lon === null || lat === null) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  const props = feature.properties ?? {};
  const id = feature.id || `${props.net ?? "unk"}-${props.code ?? "0"}-${props.time ?? 0}`;
  const time = asNumber(props.time);
  if (time === null) return null;

  return {
    id,
    mag: asNumber(props.mag),
    place: (props.place ?? "Unknown location").trim() || "Unknown location",
    time,
    updated: asNumber(props.updated) ?? time,
    url: props.url ?? `https://earthquake.usgs.gov/earthquakes/eventpage/${id}`,
    felt: asNumber(props.felt),
    cdi: asNumber(props.cdi),
    mmi: asNumber(props.mmi),
    alert: props.alert ?? null,
    status: props.status ?? "unknown",
    tsunami: props.tsunami === 1,
    sig: asNumber(props.sig) ?? 0,
    magType: props.magType ?? "m",
    type: props.type ?? "earthquake",
    lon,
    lat,
    depth: asNumber(coords[2]),
    net: props.net ?? "",
    code: props.code ?? "",
  };
}

export function parseFeed(payload: UsgsCollection): { meta: FeedMeta; quakes: Quake[] } {
  const quakes: Quake[] = [];
  const seen = new Set<string>();
  for (const feature of payload.features ?? []) {
    const quake = parseQuake(feature);
    if (!quake || seen.has(quake.id)) continue;
    seen.add(quake.id);
    quakes.push(quake);
  }
  quakes.sort((a, b) => b.time - a.time);
  return {
    meta: {
      generated: payload.metadata?.generated ?? Date.now(),
      title: payload.metadata?.title ?? "USGS Earthquakes",
      count: payload.metadata?.count ?? quakes.length,
      url: payload.metadata?.url ?? "",
    },
    quakes,
  };
}

export async function fetchFeed(windowId: WindowId, signal?: AbortSignal) {
  const res = await fetch(FEEDS[windowId].url, { signal });
  if (!res.ok) {
    throw new Error(`USGS feed failed (${res.status})`);
  }
  const json = (await res.json()) as UsgsCollection;
  return parseFeed(json);
}
