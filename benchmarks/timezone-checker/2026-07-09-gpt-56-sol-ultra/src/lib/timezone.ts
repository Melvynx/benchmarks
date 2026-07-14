import type {
  AppMode,
  City,
  ComparisonModel,
  HourCell,
  TimeFormat,
  TimeRange,
} from '../types';

const DAY_MINUTES = 24 * 60;
const HOURS_PER_DAY = 24;
const offsetFormatters = new Map<string, Intl.DateTimeFormat>();

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function getOffsetFormatter(timeZone: string): Intl.DateTimeFormat {
  const cachedFormatter = offsetFormatters.get(timeZone);
  if (cachedFormatter) return cachedFormatter;

  const formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  offsetFormatters.set(timeZone, formatter);
  return formatter;
}

export function getTimeZoneOffsetMinutes(timeZone: string, date: Date): number {
  const roundedDate = new Date(Math.floor(date.getTime() / 60_000) * 60_000);
  const parts = getOffsetFormatter(timeZone).formatToParts(roundedDate);
  const partValues = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const zonedTimeAsUtc = Date.UTC(
    Number(partValues.year),
    Number(partValues.month) - 1,
    Number(partValues.day),
    Number(partValues.hour),
    Number(partValues.minute),
  );

  return Math.round((zonedTimeAsUtc - roundedDate.getTime()) / 60_000);
}

export function getLocalMinute(
  referenceHour: number,
  cityOffsetMinutes: number,
  referenceOffsetMinutes: number,
): { localMinute: number; dayDelta: number } {
  const rawMinute = referenceHour * 60 + cityOffsetMinutes - referenceOffsetMinutes;
  return {
    localMinute: positiveModulo(rawMinute, DAY_MINUTES),
    dayDelta: Math.floor(rawMinute / DAY_MINUTES),
  };
}

export function isMinuteAwake(localMinute: number, wakeHour: number, sleepHour: number): boolean {
  const wakeMinute = wakeHour * 60;
  const sleepMinute = sleepHour * 60;

  if (wakeMinute === sleepMinute) return true;
  if (wakeMinute < sleepMinute) {
    return localMinute >= wakeMinute && localMinute < sleepMinute;
  }

  return localMinute >= wakeMinute || localMinute < sleepMinute;
}

function buildBaseCells(
  cityOffsetMinutes: number,
  referenceOffsetMinutes: number,
  wakeHour: number,
  sleepHour: number,
): Omit<HourCell, 'isOverlap'>[] {
  return Array.from({ length: HOURS_PER_DAY }, (_, referenceHour) => {
    const { localMinute, dayDelta } = getLocalMinute(
      referenceHour,
      cityOffsetMinutes,
      referenceOffsetMinutes,
    );
    return {
      referenceHour,
      localMinute,
      dayDelta,
      isAwake: isMinuteAwake(localMinute, wakeHour, sleepHour),
    };
  });
}

export function buildComparisonModel(
  cities: City[],
  mode: AppMode,
  wakeHour: number,
  sleepHour: number,
  date: Date,
): ComparisonModel | null {
  const referenceCity = cities[0];
  if (!referenceCity) return null;

  const offsets = Object.fromEntries(
    cities.map((city) => [city.id, getTimeZoneOffsetMinutes(city.timeZone, date)]),
  );
  const referenceOffset = offsets[referenceCity.id];
  const baseCellsByCityId = Object.fromEntries(
    cities.map((city) => [
      city.id,
      buildBaseCells(offsets[city.id], referenceOffset, wakeHour, sleepHour),
    ]),
  );

  const meetingHours = cities.length < 2
    ? []
    : Array.from({ length: HOURS_PER_DAY }, (_, hour) => hour).filter((hour) =>
        cities.every((city) => baseCellsByCityId[city.id][hour].isAwake),
      );
  const baseHoursByCityId = Object.fromEntries(
    cities.slice(1).map((city) => [
      city.id,
      Array.from({ length: HOURS_PER_DAY }, (_, hour) => hour).filter(
        (hour) =>
          baseCellsByCityId[referenceCity.id][hour].isAwake &&
          baseCellsByCityId[city.id][hour].isAwake,
      ),
    ]),
  );

  const meetingHourSet = new Set(meetingHours);
  const timelines = cities.map((city, cityIndex) => {
    const baseHourSet = new Set(baseHoursByCityId[city.id] ?? []);
    return {
      city,
      offsetMinutes: offsets[city.id],
      cells: baseCellsByCityId[city.id].map((cell) => ({
        ...cell,
        isOverlap:
          mode === 'meeting'
            ? meetingHourSet.has(cell.referenceHour)
            : cityIndex > 0 && baseHourSet.has(cell.referenceHour),
      })),
    };
  });

  return { referenceCity, timelines, meetingHours, baseHoursByCityId };
}

export function groupHoursIntoRanges(hours: number[]): TimeRange[] {
  const includedHours = new Set(hours);
  if (includedHours.size === 0) return [];
  if (includedHours.size === HOURS_PER_DAY) return [{ startHour: 0, endHour: 24 }];

  return Array.from({ length: HOURS_PER_DAY }, (_, hour) => hour)
    .filter(
      (hour) =>
        includedHours.has(hour) &&
        !includedHours.has(positiveModulo(hour - 1, HOURS_PER_DAY)),
    )
    .map((startHour) => {
      let length = 1;
      while (includedHours.has(positiveModulo(startHour + length, HOURS_PER_DAY))) {
        length += 1;
      }
      return { startHour, endHour: startHour + length };
    });
}

export function formatUtcOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '−';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60).toString().padStart(2, '0');
  const minutes = (absoluteMinutes % 60).toString().padStart(2, '0');
  return `UTC${sign}${hours}:${minutes}`;
}

export function formatCellTime(localMinute: number, timeFormat: TimeFormat): string {
  const hour = Math.floor(localMinute / 60);
  const minute = localMinute % 60;
  const minuteLabel = minute === 0 ? '' : `:${minute.toString().padStart(2, '0')}`;

  if (timeFormat === '24h') {
    return `${hour.toString().padStart(2, '0')}${minuteLabel}`;
  }

  const twelveHour = hour % 12 || 12;
  return `${twelveHour}${minuteLabel}${hour < 12 ? 'a' : 'p'}`;
}

export function formatFullTime(localMinute: number, timeFormat: TimeFormat): string {
  const hour = Math.floor(localMinute / 60);
  const minute = localMinute % 60;
  const minuteLabel = minute.toString().padStart(2, '0');

  if (timeFormat === '24h') {
    return `${hour.toString().padStart(2, '0')}:${minuteLabel}`;
  }

  return `${hour % 12 || 12}:${minuteLabel} ${hour < 12 ? 'AM' : 'PM'}`;
}

function formatSummaryHour(hour: number, timeFormat: TimeFormat, isEnd: boolean): string {
  if (timeFormat === '24h' && isEnd && hour === 24) return '24:00';

  const normalizedHour = positiveModulo(hour, HOURS_PER_DAY);
  if (timeFormat === '24h') return `${normalizedHour.toString().padStart(2, '0')}:00`;
  return `${normalizedHour % 12 || 12}${normalizedHour < 12 ? 'am' : 'pm'}`;
}

export function formatTimeRange(range: TimeRange, timeFormat: TimeFormat): string {
  if (range.startHour === 0 && range.endHour === 24) return 'All day';

  const start = formatSummaryHour(range.startHour, timeFormat, false);
  const end = formatSummaryHour(range.endHour, timeFormat, true);
  const nextDay = range.endHour > 24 ? ' (+1 day)' : '';
  return `${start} — ${end}${nextDay}`;
}

export function formatHourOption(hour: number, timeFormat: TimeFormat): string {
  return formatSummaryHour(hour, timeFormat, false);
}

export function getTimeCellState(cell: HourCell): 'sleeping' | 'awake' | 'overlap' {
  if (cell.isOverlap) return 'overlap';
  return cell.isAwake ? 'awake' : 'sleeping';
}

export function getTimeCellDescription(cell: HourCell, timeFormat: TimeFormat): string {
  const state = getTimeCellState(cell);
  const dayLabel = cell.dayDelta > 0 ? ', next day' : cell.dayDelta < 0 ? ', previous day' : '';
  return `${formatFullTime(cell.localMinute, timeFormat)}${dayLabel}; ${state}`;
}

export function getDayPhase(hour: number): 'night' | 'dawn' | 'day' | 'dusk' {
  if (hour < 6 || hour >= 21) return 'night';
  if (hour < 9) return 'dawn';
  if (hour < 18) return 'day';
  return 'dusk';
}
