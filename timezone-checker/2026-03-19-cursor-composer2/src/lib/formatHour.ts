export function formatHourLabel(hour: number, use24h: boolean): string {
  if (use24h) {
    return `${hour.toString().padStart(2, '0')}:00`
  }
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  const suffix = hour < 12 ? 'am' : 'pm'
  return `${h12}${suffix}`
}

/** Inclusive start, exclusive end for display */
export function formatHourRange(start: number, endExclusive: number, use24h: boolean): string {
  return `${formatHourLabel(start, use24h)} — ${formatHourLabel(endExclusive, use24h)}`
}
