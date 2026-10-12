import { House, Users } from 'lucide-react'
import type { Mode } from '../domain/schedule'
import type { Schedule } from '../hooks/use-schedule'
import { useAppStore } from '../state/app-store'
import { CityPicker } from './CityPicker'
import { SettingsPopover } from './SettingsPopover'
import { Segmented, type SegmentedOption } from './ui/Segmented'

const MODE_OPTIONS: readonly SegmentedOption<Mode>[] = [
  { value: 'meeting', label: 'Meeting', icon: Users },
  { value: 'base', label: 'Base', icon: House },
]

export function Toolbar({ schedule }: { schedule: Schedule }) {
  const mode = useAppStore((s) => s.mode)
  const setMode = useAppStore((s) => s.setMode)
  const referenceName = schedule.reference?.timeline.city.name ?? 'the reference city'

  return (
    <div className="flex flex-col gap-x-4 gap-y-3 md:flex-row md:flex-wrap md:items-center">
      <Segmented
        label="Overlap mode"
        value={mode}
        options={MODE_OPTIONS}
        onChange={setMode}
        className="shrink-0 self-start md:self-auto"
      />
      <p className="text-sm text-ink-2 md:order-last md:basis-full lg:order-none lg:flex-1 lg:basis-auto">
        {mode === 'meeting'
          ? 'Hours when every city is awake at once.'
          : `Each city compared with ${referenceName} on its own.`}
      </p>
      <div className="flex gap-2 *:flex-1 md:ml-auto md:*:flex-none">
        <SettingsPopover />
        <CityPicker now={schedule.now} />
      </div>
    </div>
  )
}
