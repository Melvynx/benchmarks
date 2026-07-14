import type { EarthquakeEvent, TimeRangeKey } from "../types/earthquake";

export interface TimelineBucket {
  index: number;
  startMs: number;
  endMs: number;
  count: number;
  maxMag: number | null;
  eventIds: string[];
}

const BUCKET_COUNT: Record<TimeRangeKey, number> = {
  hour: 12,
  day: 24,
  week: 42,
  month: 30,
};

export function rangeDurationMs(range: TimeRangeKey): number {
  switch (range) {
    case "hour":
      return 60 * 60_000;
    case "day":
      return 24 * 60 * 60_000;
    case "week":
      return 7 * 24 * 60 * 60_000;
    case "month":
      return 30 * 24 * 60 * 60_000;
  }
}

export function buildTimeline(events: EarthquakeEvent[], range: TimeRangeKey, nowMs: number): TimelineBucket[] {
  const duration = rangeDurationMs(range);
  const bucketCount = BUCKET_COUNT[range];
  const startMs = nowMs - duration;
  const bucketMs = duration / bucketCount;

  const buckets: TimelineBucket[] = Array.from({ length: bucketCount }, (_, i) => ({
    index: i,
    startMs: startMs + i * bucketMs,
    endMs: startMs + (i + 1) * bucketMs,
    count: 0,
    maxMag: null,
    eventIds: [],
  }));

  for (const e of events) {
    if (e.timeMs < startMs || e.timeMs > nowMs) continue;
    let idx = Math.floor((e.timeMs - startMs) / bucketMs);
    idx = Math.min(bucketCount - 1, Math.max(0, idx));
    const b = buckets[idx];
    b.count += 1;
    b.eventIds.push(e.id);
    if (e.magnitude !== null && (b.maxMag === null || e.magnitude > b.maxMag)) b.maxMag = e.magnitude;
  }

  return buckets;
}
