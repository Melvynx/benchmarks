import { Earth, Plus } from 'lucide-react'
import { useUiStore } from '../state/ui-store'
import { Button } from './ui/Button'

export function EmptyState() {
  const openPicker = useUiStore((s) => s.setPickerOpen)
  return (
    <section className="card flex flex-col items-center px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-ink-2 shadow-[inset_0_0_0_1px_var(--line)]">
        <Earth aria-hidden className="size-6" />
      </span>
      <h2 className="mt-5 font-display text-3xl text-ink">No cities yet</h2>
      <p className="mt-2 max-w-xs text-sm text-ink-2">Add the cities your team lives in to see who’s awake, hour by hour.</p>
      <Button variant="primary" className="mt-6" onClick={() => openPicker(true)}>
        <Plus aria-hidden />
        Add a city
      </Button>
    </section>
  )
}
