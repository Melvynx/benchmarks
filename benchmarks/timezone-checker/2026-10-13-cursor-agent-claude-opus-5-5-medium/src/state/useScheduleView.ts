import { useMemo } from "react";
import { getCity, type City } from "../lib/cities";
import { buildSchedule, type HourRange, type Schedule } from "../lib/schedule";
import { formatHour, formatTime, getUtcOffsetMinutes, getZonedParts, mod, weekdayAfter } from "../lib/time";
import type { AppState } from "./appState";

export interface ScheduleView extends Schedule {
  reference: City | null;
  /** Current hour in the reference city, i.e. the "now" column. */
  nowHour: number | null;
  /** Current local time label per city id, e.g. "Wed 7:26am". */
  nowLabels: Record<string, string>;
  dayLabel: (dayShift: number) => string;
  formatRange: (range: HourRange) => string;
  /** The same range expressed in each non-reference city's local time. */
  describeRangeLocally: (range: HourRange) => string;
}

export function useScheduleView(state: AppState, now: Date): ScheduleView {
  const { cityIds, mode, settings } = state;
  const { wakeHour, sleepHour, timeFormat } = settings;
  const minuteKey = Math.floor(now.getTime() / 60_000);

  return useMemo(() => {
    const date = new Date(minuteKey * 60_000);
    const cities = cityIds
      .map((id) => getCity(id))
      .filter((city): city is City => !!city)
      .map((city) => ({ city, offsetMinutes: getUtcOffsetMinutes(city.timeZone, date) }));

    const schedule = buildSchedule({ cities, mode, wakeHour, sleepHour });
    const reference = cities[0]?.city ?? null;
    const refParts = reference ? getZonedParts(date, reference.timeZone) : null;

    const nowLabels: Record<string, string> = {};
    for (const { city } of cities) {
      const p = getZonedParts(date, city.timeZone);
      nowLabels[city.id] = `${p.weekday} ${formatTime(p.hour * 60 + p.minute, timeFormat)}`;
    }

    const formatRange = (range: HourRange) =>
      range.length === 24 ? "All day" : `${formatHour(range.start, timeFormat)} — ${formatHour(range.end, timeFormat)}`;

    const refOffset = cities[0]?.offsetMinutes ?? 0;
    const describeRangeLocally = (range: HourRange) =>
      cities
        .slice(1)
        .map(({ city, offsetMinutes }) => {
          const start = mod(range.start * 60 - refOffset + offsetMinutes, 24 * 60);
          const end = start + range.length * 60;
          return `${city.name}: ${formatTime(start, timeFormat)} — ${formatTime(end, timeFormat)}`;
        })
        .join("\n");

    return {
      ...schedule,
      reference,
      nowHour: refParts?.hour ?? null,
      nowLabels,
      dayLabel: (dayShift: number) => (refParts ? weekdayAfter(refParts, dayShift) : ""),
      formatRange,
      describeRangeLocally,
    };
  }, [cityIds, mode, wakeHour, sleepHour, timeFormat, minuteKey]);
}
