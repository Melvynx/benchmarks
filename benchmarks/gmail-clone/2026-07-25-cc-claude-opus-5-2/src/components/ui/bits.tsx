import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, Minus } from 'lucide-react'
import { avatarColor, cn, initials } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/*  Tooltip                                                                    */
/* -------------------------------------------------------------------------- */

interface TooltipState {
  text: string
  x: number
  y: number
  below: boolean
}

let tooltipTimer: number | undefined

export function Tooltip({
  label,
  shortcut,
  children,
  disabled,
}: {
  label?: string
  shortcut?: string
  children: ReactNode
  disabled?: boolean
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [state, setState] = useState<TooltipState | null>(null)

  useEffect(() => () => window.clearTimeout(tooltipTimer), [])

  if (!label || disabled) return <>{children}</>

  const open = () => {
    window.clearTimeout(tooltipTimer)
    tooltipTimer = window.setTimeout(() => {
      const el = ref.current?.firstElementChild ?? ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const below = r.bottom + 44 < window.innerHeight
      setState({
        text: shortcut ? `${label} (${shortcut})` : label,
        x: r.left + r.width / 2,
        y: below ? r.bottom + 8 : r.top - 8,
        below,
      })
    }, 450)
  }
  const close = () => {
    window.clearTimeout(tooltipTimer)
    setState(null)
  }

  return (
    <>
      <span
        ref={ref}
        className="contents"
        onPointerEnter={open}
        onPointerLeave={close}
        onPointerDown={close}
        onFocus={open}
        onBlur={close}
      >
        {children}
      </span>
      {state &&
        createPortal(
          <div
            role="tooltip"
            style={{
              left: state.x,
              top: state.y,
              transform: `translate(-50%, ${state.below ? '0' : '-100%'})`,
            }}
            className="pointer-events-none fixed z-[90] animate-fade-in whitespace-nowrap rounded bg-[#3c4043] px-2 py-1 text-[11px] font-medium text-white shadow-pop dark:bg-[#e3e3e3] dark:text-[#1f1f1f]"
          >
            {state.text}
          </div>,
          document.body,
        )}
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Buttons                                                                    */
/* -------------------------------------------------------------------------- */

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  shortcut?: string
  size?: 'sm' | 'md' | 'lg'
  active?: boolean
  showTooltip?: boolean
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, shortcut, size = 'md', active, className, children, showTooltip = true, ...rest },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors',
        'hover:bg-surface-3 hover:text-ink active:bg-surface-3 disabled:pointer-events-none disabled:opacity-35',
        size === 'sm' && 'h-7 w-7 [&_svg]:h-4 [&_svg]:w-4',
        size === 'md' && 'h-9 w-9 [&_svg]:h-5 [&_svg]:w-5',
        size === 'lg' && 'h-10 w-10 [&_svg]:h-[22px] [&_svg]:w-[22px]',
        active && 'bg-surface-3 text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
  return showTooltip ? (
    <Tooltip label={label} shortcut={shortcut}>
      {button}
    </Tooltip>
  ) : (
    button
  )
})

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'filled' | 'tonal' | 'text' | 'outline' }
>(function Button({ variant = 'filled', className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex h-9 items-center justify-center gap-2 rounded-full px-5 text-[13px] font-medium transition-colors',
        'disabled:pointer-events-none disabled:opacity-40 [&_svg]:h-[18px] [&_svg]:w-[18px]',
        variant === 'filled' && 'bg-accent text-on-accent hover:bg-accent-hover',
        variant === 'tonal' && 'bg-accent-soft text-accent-ink hover:brightness-95',
        variant === 'text' && 'px-3 text-accent-ink hover:bg-accent-soft/40',
        variant === 'outline' && 'border border-line text-ink hover:bg-surface-2',
        className,
      )}
      {...rest}
    />
  )
})

/* -------------------------------------------------------------------------- */
/*  Checkbox / Switch                                                          */
/* -------------------------------------------------------------------------- */

export function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
  className,
  stopPropagation = true,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: (next: boolean, event: React.MouseEvent) => void
  label: string
  className?: string
  stopPropagation?: boolean
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation()
        onChange(!checked, e)
      }}
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-surface-3',
        className,
      )}
    >
      <span
        className={cn(
          'flex h-[18px] w-[18px] items-center justify-center rounded-[3px] border-2 transition-colors',
          checked || indeterminate
            ? 'border-accent bg-accent text-on-accent'
            : 'border-current bg-transparent',
        )}
      >
        {indeterminate ? (
          <Minus className="h-3 w-3" strokeWidth={3} />
        ) : checked ? (
          <Check className="h-3 w-3" strokeWidth={3.5} />
        ) : null}
      </span>
    </button>
  )
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[18px] w-[34px] shrink-0 rounded-full transition-colors',
        checked ? 'bg-accent' : 'bg-line',
      )}
    >
      <span
        className={cn(
          'absolute top-1/2 h-[14px] w-[14px] -translate-y-1/2 rounded-full bg-white shadow transition-[left]',
          checked ? 'left-[18px]' : 'left-[2px]',
        )}
      />
    </button>
  )
}

export function Radio({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: () => void
  label: ReactNode
  description?: ReactNode
}) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2"
    >
      <input
        id={id}
        type="radio"
        checked={checked}
        onChange={onChange}
        className="mt-[3px] h-4 w-4 shrink-0 accent-[var(--color-accent)]"
      />
      <span className="min-w-0">
        <span className="block text-[13px] leading-5 text-ink">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[12px] leading-4 text-ink-3">{description}</span>
        )}
      </span>
    </label>
  )
}

/* -------------------------------------------------------------------------- */
/*  Avatar                                                                     */
/* -------------------------------------------------------------------------- */

export function Avatar({
  name,
  email,
  size = 40,
  className,
  color,
}: {
  name: string
  email: string
  size?: number
  className?: string
  color?: string
}) {
  const bg = color ?? avatarColor(email || name)
  return (
    <span
      aria-hidden
      style={{ backgroundColor: bg, width: size, height: size, fontSize: size * 0.42 }}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium text-white',
        className,
      )}
    >
      {initials(name, email)}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  Misc                                                                       */
/* -------------------------------------------------------------------------- */

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[20px] items-center justify-center rounded border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-[11px] font-medium text-ink-2">
      {children}
    </kbd>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
    />
  )
}
