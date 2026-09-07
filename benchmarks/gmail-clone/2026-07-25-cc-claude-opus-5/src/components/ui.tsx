import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Icon, type IconName } from './Icon'
import { avatarColor, initials } from '../lib/format'

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ')

/* -------------------------------------------------------------- tooltip */

interface TipState {
  text: string
  x: number
  y: number
  above: boolean
}

export function Tooltip({
  label,
  children,
  side = 'bottom',
  disabled,
}: {
  label?: string
  children: ReactNode
  side?: 'bottom' | 'top'
  disabled?: boolean
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [tip, setTip] = useState<TipState | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback(() => {
    if (!label || disabled) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const el = ref.current?.firstElementChild ?? ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const above = side === 'top' || r.bottom + 44 > window.innerHeight
      setTip({
        text: label,
        x: Math.min(Math.max(r.left + r.width / 2, 60), window.innerWidth - 60),
        y: above ? r.top - 8 : r.bottom + 8,
        above,
      })
    }, 480)
  }, [label, side, disabled])

  const hide = useCallback(() => {
    window.clearTimeout(timer.current)
    setTip(null)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <>
      <span
        ref={ref}
        onPointerEnter={show}
        onPointerLeave={hide}
        onPointerDown={hide}
        className="contents"
      >
        {children}
      </span>
      {tip &&
        createPortal(
          <div
            role="tooltip"
            className="anim-fade pointer-events-none fixed z-[999] max-w-56 rounded bg-tooltip px-2 py-1 text-center text-[11px] leading-4 font-medium text-tooltip-ink shadow-e1"
            style={{
              left: tip.x,
              top: tip.y,
              transform: `translate(-50%, ${tip.above ? '-100%' : '0'})`,
            }}
          >
            {tip.text}
          </div>,
          document.body,
        )}
    </>
  )
}

/* ---------------------------------------------------------- icon button */

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  tip?: string
  size?: number
  active?: boolean
  tone?: 'default' | 'star' | 'important' | 'accent'
  padding?: string
}

export function IconButton({
  icon,
  tip,
  size = 20,
  active,
  tone = 'default',
  padding = 'p-2',
  className,
  ...rest
}: IconButtonProps) {
  const toneCls =
    tone === 'star'
      ? active
        ? 'text-star'
        : 'text-ink-4 hover:text-ink-2'
      : tone === 'important'
        ? active
          ? 'text-important'
          : 'text-ink-4 hover:text-ink-2'
        : tone === 'accent'
          ? 'text-accent'
          : active
            ? 'text-ink'
            : 'text-ink-2'

  return (
    <Tooltip label={tip} disabled={rest.disabled}>
      <button
        type="button"
        aria-label={rest['aria-label'] ?? tip}
        className={cx(
          'inline-grid place-items-center rounded-full transition-colors',
          padding,
          'hover:bg-hov active:bg-hov-strong disabled:pointer-events-none disabled:opacity-35',
          toneCls,
          className,
        )}
        {...rest}
      >
        <Icon name={icon} size={size} />
      </button>
    </Tooltip>
  )
}

/* -------------------------------------------------------------- popover */

type Placement = 'bottom-start' | 'bottom-end' | 'bottom' | 'top-start' | 'right-start'

/**
 * Triggers are often wrapped in `display: contents` spans (Tooltip, MenuButton),
 * which measure as a zero rect — walk down to the first real box instead.
 */
function anchorRect(el: HTMLElement) {
  let node: HTMLElement = el
  while (getComputedStyle(node).display === 'contents' && node.firstElementChild) {
    node = node.firstElementChild as HTMLElement
  }
  return node.getBoundingClientRect()
}

export function Popover({
  anchor,
  open,
  onClose,
  placement = 'bottom-start',
  children,
  width,
  className,
  offset = 4,
}: {
  anchor: HTMLElement | null
  open: boolean
  onClose: () => void
  placement?: Placement
  children: ReactNode
  width?: number
  className?: string
  offset?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number; maxHeight: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchor) return
    const place = () => {
      const a = anchorRect(anchor)
      const el = ref.current
      const w = width ?? el?.offsetWidth ?? 240
      const h = el?.offsetHeight ?? 200
      const vw = window.innerWidth
      const vh = window.innerHeight

      let left = a.left
      let top = a.bottom + offset

      if (placement === 'bottom-end') left = a.right - w
      if (placement === 'bottom') left = a.left + a.width / 2 - w / 2
      if (placement === 'right-start') {
        left = a.right + offset
        top = a.top
      }
      if (placement === 'top-start') top = a.top - h - offset

      if (top + h > vh - 8 && placement !== 'top-start') {
        const above = a.top - h - offset
        if (above > 8) top = above
      }
      left = Math.min(Math.max(8, left), Math.max(8, vw - w - 8))
      top = Math.min(Math.max(8, top), Math.max(8, vh - 8 - Math.min(h, vh - 16)))
      setPos({ left, top, maxHeight: vh - top - 12 })
    }
    place()
    const ro = new ResizeObserver(place)
    if (ref.current) ro.observe(ref.current)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, anchor, placement, width, offset])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || anchor?.contains(t)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('mousedown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open, onClose, anchor])

  if (!open) return null

  return createPortal(
    <div
      ref={ref}
      role="menu"
      className={cx(
        'anim-menu scroll-thin fixed z-[200] overflow-y-auto rounded-lg border border-line bg-raised py-2 shadow-e2',
        className,
      )}
      style={{
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        width,
        maxHeight: pos?.maxHeight,
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      {children}
    </div>,
    document.body,
  )
}

export function MenuItem({
  icon,
  children,
  onClick,
  danger,
  disabled,
  trailing,
  selected,
  checkbox,
  swatch,
}: {
  icon?: IconName
  children: ReactNode
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
  trailing?: ReactNode
  selected?: boolean
  checkbox?: boolean | 'mixed'
  swatch?: string
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'flex w-full items-center gap-3 px-4 py-[7px] text-left text-[13px] transition-colors',
        'hover:bg-hov disabled:pointer-events-none disabled:opacity-40',
        danger ? 'text-danger' : 'text-ink',
      )}
    >
      {checkbox !== undefined && (
        <Icon
          name={
            checkbox === 'mixed'
              ? 'checkboxIndeterminate'
              : checkbox
                ? 'checkboxChecked'
                : 'checkboxBlank'
          }
          size={18}
          className={checkbox ? 'text-accent' : 'text-ink-3'}
        />
      )}
      {swatch !== undefined && (
        <span
          className="size-3.5 flex-none rounded-[3px]"
          style={{ background: swatch }}
          aria-hidden
        />
      )}
      {icon && <Icon name={icon} size={18} className={danger ? '' : 'text-ink-3'} />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {selected && <Icon name="check" size={16} className="text-accent" />}
      {trailing && <span className="text-[11px] text-ink-4">{trailing}</span>}
    </button>
  )
}

export function MenuDivider() {
  return <div className="my-1.5 border-t border-line" role="separator" />
}

export function MenuHeading({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 pt-1 pb-1.5 text-[11px] font-medium tracking-wide text-ink-3 uppercase">
      {children}
    </div>
  )
}

/* --------------------------------------------------------------- dialog */

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  width = 560,
  bare,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: number
  bare?: boolean
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
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey, true)
      prev?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="anim-fade fixed inset-0 z-[300] grid place-items-center bg-scrim p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="anim-sheet flex max-h-[88vh] w-full flex-col overflow-hidden rounded-2xl bg-raised shadow-e3 outline-none"
        style={{ maxWidth: width }}
      >
        {!bare && title && (
          <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-3">
            <h2 className="text-[18px] leading-6 font-normal text-ink">{title}</h2>
            <IconButton icon="close" tip="Close" onClick={onClose} size={18} />
          </div>
        )}
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-6 pb-2">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

/* -------------------------------------------------------------- buttons */

export function Button({
  variant = 'text',
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'filled' | 'text' | 'outline' | 'tonal' }) {
  const base =
    'inline-flex h-9 items-center justify-center gap-2 rounded-full px-5 text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-40'
  const styles = {
    filled: 'bg-accent text-on-accent hover:brightness-110 active:brightness-95',
    tonal: 'bg-selected-soft text-accent hover:brightness-105',
    outline: 'border border-line-2 text-accent hover:bg-selected-soft/40',
    text: 'text-accent hover:bg-selected-soft/40',
  }[variant]
  return (
    <button type="button" className={cx(base, styles, className)} {...rest}>
      {children}
    </button>
  )
}

/* --------------------------------------------------------------- inputs */

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative h-[18px] w-9 flex-none rounded-full transition-colors',
        checked ? 'bg-accent' : 'bg-line-2',
      )}
    >
      <span
        className={cx(
          'absolute top-[2px] size-[14px] rounded-full bg-white shadow-e1 transition-[left]',
          checked ? 'left-[20px]' : 'left-[2px]',
        )}
      />
    </button>
  )
}

export function Radio({
  checked,
  onChange,
  children,
  name,
}: {
  checked: boolean
  onChange: () => void
  children: ReactNode
  name: string
}) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 py-[3px] text-[13px]">
      <input
        id={id}
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-[2px] size-4 flex-none accent-[var(--c-accent)]"
      />
      <span className="text-ink">{children}</span>
    </label>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
  className,
  indeterminate,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  className?: string
  indeterminate?: boolean
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className={cx(
        'grid size-8 place-items-center rounded-full transition-colors hover:bg-hov',
        checked || indeterminate ? 'text-accent' : 'text-ink-3',
        className,
      )}
    >
      <Icon
        name={
          indeterminate ? 'checkboxIndeterminate' : checked ? 'checkboxChecked' : 'checkboxBlank'
        }
        size={18}
      />
    </button>
  )
}

/* -------------------------------------------------------------- avatars */

export function Avatar({
  name,
  email,
  hue,
  size = 40,
  className,
  ring,
}: {
  name: string
  email?: string
  hue: number
  size?: number
  className?: string
  ring?: boolean
}) {
  return (
    <span
      className={cx(
        'grid flex-none place-items-center rounded-full font-medium text-white select-none',
        ring && 'ring-2 ring-panel',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: avatarColor(hue),
        fontSize: Math.round(size * 0.42),
      }}
      title={email}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

/* --------------------------------------------------------------- misc */

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      className="anim-spin inline-block rounded-full border-2 border-line-2 border-t-accent"
      style={{ width: size, height: size }}
      aria-label="Loading"
      role="status"
    />
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-grid h-5 min-w-5 place-items-center rounded border border-line-2 bg-panel-alt px-1.5 font-sans text-[11px] font-medium text-ink-2">
      {children}
    </kbd>
  )
}

/** Auto-closing menu wrapper: renders a trigger and its popover together. */
export function MenuButton({
  icon,
  tip,
  children,
  placement = 'bottom-start',
  width,
  size,
  padding,
  className,
  render,
}: {
  icon: IconName
  tip?: string
  children?: (close: () => void) => ReactNode
  placement?: Placement
  width?: number
  size?: number
  padding?: string
  className?: string
  render?: (props: { open: boolean; toggle: () => void; ref: (el: HTMLElement | null) => void }) => ReactNode
}) {
  const [el, setEl] = useState<HTMLElement | null>(null)
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  return (
    <>
      {render ? (
        render({ open, toggle: () => setOpen((v) => !v), ref: setEl })
      ) : (
        <span ref={setEl} className="contents">
          <IconButton
            icon={icon}
            tip={tip}
            size={size}
            padding={padding}
            className={className}
            active={open}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          />
        </span>
      )}
      <Popover anchor={el} open={open} onClose={close} placement={placement} width={width}>
        {children?.(close)}
      </Popover>
    </>
  )
}
