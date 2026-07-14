import type { City } from "../data/cities";
import { isAwake, localMinutesInCity } from "./timezone";

export type Mode = "meeting" | "base";

export type Settings = {
  wakeHour: number;
  sleepHour: number;
  format12h: boolean;
};

export type HourCell = {
  /** 0..23 reference-city hour for this column */
  refHour: number;
  /** Local time in this city (minutes since midnight) */
  localMinutes: number;
  /** Awake given the user's wake/sleep window */
  awake: boolean;
  /** True if this hour qualifies as overlap per current mode */
  overlap: boolean;
};

export type CityRow = {
  city: City;
  isRef: boolean;
  cells: HourCell[];
  /** Hours where this city participates in overlap (24 booleans) */
  overlapMask: boolean[];
};

/**
 * Compute per-city rows (each with 24 hour cells) plus the overall overlap
 * mask relevant to the current mode.
 *
 * - In "meeting" mode, every city shares the same overlap mask: hours where
 *   all cities are simultaneously awake.
 * - In "base" mode, each non-reference city has its own mask: hours where
 *   both it and the reference are awake. The reference row gets the union
 *   of all those masks so users can see its visible availability envelope.
 */
export function computeRows(
  cities: City[],
  mode: Mode,
  settings: Settings,
  now: Date = new Date(),
): { rows: CityRow[]; globalOverlap: boolean[]; perCityOverlap: Record<string, boolean[]> } {
  if (cities.length === 0) {
    return { rows: [], globalOverlap: Array(24).fill(false), perCityOverlap: {} };
  }

  const ref = cities[0];
  const { wakeHour, sleepHour } = settings;

  // Precompute awake status per city, per reference hour.
  const awakeMap: Record<string, boolean[]> = {};
  const localMinutesMap: Record<string, number[]> = {};
  for (const city of cities) {
    const awakeArr: boolean[] = [];
    const localArr: number[] = [];
    for (let h = 0; h < 24; h++) {
      const local = localMinutesInCity(h, ref.timezone, city.timezone, now);
      localArr.push(local);
      awakeArr.push(isAwake(local, wakeHour, sleepHour));
    }
    awakeMap[city.id] = awakeArr;
    localMinutesMap[city.id] = localArr;
  }

  let globalOverlap: boolean[] = Array(24).fill(false);
  const perCityOverlap: Record<string, boolean[]> = {};

  if (mode === "meeting") {
    for (let h = 0; h < 24; h++) {
      globalOverlap[h] = cities.every((c) => awakeMap[c.id][h]);
    }
    for (const city of cities) perCityOverlap[city.id] = globalOverlap;
  } else {
    // base mode
    const refAwake = awakeMap[ref.id];
    const refUnion: boolean[] = Array(24).fill(false);
    for (const city of cities) {
      if (city.id === ref.id) continue;
      const mask: boolean[] = [];
      for (let h = 0; h < 24; h++) {
        const overlap = refAwake[h] && awakeMap[city.id][h];
        mask.push(overlap);
        if (overlap) refUnion[h] = true;
      }
      perCityOverlap[city.id] = mask;
    }
    perCityOverlap[ref.id] = refUnion;
    // In base mode, there's no single "global" overlap; components consume
    // perCityOverlap directly.
    globalOverlap = Array(24).fill(false);
  }

  const rows: CityRow[] = cities.map((city) => {
    const mask = perCityOverlap[city.id];
    const cells: HourCell[] = [];
    for (let h = 0; h < 24; h++) {
      cells.push({
        refHour: h,
        localMinutes: localMinutesMap[city.id][h],
        awake: awakeMap[city.id][h],
        overlap: mask[h],
      });
    }
    return {
      city,
      isRef: city.id === ref.id,
      cells,
      overlapMask: mask,
    };
  });

  return { rows, globalOverlap, perCityOverlap };
}
