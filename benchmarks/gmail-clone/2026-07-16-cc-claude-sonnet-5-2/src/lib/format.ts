import {
  format,
  isThisYear,
  isToday,
  isYesterday,
  differenceInCalendarDays,
} from 'date-fns'

export function formatListDate(iso: string): string {
  const date = new Date(iso)
  if (isToday(date)) return format(date, 'h:mm a')
  if (isYesterday(date)) return 'Yesterday'
  const daysAgo = differenceInCalendarDays(new Date(), date)
  if (daysAgo < 7) return format(date, 'EEE')
  if (isThisYear(date)) return format(date, 'MMM d')
  return format(date, 'MM/dd/yy')
}

export function formatFullDate(iso: string): string {
  return format(new Date(iso), "EEE, MMM d, yyyy 'at' h:mm a")
}

export function formatShortDateTime(iso: string): string {
  const date = new Date(iso)
  if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`
  if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`
  return format(date, 'MMM d, h:mm a')
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
