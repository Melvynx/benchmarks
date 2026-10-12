const formatters = new Map<string, Intl.DateTimeFormat>()

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
    formatters.set(timeZone, formatter)
  }
  return formatter
}

/** Hour of the day (0–23) it currently is at a fixed UTC offset. */
export function currentHourAtOffset(offsetMinutes: number, now: Date): number {
  const minutesSinceEpoch = Math.floor(now.getTime() / 60_000) + offsetMinutes
  const minuteOfDay = ((minutesSinceEpoch % 1440) + 1440) % 1440
  return Math.floor(minuteOfDay / 60)
}

/**
 * UTC offset of `timeZone` at the instant `at`, in minutes (east is positive).
 * Derived from the wall-clock time the Intl database reports, so DST and
 * fractional offsets (India +5:30, Nepal +5:45) are handled for free.
 */
export function getUtcOffsetMinutes(timeZone: string, at: Date): number {
  const parts = getFormatter(timeZone).formatToParts(at)
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)

  const wallClockAsUtc = Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    read('hour'),
    read('minute'),
    read('second'),
  )
  const instant = Math.floor(at.getTime() / 1000) * 1000
  return Math.round((wallClockAsUtc - instant) / 60_000)
}
