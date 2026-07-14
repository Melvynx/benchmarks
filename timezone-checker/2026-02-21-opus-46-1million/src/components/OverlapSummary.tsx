import type { City } from '../data/cities'
import { hoursToRanges, formatHourFull } from '../utils/timezone'

interface OverlapSummaryProps {
  mode: 'meeting' | 'base'
  cities: City[]
  meetingOverlap: number[]
  baseOverlaps: Map<string, number[]>
  timeFormat: '12h' | '24h'
}

function RangeBadges({ hours, timeFormat }: { hours: number[]; timeFormat: '12h' | '24h' }) {
  const ranges = hoursToRanges(hours)
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {ranges.map((r, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 text-xs font-medium px-2 py-0.5 rounded-full"
        >
          {formatHourFull(r.start, timeFormat)} — {formatHourFull(r.end, timeFormat)}
        </span>
      ))}
    </span>
  )
}

export function OverlapSummary({ mode, cities, meetingOverlap, baseOverlaps, timeFormat }: OverlapSummaryProps) {
  if (mode === 'meeting') {
    if (meetingOverlap.length === 0) {
      return (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-sm text-amber-400">
          No overlapping hours — consider adjusting your schedule or awake window
        </div>
      )
    }
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-300 font-medium">{meetingOverlap.length}h overlap</span>
        <RangeBadges hours={meetingOverlap} timeFormat={timeFormat} />
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 space-y-2">
      {cities.slice(1).map((city) => {
        const hours = baseOverlaps.get(city.id) ?? []
        return (
          <div key={city.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-400">vs</span>
            <span className="text-slate-200 font-medium">
              {city.flag} {city.name}
            </span>
            {hours.length === 0 ? (
              <span className="text-amber-400 text-xs">No overlap</span>
            ) : (
              <>
                <span className="text-slate-400">{hours.length}h</span>
                <RangeBadges hours={hours} timeFormat={timeFormat} />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
