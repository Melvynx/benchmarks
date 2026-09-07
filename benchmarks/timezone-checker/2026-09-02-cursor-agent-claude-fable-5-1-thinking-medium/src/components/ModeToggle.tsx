import { SegmentedControl } from './ui/SegmentedControl'
import type { Mode } from '@/lib/overlap'
import { useAppStore } from '@/store/useAppStore'

const MODES = [
  { value: 'meeting', label: 'Meeting', description: 'Hours when everyone is awake at once' },
  { value: 'base', label: 'Base', description: 'Each city compared against the reference only' },
] as const satisfies readonly { value: Mode; label: string; description: string }[]

export function ModeToggle() {
  const mode = useAppStore((state) => state.mode)
  const setMode = useAppStore((state) => state.setMode)
  return <SegmentedControl aria-label="Comparison mode" value={mode} options={MODES} onChange={setMode} />
}
