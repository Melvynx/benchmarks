import type { City } from "../data/cities";
import {
  HOURS_IN_DAY,
  countHours,
  isAwake,
  toHourRanges,
  type HourRange,
} from "./availability";
import { dayNumberOf, getUtcOffsetMinutes, getZonedParts, zonedTimeToInstant } from "./time";

export type Mode = "meeting" | "base";

export type CellState = "sleeping" | "awake" | "overlap";

export type HourCell = {
  /** Column index — the hour of the day in the reference city. */
  refHour: number;
  localHour: number;
  localMinute: number;
  /** -1 yesterday, 0 same day, +1 tomorrow, relative to the reference city's date. */
  dayDelta: number;
  state: CellState;
};

export type CityRow = {
  city: City;
  isReference: boolean;
  offsetMinutes: number;
  /** The city's live local time right now. */
  now: { hour: number; minute: number };
  cells: HourCell[];
  /** Hours (in reference time) that count as overlap for this row. */
  overlapHours: boolean[];
  overlapCount: number;
  overlapRanges: HourRange[];
};

export type Schedule = {
  rows: CityRow[];
  /** Current hour in the reference city, or null when there is no reference. */
  nowRefHour: number | null;
  /** "Fri, Jul 25" in the reference city. */
  referenceDayLabel: string;
  /**
   * Meeting mode: the window everyone shares.
   * Base mode: the union of the base's pairwise windows — i.e. hours where the
   * base can reach at least one other city.
   */
  overlap: { hours: boolean[]; count: number; ranges: HourRange[] };
};

export type ScheduleInput = {
  cities: readonly City[];
  wake: number;
  sleep: number;
  mode: Mode;
  now: Date;
};

const EMPTY_MASK: boolean[] = Array.from({ length: HOURS_IN_DAY }, () => false);

export function buildSchedule({ cities, wake, sleep, mode, now }: ScheduleInput): Schedule {
  const reference = cities[0];
  if (!reference) {
    return {
      rows: [],
      nowRefHour: null,
      referenceDayLabel: "",
      overlap: { hours: EMPTY_MASK, count: 0, ranges: [] },
    };
  }

  // The grid represents "today" in the reference city.
  const referenceNow = getZonedParts(reference.zone, now);
  const referenceDay = dayNumberOf(referenceNow);

  // One instant per column, resolved through the reference city's wall clock.
  const instants = Array.from({ length: HOURS_IN_DAY }, (_, hour) =>
    zonedTimeToInstant(reference.zone, referenceNow.year, referenceNow.month, referenceNow.day, hour),
  );

  const drafts = cities.map((city) => {
    const cells = instants.map((instant, refHour) => {
      const local = getZonedParts(city.zone, instant);
      return {
        refHour,
        localHour: local.hour,
        localMinute: local.minute,
        dayDelta: dayNumberOf(local) - referenceDay,
      };
    });
    const awake = cells.map((cell) => isAwake(cell.localHour, wake, sleep));
    const currentLocal = getZonedParts(city.zone, now);
    return {
      city,
      cells,
      awake,
      offsetMinutes: getUtcOffsetMinutes(city.zone, now),
      now: { hour: currentLocal.hour, minute: currentLocal.minute },
    };
  });

  const masks = mode === "meeting" ? meetingMasks(drafts) : baseMasks(drafts);

  const rows: CityRow[] = drafts.map((draft, index) => {
    const overlapHours = masks[index] ?? EMPTY_MASK;
    return {
      city: draft.city,
      isReference: index === 0,
      offsetMinutes: draft.offsetMinutes,
      now: draft.now,
      cells: draft.cells.map((cell, hour) => ({
        ...cell,
        state: overlapHours[hour] ? "overlap" : draft.awake[hour] ? "awake" : "sleeping",
      })),
      overlapHours,
      overlapCount: countHours(overlapHours),
      overlapRanges: toHourRanges(overlapHours),
    };
  });

  const headline = rows[0]?.overlapHours ?? EMPTY_MASK;

  return {
    rows,
    nowRefHour: referenceNow.hour,
    referenceDayLabel: formatDayLabel(reference.zone, now),
    overlap: {
      hours: headline,
      count: countHours(headline),
      ranges: toHourRanges(headline),
    },
  };
}

type Draft = { awake: boolean[] };

/** Everyone must be awake at the same hour — one shared window for all rows. */
function meetingMasks(drafts: readonly Draft[]): boolean[][] {
  const shared = Array.from({ length: HOURS_IN_DAY }, (_, hour) =>
    drafts.every((draft) => draft.awake[hour]),
  );
  return drafts.map(() => shared);
}

/**
 * Each city is compared against the base city alone, so rows can light up
 * different hours. The base row shows the union: hours where it reaches someone.
 */
function baseMasks(drafts: readonly Draft[]): boolean[][] {
  const base = drafts[0];
  if (!base) return [];
  if (drafts.length === 1) return [base.awake.slice()];

  const pairwise = drafts.map((draft, index) =>
    index === 0
      ? null
      : Array.from({ length: HOURS_IN_DAY }, (_, hour) => Boolean(base.awake[hour] && draft.awake[hour])),
  );

  const union = Array.from({ length: HOURS_IN_DAY }, (_, hour) =>
    pairwise.some((mask) => mask?.[hour]),
  );
  return pairwise.map((mask) => mask ?? union);
}

const dayLabelCache = new Map<string, Intl.DateTimeFormat>();

function formatDayLabel(timeZone: string, instant: Date): string {
  let formatter = dayLabelCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    dayLabelCache.set(timeZone, formatter);
  }
  return formatter.format(instant);
}
