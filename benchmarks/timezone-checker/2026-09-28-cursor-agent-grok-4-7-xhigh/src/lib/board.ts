import { citiesInOrder } from '../data/cities';
import type { AppState, CellState, City, Mode, RangeChip, TimeFormat } from '../types';
import {
  cityLocal,
  describeRuns,
  formatClock,
  formatOffset,
  isAwake,
  offsetMinutes,
  windowLabel,
  zoneAbbrev,
  zonedParts,
} from './time';

export type CellModel = {
  cityId: string;
  refHour: number;
  hour: number;
  minute: number;
  dayDelta: number;
  state: CellState;
  isNow: boolean;
};

export type CityRowModel = {
  city: City;
  isReference: boolean;
  offsetMinutes: number;
  offsetLabel: string;
  abbrev: string | null;
  nowLabel: string;
  cells: CellModel[];
};

export type AxisCol = {
  hour: number;
  state: CellState;
  isNow: boolean;
};

export type SummaryModel =
  | { kind: 'hidden' }
  | {
      kind: 'meeting';
      count: number;
      headline: string;
      where: string;
      ranges: RangeChip[];
      warning: string | null;
    }
  | {
      kind: 'base';
      heading: string;
      lines: Array<{
        cityId: string;
        cityName: string;
        count: number;
        detail: string;
        ranges: RangeChip[];
        warning: string | null;
      }>;
    };

export type BoardModel = {
  mode: Mode;
  format: TimeFormat;
  wake: number;
  sleep: number;
  windowLabel: string;
  rows: CityRowModel[];
  axis: AxisCol[];
  summary: SummaryModel;
  hint: string;
};

function awakeFlags(offsets: readonly number[], wake: number, sleep: number): boolean[] {
  const ref = offsets[0] ?? 0;
  return Array.from({ length: 24 }, (_, hour) =>
    offsets.every((offset) => isAwake(cityLocal(hour, ref, offset).hour, wake, sleep)),
  );
}

function countLabel(count: number, prefix = ''): string {
  const noun = count === 1 ? 'hour' : 'hours';
  return prefix ? `${count} ${prefix} ${noun}` : `${count} ${noun}`;
}

export function buildBoard(state: AppState, now: Date): BoardModel {
  const cities = citiesInOrder(state.cityIds);
  const format = state.format;
  const label = windowLabel(state.wake, state.sleep, format);
  const refCity = cities[0];
  const hint =
    state.mode === 'meeting'
      ? 'Green cells = everyone awake'
      : refCity
        ? `Green cells = awake together with ${refCity.name}`
        : 'Green cells = awake together with the reference city';

  if (!refCity) {
    return {
      mode: state.mode,
      format,
      wake: state.wake,
      sleep: state.sleep,
      windowLabel: label,
      rows: [],
      axis: [],
      summary: { kind: 'hidden' },
      hint,
    };
  }

  const refOffset = offsetMinutes(refCity.timeZone, now);
  const offsets = cities.map((city) => offsetMinutes(city.timeZone, now));
  const nowHour = zonedParts(now, refCity.timeZone).hour;
  const meeting = awakeFlags(offsets, state.wake, state.sleep);
  const refAwake = Array.from({ length: 24 }, (_, hour) => isAwake(hour, state.wake, state.sleep));

  const rows: CityRowModel[] = cities.map((city, index) => {
    const offset = offsets[index] ?? refOffset;
    const zoned = zonedParts(now, city.timeZone);
    const pair =
      index === 0
        ? refAwake.map(() => false)
        : awakeFlags([refOffset, offset], state.wake, state.sleep);
    const abbrev = zoneAbbrev(city.timeZone, now);
    return {
      city,
      isReference: index === 0,
      offsetMinutes: offset,
      offsetLabel: formatOffset(offset),
      abbrev,
      nowLabel: `${zoned.weekday} · ${formatClock(zoned.hour, zoned.minute, format)}`,
      cells: Array.from({ length: 24 }, (_, refHour) => {
        const local = cityLocal(refHour, refOffset, offset);
        const cityAwake = isAwake(local.hour, state.wake, state.sleep);
        const overlap = state.mode === 'meeting' ? meeting[refHour] === true : pair[refHour] === true;
        let visual: CellState = 'sleep';
        if (cityAwake && overlap) visual = 'overlap';
        else if (cityAwake) visual = 'awake';
        return {
          cityId: city.id,
          refHour,
          hour: local.hour,
          minute: local.minute,
          dayDelta: local.dayDelta,
          state: visual,
          isNow: refHour === nowHour,
        };
      }),
    };
  });

  const axis: AxisCol[] = Array.from({ length: 24 }, (_, hour) => {
    const everyone = meeting[hour] === true;
    const awake = refAwake[hour] === true;
    let visual: CellState = 'sleep';
    if (state.mode === 'meeting' && everyone) visual = 'overlap';
    else if (awake) visual = 'awake';
    return { hour, state: visual, isNow: hour === nowHour };
  });

  return {
    mode: state.mode,
    format,
    wake: state.wake,
    sleep: state.sleep,
    windowLabel: label,
    rows,
    axis,
    summary: summarize(state.mode, cities, offsets, state.wake, state.sleep, format),
    hint,
  };
}

function summarize(
  mode: Mode,
  cities: City[],
  offsets: number[],
  wake: number,
  sleep: number,
  format: TimeFormat,
): SummaryModel {
  const ref = cities[0];
  if (!ref || cities.length < 2) return { kind: 'hidden' };
  const refOffset = offsets[0] ?? 0;

  if (mode === 'meeting') {
    const flags = awakeFlags(offsets, wake, sleep);
    const count = flags.filter(Boolean).length;
    return {
      kind: 'meeting',
      count,
      headline: countLabel(count, 'shared'),
      where: `${ref.name} time`,
      ranges: describeRuns(flags, format),
      warning: count === 0 ? 'No shared awake hours.' : null,
    };
  }

  return {
    kind: 'base',
    heading: `Overlap with ${ref.name}`,
    lines: cities.slice(1).map((city, index) => {
      const offset = offsets[index + 1] ?? refOffset;
      const flags = awakeFlags([refOffset, offset], wake, sleep);
      const count = flags.filter(Boolean).length;
      return {
        cityId: city.id,
        cityName: city.name,
        count,
        detail: countLabel(count),
        ranges: describeRuns(flags, format),
        warning: count === 0 ? `No overlap with ${ref.name}.` : null,
      };
    }),
  };
}
