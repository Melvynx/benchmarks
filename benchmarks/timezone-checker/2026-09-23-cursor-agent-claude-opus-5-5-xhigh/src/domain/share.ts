import type { BaseOverlap, CityTimeline, HourRange, MeetingOverlap } from './schedule'
import { formatHours, formatTimeRange, type TimeFormat } from './time'

/** A reference-hour range expressed in a city's own wall-clock time. */
export function localRangeLabel(timeline: CityTimeline, range: HourRange, format: TimeFormat): string {
  const start = range.start * 60 + timeline.diffMinutes
  return formatTimeRange(start, start + range.length * 60, format)
}

export function meetingShareText(
  timelines: readonly CityTimeline[],
  overlap: MeetingOverlap,
  format: TimeFormat,
): string {
  const header = `Everyone awake · ${formatHours(overlap.hours)}`
  const lines = overlap.ranges.map(
    (range) => `• ${timelines.map((t) => `${t.city.name} ${localRangeLabel(t, range, format)}`).join(' · ')}`,
  )
  return [header, ...lines].join('\n')
}

export function baseShareText(reference: CityTimeline, overlap: BaseOverlap, format: TimeFormat): string {
  const header = `Overlap with ${reference.city.name}`
  const lines = overlap.pairs.map(({ timeline, ranges, hours }) => {
    if (hours === 0) return `• ${timeline.city.name}: no overlap`
    const windows = ranges
      .map((range) => `${localRangeLabel(reference, range, format)} (${localRangeLabel(timeline, range, format)} local)`)
      .join(', ')
    return `• ${timeline.city.name} · ${formatHours(hours)}: ${windows}`
  })
  return [header, ...lines].join('\n')
}
