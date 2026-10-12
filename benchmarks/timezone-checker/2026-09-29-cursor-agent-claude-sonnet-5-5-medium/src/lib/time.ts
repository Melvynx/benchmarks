import type { City } from "./cities";

export type TimeFormat = "12h" | "24h";
export type Mode = "meeting" | "base";

export interface Settings {
  wake: number;
  sleep: number;
  format: TimeFormat;
}

const MIN_DAY = 1440;
const mod = (n: number, m: number) => ((n % m) + m) % m;

/** UTC offset in minutes for a timezone at a given instant (DST aware). */
export function utcOffsetMinutes(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

export function isAwake(localMinutes: number, { wake, sleep }: Settings): boolean {
  const m = mod(localMinutes, MIN_DAY);
  const w = wake * 60;
  const s = sleep * 60;
  if (w === s) return true;
  return w < s ? m >= w && m < s : m >= w || m < s;
}

export function hourLabel(hour: number, format: TimeFormat, short = false): string {
  if (format === "24h") return String(hour).padStart(2, "0");
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? "am" : "pm";
  return short ? `${h12}${suffix[0]}` : `${h12}${suffix}`;
}

/** Label for a local time expressed in minutes since midnight (supports :30/:45). */
export function localLabel(localMinutes: number, format: TimeFormat, short = true): string {
  const m = mod(localMinutes, MIN_DAY);
  const hour = Math.floor(m / 60);
  const min = m % 60;
  if (min === 0) return hourLabel(hour, format, short);
  if (format === "24h") return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(min).padStart(2, "0")}`;
}

export interface CellInfo {
  refHour: number;
  localMinutes: number;
  awake: boolean;
  overlap: boolean;
}

export interface Row {
  city: City;
  offset: number;
  cells: CellInfo[];
  overlapHours: number[];
}

export interface Analysis {
  rows: Row[];
  meetingHours: number[];
}

export function analyze(cities: City[], mode: Mode, settings: Settings, at: Date): Analysis {
  const offsets = cities.map((c) => utcOffsetMinutes(c.tz, at));
  const refOffset = offsets[0] ?? 0;
  const local = (i: number, h: number) => h * 60 + (offsets[i] - refOffset);

  const meetingHours: number[] = [];
  for (let h = 0; h < 24; h++) {
    if (cities.every((_, i) => isAwake(local(i, h), settings))) meetingHours.push(h);
  }

  const rows: Row[] = cities.map((city, i) => {
    const cells: CellInfo[] = [];
    for (let h = 0; h < 24; h++) {
      const awake = isAwake(local(i, h), settings);
      let overlap = false;
      if (mode === "meeting") overlap = meetingHours.includes(h);
      else overlap = awake && (i === 0 ? false : isAwake(local(0, h), settings));
      cells.push({ refHour: h, localMinutes: local(i, h), awake, overlap });
    }
    return { city, offset: offsets[i], cells, overlapHours: cells.filter((c) => c.overlap).map((c) => c.refHour) };
  });

  return { rows, meetingHours };
}

export function toRanges(hours: number[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const h of hours) {
    const last = out[out.length - 1];
    if (last && last[1] === h) last[1] = h + 1;
    else out.push([h, h + 1]);
  }
  return out;
}

export function formatRange([start, end]: [number, number], format: TimeFormat): string {
  return `${hourLabel(start, format)} — ${hourLabel(end % 24, format)}`;
}
