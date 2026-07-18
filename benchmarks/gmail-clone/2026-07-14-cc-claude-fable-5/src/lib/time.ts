const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export const TIME = { MINUTE, HOUR, DAY }

export function ago(opts: { minutes?: number; hours?: number; days?: number }, from = Date.now()): number {
  return (
    from -
    (opts.minutes ?? 0) * MINUTE -
    (opts.hours ?? 0) * HOUR -
    (opts.days ?? 0) * DAY
  )
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
const monthDayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const fullDateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})
const numericFmt = new Intl.DateTimeFormat('en-US', {
  month: 'numeric',
  day: 'numeric',
  year: '2-digit',
})
const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

/** Gmail-style compact date for list rows: "10:24 AM", "Jul 8", "3/12/25". */
export function listDate(ts: number, now = Date.now()): string {
  const d = new Date(ts)
  const n = new Date(now)
  if (isSameDay(d, n)) return timeFmt.format(d)
  if (d.getFullYear() === n.getFullYear()) return monthDayFmt.format(d)
  return numericFmt.format(d)
}

/** Full date for the message header: "Jul 8, 2026, 10:24 AM (2 days ago)". */
export function messageDate(ts: number, now = Date.now()): string {
  const d = new Date(ts)
  return `${fullDateFmt.format(d)}, ${timeFmt.format(d)} (${relative(ts, now)})`
}

export function relative(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts)
  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE)
    return `${m} minute${m === 1 ? '' : 's'} ago`
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR)
    return `${h} hour${h === 1 ? '' : 's'} ago`
  }
  const days = Math.floor(diff / DAY)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/** "Snoozed until Mon, Jul 20, 8:00 AM" style label. */
export function snoozeLabel(ts: number): string {
  const d = new Date(ts)
  return `${weekdayFmt.format(d)}, ${timeFmt.format(d)}`
}

function at(base: Date, hour: number): Date {
  const d = new Date(base)
  d.setHours(hour, 0, 0, 0)
  return d
}

export interface SnoozeOption {
  label: string
  detail: string
  ts: number
}

export function snoozeOptions(now = Date.now()): SnoozeOption[] {
  const n = new Date(now)
  const options: SnoozeOption[] = []

  const laterToday = new Date(now + 3 * HOUR)
  if (laterToday.getDate() === n.getDate()) {
    options.push({ label: 'Later today', detail: timeFmt.format(laterToday), ts: laterToday.getTime() })
  }

  const tomorrow = at(new Date(now + DAY), 8)
  options.push({ label: 'Tomorrow', detail: `${weekdayFmt.format(tomorrow)}, ${timeFmt.format(tomorrow)}`, ts: tomorrow.getTime() })

  const day = n.getDay()
  const untilSat = (6 - day + 7) % 7 || 7
  const weekend = at(new Date(now + untilSat * DAY), 8)
  options.push({ label: 'This weekend', detail: `${weekdayFmt.format(weekend)}, ${timeFmt.format(weekend)}`, ts: weekend.getTime() })

  const untilMon = (1 - day + 7) % 7 || 7
  const nextWeek = at(new Date(now + untilMon * DAY), 8)
  options.push({ label: 'Next week', detail: `${weekdayFmt.format(nextWeek)}, ${timeFmt.format(nextWeek)}`, ts: nextWeek.getTime() })

  return options
}
