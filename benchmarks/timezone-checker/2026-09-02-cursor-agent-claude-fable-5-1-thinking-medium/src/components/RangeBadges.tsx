import type { HourRange } from '@/lib/overlap'
import { formatHour, type TimeFormat } from '@/lib/timezone'

interface RangeBadgesProps {
  ranges: HourRange[]
  format: TimeFormat
}

/** Renders `[start, end)` hour windows as "9am — 12pm" chips. */
export function RangeBadges({ ranges, format }: RangeBadgesProps) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Overlap windows">
      {ranges.map((range) => (
        <li
          key={`${range.start}-${range.end}`}
          className="tabular inline-flex items-center rounded-lg border border-mint-500/30 bg-mint-500/10 px-2.5 py-1 font-mono text-xs font-medium text-mint-300"
        >
          {formatHour(range.start, format)}
          <span className="mx-1.5 text-mint-500/70">—</span>
          {formatHour(range.end % 24, format)}
        </li>
      ))}
    </ul>
  )
}
