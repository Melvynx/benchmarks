import type { Mode, Schedule } from '../lib/overlap'
import type { TimeFormat } from '../lib/time'
import { RangeBadges } from './RangeBadges'

interface Props {
  schedule: Schedule
  mode: Mode
  format: TimeFormat
}

function Count({ n }: { n: number }) {
  return (
    <span className="tabular text-sm font-semibold text-white">
      {n}
      <span className="ml-1 font-normal text-ink-300">{n === 1 ? 'hour' : 'hours'}</span>
    </span>
  )
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300">
      <svg aria-hidden viewBox="0 0 20 20" className="size-3.5" fill="currentColor">
        <path d="M10 2.5 18.5 17h-17L10 2.5Zm0 4.5a.9.9 0 0 0-.9.9V12a.9.9 0 1 0 1.8 0V7.9A.9.9 0 0 0 10 7Zm0 6.6a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
      </svg>
      {children}
    </span>
  )
}

export function OverlapSummary({ schedule, mode, format }: Props) {
  const [reference, ...others] = schedule.rows
  if (!reference || others.length === 0) return null
  const refName = reference.city.name

  return (
    <section
      aria-live="polite"
      className="animate-fade-up rounded-2xl border border-ink-700 bg-ink-900/70 px-4 py-3 backdrop-blur"
    >
      {mode === 'meeting' ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[11px] font-medium tracking-wider text-ink-400 uppercase">Everyone awake</span>
          <Count n={schedule.sharedOverlap.length} />
          {schedule.sharedOverlap.length > 0 ? (
            <>
              <RangeBadges hours={schedule.sharedOverlap} format={format} />
              <span className="text-xs text-ink-400">in {refName} time</span>
            </>
          ) : (
            <Warning>No hour when everyone is awake. Try widening the awake window.</Warning>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-ink-700/70">
          {others.map((row) => (
            <li key={row.city.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2 first:pt-0 last:pb-0">
              <span className="min-w-28 text-sm font-medium text-white">{row.city.name}</span>
              <Count n={row.overlapHours.length} />
              {row.overlapHours.length > 0 ? (
                <>
                  <RangeBadges hours={row.overlapHours} format={format} />
                  <span className="text-xs text-ink-400">in {refName} time</span>
                </>
              ) : (
                <Warning>No overlap with {refName}</Warning>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
