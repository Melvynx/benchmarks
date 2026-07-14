import type {
  EarthquakeEvent,
  TimeRangeKey,
  TimeRangeOption,
  UsgsFeedCollection,
} from "../types/earthquake";

export const TIME_RANGES: TimeRangeOption[] = [
  {
    key: "hour",
    label: "Past hour",
    shortLabel: "1h",
    feedUrl: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson",
    description: "Every located event in the last 60 minutes.",
  },
  {
    key: "day",
    label: "Past day",
    shortLabel: "24h",
    feedUrl: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
    description: "Every located event in the last 24 hours.",
  },
  {
    key: "week",
    label: "Past 7 days",
    shortLabel: "7d",
    feedUrl: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
    description: "Every located event in the last 7 days.",
  },
  {
    key: "month",
    label: "Past 30 days",
    shortLabel: "30d",
    feedUrl: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson",
    description: "Every located event in the last 30 days.",
  },
];

export function getTimeRange(key: TimeRangeKey): TimeRangeOption {
  return TIME_RANGES.find((r) => r.key === key) ?? TIME_RANGES[2];
}

export class UsgsFetchError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "UsgsFetchError";
    this.cause = cause;
  }
}

export async function fetchEarthquakeFeed(
  url: string,
  signal?: AbortSignal,
): Promise<{ events: EarthquakeEvent[]; generatedMs: number; title: string }> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new UsgsFetchError("Could not reach the USGS earthquake feed. Check your connection.", err);
  }

  if (!response.ok) {
    throw new UsgsFetchError(`USGS feed responded with ${response.status} ${response.statusText}.`);
  }

  let data: UsgsFeedCollection;
  try {
    data = await response.json();
  } catch (err) {
    throw new UsgsFetchError("USGS feed returned a response that could not be parsed.", err);
  }

  const events = data.features
    .filter((f) => f.geometry && Array.isArray(f.geometry.coordinates))
    .map(normalizeFeature);

  return {
    events,
    generatedMs: data.metadata?.generated ?? Date.now(),
    title: data.metadata?.title ?? "USGS Earthquakes",
  };
}

function normalizeFeature(feature: UsgsFeedCollection["features"][number]): EarthquakeEvent {
  const [longitude, latitude, depthKm] = feature.geometry.coordinates;
  const p = feature.properties;
  return {
    id: feature.id,
    magnitude: typeof p.mag === "number" ? p.mag : null,
    magType: p.magType ?? null,
    place: p.place ?? "Unknown location",
    title: p.title ?? p.place ?? "Unknown event",
    timeMs: p.time,
    updatedMs: p.updated,
    longitude,
    latitude,
    depthKm: typeof depthKm === "number" ? depthKm : null,
    alert: p.alert ?? null,
    status: p.status ?? "automatic",
    tsunami: p.tsunami === 1,
    significance: typeof p.sig === "number" ? p.sig : null,
    felt: typeof p.felt === "number" ? p.felt : null,
    cdi: typeof p.cdi === "number" ? p.cdi : null,
    mmi: typeof p.mmi === "number" ? p.mmi : null,
    type: p.type ?? "earthquake",
    url: p.url,
    detailUrl: p.detail,
    gap: typeof p.gap === "number" ? p.gap : null,
    nst: typeof p.nst === "number" ? p.nst : null,
    dmin: typeof p.dmin === "number" ? p.dmin : null,
    rms: typeof p.rms === "number" ? p.rms : null,
  };
}
