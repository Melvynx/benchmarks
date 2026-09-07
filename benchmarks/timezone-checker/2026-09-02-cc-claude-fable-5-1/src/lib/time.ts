export type TimeFormat = '12h' | '24h'

/** Current UTC offset in minutes for an IANA time zone (DST-aware, fractional offsets supported). */
export function getUtcOffsetMinutes(timeZone: string, at: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at)
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  const truncated = Math.floor(at.getTime() / 1000) * 1000
  return Math.round((asUtc - truncated) / 60_000)
}

/** "UTC+5:30", "UTC−7", "UTC±0" */
export function formatUtcOffset(minutes: number): string {
  if (minutes === 0) return 'UTC±0'
  const sign = minutes > 0 ? '+' : '−'
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`
}

const MINUTES_PER_DAY = 24 * 60

export function normalizeMinutes(minutes: number): number {
  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
}

/** Local time-of-day (minutes since midnight) in `cityOffset` when it is `refHour:00` in `refOffset`. */
export function localMinutesAt(refHour: number, refOffset: number, cityOffset: number): number {
  return normalizeMinutes(refHour * 60 + (cityOffset - refOffset))
}

/** Whether a local time-of-day (minutes) falls inside the awake window. Overnight windows supported. */
export function isAwake(localMinutes: number, wakeHour: number, sleepHour: number): boolean {
  const wake = wakeHour * 60
  const sleep = sleepHour * 60
  if (wake === sleep) return true // 24h awake
  if (wake < sleep) return localMinutes >= wake && localMinutes < sleep
  return localMinutes >= wake || localMinutes < sleep
}

/** Compact clock label for grid cells: "9a", "2:30p", "14", "14:30". */
export function formatCellTime(localMinutes: number, format: TimeFormat): string {
  const h = Math.floor(localMinutes / 60)
  const m = localMinutes % 60
  const mm = m ? `:${String(m).padStart(2, '0')}` : ''
  if (format === '24h') return `${h}${mm}`
  const suffix = h < 12 ? 'a' : 'p'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}${mm}${suffix}`
}

/** Full hour label for summaries/axes: "9am", "12pm", "09:00", "14:00". */
export function formatHour(hour: number, format: TimeFormat): string {
  const h = normalizeMinutes(hour * 60) / 60
  if (format === '24h') return `${String(h).padStart(2, '0')}:00`
  const suffix = h < 12 ? 'am' : 'pm'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}${suffix}`
}
