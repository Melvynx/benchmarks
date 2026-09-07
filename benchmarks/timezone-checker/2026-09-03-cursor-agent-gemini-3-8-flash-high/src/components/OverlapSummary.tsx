import React from 'react'
import { AlertCircle, Users, UserCheck, Calendar } from 'lucide-react'
import { useTimezone } from '@/context/TimezoneContext'
import { RangeBadges } from './RangeBadges'

export const OverlapSummary: React.FC = () => {
  const { schedule, mode, settings } = useTimezone()
  const reference = schedule.rows[0]

  // Prompt: Displayed above the grid when 2+ cities are present
  if (!reference || schedule.rows.length < 2) {
    return null
  }

  const refCityName = reference.city.name

  return (
    <section
      aria-label="Overlap Summary"
      className="mb-6 bg-ink-900/90 border border-ink-800 rounded-2xl p-4 sm:p-6 shadow-lg backdrop-blur-sm relative overflow-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-ink-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {mode === 'meeting' ? (
              <Users className="w-5 h-5" />
            ) : (
              <UserCheck className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              {mode === 'meeting' ? 'Common Availability' : `Availability with ${refCityName}`}
            </h2>
            <p className="text-xs text-ink-400">
              {mode === 'meeting'
                ? `Hours when all ${schedule.rows.length} cities are simultaneously awake`
                : `Pairwise overlap calculated independently against reference base`}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ink-950 border border-ink-700/60 text-xs text-ink-300">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span>Times shown in </span>
          <span className="font-semibold text-emerald-300">{refCityName} (REF)</span>
        </div>
      </div>

      {mode === 'meeting' ? (
        <MeetingSummaryContent
          hoursCount={schedule.meeting.hours.length}
          ranges={schedule.meeting.ranges}
          cityCount={schedule.rows.length}
          timeFormat={settings.timeFormat}
          refCityName={refCityName}
        />
      ) : (
        <BaseSummaryContent
          rows={schedule.rows}
          perCity={schedule.perCity}
          timeFormat={settings.timeFormat}
          refCityName={refCityName}
        />
      )}
    </section>
  )
}

interface MeetingSummaryContentProps {
  hoursCount: number
  ranges: ReturnType<typeof useTimezone>['schedule']['meeting']['ranges']
  cityCount: number
  timeFormat: ReturnType<typeof useTimezone>['settings']['timeFormat']
  refCityName: string
}

const MeetingSummaryContent: React.FC<MeetingSummaryContentProps> = ({
  hoursCount,
  ranges,
  cityCount,
  timeFormat,
  refCityName,
}) => {
  if (hoursCount === 0) {
    return (
      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-sm">
        <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
        <div>
          <span className="font-semibold">Zero overlap across all {cityCount} cities.</span>
          <p className="text-xs text-amber-300/80 mt-0.5">
            No single hour when everyone is awake. Try widening the awake window or switch to Base Mode to find pairwise meeting times with {refCityName}.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-ink-950/70 rounded-xl border border-ink-800">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-3xl sm:text-4xl font-extrabold text-emerald-400 tabular">
          {hoursCount}
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white">
            {hoursCount === 1 ? 'Hour' : 'Hours'} Overlap
          </span>
          <span className="text-xs text-ink-400">
            across all {cityCount} selected cities
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <RangeBadges ranges={ranges} format={timeFormat} />
      </div>
    </div>
  )
}

interface BaseSummaryContentProps {
  rows: ReturnType<typeof useTimezone>['schedule']['rows']
  perCity: ReturnType<typeof useTimezone>['schedule']['perCity']
  timeFormat: ReturnType<typeof useTimezone>['settings']['timeFormat']
  refCityName: string
}

const BaseSummaryContent: React.FC<BaseSummaryContentProps> = ({
  rows,
  perCity,
  timeFormat,
  refCityName,
}) => {
  const otherRows = rows.slice(1)

  return (
    <div className="space-y-2.5">
      {otherRows.map((row) => {
        const result = perCity.get(row.city.id)
        const hoursCount = result?.hours.length ?? 0
        const ranges = result?.ranges ?? []

        return (
          <div
            key={row.city.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-ink-950/70 border border-ink-800"
          >
            <div className="flex items-center gap-2.5 min-w-[200px]">
              <span className="text-base" aria-hidden>{row.city.flag}</span>
              <div>
                <span className="font-semibold text-white text-sm">{row.city.name}</span>
                <span className="text-xs text-ink-400 ml-1.5">({row.city.country})</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hoursCount > 0 ? (
                <>
                  <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 tabular">
                    {hoursCount} {hoursCount === 1 ? 'hr' : 'hrs'}
                  </span>
                  <RangeBadges ranges={ranges} format={timeFormat} />
                </>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>No shared awake hours with {refCityName}</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
