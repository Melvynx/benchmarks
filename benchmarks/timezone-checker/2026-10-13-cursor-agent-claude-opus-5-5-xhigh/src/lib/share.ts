import { formatLocalRange, formatUtcOffset, type TimeFormat } from "./format";
import type { HourRange, ScheduleRow } from "./overlap";

/** Plain-text version of a window in every participant's local time, ready to paste into chat. */
export function describeWindow(range: HourRange, rows: readonly ScheduleRow[], format: TimeFormat): string {
  const width = Math.max(...rows.map((row) => row.city.name.length));
  return rows
    .map((row) => {
      const name = row.city.name.padEnd(width);
      return `${name}  ${formatLocalRange(range, row.diffMinutes, format)}  (${formatUtcOffset(row.offsetMinutes)})`;
    })
    .join("\n");
}
