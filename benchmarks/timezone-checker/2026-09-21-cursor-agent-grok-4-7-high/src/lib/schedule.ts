import type { LocalTime, TimeRange } from "../types";

export function localParts(refOffset: number, cityOffset: number, refHour: number): LocalTime {
  const total = refHour * 60 + (cityOffset - refOffset);
  const mod = ((total % 1440) + 1440) % 1440;
  return { hour: Math.floor(mod / 60), minute: mod % 60 };
}

export function isAwake(hour: number, wake: number, sleep: number): boolean {
  if (wake === sleep) return true;
  if (wake < sleep) return hour >= wake && hour < sleep;
  return hour >= wake || hour < sleep;
}

export function awakeMask(refOffset: number, cityOffset: number, wake: number, sleep: number): boolean[] {
  return Array.from({ length: 24 }, (_, hour) =>
    isAwake(localParts(refOffset, cityOffset, hour).hour, wake, sleep),
  );
}

export function meetingMask(offsets: number[], wake: number, sleep: number): boolean[] {
  if (offsets.length === 0) return Array(24).fill(false);
  const masks = offsets.map((offset) => awakeMask(offsets[0], offset, wake, sleep));
  return Array.from({ length: 24 }, (_, hour) => masks.every((mask) => mask[hour]));
}

export function baseMask(refOffset: number, cityOffset: number, wake: number, sleep: number): boolean[] {
  const reference = awakeMask(refOffset, refOffset, wake, sleep);
  const city = awakeMask(refOffset, cityOffset, wake, sleep);
  return reference.map((awake, hour) => awake && city[hour]);
}

export function maskToRanges(mask: boolean[]): TimeRange[] {
  const hours = mask.flatMap((on, hour) => (on ? [hour] : []));
  if (hours.length === 0) return [];
  if (hours.length === 24) return [{ start: 0, end: 24 }];

  const ranges: TimeRange[] = [];
  let start = hours[0];
  let prev = hours[0];
  for (let index = 1; index < hours.length; index += 1) {
    const hour = hours[index];
    if (hour === prev + 1) {
      prev = hour;
      continue;
    }
    ranges.push({ start, end: prev + 1 });
    start = hour;
    prev = hour;
  }
  ranges.push({ start, end: prev + 1 });

  if (ranges.length > 1 && ranges[0].start === 0 && ranges[ranges.length - 1].end === 24) {
    const tail = ranges.pop();
    const head = ranges.shift();
    if (tail && head) ranges.unshift({ start: tail.start, end: head.end });
  }

  ranges.sort((a, b) => a.start - b.start);
  return ranges;
}

export function awakeHourMask(wake: number, sleep: number): boolean[] {
  return Array.from({ length: 24 }, (_, hour) => isAwake(hour, wake, sleep));
}
