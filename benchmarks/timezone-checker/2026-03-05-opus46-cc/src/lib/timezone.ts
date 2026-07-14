export function getUtcOffsetMinutes(timezone: string, date: Date = new Date()): number {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const localStr = date.toLocaleString("en-US", { timeZone: timezone });
  const utcDate = new Date(utcStr);
  const localDate = new Date(localStr);
  return Math.round((localDate.getTime() - utcDate.getTime()) / 60000);
}

export function formatUtcOffset(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(m).padStart(2, "0")}`;
}

export function getLocalHour(refHour: number, refOffsetMin: number, cityOffsetMin: number): number {
  const diff = cityOffsetMin - refOffsetMin;
  const diffHours = diff / 60;
  let localHour = refHour + diffHours;
  // Handle fractional hours - round to nearest 0.25 for display
  localHour = Math.round(localHour * 4) / 4;
  // Wrap around 24
  return ((localHour % 24) + 24) % 24;
}

export function formatHour(hour: number, use12h: boolean): string {
  const wholeHour = Math.floor(hour);
  const fraction = hour - wholeHour;
  const minutes = Math.round(fraction * 60);
  const minuteStr = minutes > 0 ? `:${String(minutes).padStart(2, "0")}` : "";

  if (!use12h) {
    return `${String(wholeHour).padStart(2, "0")}${minuteStr}`;
  }

  if (wholeHour === 0) return `12${minuteStr}a`;
  if (wholeHour < 12) return `${wholeHour}${minuteStr}a`;
  if (wholeHour === 12) return `12${minuteStr}p`;
  return `${wholeHour - 12}${minuteStr}p`;
}

export function isAwake(hour: number, wakeUp: number, sleepAt: number): boolean {
  const h = Math.floor(hour);
  if (wakeUp <= sleepAt) {
    return h >= wakeUp && h < sleepAt;
  }
  // Overnight: e.g. wake at 22, sleep at 6
  return h >= wakeUp || h < sleepAt;
}

export type OverlapResult = {
  hours: number[];
  ranges: { start: number; end: number }[];
};

export function computeMeetingOverlap(
  cityOffsets: number[],
  refOffset: number,
  wakeUp: number,
  sleepAt: number
): OverlapResult {
  const overlapHours: number[] = [];

  for (let refHour = 0; refHour < 24; refHour++) {
    let allAwake = true;
    for (const offset of cityOffsets) {
      const localHour = getLocalHour(refHour, refOffset, offset);
      if (!isAwake(localHour, wakeUp, sleepAt)) {
        allAwake = false;
        break;
      }
    }
    if (allAwake) overlapHours.push(refHour);
  }

  return { hours: overlapHours, ranges: hoursToRanges(overlapHours) };
}

export function computeBaseOverlap(
  refOffset: number,
  cityOffset: number,
  wakeUp: number,
  sleepAt: number
): OverlapResult {
  return computeMeetingOverlap([refOffset, cityOffset], refOffset, wakeUp, sleepAt);
}

function hoursToRanges(hours: number[]): { start: number; end: number }[] {
  if (hours.length === 0) return [];

  const sorted = [...hours].sort((a, b) => a - b);
  const ranges: { start: number; end: number }[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
    } else {
      ranges.push({ start, end: (prev + 1) % 24 });
      start = sorted[i];
      prev = sorted[i];
    }
  }
  ranges.push({ start, end: (prev + 1) % 24 });

  // Check if we can merge last and first range (wrapping around midnight)
  if (ranges.length >= 2) {
    const first = ranges[0];
    const last = ranges[ranges.length - 1];
    if (last.end === first.start || (last.end === 0 && first.start === 0)) {
      ranges[0] = { start: last.start, end: first.end };
      ranges.pop();
    }
  }

  return ranges;
}

export function formatRange(start: number, end: number, use12h: boolean): string {
  return `${formatHour(start, use12h)} - ${formatHour(end, use12h)}`;
}
