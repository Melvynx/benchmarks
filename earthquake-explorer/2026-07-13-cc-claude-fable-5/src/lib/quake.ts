import type { Brush, Filters, Quake, SortKey } from "../types";
import { DEFAULT_FILTERS } from "../types";

export type MagBand = "minor" | "light" | "moderate" | "major";

export function magBand(mag: number | null): MagBand {
  if (mag == null || mag < 2.5) return "minor";
  if (mag < 4.5) return "light";
  if (mag < 6) return "moderate";
  return "major";
}

export const MAG_BAND_LABEL: Record<MagBand, string> = {
  minor: "below M 2.5",
  light: "M 2.5–4.4",
  moderate: "M 4.5–5.9",
  major: "M 6.0+",
};

export function formatMag(mag: number | null): string {
  return mag == null ? "—" : mag.toFixed(1);
}

export function formatDepth(depth: number, digits = 0): string {
  const text = depth.toFixed(digits);
  return text === "-0" || text === "-0.0" ? text.slice(1) : text;
}

export function depthBandOf(depth: number | null): "shallow" | "intermediate" | "deep" | null {
  if (depth == null) return null;
  if (depth < 70) return "shallow";
  if (depth < 300) return "intermediate";
  return "deep";
}

export const DEPTH_BAND_LABEL = {
  shallow: "Shallow · < 70 km",
  intermediate: "Intermediate · 70–300 km",
  deep: "Deep · > 300 km",
} as const;

export function inBounds(q: Quake, bounds: [number, number, number, number]): boolean {
  const [w, s, e, n] = bounds;
  if (q.lat < s || q.lat > n) return false;
  // Handle viewports that cross the antimeridian or wrap the world.
  if (e - w >= 360) return true;
  const lon = q.lon;
  const wrappedW = ((w + 180) % 360 + 360) % 360 - 180;
  const wrappedE = ((e + 180) % 360 + 360) % 360 - 180;
  const wrappedLon = ((lon + 180) % 360 + 360) % 360 - 180;
  if (wrappedW <= wrappedE) return wrappedLon >= wrappedW && wrappedLon <= wrappedE;
  return wrappedLon >= wrappedW || wrappedLon <= wrappedE;
}

export function matchesFilters(
  q: Quake,
  f: Filters,
  bounds: [number, number, number, number] | null,
): boolean {
  if (f.minMag > 0 && (q.mag == null || q.mag < f.minMag)) return false;
  if (f.depth !== "any" && depthBandOf(q.depth) !== f.depth) return false;
  if (f.alert !== "any" && q.alert !== f.alert) return false;
  if (f.tsunamiOnly && !q.tsunami) return false;
  if (f.status === "reviewed" && q.status !== "reviewed") return false;
  if (f.status === "automatic" && q.status === "reviewed") return false;
  if (f.quakesOnly && q.type !== "earthquake") return false;
  if (f.query) {
    const hay = `${q.place ?? ""} ${q.title}`.toLowerCase();
    if (!hay.includes(f.query.toLowerCase())) return false;
  }
  if (f.inView && bounds && !inBounds(q, bounds)) return false;
  return true;
}

export function applyBrush(quakes: Quake[], brush: Brush): Quake[] {
  if (!brush) return quakes;
  return quakes.filter((q) => q.time >= brush.start && q.time <= brush.end);
}

export function sortQuakes(quakes: Quake[], sort: SortKey): Quake[] {
  const list = [...quakes];
  if (sort === "mag") list.sort((a, b) => (b.mag ?? -10) - (a.mag ?? -10) || b.time - a.time);
  else if (sort === "sig") list.sort((a, b) => (b.sig ?? -1) - (a.sig ?? -1) || b.time - a.time);
  else list.sort((a, b) => b.time - a.time);
  return list;
}

export function countActiveFilters(f: Filters): number {
  let n = 0;
  if (f.minMag !== DEFAULT_FILTERS.minMag) n++;
  if (f.depth !== DEFAULT_FILTERS.depth) n++;
  if (f.alert !== DEFAULT_FILTERS.alert) n++;
  if (f.tsunamiOnly !== DEFAULT_FILTERS.tsunamiOnly) n++;
  if (f.status !== DEFAULT_FILTERS.status) n++;
  if (f.quakesOnly !== DEFAULT_FILTERS.quakesOnly) n++;
  if (f.query !== DEFAULT_FILTERS.query) n++;
  if (f.inView !== DEFAULT_FILTERS.inView) n++;
  return n;
}

export function strongestOf(quakes: Quake[]): Quake | null {
  let best: Quake | null = null;
  for (const q of quakes) {
    if (q.mag == null) continue;
    if (!best || best.mag == null || q.mag > best.mag) best = q;
  }
  return best;
}

const RELATIVE_STEPS: Array<[number, Intl.RelativeTimeFormatUnit]> = [
  [60_000, "second"],
  [3_600_000, "minute"],
  [86_400_000, "hour"],
  [Infinity, "day"],
];

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function relativeTime(ts: number, now: number = Date.now()): string {
  const diff = ts - now;
  const abs = Math.abs(diff);
  for (const [limit, unit] of RELATIVE_STEPS) {
    if (abs < limit) {
      const divisor =
        unit === "second" ? 1_000 : unit === "minute" ? 60_000 : unit === "hour" ? 3_600_000 : 86_400_000;
      return rtf.format(Math.round(diff / divisor), unit);
    }
  }
  return rtf.format(Math.round(diff / 86_400_000), "day");
}

const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function formatLocal(ts: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(ts);
}

export function formatFullLocal(ts: number): string {
  return `${new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(ts)} (${localZone})`;
}

export function formatUtc(ts: number): string {
  return `${new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(ts)} UTC`;
}

export function formatCoords(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(3)}° ${ns}, ${Math.abs(lon).toFixed(3)}° ${ew}`;
}

// How unusual is this event? Grounded in USGS "sig" (0–~1000, mag/felt/alert composite).
export function significanceNote(q: Quake): { label: string; tone: "calm" | "notable" | "elevated" } {
  const sig = q.sig ?? 0;
  if (q.alert === "red" || q.alert === "orange" || sig >= 900)
    return { label: "High-impact event — see USGS for authoritative updates", tone: "elevated" };
  if (q.alert === "yellow" || sig >= 600 || (q.mag ?? 0) >= 6)
    return { label: "Notable event for this period", tone: "notable" };
  if (sig >= 250 || (q.mag ?? 0) >= 4.5) return { label: "Moderately significant", tone: "notable" };
  return { label: "Ordinary background seismicity", tone: "calm" };
}
