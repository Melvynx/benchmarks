export function getUtcOffset(timezone: string): number {
  const now = new Date()
  const utcStr = now.toLocaleString('en-US', { timeZone: 'UTC' })
  const tzStr = now.toLocaleString('en-US', { timeZone: timezone })
  const utcDate = new Date(utcStr)
  const tzDate = new Date(tzStr)
  return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60)
}

export function formatUtcOffset(offset: number): string {
  const sign = offset >= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  const hours = Math.floor(abs)
  const minutes = Math.round((abs - hours) * 60)
  if (minutes === 0) return `UTC${sign}${hours}`
  return `UTC${sign}${hours}:${minutes.toString().padStart(2, '0')}`
}

export function getLocalTime(
  referenceHour: number,
  refTimezone: string,
  targetTimezone: string,
): { hour: number; minute: number } {
  const refOffset = getUtcOffset(refTimezone)
  const targetOffset = getUtcOffset(targetTimezone)
  const diffMinutes = Math.round((targetOffset - refOffset) * 60)
  const totalMinutes = referenceHour * 60 + diffMinutes
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440
  return {
    hour: Math.floor(normalizedMinutes / 60),
    minute: normalizedMinutes % 60,
  }
}

export function isAwake(hour: number, wakeHour: number, sleepHour: number): boolean {
  if (wakeHour < sleepHour) {
    return hour >= wakeHour && hour < sleepHour
  }
  return hour >= wakeHour || hour < sleepHour
}

export function formatHourCell(hour: number, minute: number, format: '12h' | '24h'): string {
  if (format === '24h') {
    if (minute === 0) return `${hour}`
    return `${hour}:${minute.toString().padStart(2, '0')}`
  }
  const period = hour >= 12 ? 'p' : 'a'
  const h = hour % 12 || 12
  if (minute === 0) return `${h}${period}`
  return `${h}:${minute.toString().padStart(2, '0')}${period}`
}

export function formatHourFull(hour: number, format: '12h' | '24h'): string {
  if (format === '24h') return `${hour}:00`
  const period = hour >= 12 ? 'pm' : 'am'
  const h = hour % 12 || 12
  return `${h}${period}`
}

export function getOverlapHours(
  cityTimezones: string[],
  referenceTimezone: string,
  wakeHour: number,
  sleepHour: number,
): number[] {
  const overlapHours: number[] = []
  for (let h = 0; h < 24; h++) {
    const allAwake = cityTimezones.every((tz) => {
      const local = getLocalTime(h, referenceTimezone, tz)
      return isAwake(local.hour, wakeHour, sleepHour)
    })
    if (allAwake) overlapHours.push(h)
  }
  return overlapHours
}

export function getPairOverlapHours(
  refTimezone: string,
  targetTimezone: string,
  wakeHour: number,
  sleepHour: number,
): number[] {
  return getOverlapHours([refTimezone, targetTimezone], refTimezone, wakeHour, sleepHour)
}

export function hoursToRanges(hours: number[]): { start: number; end: number }[] {
  if (hours.length === 0) return []
  const sorted = [...hours].sort((a, b) => a - b)
  const ranges: { start: number; end: number }[] = []
  let start = sorted[0]
  let prev = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i]
    } else {
      ranges.push({ start, end: (prev + 1) % 24 })
      start = sorted[i]
      prev = sorted[i]
    }
  }
  ranges.push({ start, end: (prev + 1) % 24 })
  return ranges
}
