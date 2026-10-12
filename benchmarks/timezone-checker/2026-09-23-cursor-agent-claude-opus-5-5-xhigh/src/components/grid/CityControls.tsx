import { X } from 'lucide-react'
import type { City } from '../../domain/cities'
import { cn } from '../../lib/cn'
import { withViewTransition } from '../../lib/view-transition'
import { useAppStore } from '../../state/app-store'

export function RefBadge({ className }: { className?: string }) {
  return (
    <span
      title="Reference city: every column is one hour of its day"
      className={cn(
        'inline-flex h-[18px] shrink-0 items-center rounded-[5px] bg-ink px-1.5 font-mono text-[9.5px] font-semibold tracking-[0.08em] text-surface',
        className,
      )}
    >
      REF
    </span>
  )
}

interface CityNameProps {
  city: City
  isReference: boolean
  /** Show the three-letter city code; the full name stays available to assistive tech and on hover. */
  short?: boolean
  className?: string
  /** Applied to the text itself, e.g. `truncate` or `line-clamp-2`. */
  textClassName?: string
}

/** The reference city's name is static; any other name promotes that city to reference. */
export function CityName({ city, isReference, short = false, className, textClassName }: CityNameProps) {
  const makeReference = useAppStore((s) => s.makeReference)
  const text = short ? (
    <>
      <span aria-hidden className={cn('block tracking-wide', textClassName)}>
        {city.code}
      </span>
      <span className="sr-only">{city.name}</span>
    </>
  ) : (
    <span className={cn('block', textClassName)}>{city.name}</span>
  )

  if (isReference) {
    return (
      <span title={city.name} className={cn('min-w-0 font-semibold text-ink', className)}>
        {text}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => withViewTransition(() => makeReference(city.id))}
      title={`Make ${city.name} the reference city`}
      className={cn(
        'min-w-0 rounded-sm font-medium text-ink decoration-ink-4 decoration-dotted underline-offset-[5px] transition-colors hover:underline',
        className,
      )}
    >
      {text}
    </button>
  )
}

export function RemoveCityButton({ city, className }: { city: City; className?: string }) {
  const removeCity = useAppStore((s) => s.removeCity)
  return (
    <button
      type="button"
      onClick={() => withViewTransition(() => removeCity(city.id))}
      aria-label={`Remove ${city.name}`}
      title={`Remove ${city.name}`}
      className={cn(
        'grid size-7 shrink-0 place-items-center rounded-full text-ink-3 transition-[background-color,color,opacity] hover:bg-surface-2 hover:text-ink',
        className,
      )}
    >
      <X aria-hidden className="size-4" />
    </button>
  )
}
