import React from 'react'
import { Clock } from 'lucide-react'
import { formatHourRange, type HourRange } from '@/lib/overlap'
import type { TimeFormat } from '@/lib/timezone'

interface RangeBadgesProps {
  ranges: HourRange[]
  format: TimeFormat
  className?: string
}

export const RangeBadges: React.FC<RangeBadgesProps> = ({ ranges, format, className = '' }) => {
  if (ranges.length === 0) return null

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {ranges.map((range, index) => {
        const text = formatHourRange(range, format)
        return (
          <span
            key={`${range.start}-${range.end}-${index}`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs sm:text-sm font-semibold shadow-sm"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="tabular">{text}</span>
          </span>
        )
      })}
    </div>
  )
}
