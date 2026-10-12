import { useEffect, useRef, useState, type ReactNode } from 'react'
import { colorOf, initial } from './util'
import { I } from './icons'

export function Avatar({ email, size = 40 }: { email: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, background: colorOf(email), fontSize: size * 0.45 }}>
      {initial(email)}
    </span>
  )
}

export function Btn({ icon, title, onClick, disabled, active, children, className = '' }: { icon?: string; title: string; onClick?: (e: React.MouseEvent) => void; disabled?: boolean; active?: boolean; children?: ReactNode; className?: string }) {
  return (
    <button type="button" className={`ibtn ${active ? 'active' : ''} ${className}`} title={title} aria-label={title} onClick={onClick} disabled={disabled}>
      {icon && <I n={icon} />}
      {children}
    </button>
  )
}

export function Dropdown({ trigger, children, align = 'left', className = '', onOpen }: { trigger: (open: boolean, toggle: () => void) => ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; className?: string; onOpen?: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open])
  return (
    <div className={`dd ${className}`} ref={ref}>
      {trigger(open, () => {
        if (!open) onOpen?.()
        setOpen(!open)
      })}
      {open && <div className={`menu ${align}`}>{children(() => setOpen(false))}</div>}
    </div>
  )
}

export function MenuItem({ icon, children, onClick, right, disabled }: { icon?: string; children: ReactNode; onClick?: () => void; right?: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" className="mitem" onClick={onClick} disabled={disabled}>
      {icon ? <I n={icon} s={18} /> : <span className="mi-sp" />}
      <span className="mi-t">{children}</span>
      {right && <span className="mi-r">{right}</span>}
    </button>
  )
}

export function Check({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate?: boolean; onChange: () => void; label: string }) {
  return (
    <span
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      tabIndex={-1}
      className={`chk ${checked ? 'on' : ''} ${indeterminate ? 'mixed' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
    >
      {indeterminate ? <i className="dash" /> : checked ? <I n="check" s={14} c="#fff" /> : null}
    </span>
  )
}
