export function getUtcOffsetMinutes(timezone: string): number {
  const now = new Date();
  const utcStr = now.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = now.toLocaleString("en-US", { timeZone: timezone });
  return Math.round(
    (new Date(tzStr).getTime() - new Date(utcStr).getTime()) / 60000,
  );
}

export function formatUtcOffset(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0
    ? `UTC${sign}${h}`
    : `UTC${sign}${h}:${String(m).padStart(2, "0")}`;
}

export function getLocalHourFractional(
  refOffsetMin: number,
  targetOffsetMin: number,
  refHour: number,
): number {
  const diffMin = targetOffsetMin - refOffsetMin;
  const localMin = refHour * 60 + diffMin;
  return (((localMin % 1440) + 1440) % 1440) / 60;
}

export function isAwake(
  hourFrac: number,
  wake: number,
  sleep: number,
): boolean {
  if (wake <= sleep) return hourFrac >= wake && hourFrac < sleep;
  return hourFrac >= wake || hourFrac < sleep;
}

export function formatHour(
  hourFrac: number,
  format: "12h" | "24h",
): string {
  const totalMin = Math.round(hourFrac * 60) % 1440;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  if (format === "24h") {
    return m === 0 ? `${h}` : `${h}:${String(m).padStart(2, "0")}`;
  }

  const period = h >= 12 ? "p" : "a";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0
    ? `${h12}${period}`
    : `${h12}:${String(m).padStart(2, "0")}${period}`;
}

function formatRangeHour(h: number, format: "12h" | "24h"): string {
  if (format === "24h") return `${String(h).padStart(2, "0")}:00`;
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

export function computeMeetingOverlap(
  refOffsetMin: number,
  allOffsetsMin: number[],
  wake: number,
  sleep: number,
): boolean[] {
  return Array.from({ length: 24 }, (_, h) =>
    allOffsetsMin.every((offset) =>
      isAwake(getLocalHourFractional(refOffsetMin, offset, h), wake, sleep),
    ),
  );
}

export function computeBaseOverlap(
  refOffsetMin: number,
  targetOffsetMin: number,
  wake: number,
  sleep: number,
): boolean[] {
  return Array.from({ length: 24 }, (_, h) =>
    isAwake(h, wake, sleep) &&
    isAwake(
      getLocalHourFractional(refOffsetMin, targetOffsetMin, h),
      wake,
      sleep,
    ),
  );
}

export function overlapToRanges(
  overlap: boolean[],
  format: "12h" | "24h",
): string[] {
  const count = overlap.filter(Boolean).length;
  if (count === 0) return [];
  if (count === 24) return ["All day"];

  const raw: { start: number; end: number }[] = [];
  let start: number | null = null;

  for (let h = 0; h < 24; h++) {
    if (overlap[h] && start === null) start = h;
    else if (!overlap[h] && start !== null) {
      raw.push({ start, end: h });
      start = null;
    }
  }
  if (start !== null) raw.push({ start, end: 24 });

  if (
    raw.length >= 2 &&
    raw[0].start === 0 &&
    raw[raw.length - 1].end === 24
  ) {
    const last = raw.pop()!;
    const first = raw.shift()!;
    raw.push({ start: last.start, end: first.end });
  }

  return raw.map(
    ({ start, end }) =>
      `${formatRangeHour(start, format)} - ${formatRangeHour(end % 24, format)}`,
  );
}
