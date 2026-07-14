
export function getReferenceDayHours(tz: string): Date[] {
  const now = new Date();

  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: 'numeric', day: 'numeric'
  }).formatToParts(now);

  const d = Number(f.find((p) => p.type === 'day')!.value);

  let current = now.getTime();

  // Clean minutes/seconds for precision
  current -= (new Date(current).getUTCMinutes() * 60000 + new Date(current).getUTCSeconds() * 1000 + new Date(current).getUTCMilliseconds());

  // Step backwards (or forwards slightly if needed) to find 00:00 on day d
  // If it's hour 15 on day d, stepping backwards will find hour 0.
  // If we stepped out of day d, we went too far.
  for (let i = 0; i < 48; i++) {
    const f2 = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric', hour12: false, day: 'numeric'
    }).formatToParts(current);

    const hStr = f2.find((p) => p.type === 'hour')!.value;
    let hNum = Number(hStr);
    if (hNum === 24) hNum = 0;

    const dNum = Number(f2.find((p) => p.type === 'day')!.value);

    if (hNum === 0 && dNum === d) {
      break;
    }

    if (dNum > d) {
      // Must go back
      current -= 3600000;
    } else if (dNum < d) {
      // Very weird edge case or we started too early, go forward
      current += 3600000;
    } else {
      current -= 3600000;
    }
  }

  const dates: Date[] = [];
  for (let i = 0; i < 24; i++) {
    dates.push(new Date(current + i * 3600000));
  }
  return dates;
}

export function getHourInTimezone(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);

  const hStr = parts.find((p) => p.type === 'hour')?.value;
  if (!hStr) return date.getHours(); // fallback
  let hNum = Number(hStr);
  if (hNum === 24) hNum = 0;
  return hNum;
}

export function formatCityHour(hour: number, _tz: string, format24: boolean): string {
  // Use a dummy date locked at `hour` UTC to format (with UTC timezone)
  const dummy = new Date(Date.UTC(2020, 0, 1, hour));
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    hour: 'numeric',
    hour12: !format24,
  }).format(dummy).replace(/^0/, '12'); // Handle 0 -> 12am for 12h formats
}

export function getOffsetMinutes(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', hour12: false
  }).formatToParts(date);

  const y = Number(parts.find((p) => p.type === 'year')!.value);
  const m = Number(parts.find((p) => p.type === 'month')!.value);
  const d = Number(parts.find((p) => p.type === 'day')!.value);
  let h = Number(parts.find((p) => p.type === 'hour')!.value);
  if (h === 24) h = 0;
  const min = Number(parts.find((p) => p.type === 'minute')!.value);

  const tzWall = Date.UTC(y, m - 1, d, h, min);
  const utc = date.getTime();

  return (tzWall - utc) / 60000;
}

export function formatOffsetString(tz: string): string {
  const offsetMins = getOffsetMinutes(new Date(), tz);
  const sign = offsetMins >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMins);
  const hours = Math.floor(absOffset / 60);
  const mins = absOffset % 60;
  if (mins === 0) return `UTC${sign}${hours}`;
  return `UTC${sign}${hours}:${String(mins).padStart(2, '0')}`;
}

export function isAwake(hour: number, wake: number, sleep: number): boolean {
  if (wake < sleep) {
    return hour >= wake && hour < sleep;
  }
  return hour >= wake || hour < sleep;
}

// Find ranges of contiguous true values
export function findOverlapRanges(awakeAtHourArray: boolean[]) {
  const ranges: { start: number; end: number }[] = [];
  let inRange = false;
  let start = 0;

  for (let i = 0; i <= 24; i++) {
    const isAwakeHour = i < 24 ? awakeAtHourArray[i] : false;
    if (isAwakeHour && !inRange) {
      start = i;
      inRange = true;
    } else if (!isAwakeHour && inRange) {
      ranges.push({ start, end: i }); // end is exclusive
      inRange = false;
    }
  }

  // Handle midnight wrap-around: if it ends at 24 and starts at 0, combine them.
  if (ranges.length > 1 && ranges[ranges.length - 1].end === 24 && ranges[0].start === 0) {
    ranges[0].start = ranges[ranges.length - 1].start;
    ranges.pop();
  }

  return ranges;
}

export function getCityOffsetString(tz: string): string {
  return formatOffsetString(tz);
}

export function formatHour(hour: number, format24: boolean): string {
  if (format24) return `${String(hour).padStart(2, '0')}:00`;
  const suffix = hour >= 12 ? 'pm' : 'am';
  let h = hour % 12;
  if (h === 0) h = 12;
  return `${h}${suffix}`;
}
