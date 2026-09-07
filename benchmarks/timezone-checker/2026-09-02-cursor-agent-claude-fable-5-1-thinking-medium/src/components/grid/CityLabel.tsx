import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { CityRow } from '@/lib/overlap'
import { formatUtcOffset } from '@/lib/timezone'
import { useAppStore } from '@/store/useAppStore'

interface CityLabelProps {
  row: CityRow
  layout: 'horizontal' | 'vertical'
}

/** City name (click to promote to reference), REF badge and UTC offset. */
export function CityLabel({ row, layout }: CityLabelProps) {
  const promoteCity = useAppStore((state) => state.promoteCity)
  const { city, isReference, offsetMinutes } = row
  const vertical = layout === 'vertical'

  return (
    <div className={cn('flex min-w-0', vertical ? 'flex-col items-center gap-1 text-center' : 'flex-col gap-0.5')}>
      <div className={cn('flex min-w-0 items-center gap-1.5', vertical && 'flex-col gap-1')}>
        <button
          type="button"
          onClick={() => promoteCity(city.id)}
          disabled={isReference}
          title={isReference ? `${city.name} is the reference city` : `Make ${city.name} the reference city`}
          className={cn(
            'truncate rounded-md text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400/60',
            isReference ? 'text-ink-100' : 'text-ink-200 hover:text-mint-300',
            vertical && 'max-w-full text-xs',
          )}
        >
          {city.name}
        </button>
        {isReference && (
          <span className="shrink-0 rounded-md bg-mint-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-mint-300 ring-1 ring-inset ring-mint-500/40">
            REF
          </span>
        )}
      </div>
      <span className={cn('tabular truncate font-mono text-[11px] text-ink-500', vertical && 'text-[10px]')}>
        {formatUtcOffset(offsetMinutes)}
        {!vertical && <span className="text-ink-600"> · {city.country}</span>}
      </span>
    </div>
  )
}

export function RemoveCityButton({ row, className }: { row: CityRow; className?: string }) {
  const removeCity = useAppStore((state) => state.removeCity)
  return (
    <button
      type="button"
      onClick={() => removeCity(row.city.id)}
      aria-label={`Remove ${row.city.name}`}
      title={`Remove ${row.city.name}`}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-ink-700 hover:text-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400/60',
        className,
      )}
    >
      <X className="h-3.5 w-3.5" aria-hidden />
    </button>
  )
}
