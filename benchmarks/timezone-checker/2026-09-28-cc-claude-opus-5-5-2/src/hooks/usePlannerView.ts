import { useMemo } from "react";
import { type City, getCity } from "@/data/cities";
import { useNow } from "@/hooks/useNow";
import { buildSchedule, type Schedule } from "@/lib/schedule";
import { getUtcOffsetMinutes, getZonedParts, type ZonedParts } from "@/lib/time";
import { type PlannerData, usePlanner } from "@/state/store";

export interface PlannerView extends Pick<PlannerData, "mode" | "settings"> {
  cities: City[];
  reference: City | undefined;
  schedule: Schedule;
  /** Current wall-clock time in the reference city, or null without cities. */
  referenceNow: ZonedParts | null;
}

/** Everything the summary and both grid layouts need, derived from the persisted planner state. */
export function usePlannerView(): PlannerView {
  const cityIds = usePlanner((state) => state.cityIds);
  const mode = usePlanner((state) => state.mode);
  const settings = usePlanner((state) => state.settings);
  const now = useNow();

  return useMemo(() => {
    const cities = cityIds.map(getCity).filter((city): city is City => Boolean(city));
    const offsets = new Map(cities.map((city) => [city.id, getUtcOffsetMinutes(city.timeZone, now)]));
    const reference = cities[0];

    return {
      mode,
      settings,
      cities,
      reference,
      schedule: buildSchedule({ cities, offsets, window: settings, mode }),
      referenceNow: reference ? getZonedParts(reference.timeZone, now) : null,
    };
  }, [cityIds, mode, settings, now]);
}
