import type { City } from "./cities";
import { MINUTES_PER_DAY, mod } from "./timezone";

export const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export type Mode = "meeting" | "base";

export interface HourRange {
  /** Reference-city hour the window starts at (inclusive). */
  start: number;
  /** Number of hours; the window ends at `(start + length) % 24` (exclusive). */
  length: number;
}

export interface HourCell {
  refHour: number;
  /** Local wall-clock time in this city, in minutes since local midnight. */
  minutesOfDay: number;
  /** Local calendar day relative to the reference city's day (-1, 0 or +1). */
  dayOffset: number;
  /** True on the first cell of a new local day within the row. */
  startsNewDay: boolean;
  awake: boolean;
  overlap: boolean;
}

export interface ScheduleRow {
  city: City;
  offsetMinutes: number;
  /** Offset relative to the reference city, in minutes. */
  diffMinutes: number;
  isReference: boolean;
  cells: HourCell[];
}

export interface PartialWindow extends HourRange {
  awakeCount: number;
  asleep: City[];
}

export interface MeetingSummary {
  kind: "meeting";
  total: number;
  ranges: HourRange[];
  /** Best partial windows, only computed when nobody overlaps. */
  closest: PartialWindow[];
}

export interface BaseEntry {
  city: City;
  diffMinutes: number;
  total: number;
  ranges: HourRange[];
}

export interface BaseSummary {
  kind: "base";
  entries: BaseEntry[];
}

export interface Schedule {
  rows: ScheduleRow[];
  summary: MeetingSummary | BaseSummary | null;
}

export interface ScheduleInput {
  cities: ReadonlyArray<{ city: City; offsetMinutes: number }>;
  wakeHour: number;
  sleepHour: number;
  mode: Mode;
}

/**
 * Awake when the local time falls within [wake, sleep). Supports overnight windows
 * (wake 22, sleep 6). Equal hours mean awake around the clock.
 */
export function isAwake(minutesOfDay: number, wakeHour: number, sleepHour: number): boolean {
  const wake = wakeHour * 60;
  const sleep = sleepHour * 60;
  if (wake === sleep) return true;
  if (wake < sleep) return minutesOfDay >= wake && minutesOfDay < sleep;
  return minutesOfDay >= wake || minutesOfDay < sleep;
}

export function awakeDuration(wakeHour: number, sleepHour: number): number {
  return wakeHour === sleepHour ? 24 : mod(sleepHour - wakeHour, 24);
}

/**
 * Groups hours sharing the same non-null key into contiguous runs. Because the
 * schedule repeats daily, a run touching 11pm and one touching midnight are merged.
 */
function groupRuns(keys: ReadonlyArray<string | null>): Array<HourRange & { key: string }> {
  const runs: Array<HourRange & { key: string }> = [];
  keys.forEach((key, hour) => {
    if (key === null) return;
    const last = runs.at(-1);
    if (last && last.key === key && last.start + last.length === hour) last.length += 1;
    else runs.push({ start: hour, length: 1, key });
  });

  const first = runs[0];
  const last = runs.at(-1);
  if (first && last && first !== last && first.start === 0 && last.start + last.length === 24 && first.key === last.key) {
    last.length += first.length;
    runs.shift();
  }
  return runs;
}

export function toRanges(flags: readonly boolean[]): HourRange[] {
  return groupRuns(flags.map((flag) => (flag ? "1" : null))).map(({ start, length }) => ({ start, length }));
}

export function rangeHours(range: HourRange): number[] {
  return Array.from({ length: range.length }, (_, i) => (range.start + i) % 24);
}

function closestWindows(rows: readonly ScheduleRow[]): PartialWindow[] {
  const awakeByHour = HOURS.map((hour) => rows.filter((row) => row.cells[hour]?.awake));
  const best = Math.max(...awakeByHour.map((awake) => awake.length));
  if (best < 2) return [];

  const keys = awakeByHour.map((awake) =>
    awake.length === best ? awake.map((row) => row.city.id).join("|") : null,
  );

  return groupRuns(keys)
    .map(({ start, length }) => {
      const awakeIds = new Set(awakeByHour[start]?.map((row) => row.city.id));
      return {
        start,
        length,
        awakeCount: best,
        asleep: rows.filter((row) => !awakeIds.has(row.city.id)).map((row) => row.city),
      };
    })
    .sort((a, b) => b.length - a.length)
    .slice(0, 3);
}

export function buildSchedule({ cities, wakeHour, sleepHour, mode }: ScheduleInput): Schedule {
  const reference = cities[0];
  if (!reference) return { rows: [], summary: null };

  const rows: ScheduleRow[] = cities.map(({ city, offsetMinutes }, index) => {
    const diffMinutes = offsetMinutes - reference.offsetMinutes;
    let previousDay = 0;
    const cells = HOURS.map((refHour): HourCell => {
      const localTotal = refHour * 60 + diffMinutes;
      const dayOffset = Math.floor(localTotal / MINUTES_PER_DAY);
      const minutesOfDay = mod(localTotal, MINUTES_PER_DAY);
      const startsNewDay = refHour > 0 && dayOffset !== previousDay;
      previousDay = dayOffset;
      return {
        refHour,
        minutesOfDay,
        dayOffset,
        startsNewDay,
        awake: isAwake(minutesOfDay, wakeHour, sleepHour),
        overlap: false,
      };
    });
    return { city, offsetMinutes, diffMinutes, isReference: index === 0, cells };
  });

  if (rows.length < 2) return { rows, summary: null };

  const [referenceRow, ...others] = rows as [ScheduleRow, ...ScheduleRow[]];

  if (mode === "meeting") {
    const flags = HOURS.map((hour) => rows.every((row) => row.cells[hour]?.awake));
    for (const row of rows) row.cells.forEach((cell, hour) => (cell.overlap = flags[hour] ?? false));

    const ranges = toRanges(flags);
    const total = flags.filter(Boolean).length;
    return {
      rows,
      summary: { kind: "meeting", total, ranges, closest: total === 0 ? closestWindows(rows) : [] },
    };
  }

  const entries = others.map((row): BaseEntry => {
    const flags = HOURS.map((hour) => Boolean(referenceRow.cells[hour]?.awake && row.cells[hour]?.awake));
    row.cells.forEach((cell, hour) => (cell.overlap = flags[hour] ?? false));
    return {
      city: row.city,
      diffMinutes: row.diffMinutes,
      total: flags.filter(Boolean).length,
      ranges: toRanges(flags),
    };
  });

  // The reference row lights up wherever it overlaps with at least one other city.
  referenceRow.cells.forEach((cell, hour) => {
    cell.overlap = others.some((row) => row.cells[hour]?.overlap);
  });

  return { rows, summary: { kind: "base", entries } };
}
