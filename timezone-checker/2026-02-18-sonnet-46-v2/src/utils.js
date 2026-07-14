export function getLocalHour(timezone) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hourPart = parts.find((p) => p.type === "hour");
  return parseInt(hourPart.value, 10) % 24;
}

export function getUTCOffset(timezone) {
  const now = new Date();
  const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const diff = (tzDate - utcDate) / (1000 * 60 * 60);
  return diff;
}

export function formatOffset(offset) {
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const hours = Math.floor(abs);
  const minutes = Math.round((abs - hours) * 60);
  if (minutes === 0) return `UTC${sign}${hours}`;
  return `UTC${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

export function formatLocalTime(timezone, use12h) {
  const now = new Date();
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: use12h,
  }).format(now);
}

// Convert primary working hours to UTC, then to target timezone hours
// Returns array of local hours that overlap with primary's working hours
export function getOverlapHours(primaryTimezone, targetTimezone, workStart, workEnd) {
  const primaryOffset = getUTCOffset(primaryTimezone);
  const targetOffset = getUTCOffset(targetTimezone);

  // Convert primary work hours to UTC
  const utcStart = ((workStart - primaryOffset) % 24 + 24) % 24;
  const utcEnd = ((workEnd - primaryOffset) % 24 + 24) % 24;

  // Convert UTC hours to target local hours
  const localStart = ((utcStart + targetOffset) % 24 + 24) % 24;
  const localEnd = ((utcEnd + targetOffset) % 24 + 24) % 24;

  const hours = [];

  if (localStart <= localEnd) {
    for (let h = localStart; h < localEnd; h++) {
      hours.push(h);
    }
  } else {
    // Wraps around midnight
    for (let h = localStart; h < 24; h++) hours.push(h);
    for (let h = 0; h < localEnd; h++) hours.push(h);
  }

  return hours;
}

export function getCellType(hour, localHour, overlapHours, wakeStart, wakeEnd) {
  const isCurrentHour = hour === localHour;
  const isOverlap = overlapHours.includes(hour);
  const isWakeUp = hour >= wakeStart && hour < wakeEnd;
  const isDay = hour >= 7 && hour < 20;
  const isNight = !isDay;

  return { isCurrentHour, isOverlap, isWakeUp, isDay, isNight };
}

export function getHasOverlap(overlapHours) {
  return overlapHours.length > 0;
}
