import { formatHourLabel } from '../lib/timezone'
import type { TimeFormat } from '../types'
import { memo } from 'react'

interface CellProps {
  localHour: number
  status: 'sleeping' | 'awake' | 'overlap'
  use24h: TimeFormat
  isNow?: boolean
  isFirst?: boolean
  isLast?: boolean
  size?: 'desktop' | 'mobile'
}

function CellBase({ localHour, status, use24h, isNow, isFirst, isLast, size = 'desktop' }: CellProps) {
  const is24 = use24h === '24h'
  const label = formatHourLabel(localHour, is24)
  const padding = size === 'desktop' ? 'py-2.5' : 'py-2'
  const base =
    size === 'desktop'
      ? 'min-h-[44px] text-[12.5px]'
      : 'min-h-[34px] text-xs'

  return (
    <div
      className={[
        'relative flex flex-col items-center justify-center transition',
        padding,
        base,
        size === 'desktop' ? 'border-r border-ink-800/60 last:border-r-0' : '',
        status === 'overlap'
          ? 'bg-leaf-500/15 text-leaf-300 font-bold'
          : status === 'awake'
          ? 'bg-ink-800/40 text-ink-200'
          : 'bg-transparent text-ink-600',
        isFirst ? (size === 'desktop' ? 'border-l border-ink-800/60' : '') : '',
        isLast ? (size === 'desktop' ? '' : 'border-r border-ink-800/60') : '',
      ].join(' ')}
      title={`Local time: ${label}`}
    >
      {status === 'overlap' && (
        <span className="pointer-events-none absolute inset-1 rounded-md border border-leaf-500/40" aria-hidden />
      )}
      <span className="relative font-mono tracking-tight">{formatHourLabel(localHour, is24)}</span>
      {isNow && (
        <span
          className="pointer-events-none absolute -top-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent-400 shadow-[0_0_8px_rgba(124,92,255,0.7)]"
          aria-hidden
        />
      )}
    </div>
  )
}

export const Cell = memo(CellBase)

interface HourHeaderProps {
  refHour: number
  use24h: TimeFormat
  isNow?: boolean
}

export function HourHeader({ refHour, use24h, isNow }: HourHeaderProps) {
  const label = formatHourLabel(refHour, use24h === '24h')
  return (
    <div
      className={[
        'relative flex items-center justify-center py-2 text-[11px] font-medium',
        'border-r border-ink-800/60 last:border-r-0',
        isNow ? 'bg-accent-500/10 text-accent-300' : 'text-ink-400',
      ].join(' ')}
      title={`Reference hour ${refHour}:00`}
    >
      <span className="font-mono tracking-tight">{label}</span>
    </div>
  )
}