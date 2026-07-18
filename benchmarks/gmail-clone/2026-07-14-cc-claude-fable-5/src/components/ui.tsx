import { useEffect, useRef, type ReactNode } from 'react'
import { Check, Minus } from 'lucide-react'
import { avatarColor, cx, initial } from '../lib/utils'
import type { Contact } from '../types'

export function IconButton(props: {
  title: string
  onClick?: (e: React.MouseEvent) => void
  children: ReactNode
  className?: string
  disabled?: boolean
  active?: boolean
  size?: 'sm' | 'md' | 'lg'
  'aria-expanded'?: boolean
}) {
  const size = props.size ?? 'md'
  return (
    <button
      type="button"
      title={props.title}
      aria-label={props.title}
      aria-expanded={props['aria-expanded']}
      disabled={props.disabled}
      onClick={(e) => {
        e.stopPropagation()
        props.onClick?.(e)
      }}
      className={cx(
        'inline-flex items-center justify-center rounded-full text-ink-2 transition-colors',
        'hover:bg-black/8 dark:hover:bg-white/10 active:bg-black/12 dark:active:bg-white/15',
        'disabled:opacity-40 disabled:pointer-events-none',
        props.active && 'bg-black/8 dark:bg-white/10',
        size === 'sm' && 'h-7 w-7 [&>svg]:h-4 [&>svg]:w-4',
        size === 'md' && 'h-9 w-9 [&>svg]:h-[18px] [&>svg]:w-[18px]',
        size === 'lg' && 'h-11 w-11 [&>svg]:h-5 [&>svg]:w-5',
        props.className,
      )}
    >
      {props.children}
    </button>
  )
}

export function Menu(props: {
  open: boolean
  onClose: () => void
  children: ReactNode
  align?: 'left' | 'right'
  direction?: 'down' | 'up'
  className?: string
  width?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!props.open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        props.onClose()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [props.open, props.onClose])

  if (!props.open) return null
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={(e) => {
          e.stopPropagation()
          props.onClose()
        }}
      />
      <div
        ref={ref}
        role="menu"
        className={cx(
          'absolute z-50 min-w-44 overflow-auto rounded-lg bg-surface py-2 anim-pop',
          'shadow-[var(--shadow-menu)] border border-line/60',
          props.align === 'right' ? 'right-0' : 'left-0',
          props.direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1',
          props.width,
          props.className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {props.children}
      </div>
    </>
  )
}

export function MenuItem(props: {
  onClick?: () => void
  children: ReactNode
  icon?: ReactNode
  disabled?: boolean
  danger?: boolean
  trailing?: ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={props.disabled}
      onClick={props.onClick}
      className={cx(
        'flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-ink-1',
        'hover:bg-surface-hover disabled:opacity-40 disabled:pointer-events-none',
        props.danger && 'text-danger',
      )}
    >
      {props.icon && <span className="[&>svg]:h-4.5 [&>svg]:w-4.5 text-ink-2 shrink-0">{props.icon}</span>}
      <span className="flex-1 truncate">{props.children}</span>
      {props.trailing}
    </button>
  )
}

export function MenuDivider() {
  return <div className="my-2 border-t border-line" />
}

export function Checkbox(props: {
  checked: boolean
  indeterminate?: boolean
  onChange: (checked: boolean) => void
  title?: string
  className?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={props.indeterminate ? 'mixed' : props.checked}
      title={props.title ?? 'Select'}
      onClick={(e) => {
        e.stopPropagation()
        props.onChange(!props.checked)
      }}
      className={cx(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
        'hover:bg-black/8 dark:hover:bg-white/10',
        props.className,
      )}
    >
      <span
        className={cx(
          'flex h-4 w-4 items-center justify-center rounded-xs border-2 transition-colors',
          props.checked || props.indeterminate
            ? 'border-accent bg-accent text-white dark:text-[#0e1014]'
            : 'border-ink-3 bg-transparent text-transparent',
        )}
      >
        {props.indeterminate ? <Minus className="h-3 w-3" strokeWidth={3.5} /> : <Check className="h-3 w-3" strokeWidth={3.5} />}
      </span>
    </button>
  )
}

export function Avatar(props: { contact: Contact; size?: number; className?: string }) {
  const size = props.size ?? 40
  return (
    <span
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white select-none', props.className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        backgroundColor: props.contact.me ? '#7E57C2' : avatarColor(props.contact.email),
      }}
      aria-hidden
    >
      {initial(props.contact.name)}
    </span>
  )
}

export function Kbd(props: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-5 items-center justify-center rounded border border-line-strong bg-chip px-1.5 py-0.5 font-sans text-[11px] text-ink-2">
      {props.children}
    </kbd>
  )
}
