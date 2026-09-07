import { CITIES, DEFAULT_IDS, type City } from "./cities";

export type Settings = { wake: number; sleep: number; format: "12h" | "24h" };
export type Mode = "meeting" | "base";
export type Configuration = { cityIds: string[]; settings: Settings; mode: Mode };
export const DEFAULT_CONFIG: Configuration = { cityIds: DEFAULT_IDS, settings: { wake: 7, sleep: 23, format: "12h" }, mode: "meeting" };
export const HOURS = Array.from({ length: 24 }, (_, index) => index);
export const wrap = (minutes: number) => ((minutes % 1440) + 1440) % 1440;

export function offsetMinutes(zone: string, date: Date): number {
  const offset = new Intl.DateTimeFormat("en", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = offset.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  return (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

export function offsetLabel(offset: number): string {
  const absolute = Math.abs(offset);
  return `UTC${offset >= 0 ? "+" : "−"}${Math.floor(absolute / 60)}${absolute % 60 ? `:${String(absolute % 60).padStart(2, "0")}` : ""}`;
}

export function isAwake(minutes: number, settings: Settings): boolean {
  const local = wrap(minutes);
  const start = settings.wake * 60;
  const end = settings.sleep * 60;
  if (start === end) return true;
  return start < end ? local >= start && local < end : local >= start || local < end;
}

export function formatTime(minutes: number, format: Settings["format"], compact = false): string {
  const local = wrap(minutes);
  const hour = Math.floor(local / 60);
  const minute = local % 60;
  if (format === "24h") return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return `${hour % 12 || 12}${minute || !compact ? `:${String(minute).padStart(2, "0")}` : ""}${hour >= 12 ? "pm" : "am"}`;
}

export function overlapRanges(overlap: boolean[]): [number, number][] {
  const ranges: [number, number][] = [];
  let start: number | undefined;
  for (let hour = 0; hour <= 24; hour++) {
    if (overlap[hour] && start === undefined) start = hour;
    if (!overlap[hour] && start !== undefined) { ranges.push([start, hour]); start = undefined; }
  }
  return ranges;
}

export function calculateTimeline(cities: City[], settings: Settings, mode: Mode, date: Date) {
  const offsets = cities.map((city) => offsetMinutes(city.zone, date));
  const localTimes = offsets.map((offset) => HOURS.map((hour) => wrap(hour * 60 + offset - offsets[0])));
  const awake = localTimes.map((times) => times.map((time) => isAwake(time, settings)));
  const meeting = HOURS.map((hour) => cities.length > 0 && awake.every((row) => row[hour]));
  const overlaps = awake.map((row, index) => HOURS.map((hour) => mode === "meeting" ? meeting[hour] : index === 0 ? row[hour] : row[hour] && awake[0][hour]));
  return { offsets, localTimes, awake, meeting, overlaps };
}

export function readConfiguration(raw: string | null): Configuration {
  try {
    if (!raw) return DEFAULT_CONFIG;
    const config: unknown = JSON.parse(raw);
    if (typeof config !== "object" || config === null) return DEFAULT_CONFIG;
    const value = config as Partial<Configuration>;
    const settings = value.settings;
    const validHour = (hour: unknown) => typeof hour === "number" && Number.isInteger(hour) && hour >= 0 && hour <= 23;
    if (!Array.isArray(value.cityIds) || !settings || !validHour(settings.wake) || !validHour(settings.sleep) || !["12h", "24h"].includes(settings.format) || !["meeting", "base"].includes(value.mode ?? "")) return DEFAULT_CONFIG;
    return { cityIds: [...new Set(value.cityIds.filter((id) => CITIES.some((city) => city.id === id)))], settings, mode: value.mode as Mode };
  } catch { return DEFAULT_CONFIG; }
}
