import type { EarthquakeEvent, UsgsAlertLevel } from "../types/earthquake";

export function formatMagnitude(mag: number | null): string {
  if (mag === null || Number.isNaN(mag)) return "—";
  return mag.toFixed(1);
}

export interface MagnitudeClass {
  key: "micro" | "minor" | "light" | "moderate" | "strong" | "major" | "great";
  label: string;
  description: string;
}

/** Categorical magnitude classes, following USGS's general public-facing bands. */
export function classifyMagnitude(mag: number | null): MagnitudeClass {
  const m = mag ?? -Infinity;
  if (m < 2) return { key: "micro", label: "Micro", description: "Not felt, recorded only by instruments." };
  if (m < 4) return { key: "minor", label: "Minor", description: "Often felt nearby; rarely causes damage." };
  if (m < 5) return { key: "light", label: "Light", description: "Felt widely; minor damage is possible." };
  if (m < 6) return { key: "moderate", label: "Moderate", description: "Can cause damage in populated areas." };
  if (m < 7) return { key: "strong", label: "Strong", description: "Can cause serious damage over larger areas." };
  if (m < 8) return { key: "major", label: "Major", description: "Can cause serious damage across wide regions." };
  return { key: "great", label: "Great", description: "Capable of tremendous, widespread destruction." };
}

export interface DepthClass {
  key: "shallow" | "intermediate" | "deep";
  label: string;
  description: string;
}

export function classifyDepth(depthKm: number | null): DepthClass {
  const d = depthKm ?? 0;
  if (d < 70) return { key: "shallow", label: "Shallow", description: "< 70 km — shaking is usually felt more strongly at the surface." };
  if (d < 300) return { key: "intermediate", label: "Intermediate", description: "70–300 km deep." };
  return { key: "deep", label: "Deep", description: "> 300 km — rarely felt at the surface." };
}

export function formatDepth(depthKm: number | null): string {
  if (depthKm === null || Number.isNaN(depthKm)) return "Unknown depth";
  return `${depthKm.toFixed(1)} km`;
}

export const ALERT_LABEL: Record<UsgsAlertLevel, string> = {
  green: "Green — minimal impact expected",
  yellow: "Yellow — localized impact possible",
  orange: "Orange — significant impact possible",
  red: "Red — high-impact response likely",
};

export function formatSignificance(sig: number | null): string {
  if (sig === null) return "Not scored";
  if (sig >= 700) return `${sig} — very high`;
  if (sig >= 400) return `${sig} — high`;
  if (sig >= 150) return `${sig} — moderate`;
  return `${sig} — low`;
}

const dtCache = new Map<string, Intl.DateTimeFormat>();
function getFormatter(opts: Intl.DateTimeFormatOptions, key: string) {
  let f = dtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(undefined, opts);
    dtCache.set(key, f);
  }
  return f;
}

export function formatLocalDateTime(ms: number): string {
  return getFormatter(
    { dateStyle: "medium", timeStyle: "short" },
    "local-datetime",
  ).format(new Date(ms));
}

export function formatTimeZoneAbbrev(): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

export function formatUtc(ms: number): string {
  return `${new Date(ms).toISOString().replace("T", " ").slice(0, 19)} UTC`;
}

export function formatRelativeTime(ms: number, nowMs: number): string {
  const diff = nowMs - ms;
  const abs = Math.abs(diff);
  const suffix = diff >= 0 ? "ago" : "from now";
  const sec = Math.round(abs / 1000);
  if (sec < 45) return diff >= 0 ? "just now" : "in a moment";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ${suffix}`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ${suffix}`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? "" : "s"} ${suffix}`;
  const month = Math.round(day / 30);
  return `${month} mo ${suffix}`;
}

export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(3)}°${latDir}, ${Math.abs(lon).toFixed(3)}°${lonDir}`;
}

export function eventShortLabel(event: EarthquakeEvent): string {
  return `M${formatMagnitude(event.magnitude)} — ${event.place}`;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
