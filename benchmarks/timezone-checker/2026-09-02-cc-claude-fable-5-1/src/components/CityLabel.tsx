import type { CityRow } from '../lib/overlap'
import { formatUtcOffset } from '../lib/time'

interface Props {
  row: CityRow
  onPromote: () => void
  compact?: boolean
}

/** City name (clickable to promote to reference), REF badge, and UTC offset. */
export function CityLabel({ row, onPromote, compact = false }: Props) {
  const { city, offset, isReference } = row
  return (
    <div className={compact ? 'flex flex-col items-center gap-0.5 text-center' : 'flex min-w-0 flex-col gap-0.5'}>
      <div className={['flex items-center gap-1.5', compact ? 'flex-col' : ''].join(' ')}>
        <button
          type="button"
          onClick={onPromote}
          disabled={isReference}
          title={isReference ? `${city.name} is the reference city` : `Make ${city.name} the reference city`}
          className={[
            'truncate rounded-md text-left font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow-400',
            compact ? 'text-xs' : 'text-sm',
            isReference ? 'cursor-default' : 'cursor-pointer hover:text-glow-300 hover:underline hover:decoration-glow-500/50 hover:underline-offset-4',
          ].join(' ')}
        >
          {city.name}
        </button>
        {isReference && (
          <span className="rounded-sm bg-glow-500 px-1 py-px text-[9px] leading-tight font-bold tracking-wider text-glow-900">REF</span>
        )}
      </div>
      <span className={['tabular text-ink-400', compact ? 'text-[10px]' : 'text-xs'].join(' ')}>
        {!compact && <span className="mr-1.5 text-ink-400/80">{city.country}</span>}
        <span className="text-ink-300">{formatUtcOffset(offset)}</span>
      </span>
    </div>
  )
}
