import { DateTime } from "luxon";
import { CITY_INDEX, DEFAULT_CITY_IDS } from "@/lib/city-catalog";
import type { AppMode, AppState, CatalogCity, CityRow, SummaryEntry, TimeFormat } from "@/lib/types";

function getReferenceSlots(referenceTimeZone: string) {
  const referenceStart = DateTime.now().setZone(referenceTimeZone).startOf("day");
  return Array.from({ length: 24 }, (_, hour) => referenceStart.plus({ hours: hour }));
}

function formatHour(dt: DateTime, timeFormat: TimeFormat, compact = false) {
  if (timeFormat === "24h") {
    return compact ? dt.toFormat("HH") : dt.toFormat("HH:mm");
  }

  if (compact) {
    return dt.toFormat("ha").toLowerCase();
  }

  return dt.minute === 0 ? dt.toFormat("ha").toLowerCase() : dt.toFormat("h:mma").toLowerCase();
}

function getDayShiftLabel(local: DateTime, reference: DateTime) {
  const localDate = DateTime.fromISO(local.toISODate() ?? "", { zone: "utc" });
  const referenceDate = DateTime.fromISO(reference.toISODate() ?? "", { zone: "utc" });
  const dayDiff = Math.round(localDate.diff(referenceDate, "days").days);

  if (dayDiff === -1) {
    return "-1d";
  }

  if (dayDiff === 1) {
    return "+1d";
  }

  return null;
}

function isAwake(minutes: number, wakeHour: number, sleepHour: number) {
  const wakeMinutes = wakeHour * 60;
  const sleepMinutes = sleepHour * 60;

  if (wakeMinutes === sleepMinutes) {
    return true;
  }

  if (wakeMinutes < sleepMinutes) {
    return minutes >= wakeMinutes && minutes < sleepMinutes;
  }

  return minutes >= wakeMinutes || minutes < sleepMinutes;
}

function collectRanges(activeHours: boolean[]) {
  const ranges: Array<{ start: number; end: number }> = [];
  let rangeStart: number | null = null;

  activeHours.forEach((isActive, hour) => {
    if (isActive && rangeStart === null) {
      rangeStart = hour;
      return;
    }

    if (!isActive && rangeStart !== null) {
      ranges.push({ start: rangeStart, end: hour });
      rangeStart = null;
    }
  });

  if (rangeStart !== null) {
    ranges.push({ start: rangeStart, end: 24 });
  }

  return ranges;
}

function formatRange(
  range: { start: number; end: number },
  referenceTimeZone: string,
  timeFormat: TimeFormat,
) {
  const referenceStart = DateTime.now().setZone(referenceTimeZone).startOf("day");
  const start = referenceStart.plus({ hours: range.start });
  const end = referenceStart.plus({ hours: range.end });
  return `${formatHour(start, timeFormat)} - ${formatHour(end, timeFormat)}`;
}

function buildAwakeMap(cities: CatalogCity[], wakeHour: number, sleepHour: number) {
  const referenceSlots = getReferenceSlots(cities[0].timeZone);

  return cities.map((city) =>
    referenceSlots.map((slot) => {
      const local = slot.setZone(city.timeZone);
      const minutes = local.hour * 60 + local.minute;
      return isAwake(minutes, wakeHour, sleepHour);
    }),
  );
}

export function formatUtcOffset(timeZone: string) {
  const now = DateTime.now().setZone(timeZone);
  const totalMinutes = now.offset;
  const sign = totalMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(totalMinutes);
  const hours = Math.floor(absoluteMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (absoluteMinutes % 60).toString().padStart(2, "0");
  return `UTC${sign}${hours}:${minutes}`;
}

export function buildCityRows(
  cities: CatalogCity[],
  mode: AppMode,
  wakeHour: number,
  sleepHour: number,
  timeFormat: TimeFormat,
): CityRow[] {
  if (!cities.length) {
    return [];
  }

  const referenceCity = cities[0];
  const referenceSlots = getReferenceSlots(referenceCity.timeZone);
  const awakeMap = buildAwakeMap(cities, wakeHour, sleepHour);
  const meetingOverlap = referenceSlots.map((_, hour) => awakeMap.every((cityHours) => cityHours[hour]));
  const referencePairUnion = referenceSlots.map((_, hour) =>
    awakeMap.slice(1).some((cityHours) => awakeMap[0][hour] && cityHours[hour]),
  );

  return cities.map((city, cityIndex) => {
    const overlapHours =
      mode === "meeting"
        ? meetingOverlap
        : cityIndex === 0
          ? referencePairUnion
          : referenceSlots.map((_, hour) => awakeMap[0][hour] && awakeMap[cityIndex][hour]);

    return {
      city,
      isReference: cityIndex === 0,
      offsetLabel: formatUtcOffset(city.timeZone),
      cells: referenceSlots.map((slot, referenceHour) => {
        const local = slot.setZone(city.timeZone);
        return {
          referenceHour,
          referenceLabel: formatHour(slot, timeFormat, true),
          label: formatHour(local, timeFormat),
          dayShiftLabel: getDayShiftLabel(local, slot),
          isAwake: awakeMap[cityIndex][referenceHour],
          isOverlap: overlapHours[referenceHour],
        };
      }),
    };
  });
}

export function buildMeetingSummary(
  cities: CatalogCity[],
  wakeHour: number,
  sleepHour: number,
  timeFormat: TimeFormat,
): SummaryEntry {
  const awakeMap = buildAwakeMap(cities, wakeHour, sleepHour);
  const overlapHours = awakeMap[0].map((_, hour) => awakeMap.every((cityHours) => cityHours[hour]));
  const ranges = collectRanges(overlapHours);

  return {
    cityId: "meeting",
    cityName: "Meeting Mode",
    count: overlapHours.filter(Boolean).length,
    ranges: ranges.map((range) => formatRange(range, cities[0].timeZone, timeFormat)),
  };
}

export function buildPerCitySummary(
  cities: CatalogCity[],
  wakeHour: number,
  sleepHour: number,
  timeFormat: TimeFormat,
): SummaryEntry[] {
  const awakeMap = buildAwakeMap(cities, wakeHour, sleepHour);

  return cities.slice(1).map((city, index) => {
    const cityHours = awakeMap[index + 1].map((hour, hourIndex) => hour && awakeMap[0][hourIndex]);
    const ranges = collectRanges(cityHours);

    return {
      cityId: city.id,
      cityName: city.name,
      count: cityHours.filter(Boolean).length,
      ranges: ranges.map((range) => formatRange(range, cities[0].timeZone, timeFormat)),
    };
  });
}

export function sanitizeState(candidate: Partial<AppState>, fallback: AppState): AppState {
  const uniqueCityIds = Array.isArray(candidate.cityIds)
    ? Array.from(new Set(candidate.cityIds.filter((cityId) => CITY_INDEX[cityId])))
    : fallback.cityIds;
  const cityIds = uniqueCityIds.length ? uniqueCityIds : DEFAULT_CITY_IDS;
  const wakeHour =
    typeof candidate.wakeHour === "number" && candidate.wakeHour >= 0 && candidate.wakeHour <= 23
      ? candidate.wakeHour
      : fallback.wakeHour;
  const sleepHour =
    typeof candidate.sleepHour === "number" && candidate.sleepHour >= 0 && candidate.sleepHour <= 23
      ? candidate.sleepHour
      : fallback.sleepHour;
  const mode = candidate.mode === "base" ? "base" : fallback.mode;
  const timeFormat = candidate.timeFormat === "24h" ? "24h" : fallback.timeFormat;

  return {
    cityIds,
    mode,
    wakeHour,
    sleepHour,
    timeFormat,
  };
}
