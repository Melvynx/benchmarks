import type { Bounds, Filters, Quake, SortKey } from "./types";

export const DEFAULT_FILTERS: Filters = {
  minMag: 0,
  depth: "all",
  query: "",
  feltOnly: false,
  tsunamiOnly: false,
  viewportOnly: false,
  timeFrom: null,
  timeTo: null,
};

export function inBounds(quake: Quake, bounds: Bounds): boolean {
  const { lat, lon } = quake;
  if (bounds.west <= bounds.east) {
    return lon >= bounds.west && lon <= bounds.east && lat >= bounds.south && lat <= bounds.north;
  }
  return (lon >= bounds.west || lon <= bounds.east) && lat >= bounds.south && lat <= bounds.north;
}

function depthBand(depth: number | null): Filters["depth"] {
  if (depth === null) return "all";
  if (depth < 70) return "shallow";
  if (depth < 300) return "intermediate";
  return "deep";
}

export function applyFilters(quakes: Quake[], filters: Filters, bounds: Bounds | null): Quake[] {
  const q = filters.query.trim().toLowerCase();
  return quakes.filter((quake) => {
    if (quake.mag !== null && quake.mag < filters.minMag) return false;
    if (quake.mag === null && filters.minMag > 0) return false;
    if (filters.depth !== "all" && depthBand(quake.depth) !== filters.depth) return false;
    if (filters.feltOnly && !(quake.felt && quake.felt > 0)) return false;
    if (filters.tsunamiOnly && !quake.tsunami) return false;
    if (filters.timeFrom !== null && quake.time < filters.timeFrom) return false;
    if (filters.timeTo !== null && quake.time > filters.timeTo) return false;
    if (q && !quake.place.toLowerCase().includes(q) && !quake.id.toLowerCase().includes(q)) {
      return false;
    }
    if (filters.viewportOnly && bounds && !inBounds(quake, bounds)) return false;
    return true;
  });
}

export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const h =
    s1 * s1 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function sortQuakes(
  quakes: Quake[],
  sort: SortKey,
  origin: { lat: number; lon: number } | null = null,
): Quake[] {
  const copy = quakes.slice();
  switch (sort) {
    case "strongest":
      copy.sort((a, b) => (b.mag ?? -Infinity) - (a.mag ?? -Infinity) || b.time - a.time);
      break;
    case "felt":
      copy.sort((a, b) => (b.felt ?? 0) - (a.felt ?? 0) || (b.mag ?? 0) - (a.mag ?? 0));
      break;
    case "nearest":
      if (origin) {
        copy.sort(
          (a, b) =>
            haversineKm(origin.lat, origin.lon, a.lat, a.lon) -
            haversineKm(origin.lat, origin.lon, b.lat, b.lon),
        );
      } else {
        copy.sort((a, b) => b.time - a.time);
      }
      break;
    default:
      copy.sort((a, b) => b.time - a.time);
  }
  return copy;
}

export function summarize(quakes: Quake[]) {
  let strongest: Quake | null = null;
  let felt = 0;
  let tsunami = 0;
  let magSum = 0;
  let magCount = 0;
  for (const quake of quakes) {
    if (quake.mag !== null) {
      magSum += quake.mag;
      magCount += 1;
      if (!strongest || quake.mag > (strongest.mag ?? -Infinity)) strongest = quake;
    }
    if (quake.felt && quake.felt > 0) felt += 1;
    if (quake.tsunami) tsunami += 1;
  }
  return {
    count: quakes.length,
    strongest,
    felt,
    tsunami,
    meanMag: magCount ? magSum / magCount : null,
  };
}

export function activeFilterCount(filters: Filters): number {
  let n = 0;
  if (filters.minMag > 0) n += 1;
  if (filters.depth !== "all") n += 1;
  if (filters.query.trim()) n += 1;
  if (filters.feltOnly) n += 1;
  if (filters.tsunamiOnly) n += 1;
  if (filters.viewportOnly) n += 1;
  if (filters.timeFrom !== null || filters.timeTo !== null) n += 1;
  return n;
}
