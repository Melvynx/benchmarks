import { Settings2 } from 'lucide-react'
import { ModeToggle } from './ModeToggle'
import { cn } from '@/lib/cn'

interface HeaderProps {
  settingsOpen: boolean
  onToggleSettings: () => void
}

export function Header({ settingsOpen, onToggleSettings }: HeaderProps) {
  return (
    <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="flex items-center gap-4">
        <div
          aria-hidden
          className="grid h-12 w-12 shrink-0 grid-cols-3 gap-1 rounded-xl border border-ink-700 bg-ink-850 p-2.5 shadow-inner"
        >
          <span className="rounded-sm bg-ink-600" />
          <span className="rounded-sm bg-mint-400 shadow-[0_0_12px_rgb(52_211_153/0.6)]" />
          <span className="rounded-sm bg-ink-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-100 md:text-3xl">Claude Fable 5.1</h1>
          <p className="mt-0.5 text-sm text-ink-400">
            Timezone overlap checker for distributed teams
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ModeToggle />
        <button
          type="button"
          onClick={onToggleSettings}
          aria-expanded={settingsOpen}
          aria-controls="settings-panel"
          className={cn(
            'inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400/60',
            settingsOpen
              ? 'border-mint-500/50 bg-mint-500/10 text-mint-300'
              : 'border-ink-700 bg-ink-900/70 text-ink-300 hover:border-ink-600 hover:text-ink-100',
          )}
        >
          <Settings2 className="h-4 w-4" aria-hidden />
          Settings
        </button>
      </div>
    </header>
  )
}
