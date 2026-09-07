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
import { avatarColor, initials } from '../lib/contacts'
import { Icon, type IconName } from './Icon'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function Avatar({
  name,
  hue,
  size = 32,
  className,
}: {
  name: string
  hue: number
  size?: number
  className?: string
}) {
  return (
    <span
      className={cx(
        'inline-grid shrink-0 place-items-center rounded-full font-medium text-white select-none',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size < 28 ? 11 : 13,
        background: avatarColor(hue),
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span className="pointer-events-none absolute top-full left-1/2 z-[80] mt-1 hidden -translate-x-1/2 rounded bg-ink px-2 py-1 text-[11px] whitespace-nowrap text-panel shadow-e2 group-hover/tip:block">
        {label}
      </span>
    </span>
  )
}

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; tip?: string; active?: boolean }
>(function IconButton({ icon, tip, active, className, ...props }, ref) {
  const btn = (
    <button
      ref={ref}
      type="button"
      aria-label={tip ?? icon}
      title={tip}
      className={cx(
        'grid size-10 shrink-0 place-items-center rounded-full text-ink-2 transition-colors hover:bg-hov disabled:opacity-40',
        active && 'bg-selected-soft text-accent',
        className,
      )}
      {...props}
    >
      <Icon name={icon} size={20} />
    </button>
  )
  return btn
})

export function Button({
  children,
  className,
  variant = 'ghost',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'ghost' | 'filled' | 'tonal' | 'danger' }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors disabled:opacity-40',
        variant === 'ghost' && 'text-accent hover:bg-selected-soft/50',
        variant === 'filled' && 'bg-accent text-panel hover:opacity-90',
        variant === 'tonal' && 'bg-compose text-compose-ink hover:brightness-95',
        variant === 'danger' && 'text-danger hover:bg-danger/10',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

interface MenuPos {
  top: number
  left: number
}

export function MenuButton({
  icon,
  tip,
  children,
  width = 240,
  placement = 'bottom-start',
  className,
  trigger,
}: {
  icon?: IconName
  tip?: string
  children: (close: () => void) => ReactNode
  width?: number
  placement?: 'bottom-start' | 'bottom-end'
  className?: string
  trigger?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<MenuPos>({ top: 0, left: 0 })
  const ref = useRef<HTMLButtonElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t)) return
      if ((t as HTMLElement).closest?.(`[data-menu="${id}"]`)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, id])

  const toggle = () => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const left = placement === 'bottom-end' ? r.right - width : r.left
    setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(left, window.innerWidth - width - 8)) })
    setOpen((v) => !v)
  }

  return (
    <>
      {trigger ? (
        <button
          ref={ref}
          type="button"
          aria-label={tip}
          title={tip}
          className={cx('rounded-full', className)}
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          {trigger}
        </button>
      ) : (
        <IconButton
          ref={ref}
          icon={icon ?? 'more'}
          tip={tip}
          active={open}
          className={className}
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="menu"
        />
      )}
      {open &&
        createPortal(
          <div
            data-menu={id}
            role="menu"
            className="anim-up fixed z-[120] overflow-hidden rounded-xl bg-panel py-1 shadow-e3"
            style={{ top: pos.top, left: pos.left, width }}
          >
            {children(() => setOpen(false))}
          </div>,
          document.body,
        )}
    </>
  )
}

export function MenuItem({
  icon,
  children,
  onClick,
  danger,
  kbd,
}: {
  icon?: IconName
  children: ReactNode
  onClick?: () => void
  danger?: boolean
  kbd?: string
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cx(
        'flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] hover:bg-hov',
        danger ? 'text-danger' : 'text-ink',
      )}
    >
      {icon && <Icon name={icon} size={20} className="text-ink-3" />}
      <span className="flex-1">{children}</span>
      {kbd && <kbd className="text-[11px] text-ink-4">{kbd}</kbd>}
    </button>
  )
}

export function MenuDivider() {
  return <div className="my-1 h-px bg-line" />
}

export function Dialog({
  title,
  onClose,
  children,
  width = 560,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  width?: number
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[200] grid place-items-center p-4" role="dialog" aria-modal aria-label={title}>
      <div className="anim-fade absolute inset-0 bg-scrim" onClick={onClose} />
      <div
        className="anim-up relative max-h-[min(88vh,720px)] w-full overflow-hidden rounded-3xl bg-panel shadow-e3"
        style={{ maxWidth: width }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <h2 className="text-[22px] font-normal">{title}</h2>
          <IconButton icon="close" tip="Close" onClick={onClose} />
        </div>
        <div className="scrollbar-thin overflow-auto px-6 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
