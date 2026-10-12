import type { City } from "./cities";
import type { Mode } from "./app-state";
import {
  buildSlots,
  meetingOverlap,
  pairOverlap,
  summarizeOverlap,
  type AwakeWindow,
  type HourSlot,
  type OverlapResult,
} from "./overlap";
import { getUtcOffsetMinutes, utcMinuteOfDay, wrapMinutes } from "./time";

export interface BoardRow {
  readonly city: City;
  readonly utcOffsetMinutes: number;
  /** The city's current local clock, as a minute-of-day. */
  readonly localNowMinutes: number;
  readonly isReference: boolean;
  readonly slots: readonly HourSlot[];
  /** 24 flags: hours to highlight on this row. */
  readonly overlap: readonly boolean[];
}

export type Summary =
  | { readonly kind: "meeting"; readonly result: OverlapResult }
  | {
      readonly kind: "base";
      readonly reference: City;
      readonly entries: readonly { readonly city: City; readonly result: OverlapResult }[];
    };

export interface Board {
  readonly mode: Mode;
  readonly rows: readonly BoardRow[];
  /** Reference-city hour that is happening right now. Null when there are no cities. */
  readonly nowHour: number | null;
  /** Null when there are fewer than two cities. */
  readonly summary: Summary | null;
}

interface BoardInput {
  readonly cities: readonly City[];
  readonly mode: Mode;
  readonly window: AwakeWindow;
  readonly now: Date;
}

const NO_OVERLAP: readonly boolean[] = Array.from({ length: 24 }, () => false);

/**
 * Derives everything the grid and summary need. Pure given `now`, so DST and
 * fractional offsets are testable with a fixed date.
 */
export function buildBoard({ cities, mode, window, now }: BoardInput): Board {
  if (cities.length === 0) {
    return { mode, rows: [], nowHour: null, summary: null };
  }

  const utcNow = utcMinuteOfDay(now);
  const offsets = cities.map((city) => getUtcOffsetMinutes(city.timeZone, now));
  const referenceOffset = offsets[0];
  const nowHour = Math.floor(wrapMinutes(utcNow + referenceOffset) / 60);

  const slotsPerCity = offsets.map((offset) => buildSlots(offset - referenceOffset, window));

  const baseRows = cities.map((city, index) => ({
    city,
    utcOffsetMinutes: offsets[index],
    localNowMinutes: wrapMinutes(utcNow + offsets[index]),
    isReference: index === 0,
    slots: slotsPerCity[index],
  }));

  if (cities.length < 2) {
    return {
      mode,
      rows: baseRows.map((row) => ({ ...row, overlap: NO_OVERLAP })),
      nowHour,
      summary: null,
    };
  }

  if (mode === "meeting") {
    const shared = meetingOverlap(slotsPerCity);
    return {
      mode,
      rows: baseRows.map((row) => ({ ...row, overlap: shared })),
      nowHour,
      summary: { kind: "meeting", result: summarizeOverlap(shared) },
    };
  }

  // Base mode: every non-reference city is compared only against the reference.
  const referenceSlots = slotsPerCity[0];
  const perRowOverlap = slotsPerCity.map((slots, index) =>
    index === 0 ? NO_OVERLAP : pairOverlap(referenceSlots, slots),
  );

  return {
    mode,
    rows: baseRows.map((row, index) => ({ ...row, overlap: perRowOverlap[index] })),
    nowHour,
    summary: {
      kind: "base",
      reference: cities[0],
      entries: cities.slice(1).map((city, index) => ({
        city,
        result: summarizeOverlap(perRowOverlap[index + 1]),
      })),
    },
  };
}
