import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { getCity } from "@/lib/cities";
import { buildSchedule, type Schedule } from "@/lib/overlap";
import { getUtcOffsetMinutes, getWallClock, type WallClock } from "@/lib/timezone";
import { usePreferences } from "@/state/preferences";

export interface ScheduleView extends Schedule {
  /** Reference city's wall clock right now; anchors the grid's "today" and the now-line. */
  referenceClock: WallClock | null;
}

export function useSchedule(now: Date): ScheduleView {
  const { cityIds, wakeHour, sleepHour, mode } = usePreferences(
    useShallow(({ cityIds, wakeHour, sleepHour, mode }) => ({ cityIds, wakeHour, sleepHour, mode })),
  );

  // Offsets only change on DST boundaries, so recomputing once per minute tick is plenty.
  const minuteKey = Math.floor(now.getTime() / 60_000);

  return useMemo(() => {
    const instant = new Date(minuteKey * 60_000);
    const cities = cityIds.flatMap((id) => {
      const city = getCity(id);
      return city ? [{ city, offsetMinutes: getUtcOffsetMinutes(city.timeZone, instant) }] : [];
    });
    const schedule = buildSchedule({ cities, wakeHour, sleepHour, mode });
    const reference = cities[0];
    return {
      ...schedule,
      referenceClock: reference ? getWallClock(instant, reference.offsetMinutes) : null,
    };
  }, [cityIds, wakeHour, sleepHour, mode, minuteKey]);
}
