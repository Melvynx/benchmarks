export type TimeFormat = "12h" | "24h";

/**
 * Format an hour-of-day for display.
 * `hour` may be 0-24 (24 = midnight, used for exclusive range ends).
 * `minute` defaults to 0; non-zero minutes (fractional offsets) are shown.
 */
export function formatHour(hour: number, minute: number, format: TimeFormat): string {
  const h = ((hour % 24) + 24) % 24;
  if (format === "24h") {
    return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
  const period = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return minute ? `${display}:${String(minute).padStart(2, "0")} ${period}` : `${display} ${period}`;
}

/** Compact label used inside grid cells: "2p", "14", "9:30a". */
export function formatHourCompact(hour: number, minute: number, format: TimeFormat): string {
  const h = ((hour % 24) + 24) % 24;
  if (format === "24h") {
    return minute ? `${h}:${String(minute).padStart(2, "0")}` : String(h);
  }
  const period = h < 12 ? "a" : "p";
  const display = h % 12 === 0 ? 12 : h % 12;
  return minute ? `${display}:${String(minute).padStart(2, "0")}${period}` : `${display}${period}`;
}
