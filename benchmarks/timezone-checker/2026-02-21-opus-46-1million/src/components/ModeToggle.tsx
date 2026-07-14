interface ModeToggleProps {
  mode: 'meeting' | 'base'
  onChange: (mode: 'meeting' | 'base') => void
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex bg-slate-800 rounded-lg p-0.5">
      <button
        onClick={() => onChange('meeting')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
          mode === 'meeting'
            ? 'bg-indigo-500 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        Meeting
      </button>
      <button
        onClick={() => onChange('base')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
          mode === 'base'
            ? 'bg-indigo-500 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        Base
      </button>
    </div>
  )
}
