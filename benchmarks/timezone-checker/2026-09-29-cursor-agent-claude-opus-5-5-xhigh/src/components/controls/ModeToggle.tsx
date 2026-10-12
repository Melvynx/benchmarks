import { House, Users } from 'lucide-react';
import type { Mode } from '../../lib/overlap';
import { useAppStore } from '../../store/app-store';
import { type SegmentedOption, SegmentedControl } from '../ui/SegmentedControl';

const MODE_OPTIONS: readonly SegmentedOption<Mode>[] = [
  { value: 'meeting', label: 'Meeting', icon: Users },
  { value: 'base', label: 'Base', icon: House },
];

export function ModeToggle({ referenceName }: { referenceName: string | undefined }) {
  const mode = useAppStore((state) => state.mode);
  const setMode = useAppStore((state) => state.setMode);

  const description =
    mode === 'meeting'
      ? 'Hours when every city is awake at the same time.'
      : `Each city is compared with ${referenceName ?? 'the reference city'} on its own.`;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <SegmentedControl
        label="Comparison mode"
        value={mode}
        options={MODE_OPTIONS}
        onChange={setMode}
        className="w-full sm:w-auto"
      />
      <p className="text-sm text-pretty text-ink-3">{description}</p>
    </div>
  );
}
