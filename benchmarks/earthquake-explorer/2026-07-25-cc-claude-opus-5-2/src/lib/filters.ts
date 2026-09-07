import type { Bounds } from "./geo";
import { withinBounds } from "./geo";
import type { Quake } from "./usgs";

export const MAG_RANGE: [number, number] = [-1, 10];
export const DEPTH_RANGE: [number, number] = [0, 700];

export type SortKey = "recent" | "magnitude" | "shallow" | "deep" | "felt" | "significance";

export interface SortOption {
  id: SortKey;
  label: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { id: "recent", label: "Most recent" },
  { id: "magnitude", label: "Strongest" },
  { id: "significance", label: "Most significant" },
  { id: "felt", label: "Most reported" },
  { id: "shallow", label: "Shallowest" },
  { id: "deep", label: "Deepest" },
];

export interface Filters {
  minMag: number;
  maxMag: number;
  minDepth: number;
  maxDepth: number;
  /** Inclusive origin-time window, ms since epoch. Null = the whole feed. */
  timeFrom: number | null;
  timeTo: number | null;
  search: string;
  /** USGS significance ≥ 600, the threshold for their "significant" feed. */
  significantOnly: boolean;
  /** At least one "Did you feel it?" response. */
  feltOnly: boolean;
  tsunamiOnly: boolean;
  /** Exclude quarry blasts, explosions, and other non-tectonic events. */
  tectonicOnly: boolean;
  /** Restrict the list to what is currently on screen. */
  viewportOnly: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  minMag: MAG_RANGE[0],
  maxMag: MAG_RANGE[1],
  minDepth: DEPTH_RANGE[0],
  maxDepth: DEPTH_RANGE[1],
  timeFrom: null,
  timeTo: null,
  search: "",
  significantOnly: false,
  feltOnly: false,
  tsunamiOnly: false,
  tectonicOnly: false,
  viewportOnly: false,
};

export const SIGNIFICANT_THRESHOLD = 600;

/** True when the user has narrowed anything away from the defaults. */
export function activeFilterCount(filters: Filters): number {
  let count = 0;
  if (filters.minMag > MAG_RANGE[0] || filters.maxMag < MAG_RANGE[1]) count += 1;
  if (filters.minDepth > DEPTH_RANGE[0] || filters.maxDepth < DEPTH_RANGE[1]) count += 1;
  if (filters.timeFrom !== null || filters.timeTo !== null) count += 1;
  if (filters.search.trim() !== "") count += 1;
  if (filters.significantOnly) count += 1;
  if (filters.feltOnly) count += 1;
  if (filters.tsunamiOnly) count += 1;
  if (filters.tectonicOnly) count += 1;
  if (filters.viewportOnly) count += 1;
  return count;
}

function matchesSearch(quake: Quake, needle: string): boolean {
  if (needle === "") return true;
  return (
    quake.place.toLowerCase().includes(needle) ||
    quake.title.toLowerCase().includes(needle) ||
    quake.id.toLowerCase().includes(needle)
  );
}

/**
 * Apply every filter except the viewport one, which needs live map bounds and
 * is therefore applied separately so that panning does not force a re-filter
 * of the whole feed.
 */
export function applyFilters(quakes: Quake[], filters: Filters, bounds?: Bounds | null): Quake[] {
  const needle = filters.search.trim().toLowerCase();
  const result: Quake[] = [];

  for (const quake of quakes) {
    // A slider parked at its extreme means "no bound". USGS reports magnitudes
    // below M-1 and depths above sea level, and dropping those while the panel
    // says nothing is filtered would leave the "N of M events match" read-out
    // unexplainable.
    if (filters.minMag > MAG_RANGE[0] && quake.mag < filters.minMag) continue;
    if (filters.maxMag < MAG_RANGE[1] && quake.mag > filters.maxMag) continue;
    if (filters.minDepth > DEPTH_RANGE[0] && quake.depth < filters.minDepth) continue;
    if (filters.maxDepth < DEPTH_RANGE[1] && quake.depth > filters.maxDepth) continue;
    if (filters.timeFrom !== null && quake.time < filters.timeFrom) continue;
    if (filters.timeTo !== null && quake.time > filters.timeTo) continue;
    if (filters.significantOnly && quake.sig < SIGNIFICANT_THRESHOLD) continue;
    if (filters.feltOnly && (quake.felt ?? 0) <= 0) continue;
    if (filters.tsunamiOnly && !quake.tsunami) continue;
    if (filters.tectonicOnly && quake.type !== "earthquake") continue;
    if (!matchesSearch(quake, needle)) continue;
    if (filters.viewportOnly && bounds && !withinBounds(quake.lat, quake.lon, bounds)) continue;
    result.push(quake);
  }

  return result;
}

export function sortQuakes(quakes: Quake[], key: SortKey): Quake[] {
  const sorted = quakes.slice();
  switch (key) {
    case "magnitude":
      sorted.sort((a, b) => b.mag - a.mag || b.time - a.time);
      break;
    case "significance":
      sorted.sort((a, b) => b.sig - a.sig || b.time - a.time);
      break;
    case "felt":
      sorted.sort((a, b) => (b.felt ?? 0) - (a.felt ?? 0) || b.mag - a.mag);
      break;
    case "shallow":
      sorted.sort((a, b) => a.depth - b.depth || b.mag - a.mag);
      break;
    case "deep":
      sorted.sort((a, b) => b.depth - a.depth || b.mag - a.mag);
      break;
    case "recent":
    default:
      sorted.sort((a, b) => b.time - a.time);
      break;
  }
  return sorted;
}

export interface Stats {
  count: number;
  strongest: Quake | null;
  latest: Quake | null;
  deepest: Quake | null;
  feltCount: number;
  tsunamiCount: number;
  significantCount: number;
  medianDepth: number;
  /** Total radiated energy expressed as an equivalent single magnitude. */
  equivalentMagnitude: number | null;
}

export function summarize(quakes: Quake[]): Stats {
  if (quakes.length === 0) {
    return {
      count: 0,
      strongest: null,
      latest: null,
      deepest: null,
      feltCount: 0,
      tsunamiCount: 0,
      significantCount: 0,
      medianDepth: 0,
      equivalentMagnitude: null,
    };
  }

  let strongest = quakes[0];
  let latest = quakes[0];
  let deepest = quakes[0];
  let feltCount = 0;
  let tsunamiCount = 0;
  let significantCount = 0;
  let energy = 0;
  const depths: number[] = [];

  for (const quake of quakes) {
    if (quake.mag > strongest.mag) strongest = quake;
    if (quake.time > latest.time) latest = quake;
    if (quake.depth > deepest.depth) deepest = quake;
    if ((quake.felt ?? 0) > 0) feltCount += 1;
    if (quake.tsunami) tsunamiCount += 1;
    if (quake.sig >= SIGNIFICANT_THRESHOLD) significantCount += 1;
    energy += 10 ** (1.5 * quake.mag + 4.8);
    depths.push(quake.depth);
  }

  depths.sort((a, b) => a - b);
  const mid = depths.length >> 1;
  const medianDepth =
    depths.length % 2 === 0 ? (depths[mid - 1] + depths[mid]) / 2 : depths[mid];

  return {
    count: quakes.length,
    strongest,
    latest,
    deepest,
    feltCount,
    tsunamiCount,
    significantCount,
    medianDepth,
    equivalentMagnitude: energy > 0 ? (Math.log10(energy) - 4.8) / 1.5 : null,
  };
}
