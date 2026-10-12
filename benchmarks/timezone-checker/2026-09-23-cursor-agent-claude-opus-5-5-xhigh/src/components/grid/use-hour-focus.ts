import type { PointerEvent } from 'react'
import { useUiStore } from '../../state/ui-store'

/**
 * Delegated hover tracking: spotlights the reference hour under the pointer.
 * Touch is ignored so scrolling the grid doesn't flash highlights.
 */
export function useHourFocus() {
  const setFocus = useUiStore((s) => s.setFocus)
  return {
    onPointerOver: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'touch') return
      const cell = (event.target as Element).closest<HTMLElement>('[data-hour]')
      setFocus(cell ? { start: Number(cell.dataset.hour), length: 1 } : null)
    },
    onPointerLeave: () => setFocus(null),
  }
}
