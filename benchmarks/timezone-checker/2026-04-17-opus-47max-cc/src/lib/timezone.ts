/**
 * Compute the current UTC offset (in minutes) for an IANA timezone,
 * honoring DST automatically because it's based on `new Date()`.
 */
export function getOffsetMinutes(timeZone: string, ref: Date = new Date()): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(ref).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUTC - ref.getTime()) / 60000);
}

export function formatUtcOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(m).padStart(2, "0")}`;
}

/**
 * For a given reference hour (integer 0–23) in the reference city,
 * return the local clock time (in minutes since local midnight) in the target city.
 * Handles fractional offsets and wraps across day boundaries.
 */
export function localMinutesForRefHour(
  refHour: number,
  refOffsetMin: number,
  cityOffsetMin: number,
): number {
  const diff = cityOffsetMin - refOffsetMin; // minutes
  const mins = refHour * 60 + diff;
  const mod = ((mins % 1440) + 1440) % 1440;
  return mod;
}

export function formatLocalTime(
  minutesSinceMidnight: number,
  format12h: boolean,
): { hour: string; suffix: string; compact: string } {
  const h = Math.floor(minutesSinceMidnight / 60);
  const m = minutesSinceMidnight % 60;

  if (format12h) {
    const period = h >= 12 ? "pm" : "am";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const hour = m === 0 ? String(h12) : `${h12}:${String(m).padStart(2, "0")}`;
    return { hour, suffix: period, compact: `${hour}${period}` };
  }
  const hh = String(h).padStart(2, "0");
  const hour = m === 0 ? hh : `${hh}:${String(m).padStart(2, "0")}`;
  return { hour, suffix: "", compact: hour };
}

/**
 * Formats a reference-city hour range [startHour, endHour) as a string.
 * End is exclusive — the end hour represents the boundary *after* the last overlap hour.
 */
export function formatHourRange(
  startHour: number,
  endHour: number,
  format12h: boolean,
): string {
  const start = formatLocalTime(startHour * 60, format12h).compact;
  const end = formatLocalTime((endHour % 24) * 60, format12h).compact;
  return `${start} — ${end}`;
}
