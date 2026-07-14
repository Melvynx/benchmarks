/**
 * Timezone math. Offsets are derived from a concrete date via Intl, so DST is
 * handled automatically and fractional offsets (+5:30, +5:45) fall out for free.
 */

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsCache.set(timeZone, f);
  }
  return f;
}

/**
 * The UTC offset of `timeZone` at the given instant, in minutes.
 * Positive = ahead of UTC. Reflects DST in effect on that date.
 */
export function getOffsetMinutes(timeZone: string, at: Date): number {
  const parts = formatter(timeZone).formatToParts(at);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  // Hour "24" can appear for midnight in some environments; normalize to 0.
  const hour = map.hour === 24 ? 0 : map.hour;
  const asUTC = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second);
  return Math.round((asUTC - at.getTime()) / 60000);
}

/** "UTC+5:30", "UTC-8", "UTC+0" */
export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? ":" + String(m).padStart(2, "0") : ""}`;
}

/** The hour (0-23) currently showing on the clock in `timeZone`. */
export function currentHourInZone(timeZone: string, at: Date): number {
  const parts = formatter(timeZone).formatToParts(at);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "0";
  const h = Number(hour);
  return h === 24 ? 0 : h;
}
