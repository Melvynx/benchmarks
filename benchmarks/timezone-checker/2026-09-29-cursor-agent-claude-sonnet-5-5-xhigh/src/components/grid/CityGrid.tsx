import { Globe2 } from 'lucide-react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { DesktopGrid } from './DesktopGrid'
import { MobileGrid } from './MobileGrid'
import type { GridViewProps } from './types'

interface CityGridProps extends GridViewProps {
  onRestoreDefaults: () => void
}

/** Two separate layouts, not one responsive grid: rows-by-city on desktop, columns-by-city on mobile. */
export function CityGrid({ onRestoreDefaults, ...view }: CityGridProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  if (view.grid.rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
        <Globe2 className="size-8 text-ink-3" aria-hidden="true" />
        <div>
          <p className="font-semibold">No cities yet</p>
          <p className="mt-1 text-sm text-ink-2">Add a city to start comparing hours.</p>
        </div>
        <button
          type="button"
          onClick={onRestoreDefaults}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent-soft"
        >
          Restore default cities
        </button>
      </div>
    )
  }

  return isDesktop ? <DesktopGrid {...view} /> : <MobileGrid {...view} />
}
