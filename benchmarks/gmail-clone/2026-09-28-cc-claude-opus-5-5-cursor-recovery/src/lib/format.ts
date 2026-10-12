const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

export function startOfDay(ts: number) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function formatListDate(ts: number, now = Date.now()) {
  const d = new Date(ts)
  const n = new Date(now)
  if (startOfDay(ts) === startOfDay(now)) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  if (d.getFullYear() === n.getFullYear()) {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
  return d.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' })
}

export function relative(ts: number, now = Date.now()) {
  const diff = now - ts
  const future = diff < 0
  const abs = Math.abs(diff)
  let out: string
  if (abs < MIN) out = future ? 'in a moment' : 'just now'
  else if (abs < HOUR) {
    const m = Math.round(abs / MIN)
    out = `${m} minute${m === 1 ? '' : 's'}`
  } else if (abs < DAY) {
    const h = Math.round(abs / HOUR)
    out = `${h} hour${h === 1 ? '' : 's'}`
  } else {
    const d = Math.round(abs / DAY)
    out = `${d} day${d === 1 ? '' : 's'}`
  }
  if (abs < MIN) return out
  return future ? `in ${out}` : `${out} ago`
}

export function formatFullDate(ts: number, now = Date.now()) {
  const d = new Date(ts)
  const date = d.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric',
  })
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `${date}, ${time} (${relative(ts, now)})`
}

export function formatLongDate(ts: number) {
  return new Date(ts).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatScheduleLabel(ts: number) {
  const d = new Date(ts)
  return d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export const time = { MIN, HOUR, DAY }

/** Returns a timestamp for a specific hour on the day `offsetDays` from today */
export function atHour(offsetDays: number, hour: number, minute = 0, base = Date.now()) {
  const d = new Date(base)
  d.setDate(d.getDate() + offsetDays)
  d.setHours(hour, minute, 0, 0)
  return d.getTime()
}

export function nextWeekday(weekday: number, hour: number, base = Date.now()) {
  const d = new Date(base)
  const diff = (weekday + 7 - d.getDay()) % 7 || 7
  d.setDate(d.getDate() + diff)
  d.setHours(hour, 0, 0, 0)
  return d.getTime()
}
