// Get UTC offset in hours for a timezone at a given time
export function getUTCOffset(timezone, date = new Date()) {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  return (tzDate - utcDate) / (1000 * 60 * 60);
}

// Convert primary working hours to UTC, then to each card's local hours
// Returns array of 24 booleans (overlap[h] = true if hour h in target timezone overlaps primary working hours)
export function getOverlapHours(primaryTimezone, targetTimezone, workStart, workEnd) {
  const date = new Date();
  const primaryOffset = getUTCOffset(primaryTimezone, date);
  const targetOffset = getUTCOffset(targetTimezone, date);

  // Convert primary working hours to UTC
  const utcStart = workStart - primaryOffset;
  const utcEnd = workEnd - primaryOffset;

  // Convert UTC working hours to target timezone local hours
  const targetStart = utcStart + targetOffset;
  const targetEnd = utcEnd + targetOffset;

  const overlap = new Array(24).fill(false);

  for (let h = 0; h < 24; h++) {
    // Normalize hour against all possible day positions
    const checkHours = [h, h - 24, h + 24];
    for (const ch of checkHours) {
      if (ch >= targetStart && ch < targetEnd) {
        overlap[h] = true;
        break;
      }
    }
  }

  return overlap;
}

// Returns array of 24 booleans: true = wake window hour in local time
export function getWakeHours(wakeStart, wakeEnd) {
  const wake = new Array(24).fill(false);
  for (let h = 0; h < 24; h++) {
    if (h >= wakeStart && h < wakeEnd) {
      wake[h] = true;
    }
  }
  return wake;
}

export function isNightHour(h) {
  return h < 6 || h >= 20;
}

export function isDayHour(h) {
  return h >= 7 && h < 20;
}

export function hasAnyOverlap(overlapHours) {
  return overlapHours.some(Boolean);
}
