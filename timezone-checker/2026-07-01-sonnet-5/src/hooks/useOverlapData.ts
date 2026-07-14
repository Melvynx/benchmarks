import { useMemo } from "react";
import { CITY_BY_ID } from "../lib/cities";
import {
  computeAwakeFlags,
  computeBaseOverlap,
  computeLocalHours,
  computeMeetingOverlap,
  countTrue,
  getUtcOffsetMinutes,
  mergeRanges,
} from "../lib/timezone";
import type { AwakeSettings, CellState, CityComputed, Mode } from "../lib/types";
import { useTimezoneStore } from "../store/useTimezoneStore";

function buildCellStates(awakeFlags: boolean[], overlapFlags: boolean[]): CellState[] {
  return awakeFlags.map((awake, h) => {
    if (!awake) return "sleeping";
    return overlapFlags[h] ? "overlap" : "awake";
  });
}

function unionFlags(all: boolean[][]): boolean[] {
  if (all.length === 0) return Array(24).fill(false);
  return Array.from({ length: 24 }, (_, h) => all.some((flags) => flags[h]));
}

export interface OverlapData {
  mode: Mode;
  settings: AwakeSettings;
  cities: CityComputed[];
}

export function useOverlapData(): OverlapData {
  const cityIds = useTimezoneStore((state) => state.cityIds);
  const mode = useTimezoneStore((state) => state.mode);
  const settings = useTimezoneStore((state) => state.settings);

  return useMemo(() => {
    const cityDefs = cityIds.map((id) => CITY_BY_ID[id]).filter(Boolean);
    if (cityDefs.length === 0) {
      return { mode, settings, cities: [] };
    }

    const refDef = cityDefs[0];
    const refOffset = getUtcOffsetMinutes(refDef.timezone);

    const base = cityDefs.map((def) => {
      const offsetMinutes = getUtcOffsetMinutes(def.timezone);
      const localHours = computeLocalHours(offsetMinutes, refOffset);
      const awakeFlags = computeAwakeFlags(offsetMinutes, refOffset, settings.wakeHour, settings.sleepHour);
      return { def, offsetMinutes, localHours, awakeFlags };
    });

    const allAwakeFlags = base.map((b) => b.awakeFlags);
    const meetingOverlap = mode === "meeting" ? computeMeetingOverlap(allAwakeFlags) : null;

    const nonRefBaseOverlaps = mode === "base" ? base.slice(1).map((b) => computeBaseOverlap(base[0].awakeFlags, b.awakeFlags)) : [];
    const refUnionOverlap = mode === "base" ? unionFlags(nonRefBaseOverlaps) : null;

    const cities: CityComputed[] = base.map((b, index) => {
      let overlapFlags: boolean[];
      if (mode === "meeting") {
        overlapFlags = meetingOverlap as boolean[];
      } else if (index === 0) {
        overlapFlags = refUnionOverlap as boolean[];
      } else {
        overlapFlags = nonRefBaseOverlaps[index - 1];
      }

      const cellStates = buildCellStates(b.awakeFlags, overlapFlags);
      const overlapCount = countTrue(overlapFlags);
      const overlapRanges = mergeRanges(overlapFlags);

      return {
        id: b.def.id,
        name: b.def.name,
        country: b.def.country,
        timezone: b.def.timezone,
        isReference: index === 0,
        offsetMinutes: b.offsetMinutes,
        localHours: b.localHours,
        awakeFlags: b.awakeFlags,
        cellStates,
        overlapFlags,
        overlapCount,
        overlapRanges,
      };
    });

    return { mode, settings, cities };
  }, [cityIds, mode, settings]);
}
