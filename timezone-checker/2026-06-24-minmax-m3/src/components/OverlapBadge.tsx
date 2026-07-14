import { formatHourLabel, formatHourRange } from '../lib/timezone'
import type { TimeFormat } from '../types'

interface Props {
  label: string
  ranges: Array<{ start: number; endExclusive: number }>
  totalHours: number
  use24h: TimeFormat
  zeroMessage?: string
  empty?: boolean
}

export function OverlapBadge({ label, ranges, totalHours, use24h, zeroMessage, empty }: Props) {
  if (empty) return null
  const noOverlap = totalHours === 0
  return (
    <div
      className={[
        'flex flex-col gap-1.5 rounded-xl border p-3 transition',
        noOverlap
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-leaf-500/30 bg-leaf-500/5',
      ].join(' ')}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-400">{label}</div>
        <div
          className={[
            'font-mono text-sm font-semibold',
            noOverlap ? 'text-amber-400' : 'text-leaf-400',
          ].join(' ')}
        >
          {totalHours}h {noOverlap ? '' : 'overlap'}
        </div>
      </div>
      {noOverlap ? (
        <div className="text-sm text-amber-300/90">{zeroMessage ?? 'No common awake window'}</div>
      ) : ranges.length === 0 ? (
        <div className="text-sm text-ink-400">—</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {ranges.map((r, i) => (
            <span
              key={i}
              className="rounded-md border border-leaf-500/30 bg-ink-900 px-2 py-1 font-mono text-xs font-semibold text-leaf-300"
            >
              {formatHourRange(r.start, r.endExclusive, use24h === '24h')}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export { formatHourLabel }