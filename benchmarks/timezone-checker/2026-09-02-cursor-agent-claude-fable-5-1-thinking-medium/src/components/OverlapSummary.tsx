import { AlertTriangle, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { RangeBadges } from './RangeBadges'
import { Card } from './ui/Card'
import type { OverlapResult, Schedule } from '@/lib/overlap'
import type { TimeFormat } from '@/lib/timezone'
import { useAppStore } from '@/store/useAppStore'

interface OverlapSummaryProps {
  schedule: Schedule
}

export function OverlapSummary({ schedule }: OverlapSummaryProps) {
  const mode = useAppStore((state) => state.mode)
  const format = useAppStore((state) => state.settings.timeFormat)
  const reference = schedule.rows[0]

  if (!reference || schedule.rows.length < 2) return null

  return (
    <Card className="animate-fade-up p-5" aria-live="polite">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-200">
          <Users className="h-4 w-4 text-ink-400" aria-hidden />
          {mode === 'meeting' ? 'Common availability' : `Availability with ${reference.city.name}`}
        </h2>
        <span className="text-xs text-ink-500">
          Times in <span className="font-medium text-ink-300">{reference.city.name}</span>
        </span>
      </div>

      {mode === 'meeting' ? (
        <MeetingSummary result={schedule.meeting} cityCount={schedule.rows.length} format={format} />
      ) : (
        <ul className="divide-y divide-ink-700/60">
          {schedule.rows.slice(1).map((row) => {
            const result = schedule.perCity.get(row.city.id)
            if (!result) return null
            return (
              <li key={row.city.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                <div className="flex items-baseline gap-2 sm:w-48 sm:shrink-0">
                  <span className="font-medium text-ink-100">{row.city.name}</span>
                  <HourCount count={result.hours.length} />
                </div>
                {result.hours.length > 0 ? (
                  <RangeBadges ranges={result.ranges} format={format} />
                ) : (
                  <Warning>No shared awake hours with {reference.city.name}.</Warning>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function MeetingSummary({
  result,
  cityCount,
  format,
}: {
  result: OverlapResult
  cityCount: number
  format: TimeFormat
}) {
  if (result.hours.length === 0) {
    return (
      <Warning>
        No hour when all {cityCount} cities are awake. Try widening the awake window or switching to Base mode.
      </Warning>
    )
  }
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex items-baseline gap-2">
        <span className="tabular text-4xl font-semibold tracking-tight text-mint-300">{result.hours.length}</span>
        <span className="text-sm text-ink-400">
          {result.hours.length === 1 ? 'hour' : 'hours'} when all {cityCount} cities are awake
        </span>
      </div>
      <RangeBadges ranges={result.ranges} format={format} />
    </div>
  )
}

function HourCount({ count }: { count: number }) {
  return (
    <span className="tabular text-xs text-ink-500">
      {count} {count === 1 ? 'hr' : 'hrs'}
    </span>
  )
}

function Warning({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-sm text-amber-300">
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
      {children}
    </p>
  )
}
