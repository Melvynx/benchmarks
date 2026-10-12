import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, Minus } from 'lucide-react'
import { colorFor, initials } from '../lib/avatar'
import type { Contact } from '../types'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  size?: 'sm' | 'md' | 'lg'
  active?: boolean
  tipBelow?: boolean
}

export function IconButton({ label, size = 'md', active, className, children, tipBelow = true, ...rest }: IconButtonProps) {
  const dim = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10'
  return (
    <button
      type="button"
      aria-label={label}
      data-tip={label}
      data-tip-pos={tipBelow ? 'below' : 'above'}
      className={cx(
        'relative inline-flex shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-hover focus-visible:bg-hover disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-hover text-ink',
        dim,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Avatar({ contact, size = 40, className }: { contact: Contact; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx('inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium text-white', className)}
      style={{ width: size, height: size, background: colorFor(contact.email), fontSize: size * 0.42 }}
    >
      {initials(contact.name)}
    </span>
  )
}

export function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
  className,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: (v: boolean, e: React.MouseEvent) => void
  label: string
  className?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked, e)
      }}
      className={cx('group/cb inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-hover', className)}
    >
      <span
        className={cx(
          'flex h-[18px] w-[18px] items-center justify-center rounded-[3px] border-2 transition-colors',
          checked || indeterminate ? 'border-ink bg-ink text-surface' : 'border-muted/70 group-hover/cb:border-ink',
        )}
      >
        {indeterminate ? <Minus size={14} strokeWidth={3} /> : checked ? <Check size={14} strokeWidth={3} /> : null}
      </span>
    </button>
  )
}

/** Close a floating element on outside click / Escape */
export function useDismiss(open: boolean, onClose: () => void, refs: React.RefObject<HTMLElement | null>[]) {
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (refs.some((r) => r.current?.contains(e.target as Node))) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open, onClose, refs])
}

interface DropdownProps {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  width?: number
  open?: boolean
  onOpenChange?: (o: boolean) => void
  className?: string
}

export function Dropdown({ trigger, children, align = 'left', width = 240, open: openProp, onOpenChange, className }: DropdownProps) {
  const [openState, setOpenState] = useState(false)
  const open = openProp ?? openState
  const setOpen = useCallback(
    (o: boolean) => {
      setOpenState(o)
      onOpenChange?.(o)
    },
    [onOpenChange],
  )
  const anchor = useRef<HTMLSpanElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; maxH: number } | null>(null)
  const close = useCallback(() => setOpen(false), [setOpen])
  const refs = useRef([anchor, panel]).current
  useDismiss(open, close, refs)

  useLayoutEffect(() => {
    if (!open || !anchor.current) return
    const place = () => {
      const r = anchor.current!.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const w = Math.min(width, vw - 16)
      let left = align === 'right' ? r.right - w : r.left
      left = Math.max(8, Math.min(left, vw - w - 8))
      const ph = panel.current?.offsetHeight ?? 300
      let top = r.bottom + 4
      const spaceBelow = vh - r.bottom - 12
      const spaceAbove = r.top - 12
      if (ph > spaceBelow && spaceAbove > spaceBelow) top = Math.max(8, r.top - 4 - Math.min(ph, spaceAbove))
      setPos({ top, left, maxH: Math.max(spaceBelow, spaceAbove) })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open, align, width])

  return (
    <>
      <span ref={anchor} className={cx('inline-flex', className)}>
        {trigger({ open, toggle: () => setOpen(!open) })}
      </span>
      {open &&
        createPortal(
          <div
            ref={panel}
            role="menu"
            onClick={(e) => e.stopPropagation()}
            className="animate-pop fixed z-[80] overflow-y-auto rounded-lg border border-line bg-surface py-2 text-[14px] text-ink shadow-pop"
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: Math.min(width, window.innerWidth - 16), maxHeight: pos ? Math.min(pos.maxH, 480) : undefined }}
          >
            {children(close)}
          </div>,
          document.body,
        )}
    </>
  )
}

export function MenuItem({
  children,
  onClick,
  icon,
  hint,
  danger,
  checked,
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  icon?: ReactNode
  hint?: ReactNode
  danger?: boolean
  checked?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'flex w-full items-center gap-3 px-4 py-[7px] text-left hover:bg-hover disabled:opacity-40',
        danger && 'text-danger',
      )}
    >
      {checked !== undefined && (
        <span className="flex w-4 justify-center">{checked && <Check size={16} />}</span>
      )}
      {icon && <span className="flex w-5 justify-center text-muted">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </button>
  )
}

export function MenuDivider() {
  return <div className="my-2 border-t border-line" />
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-4 pb-1 pt-1 text-xs font-medium text-muted">{children}</div>
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 440,
  footer,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  width?: number
  footer?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="animate-fade fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal
        className="animate-pop flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-surface text-ink shadow-pop"
        style={{ maxWidth: width }}
      >
        {title && <div className="px-6 pb-2 pt-5 text-[20px] font-normal">{title}</div>}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-6 pb-5 pt-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Button({
  variant = 'text',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'text' | 'filled' | 'tonal' | 'outline' }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex h-9 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-medium transition-colors disabled:opacity-50',
        variant === 'filled' && 'bg-accent text-on-accent hover:shadow-md hover:brightness-110',
        variant === 'tonal' && 'bg-compose text-on-compose hover:shadow-sm',
        variant === 'outline' && 'border border-line-strong text-accent hover:bg-accent/10',
        variant === 'text' && 'text-accent hover:bg-accent/10',
        className,
      )}
      {...rest}
    />
  )
}

export function useMediaQuery(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [q])
  return m
}

export const useIsMobile = () => useMediaQuery('(max-width: 767px)')
