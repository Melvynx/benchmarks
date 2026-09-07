import { type HourRange, toRanges } from '../lib/overlap'
import { formatHour, type TimeFormat } from '../lib/time'

export function RangeBadges({ hours, format }: { hours: number[]; format: TimeFormat }) {
  const ranges = toRanges(hours)
  return (
    <span className="flex flex-wrap gap-1.5">
      {ranges.map((r) => (
        <span
          key={r.start}
          className="tabular inline-flex items-center rounded-md border border-glow-500/30 bg-glow-500/10 px-2 py-0.5 text-xs font-medium text-glow-300"
        >
          {label(r, format)}
        </span>
      ))}
    </span>
  )
}

function label(r: HourRange, format: TimeFormat) {
  return `${formatHour(r.start, format)} — ${formatHour(r.end, format)}`
}
