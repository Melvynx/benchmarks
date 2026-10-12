import { rangeEnd, type HourRange } from '../../domain/schedule'
import { formatTimeRange, type TimeFormat } from '../../domain/time'
import { cn } from '../../lib/cn'
import { useUiStore } from '../../state/ui-store'

interface RangeBadgeProps {
  range: HourRange
  format: TimeFormat
  /** Extra detail shown on hover, e.g. the window in every city's local time. */
  detail?: string
  tone?: 'overlap' | 'muted'
}

export function RangeBadge({ range, format, detail, tone = 'overlap' }: RangeBadgeProps) {
  const setFocus = useUiStore((s) => s.setFocus)
  const label = range.length === 24 ? 'All day' : formatTimeRange(range.start * 60, rangeEnd(range) * 60, format)

  return (
    <span
      title={detail}
      onMouseEnter={() => setFocus(range)}
      onMouseLeave={() => setFocus(null)}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-full pr-2 pl-3 text-[13px] whitespace-nowrap transition-transform duration-150 hover:-translate-y-px',
        tone === 'overlap'
          ? 'bg-overlap font-semibold text-overlap-ink shadow-[inset_0_0_0_1px_var(--overlap-edge)]'
          : 'bg-surface font-medium text-ink shadow-[inset_0_0_0_1px_var(--line-strong)]',
      )}
    >
      <span className="font-mono tabular-nums">{label}</span>
      <span
        className={cn(
          'rounded-full px-1.5 py-0.5 font-mono text-[10px] leading-none font-semibold tabular-nums',
          tone === 'overlap' ? 'bg-overlap-ink/12' : 'bg-surface-2 text-ink-2',
        )}
      >
        {range.length}h
      </span>
    </span>
  )
}
