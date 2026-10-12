import type { LucideIcon } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  className?: string
}

const KEY_DELTA: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

/** Radio group styled as a pill switch, with roving focus and arrow-key navigation. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = 'md',
  className,
}: SegmentedProps<T>) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const activeIndex = Math.max(0, options.findIndex((option) => option.value === value))

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = KEY_DELTA[event.key]
    if (!delta) return
    event.preventDefault()
    const next = (activeIndex + delta + options.length) % options.length
    const option = options[next]
    if (!option) return
    onChange(option.value)
    buttons.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        'relative isolate inline-grid auto-cols-fr grid-flow-col rounded-full border border-line bg-surface-2 p-1',
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 -z-10 rounded-full bg-ink shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.3,1.25,0.5,1)] motion-reduce:transition-none"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map((option, index) => {
        const active = index === activeIndex
        const Icon = option.icon
        return (
          <button
            key={option.value}
            ref={(node) => {
              buttons.current[index] = node
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors duration-200 focus-visible:outline-offset-1',
              size === 'sm' ? 'h-7 px-3 text-xs' : 'h-8 px-4 text-sm',
              active ? 'text-surface' : 'text-ink-2 hover:text-ink',
            )}
          >
            {Icon && <Icon aria-hidden className="size-4 shrink-0" />}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
