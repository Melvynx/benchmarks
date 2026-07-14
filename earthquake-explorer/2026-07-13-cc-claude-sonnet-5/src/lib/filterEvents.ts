import { haversineKm } from "./format";
import type { AppFilters } from "./urlState";
import type { EarthquakeEvent } from "../types/earthquake";

export function applyFilters(events: EarthquakeEvent[], filters: AppFilters): EarthquakeEvent[] {
  let result = events;

  if (filters.minMag > -2) {
    result = result.filter((e) => (e.magnitude ?? -Infinity) >= filters.minMag);
  }
  if (filters.maxDepth !== null) {
    const cap = filters.maxDepth;
    result = result.filter((e) => (e.depthKm ?? 0) <= cap);
  }
  if (filters.alerts.length > 0) {
    result = result.filter((e) => e.alert !== null && filters.alerts.includes(e.alert));
  }
  if (filters.tsunamiOnly) {
    result = result.filter((e) => e.tsunami);
  }
  if (filters.reviewed) {
    result = result.filter((e) => e.status === "reviewed");
  }
  if (filters.place) {
    const { lat, lon, radiusKm } = filters.place;
    result = result.filter((e) => haversineKm(lat, lon, e.latitude, e.longitude) <= radiusKm);
  }

  return sortEvents(result, filters.sort);
}

export function sortEvents(events: EarthquakeEvent[], sort: AppFilters["sort"]): EarthquakeEvent[] {
  const copy = [...events];
  switch (sort) {
    case "time-asc":
      return copy.sort((a, b) => a.timeMs - b.timeMs);
    case "mag-desc":
      return copy.sort((a, b) => (b.magnitude ?? -Infinity) - (a.magnitude ?? -Infinity));
    case "sig-desc":
      return copy.sort((a, b) => (b.significance ?? -Infinity) - (a.significance ?? -Infinity));
    case "time-desc":
    default:
      return copy.sort((a, b) => b.timeMs - a.timeMs);
  }
}
