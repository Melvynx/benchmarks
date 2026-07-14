export function getUtcOffsetMinutes(timezone: string, date: Date = new Date()): number {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const localStr = date.toLocaleString("en-US", { timeZone: timezone });
  const utcDate = new Date(utcStr);
  const localDate = new Date(localStr);
  return Math.round((localDate.getTime() - utcDate.getTime()) / 60000);
}

export function formatUtcOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return minutes === 0 ? `UTC${sign}${hours}` : `UTC${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

export function getLocalHour(refHour: number, refOffsetMin: number, targetOffsetMin: number): number {
  const diff = targetOffsetMin - refOffsetMin;
  const diffHours = diff / 60;
  let localHour = refHour + diffHours;

  // Handle fractional hours by rounding to nearest displayable value
  localHour = Math.floor(localHour * 100) / 100;

  // Normalize to 0-23 range
  while (localHour < 0) localHour += 24;
  while (localHour >= 24) localHour -= 24;
  return localHour;
}

export function formatHour(hour: number, use12h: boolean): string {
  const wholeHour = Math.floor(hour);
  const fraction = hour - wholeHour;
  const minutes = Math.round(fraction * 60);

  if (use12h) {
    const period = wholeHour >= 12 ? "p" : "a";
    const h12 = wholeHour === 0 ? 12 : wholeHour > 12 ? wholeHour - 12 : wholeHour;
    return minutes > 0 ? `${h12}:${String(minutes).padStart(2, "0")}${period}` : `${h12}${period}`;
  }

  return minutes > 0
    ? `${String(wholeHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
    : `${String(wholeHour).padStart(2, "0")}`;
}

export function isAwake(localHour: number, wakeHour: number, sleepHour: number): boolean {
  const h = Math.floor(localHour);
  if (wakeHour <= sleepHour) {
    // Normal range: e.g. 7-23
    return h >= wakeHour && h < sleepHour;
  }
  // Overnight range: e.g. 22-6
  return h >= wakeHour || h < sleepHour;
}

export interface OverlapRange {
  start: number;
  end: number;
}

export function computeMeetingOverlap(
  cityOffsets: number[],
  refOffset: number,
  wakeHour: number,
  sleepHour: number
): number[] {
  const overlapHours: number[] = [];

  for (let refH = 0; refH < 24; refH++) {
    let allAwake = true;
    for (const offset of cityOffsets) {
      const localH = getLocalHour(refH, refOffset, offset);
      if (!isAwake(localH, wakeHour, sleepHour)) {
        allAwake = false;
        break;
      }
    }
    if (allAwake) overlapHours.push(refH);
  }

  return overlapHours;
}

export function computeBaseOverlap(
  refOffset: number,
  targetOffset: number,
  wakeHour: number,
  sleepHour: number
): number[] {
  const overlapHours: number[] = [];

  for (let refH = 0; refH < 24; refH++) {
    const refLocal = getLocalHour(refH, refOffset, refOffset);
    const targetLocal = getLocalHour(refH, refOffset, targetOffset);
    if (isAwake(refLocal, wakeHour, sleepHour) && isAwake(targetLocal, wakeHour, sleepHour)) {
      overlapHours.push(refH);
    }
  }

  return overlapHours;
}

export function hoursToRanges(hours: number[]): OverlapRange[] {
  if (hours.length === 0) return [];

  const sorted = [...hours].sort((a, b) => a - b);
  const ranges: OverlapRange[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
    } else {
      ranges.push({ start, end: prev + 1 });
      start = sorted[i];
      prev = sorted[i];
    }
  }
  ranges.push({ start, end: prev + 1 });

  return ranges;
}

export function formatRange(range: OverlapRange, use12h: boolean): string {
  const startStr = formatHour(range.start, use12h);
  const endHour = range.end >= 24 ? range.end - 24 : range.end;
  const endStr = formatHour(endHour, use12h);
  return `${startStr} – ${endStr}`;
}
