const USGS_BASE = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary";

export const TIMEFRAMES = {
  hour: { label: "Past hour", feed: `${USGS_BASE}/all_hour.geojson`, durationMs: 60 * 60 * 1000 },
  day: { label: "Past 24 hours", feed: `${USGS_BASE}/all_day.geojson`, durationMs: 24 * 60 * 60 * 1000 },
  week: { label: "Past 7 days", feed: `${USGS_BASE}/all_week.geojson`, durationMs: 7 * 24 * 60 * 60 * 1000 },
  month: { label: "Past 30 days", feed: `${USGS_BASE}/all_month.geojson`, durationMs: 30 * 24 * 60 * 60 * 1000 }
};

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

function normalizeFeature(feature) {
  const coordinates = feature?.geometry?.coordinates;
  const properties = feature?.properties || {};
  const id = String(feature?.id || "").trim();

  if (
    feature?.geometry?.type !== "Point" ||
    !Array.isArray(coordinates) ||
    !id ||
    !isFiniteNumber(coordinates[0]) ||
    !isFiniteNumber(coordinates[1]) ||
    coordinates[0] < -180 ||
    coordinates[0] > 180 ||
    coordinates[1] < -90 ||
    coordinates[1] > 90
  ) {
    return null;
  }

  if (properties.type && properties.type !== "earthquake") return null;

  return {
    id,
    longitude: coordinates[0],
    latitude: coordinates[1],
    depth: isFiniteNumber(coordinates[2]) ? coordinates[2] : null,
    magnitude: isFiniteNumber(properties.mag) ? properties.mag : null,
    place: typeof properties.place === "string" && properties.place.trim() ? properties.place.trim() : "Location not reported",
    time: isFiniteNumber(properties.time) ? properties.time : null,
    updated: isFiniteNumber(properties.updated) ? properties.updated : null,
    felt: isFiniteNumber(properties.felt) ? properties.felt : null,
    cdi: isFiniteNumber(properties.cdi) ? properties.cdi : null,
    mmi: isFiniteNumber(properties.mmi) ? properties.mmi : null,
    alert: typeof properties.alert === "string" ? properties.alert : null,
    status: typeof properties.status === "string" ? properties.status : null,
    tsunami: properties.tsunami === 1,
    significance: isFiniteNumber(properties.sig) ? properties.sig : null,
    network: typeof properties.net === "string" ? properties.net.toUpperCase() : null,
    magnitudeType: typeof properties.magType === "string" ? properties.magType : null,
    type: properties.type || "earthquake",
    url: typeof properties.url === "string" ? properties.url : null
  };
}

export function normalizeFeed(payload) {
  if (!payload || payload.type !== "FeatureCollection" || !Array.isArray(payload.features)) {
    throw new Error("USGS returned an unexpected data format.");
  }

  const deduplicated = new Map();
  for (const feature of payload.features) {
    const event = normalizeFeature(feature);
    if (!event) continue;
    const existing = deduplicated.get(event.id);
    if (!existing || (event.updated || 0) >= (existing.updated || 0)) deduplicated.set(event.id, event);
  }

  return {
    events: [...deduplicated.values()].sort((a, b) => (b.time || 0) - (a.time || 0)),
    generated: isFiniteNumber(payload.metadata?.generated) ? payload.metadata.generated : Date.now(),
    title: typeof payload.metadata?.title === "string" ? payload.metadata.title : "USGS earthquake feed"
  };
}

async function requestGeoJSON(url, signal) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/geo+json, application/json" },
    signal
  });
  if (!response.ok) throw new Error(`USGS request failed with status ${response.status}.`);
  return normalizeFeed(await response.json());
}

function queryFallbackUrl(timeframe) {
  const config = TIMEFRAMES[timeframe] || TIMEFRAMES.day;
  const end = new Date();
  const start = new Date(end.getTime() - config.durationMs);
  const query = new URLSearchParams({
    format: "geojson",
    eventtype: "earthquake",
    starttime: start.toISOString(),
    endtime: end.toISOString(),
    orderby: "time",
    limit: "20000"
  });
  return `https://earthquake.usgs.gov/fdsnws/event/1/query?${query}`;
}

export async function fetchEarthquakes(timeframe, signal) {
  const config = TIMEFRAMES[timeframe] || TIMEFRAMES.day;
  try {
    const result = await requestGeoJSON(config.feed, signal);
    return { ...result, source: "realtime-feed" };
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    const result = await requestGeoJSON(queryFallbackUrl(timeframe), signal);
    return { ...result, source: "query-fallback" };
  }
}

export function toGeoJSON(events) {
  return {
    type: "FeatureCollection",
    features: events.map((event) => ({
      type: "Feature",
      id: event.id,
      geometry: {
        type: "Point",
        coordinates: [event.longitude, event.latitude]
      },
      properties: {
        id: event.id,
        magnitude: event.magnitude
      }
    }))
  };
}

function isWithinBounds(event, bounds) {
  if (!bounds) return true;
  const latitudeMatches = event.latitude >= bounds.south && event.latitude <= bounds.north;
  if (!latitudeMatches) return false;

  const normalize = (longitude) => ((longitude + 180) % 360 + 360) % 360 - 180;
  const west = normalize(bounds.west);
  const east = normalize(bounds.east);
  const longitude = normalize(event.longitude);
  return west <= east ? longitude >= west && longitude <= east : longitude >= west || longitude <= east;
}

export function filterAndSortEvents(events, filters, bounds) {
  const search = filters.search.trim().toLocaleLowerCase();
  const matches = events.filter((event) => {
    if (filters.minMagnitude > -1 && (event.magnitude === null || event.magnitude < filters.minMagnitude)) return false;
    if (search && !event.place.toLocaleLowerCase().includes(search)) return false;
    if (filters.mapOnly && !isWithinBounds(event, bounds)) return false;

    if (filters.depth !== "all") {
      if (event.depth === null) return false;
      if (filters.depth === "shallow" && event.depth >= 70) return false;
      if (filters.depth === "intermediate" && (event.depth < 70 || event.depth > 300)) return false;
      if (filters.depth === "deep" && event.depth <= 300) return false;
    }

    return true;
  });

  return matches.sort((a, b) => {
    if (filters.sort === "strongest") return (b.magnitude ?? -Infinity) - (a.magnitude ?? -Infinity) || (b.time || 0) - (a.time || 0);
    if (filters.sort === "shallowest") return (a.depth ?? Infinity) - (b.depth ?? Infinity) || (b.time || 0) - (a.time || 0);
    return (b.time || 0) - (a.time || 0);
  });
}

export function magnitudeBand(magnitude) {
  if (magnitude === null || !Number.isFinite(magnitude)) return "unknown";
  if (magnitude < 2) return "micro";
  if (magnitude < 3) return "light";
  if (magnitude < 4.5) return "moderate";
  if (magnitude < 6) return "strong";
  return "major";
}

export function formatMagnitude(magnitude) {
  return magnitude === null || !Number.isFinite(magnitude) ? "N/A" : magnitude.toFixed(1);
}

export function formatDepth(depth) {
  return depth === null || !Number.isFinite(depth) ? "Unknown" : `${depth.toFixed(depth >= 100 ? 0 : 1)} km`;
}

export function formatCoordinate(value, positive, negative) {
  const direction = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(3)}° ${direction}`;
}

export function formatAbsoluteTime(timestamp) {
  if (!timestamp) return "Time unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium"
  }).format(new Date(timestamp));
}

export function formatUtcTime(timestamp) {
  if (!timestamp) return "Time unavailable";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short"
  }).format(new Date(timestamp));
}

export function timeAgo(timestamp, now = Date.now()) {
  if (!timestamp) return "time unknown";
  const deltaSeconds = Math.round((timestamp - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto", style: "short" });
  if (Math.abs(deltaSeconds) < 60) return formatter.format(deltaSeconds, "second");
  const deltaMinutes = Math.round(deltaSeconds / 60);
  if (Math.abs(deltaMinutes) < 60) return formatter.format(deltaMinutes, "minute");
  const deltaHours = Math.round(deltaMinutes / 60);
  if (Math.abs(deltaHours) < 48) return formatter.format(deltaHours, "hour");
  return formatter.format(Math.round(deltaHours / 24), "day");
}
