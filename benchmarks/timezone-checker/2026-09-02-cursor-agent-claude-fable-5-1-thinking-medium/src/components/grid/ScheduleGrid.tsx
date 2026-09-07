import { Globe2 } from 'lucide-react'
import { DesktopGrid } from './DesktopGrid'
import { MobileGrid } from './MobileGrid'
import { Card } from '../ui/Card'
import type { Schedule } from '@/lib/overlap'
import { useAppStore } from '@/store/useAppStore'

interface ScheduleGridProps {
  schedule: Schedule
}

export function ScheduleGrid({ schedule }: ScheduleGridProps) {
  const format = useAppStore((state) => state.settings.timeFormat)
  const mode = useAppStore((state) => state.mode)
  const reference = schedule.rows[0]

  if (!reference) {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <Globe2 className="h-8 w-8 text-ink-500" aria-hidden />
        <p className="text-sm text-ink-300">No cities selected.</p>
        <p className="max-w-xs text-xs text-ink-500">
          Add at least one city to see its day, and two or more to find overlapping awake hours.
        </p>
      </Card>
    )
  }

  const hint =
    mode === 'meeting'
      ? 'Green cells = everyone awake'
      : `Green cells = awake at the same time as ${reference.city.name}`

  return (
    <Card className="p-4 md:p-5">
      <div className="hidden md:block">
        <DesktopGrid schedule={schedule} format={format} />
      </div>
      <div className="md:hidden">
        <MobileGrid schedule={schedule} format={format} />
      </div>

      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink-700/60 pt-4 text-xs text-ink-500">
        <p className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-mint-500/40 ring-1 ring-inset ring-mint-400/60" aria-hidden />
          {hint}
        </p>
        <ul className="flex items-center gap-4">
          <LegendItem swatch="bg-ink-700/70" label="Awake" />
          <LegendItem swatch="bg-ink-900/80 ring-1 ring-inset ring-ink-700" label="Sleeping" />
          <LegendItem swatch="ring-1 ring-inset ring-ink-300/60" label="Now" />
        </ul>
      </footer>
    </Card>
  )
}

function LegendItem({ swatch, label }: { swatch: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded-sm ${swatch}`} aria-hidden />
      {label}
    </li>
  )
}
