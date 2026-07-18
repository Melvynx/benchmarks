import type { Mode } from '../lib/overlap';
import { Logo } from './Logo';
import { ModeToggle } from './ModeToggle';

interface Props {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

export function AppHeader({ mode, onModeChange }: Props) {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3 pb-5 pt-7">
      <Logo />
      <div className="mr-auto min-w-0">
        <h1 className="text-[19px] font-bold leading-6 tracking-tight">k3[1m]</h1>
        <p className="text-[12px] text-fog">Timezone overlap checker for distributed teams</p>
      </div>
      <ModeToggle mode={mode} onChange={onModeChange} />
    </header>
  );
}
