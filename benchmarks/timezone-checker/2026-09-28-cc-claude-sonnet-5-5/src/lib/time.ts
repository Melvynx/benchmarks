export type Mode = "meeting" | "base";
export type HourFormat = "12h" | "24h";

export interface Settings {
  wake: number;
  sleep: number;
  format: HourFormat;
}

export const HOURS = Array.from({ length: 24 }, (_, i) => i);

/** UTC offset in minutes for an IANA zone at the given instant (DST aware). */
export function utcOffsetMinutes(tz: string, at: Date = new Date()): number {
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
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

export function formatOffset(mins: number): string {
  const sign = mins < 0 ? "-" : "+";
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

export function isAwake(hour: number, { wake, sleep }: Settings): boolean {
  if (wake === sleep) return true;
  return wake < sleep ? hour >= wake && hour < sleep : hour >= wake || hour < sleep;
}

export interface LocalTime {
  hour: number;
  minute: number;
}

/** Local time in a city when it is `refHour`:00 in the reference city. */
export function localTime(refHour: number, cityOffset: number, refOffset: number): LocalTime {
  const total = (((refHour * 60 + cityOffset - refOffset) % 1440) + 1440) % 1440;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

export function formatHour(hour: number, format: HourFormat): string {
  if (format === "24h") return String(hour).padStart(2, "0");
  return String(hour % 12 === 0 ? 12 : hour % 12);
}

export const meridiem = (hour: number) => (hour < 12 ? "am" : "pm");

export function formatCell(t: LocalTime, format: HourFormat): { main: string; sub: string } {
  const main = formatHour(t.hour, format) + (t.minute ? `:${String(t.minute).padStart(2, "0")}` : "");
  return { main, sub: format === "12h" ? meridiem(t.hour) : "" };
}

export function formatHourLabel(hour: number, format: HourFormat): string {
  const h = ((hour % 24) + 24) % 24;
  return format === "24h" ? `${String(h).padStart(2, "0")}:00` : `${h % 12 === 0 ? 12 : h % 12}${meridiem(h)}`;
}

export interface Range {
  start: number;
  end: number; // exclusive, 0..23 (wraps past midnight)
}

/** Group flagged hours into contiguous ranges, merging across midnight. */
export function toRanges(flags: boolean[]): Range[] {
  const count = flags.filter(Boolean).length;
  if (count === 0) return [];
  if (count === 24) return [{ start: 0, end: 0 }];
  const ranges: Range[] = [];
  let start = -1;
  for (let h = 0; h <= 24; h++) {
    const on = h < 24 && flags[h];
    if (on && start < 0) start = h;
    if (!on && start >= 0) {
      ranges.push({ start, end: h % 24 });
      start = -1;
    }
  }
  if (ranges.length > 1 && ranges[0].start === 0 && ranges[ranges.length - 1].end === 0) {
    const last = ranges.pop()!;
    ranges[0] = { start: last.start, end: ranges[0].end };
  }
  return ranges;
}

export function formatRange(r: Range, format: HourFormat): string {
  if (r.start === 0 && r.end === 0) return "All day";
  return `${formatHourLabel(r.start, format)} — ${formatHourLabel(r.end, format)}`;
}

export interface CityView {
  id: string;
  offset: number;
  cells: { local: LocalTime; awake: boolean; overlap: boolean }[];
}

export interface Overlap {
  flags: boolean[];
  count: number;
  ranges: Range[];
}

const summarize = (flags: boolean[]): Overlap => ({
  flags,
  count: flags.filter(Boolean).length,
  ranges: toRanges(flags),
});

export interface Computation {
  views: CityView[];
  meeting: Overlap;
  perCity: Record<string, Overlap>;
}

export function compute(cities: { id: string; offset: number }[], settings: Settings, mode: Mode): Computation {
  const refOffset = cities[0]?.offset ?? 0;
  const awake = cities.map((c) => HOURS.map((h) => isAwake(localTime(h, c.offset, refOffset).hour, settings)));
  const meetingFlags = HOURS.map((h) => awake.every((row) => row[h]));
  const perCity: Record<string, Overlap> = {};
  cities.slice(1).forEach((c, i) => {
    perCity[c.id] = summarize(HOURS.map((h) => awake[0][h] && awake[i + 1][h]));
  });
  const views = cities.map((c, i) => ({
    id: c.id,
    offset: c.offset,
    cells: HOURS.map((h) => ({
      local: localTime(h, c.offset, refOffset),
      awake: awake[i][h],
      overlap:
        cities.length < 2 ? false : mode === "meeting" ? meetingFlags[h] : i > 0 && perCity[c.id].flags[h],
    })),
  }));
  return { views, meeting: summarize(meetingFlags), perCity };
}
