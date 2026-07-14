export function getUtcOffsetMinutes(timezone: string, date: Date = new Date()): number {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = date.toLocaleString("en-US", { timeZone: timezone });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
}

export function formatUtcOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  return `UTC${sign}${hours}${minutes > 0 ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}

export function getLocalHour(timezone: string, date: Date = new Date()): number {
  return parseInt(
    date.toLocaleString("en-US", { timeZone: timezone, hour: "numeric", hour12: false }),
    10
  );
}

export function formatTime(
  timezone: string,
  format: "12h" | "24h",
  date: Date = new Date()
): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: format === "12h",
  };
  return date.toLocaleString("en-US", options);
}

export function getOverlapHours(
  primaryTimezone: string,
  targetTimezone: string,
  workStart: number,
  workEnd: number
): Set<number> {
  const now = new Date();
  const primaryOffset = getUtcOffsetMinutes(primaryTimezone, now);
  const targetOffset = getUtcOffsetMinutes(targetTimezone, now);
  const diffMinutes = targetOffset - primaryOffset;
  const diffHours = diffMinutes / 60;

  const overlapHours = new Set<number>();

  for (let h = workStart; h < workEnd; h++) {
    let targetHour = h + diffHours;
    targetHour = ((targetHour % 24) + 24) % 24;
    overlapHours.add(Math.floor(targetHour));
  }

  return overlapHours;
}

export function isNightHour(hour: number): boolean {
  return hour >= 0 && hour < 7 || hour >= 20;
}

export function isWakeupHour(hour: number, wakeStart: number, wakeEnd: number): boolean {
  if (wakeStart < wakeEnd) {
    return hour >= wakeStart && hour < wakeEnd;
  }
  return hour >= wakeStart || hour < wakeEnd;
}

export function getCurrentDate(timezone: string, date: Date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York";
  }
}
