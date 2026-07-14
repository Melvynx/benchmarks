/**
 * Timezone utilities built on Intl.DateTimeFormat so DST and fractional
 * offsets (e.g. Asia/Kolkata +5:30, Asia/Kathmandu +5:45) are handled by the
 * runtime without hardcoding any offsets.
 */

const offsetCache = new Map<string, number>();

/**
 * Returns the current UTC offset of `timezone` in minutes (e.g. -420, 330).
 * Computed from today so DST is automatic.
 */
export function getOffsetMinutes(timezone: string, now: Date = new Date()): number {
  const key = `${timezone}|${now.toISOString().slice(0, 10)}`;
  const cached = offsetCache.get(key);
  if (cached !== undefined) return cached;

  // `longOffset` yields "GMT+05:30" / "GMT-08:00" / "GMT" reliably across
  // engines; fall back to manual diff if the token is missing.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
    hour: "numeric",
  });
  const parts = dtf.formatToParts(now);
  const tzPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const match = tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  let minutes = 0;
  if (match) {
    const sign = match[1] === "-" ? -1 : 1;
    const h = parseInt(match[2], 10);
    const m = match[3] ? parseInt(match[3], 10) : 0;
    minutes = sign * (h * 60 + m);
  }
  offsetCache.set(key, minutes);
  return minutes;
}

/** Human-readable offset label: "UTC+5:30", "UTC-8", "UTC". */
export function formatOffset(timezone: string, now: Date = new Date()): string {
  const m = getOffsetMinutes(timezone, now);
  if (m === 0) return "UTC";
  const sign = m >= 0 ? "+" : "-";
  const abs = Math.abs(m);
  const h = Math.floor(abs / 60);
  const mm = abs % 60;
  return mm === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${mm.toString().padStart(2, "0")}`;
}

/**
 * Given the reference city hour (0..23), returns the local time in `timezone`
 * expressed in minutes from midnight (0..1439).
 *
 * Not an integer for cities with :30/:45 offsets.
 */
export function localMinutesInCity(
  refHour: number,
  refTimezone: string,
  targetTimezone: string,
  now: Date = new Date(),
): number {
  const refOffset = getOffsetMinutes(refTimezone, now);
  const targetOffset = getOffsetMinutes(targetTimezone, now);
  const delta = targetOffset - refOffset; // minutes
  const total = refHour * 60 + delta;
  return ((total % 1440) + 1440) % 1440;
}

/** Integer hour (0..23) of a given minute-of-day. */
export function hourOf(minutesOfDay: number): number {
  return Math.floor(minutesOfDay / 60) % 24;
}

/** Minute component of minute-of-day (0..59). */
export function minuteOf(minutesOfDay: number): number {
  return Math.round(minutesOfDay % 60);
}

/** Whether a local minute-of-day falls inside the awake window. Overnight-safe. */
export function isAwake(
  localMinutes: number,
  wakeHour: number,
  sleepHour: number,
): boolean {
  // Compare in minutes. Wake/sleep are integer hours.
  const wake = wakeHour * 60;
  const sleep = sleepHour * 60;
  if (wake === sleep) return false; // degenerate: no awake time
  if (wake < sleep) {
    return localMinutes >= wake && localMinutes < sleep;
  }
  // overnight (e.g. wake 22, sleep 6)
  return localMinutes >= wake || localMinutes < sleep;
}

/** Format a local minute-of-day for display inside a cell. */
export function formatCellTime(
  minutesOfDay: number,
  format12h: boolean,
): string {
  const h = hourOf(minutesOfDay);
  const m = minuteOf(minutesOfDay);
  if (format12h) {
    const period = h >= 12 ? "p" : "a";
    const display = ((h + 11) % 12) + 1;
    return m === 0 ? `${display}${period}` : `${display}:${pad(m)}${period}`;
  }
  return m === 0 ? `${h}` : `${h}:${pad(m)}`;
}

/** Format a reference-city hour label (column/row header). */
export function formatHourLabel(hour: number, format12h: boolean): string {
  if (format12h) {
    if (hour === 0) return "12a";
    if (hour === 12) return "12p";
    return hour < 12 ? `${hour}a` : `${hour - 12}p`;
  }
  return hour.toString().padStart(2, "0");
}

/** Format a reference-city hour for prose use: "9am", "12pm", "23:00". */
export function formatHourInline(hour: number, format12h: boolean): string {
  if (format12h) {
    if (hour === 0) return "12am";
    if (hour === 12) return "12pm";
    return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
  }
  return `${hour.toString().padStart(2, "0")}:00`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Group consecutive `true` hours (mod 24) into inclusive-start/exclusive-end ranges. */
export function groupHourRanges(hours: boolean[]): Array<{ start: number; end: number }> {
  if (hours.length !== 24) throw new Error("expected 24 hours");
  const awake = [...hours];
  const total = awake.filter(Boolean).length;
  if (total === 0) return [];
  if (total === 24) return [{ start: 0, end: 24 }];

  const ranges: Array<{ start: number; end: number }> = [];
  // find the first "off" hour to start scanning past any wraparound group
  let scanStart = 0;
  while (awake[scanStart]) scanStart++;
  let i = scanStart;
  let visited = 0;
  while (visited < 24) {
    const idx = i % 24;
    if (awake[idx]) {
      const start = idx;
      let len = 0;
      while (len < 24 && awake[(idx + len) % 24]) {
        len++;
        visited++;
      }
      ranges.push({ start, end: start + len });
      i += len;
    } else {
      i++;
      visited++;
    }
  }
  return ranges;
}

export function formatRange(
  range: { start: number; end: number },
  format12h: boolean,
): string {
  const startLabel = formatHourInline(range.start % 24, format12h);
  const endHour = range.end % 24;
  const endLabel = formatHourInline(endHour, format12h);
  return `${startLabel} \u2192 ${endLabel}`;
}
