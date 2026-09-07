import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { cx } from '../lib/cx'

interface SegmentedProps<T extends string> {
  options: Array<{ value: T; label: ReactNode; title?: string }>
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  full?: boolean
  label?: string
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  full = true,
  label,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx(
        'flex gap-0.5 rounded-lg border border-line bg-void/60 p-0.5',
        full && 'w-full',
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cx(
              'flex-1 rounded-[6px] text-center font-medium whitespace-nowrap transition-colors duration-150',
              size === 'sm' ? 'px-1.5 py-1 text-[11px]' : 'px-2 py-1.5 text-xs',
              active
                ? 'bg-hover text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]'
                : 'text-ink-faint hover:bg-raised hover:text-ink-dim',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  hint?: string
  swatch?: string
}

export function Toggle({ checked, onChange, label, hint, swatch }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-raised"
    >
      <span
        className={cx(
          'relative h-[18px] w-8 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-accent/85' : 'bg-line',
        )}
      >
        <span
          className={cx(
            'absolute top-[3px] size-3 rounded-full bg-void transition-transform duration-200',
            checked ? 'translate-x-[17px]' : 'translate-x-[3px]',
          )}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-dim group-hover:text-ink">
          {swatch && (
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: swatch }}
              aria-hidden
            />
          )}
          {label}
        </span>
        {hint && <span className="mt-0.5 block text-[10px] text-ink-faint">{hint}</span>}
      </span>
    </button>
  )
}

/* ------------------------------------------------------------------ */

interface DualRangeProps {
  min: number
  max: number
  step: number
  value: [number, number]
  onChange: (value: [number, number]) => void
  format: (value: number) => string
  label: string
  /** Optional relative-density bars drawn behind the track, 0..1 each. */
  histogram?: number[]
  gradient?: string
}

/**
 * Two-thumb range slider. Built by hand rather than with stacked native inputs
 * so the track can carry a distribution and the ramp gradient behind it.
 */
export function DualRange({
  min,
  max,
  step,
  value,
  onChange,
  format,
  label,
  histogram,
  gradient,
}: DualRangeProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<0 | 1 | null>(null)
  const labelId = useId()

  const toPercent = (v: number) => ((v - min) / (max - min)) * 100

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0) return min
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      const raw = min + ratio * (max - min)
      return Math.round(raw / step) * step
    },
    [max, min, step],
  )

  const commit = useCallback(
    (thumb: 0 | 1, next: number) => {
      const clamped = Math.min(max, Math.max(min, Number(next.toFixed(4))))
      if (thumb === 0) onChange([Math.min(clamped, value[1]), value[1]])
      else onChange([value[0], Math.max(clamped, value[0])])
    },
    [max, min, onChange, value],
  )

  useEffect(() => {
    if (dragging === null) return
    const move = (e: PointerEvent) => commit(dragging, valueFromClientX(e.clientX))
    const up = () => setDragging(null)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [commit, dragging, valueFromClientX])

  const onTrackPointerDown = (e: React.PointerEvent) => {
    const next = valueFromClientX(e.clientX)
    // Grab whichever thumb is nearer to the click.
    const thumb: 0 | 1 = Math.abs(next - value[0]) <= Math.abs(next - value[1]) ? 0 : 1
    commit(thumb, next)
    setDragging(thumb)
  }

  const keyStep = (thumb: 0 | 1) => (e: React.KeyboardEvent) => {
    const large = (max - min) / 10
    const deltas: Record<string, number> = {
      ArrowLeft: -step,
      ArrowDown: -step,
      ArrowRight: step,
      ArrowUp: step,
      PageDown: -large,
      PageUp: large,
    }
    if (e.key === 'Home') {
      e.preventDefault()
      commit(thumb, min)
      return
    }
    if (e.key === 'End') {
      e.preventDefault()
      commit(thumb, max)
      return
    }
    const delta = deltas[e.key]
    if (delta === undefined) return
    e.preventDefault()
    commit(thumb, value[thumb] + delta)
  }

  const peak = histogram && histogram.length > 0 ? Math.max(...histogram, 1) : 1

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span id={labelId} className="text-[11px] font-medium text-ink-faint">
          {label}
        </span>
        <span className="tabular text-[11px] font-medium text-ink-dim">
          {format(value[0])} – {format(value[1])}
        </span>
      </div>

      <div className="relative h-9 select-none" onPointerDown={onTrackPointerDown}>
        {histogram && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[18px] flex h-4 items-end gap-px">
            {histogram.map((h, i) => (
              <span
                key={i}
                className="flex-1 rounded-t-[1px] bg-ink-faint/25"
                style={{ height: `${Math.max(h > 0 ? 12 : 0, (h / peak) * 100)}%` }}
              />
            ))}
          </div>
        )}

        <div
          ref={trackRef}
          className="absolute inset-x-0 top-[18px] h-1.5 cursor-pointer rounded-full bg-line"
        >
          <div
            className="absolute inset-y-0 rounded-full"
            style={{
              left: `${toPercent(value[0])}%`,
              right: `${100 - toPercent(value[1])}%`,
              background: gradient ?? 'var(--color-accent)',
              opacity: gradient ? 1 : 0.75,
            }}
          />
        </div>

        {([0, 1] as const).map((thumb) => (
          <button
            key={thumb}
            type="button"
            role="slider"
            aria-labelledby={labelId}
            aria-valuemin={thumb === 0 ? min : value[0]}
            aria-valuemax={thumb === 0 ? value[1] : max}
            aria-valuenow={value[thumb]}
            aria-valuetext={format(value[thumb])}
            tabIndex={0}
            onPointerDown={(e) => {
              e.stopPropagation()
              setDragging(thumb)
            }}
            onKeyDown={keyStep(thumb)}
            className={cx(
              'absolute top-[13px] size-4 -translate-x-1/2 rounded-full border-2 border-void bg-ink shadow-md transition-transform',
              dragging === thumb ? 'scale-125' : 'hover:scale-110',
            )}
            style={{ left: `${toPercent(value[thumb])}%` }}
          />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="border-b border-line-soft px-4 py-3.5 last:border-b-0">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold tracking-[0.09em] text-ink-faint uppercase">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Chip({
  children,
  color,
  title,
}: {
  children: ReactNode
  color?: string
  title?: string
}) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium"
      style={{
        borderColor: color ? `${color}55` : 'var(--color-line)',
        background: color ? `${color}14` : 'transparent',
        color: color ?? 'var(--color-ink-dim)',
      }}
    >
      {children}
    </span>
  )
}
