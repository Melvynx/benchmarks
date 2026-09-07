import React from 'react'
import { Users, UserCheck } from 'lucide-react'
import { useTimezone } from '@/context/TimezoneContext'
import { cn } from '@/lib/cn'

export const ModeToggle: React.FC = () => {
  const { mode, setMode } = useTimezone()

  return (
    <div
      role="radiogroup"
      aria-label="Availability comparison mode"
      className="inline-flex p-1 bg-ink-900 border border-ink-700/80 rounded-xl shadow-inner"
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'meeting'}
        onClick={() => setMode('meeting')}
        className={cn(
          'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer',
          mode === 'meeting'
            ? 'bg-emerald-500 text-ink-950 shadow-md shadow-emerald-500/25 font-bold'
            : 'text-ink-300 hover:text-ink-100 hover:bg-ink-800/60'
        )}
      >
        <Users className="w-4 h-4" />
        <span>Meeting Mode</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={mode === 'base'}
        onClick={() => setMode('base')}
        className={cn(
          'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer',
          mode === 'base'
            ? 'bg-emerald-500 text-ink-950 shadow-md shadow-emerald-500/25 font-bold'
            : 'text-ink-300 hover:text-ink-100 hover:bg-ink-800/60'
        )}
      >
        <UserCheck className="w-4 h-4" />
        <span>Base Mode</span>
      </button>
    </div>
  )
}
