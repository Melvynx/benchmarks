import type { CellType, Settings } from '../types';

export function getUtcOffset(timezone: string): number {
  const now = new Date();
  const utcStr = now.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = now.toLocaleString('en-US', { timeZone: timezone });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
}

export function formatUtcOffset(offset: number): string {
  const sign = offset >= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const hours = Math.floor(absOffset);
  const minutes = Math.round((absOffset - hours) * 60);
  if (minutes === 0) return `UTC${sign}${hours}`;
  return `UTC${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
}

export function getLocalTime(timezone: string, format: '12h' | '24h'): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: format === '12h',
  });
}

export function getCurrentHour(timezone: string): number {
  const now = new Date();
  const h = parseInt(
    now.toLocaleString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    }),
    10
  );
  return h % 24;
}

export function getCellType(
  hour: number,
  timezone: string,
  primaryTimezone: string,
  settings: Settings
): CellType {
  const primaryOffset = getUtcOffset(primaryTimezone);
  const rowOffset = getUtcOffset(timezone);
  const diff = rowOffset - primaryOffset;

  const overlapHours: boolean[] = Array(24).fill(false);
  for (let h = settings.workStart; h < settings.workEnd; h++) {
    let localH = ((h + diff) % 24 + 24) % 24;
    overlapHours[Math.floor(localH)] = true;
  }

  if (overlapHours[hour]) return 'overlap';
  if (
    (hour >= settings.wakeStart && hour < settings.wakeEnd) ||
    (settings.wakeStart > settings.wakeEnd && (hour >= settings.wakeStart || hour < settings.wakeEnd))
  ) {
    return 'wake';
  }
  if (hour >= 7 && hour <= 19) return 'day';
  return 'night';
}

export function hasAnyOverlap(
  timezone: string,
  primaryTimezone: string,
  settings: Settings
): boolean {
  for (let h = 0; h < 24; h++) {
    if (getCellType(h, timezone, primaryTimezone, settings) === 'overlap') {
      return true;
    }
  }
  return false;
}

export function formatHourLabel(hour: number, format: '12h' | '24h'): string {
  if (format === '24h') return `${hour.toString().padStart(2, '0')}`;
  if (hour === 0) return '12a';
  if (hour < 12) return `${hour}a`;
  if (hour === 12) return '12p';
  return `${hour - 12}p`;
}

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/New_York';
  }
}
