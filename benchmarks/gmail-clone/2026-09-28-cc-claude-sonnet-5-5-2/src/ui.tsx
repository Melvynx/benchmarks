import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import { colorFor, cx, initials } from './util'

export function Avatar({ name, email, size = 40 }: { name: string; email: string; size?: number }) {
  return <span className="avatar" style={{ width: size, height: size, background: colorFor(email), fontSize: size * 0.45 }}>{initials(name)}</span>
}

export function IconBtn({ n, label, onClick, active, disabled, s = 20, className }: { n: string; label: string; onClick?: (e: React.MouseEvent) => void; active?: boolean; disabled?: boolean; s?: number; className?: string }) {
  return <button className={cx('ibtn', active && 'active', className)} title={label} aria-label={label} disabled={disabled} onClick={onClick}><Icon n={n} s={s} /></button>
}

export function useOutside(ref: React.RefObject<HTMLElement | null>, on: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) on() }
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); on() } }
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k, true)
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k, true) }
  }, [active, on, ref])
}

export function Menu({ trigger, children, align = 'left', up }: { trigger: (o: { open: boolean; toggle: () => void }) => ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; up?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutside(ref, () => setOpen(false), open)
  return (
    <div className="menu-wrap" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && <div className={cx('menu', align === 'right' && 'right', up && 'up')} role="menu">{children(() => setOpen(false))}</div>}
    </div>
  )
}
export const MenuItem = ({ children, onClick, icon, checked, danger }: { children: ReactNode; onClick?: () => void; icon?: string; checked?: boolean; danger?: boolean }) => (
  <button className={cx('menu-item', danger && 'danger')} role="menuitem" onClick={onClick}>
    {icon && <Icon n={icon} s={18} />}<span className="grow">{children}</span>{checked && <Icon n="check" s={16} />}
  </button>
)
export const MenuSep = () => <div className="menu-sep" />

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    document.addEventListener('keydown', k, true); return () => document.removeEventListener('keydown', k, true)
  }, [onClose])
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx('modal', wide && 'wide')} role="dialog" aria-label={title}>
        <div className="modal-h"><h2>{title}</h2><IconBtn n="x" label="Close" onClick={onClose} /></div>
        <div className="modal-b">{children}</div>
      </div>
    </div>
  )
}

export function DateTimePicker({ onPick, label = 'Pick date & time' }: { onPick: (ts: number) => void; label?: string }) {
  const def = new Date(Date.now() + 3600e3 * 3); def.setMinutes(0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  const [v, setV] = useState(`${def.getFullYear()}-${pad(def.getMonth() + 1)}-${pad(def.getDate())}T${pad(def.getHours())}:00`)
  return (
    <div className="dtp" onClick={(e) => e.stopPropagation()}>
      <div className="dtp-l">{label}</div>
      <input type="datetime-local" value={v} onChange={(e) => setV(e.target.value)} />
      <button className="btn primary sm" disabled={!v || new Date(v).getTime() <= Date.now()} onClick={() => onPick(new Date(v).getTime())}>Save</button>
    </div>
  )
}
