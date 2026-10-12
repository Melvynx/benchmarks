import type { City } from "../data/cities";
import type { AppState, CellState, TimeRange } from "../types";
import { awakeMask, baseMask, localParts, maskToRanges } from "./schedule";
import { hourInZone, offsetMinutes, zonedParts } from "./time";

export type BoardCell = {
  hour: number;
  minute: number;
  state: CellState;
};

export type BoardRow = {
  city: City;
  offset: number;
  now: { hour: number; minute: number };
  cells: BoardCell[];
};

export type OverlapLine = {
  cityId: string;
  cityName: string;
  hours: number;
  ranges: TimeRange[];
};

export type BoardModel = {
  rows: BoardRow[];
  meeting: { hours: number; ranges: TimeRange[] } | null;
  baseLines: OverlapLine[];
  nowHour: number | null;
  headerOverlap: boolean[];
};

export function buildBoard(cities: City[], state: Pick<AppState, "mode" | "wake" | "sleep">, now: Date): BoardModel {
  if (cities.length === 0) {
    return {
      rows: [],
      meeting: null,
      baseLines: [],
      nowHour: null,
      headerOverlap: Array.from({ length: 24 }, () => false),
    };
  }

  const offsets = cities.map((city) => offsetMinutes(city.timeZone, now));
  const reference = offsets[0];
  const awake = offsets.map((offset) => awakeMask(reference, offset, state.wake, state.sleep));
  const shared = Array.from({ length: 24 }, (_, hour) => awake.every((mask) => mask[hour]));
  const pairwise = offsets.map((offset, index) =>
    index === 0 ? null : baseMask(reference, offset, state.wake, state.sleep),
  );

  const rows: BoardRow[] = cities.map((city, index) => ({
    city,
    offset: offsets[index],
    now: zonedParts(city.timeZone, now),
    cells: Array.from({ length: 24 }, (_, hour) => {
      const local = localParts(reference, offsets[index], hour);
      let cellState: CellState = "sleep";
      if (awake[index][hour]) {
        if (state.mode === "meeting") cellState = shared[hour] ? "overlap" : "awake";
        else if (index === 0) cellState = "awake";
        else cellState = pairwise[index]?.[hour] ? "overlap" : "awake";
      }
      return { hour: local.hour, minute: local.minute, state: cellState };
    }),
  }));

  const meeting =
    cities.length >= 2 ? { hours: shared.filter(Boolean).length, ranges: maskToRanges(shared) } : null;

  const baseLines: OverlapLine[] =
    cities.length >= 2
      ? cities.slice(1).map((city, index) => {
          const mask = pairwise[index + 1] ?? [];
          return {
            cityId: city.id,
            cityName: city.name,
            hours: mask.filter(Boolean).length,
            ranges: maskToRanges(mask),
          };
        })
      : [];

  return {
    rows,
    meeting,
    baseLines,
    nowHour: hourInZone(cities[0].timeZone, now),
    headerOverlap: state.mode === "meeting" ? shared : Array.from({ length: 24 }, () => false),
  };
}
