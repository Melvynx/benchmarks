import { cn } from '@/lib/cn'

interface Option<T extends string> {
  value: T
  label: string
  description?: string
}

interface SegmentedControlProps<T extends string> {
  value: T
  options: readonly Option<T>[]
  onChange: (value: T) => void
  'aria-label': string
  size?: 'sm' | 'md'
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  ...aria
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={aria['aria-label']}
      className="inline-flex rounded-xl border border-ink-700 bg-ink-900/70 p-1"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.description}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400/60',
              size === 'md' ? 'px-3.5 py-1.5 text-sm' : 'px-3 py-1 text-xs',
              active ? 'bg-ink-700 text-ink-100 shadow-sm' : 'text-ink-400 hover:text-ink-200',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
