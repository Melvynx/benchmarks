import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { initials, avatarColor } from '../lib/mail'

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  title: string
  active?: boolean
  size?: 'sm' | 'md'
}

export function IconButton({ title, active, size = 'md', className, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-hover hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent',
        size === 'md' ? 'h-9 w-9' : 'h-7 w-7',
        active && 'bg-hover text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Avatar({ name, email, size = 36 }: { name: string; email: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white select-none"
      style={{ width: size, height: size, background: avatarColor(email), fontSize: size * 0.4 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

export function Checkbox({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate?: boolean; onChange: () => void; label: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      title={label}
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = !!indeterminate && !checked
      }}
      onChange={onChange}
      className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
    />
  )
}

export function Dropdown({
  trigger,
  children,
  align = 'left',
  placement = 'down',
  className,
  width = 'w-60',
}: {
  trigger: (toggle: () => void, open: boolean) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  placement?: 'up' | 'down'
  className?: string
  width?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={cx('relative inline-flex', className)}>
      {trigger(() => setOpen((o) => !o), open)}
      {open && (
        <div
          role="menu"
          className={cx(
            'absolute z-50 max-h-[70vh] overflow-auto rounded-lg border border-line bg-surface py-1.5 shadow-xl animate-toast-in',
            placement === 'up' ? 'bottom-full mb-1' : 'top-full mt-1',
            align === 'right' ? 'right-0' : 'left-0',
            width,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export function MenuItem({
  icon,
  children,
  onClick,
  danger,
  shortcut,
  checked,
}: {
  icon?: ReactNode
  children: ReactNode
  onClick: () => void
  danger?: boolean
  shortcut?: string
  checked?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      onClick={onClick}
      className={cx(
        'flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] hover:bg-hover',
        danger ? 'text-danger' : 'text-ink',
      )}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-ink-2">{icon}</span>
      <span className="flex-1 truncate">{children}</span>
      {shortcut && <kbd className="font-sans text-[11px] text-ink-3">{shortcut}</kbd>}
      {checked !== undefined && (
        <span className={cx('h-3.5 w-3.5 rounded-sm border', checked ? 'border-accent bg-accent' : 'border-ink-3')} />
      )}
    </button>
  )
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-ink-3">{children}</div>
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line bg-hover px-1.5 py-0.5 font-sans text-[11px] text-ink-2">{children}</kbd>
}

export function Modal({ title, onClose, children, width = 'max-w-lg' }: { title: string; onClose: () => void; children: ReactNode; width?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-scrim p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx('flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl animate-toast-in', width)}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-base font-medium">{title}</h2>
          <IconButton title="Close" onClick={onClose}>
            <CloseGlyph />
          </IconButton>
        </div>
        <div className="overflow-auto p-5">{children}</div>
      </div>
    </div>
  )
}

function CloseGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
