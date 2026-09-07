import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

type Side = 'bottom' | 'top'
type Align = 'start' | 'end' | 'center'

interface PopoverProps {
  anchorRef: RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  children: ReactNode
  side?: Side
  align?: Align
  /** Extra offset from the anchor, in px. */
  offset?: number
  className?: string
  matchWidth?: boolean
  /** Move keyboard focus into the panel when it opens. */
  autoFocus?: boolean
  role?: 'menu' | 'dialog' | 'listbox'
  ariaLabel?: string
}

export function Popover({
  anchorRef,
  open,
  onClose,
  children,
  side = 'bottom',
  align = 'start',
  offset = 6,
  className,
  matchWidth,
  autoFocus = true,
  role = 'menu',
  ariaLabel,
}: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width?: number } | null>(null)

  const place = useCallback(() => {
    const anchor = anchorRef.current
    const panel = panelRef.current
    if (!anchor || !panel) return
    const a = anchor.getBoundingClientRect()
    const p = panel.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const margin = 8

    let top = side === 'bottom' ? a.bottom + offset : a.top - p.height - offset
    if (top + p.height > vh - margin) top = a.top - p.height - offset
    if (top < margin) top = margin

    let left =
      align === 'start' ? a.left : align === 'end' ? a.right - p.width : a.left + a.width / 2 - p.width / 2
    left = Math.min(Math.max(margin, left), Math.max(margin, vw - p.width - margin))

    setPos({ top, left, width: matchWidth ? a.width : undefined })
  }, [align, anchorRef, matchWidth, offset, side])

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    place()
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const onScroll = () => place()
    window.addEventListener('resize', onScroll)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (panelRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        anchorRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open, onClose, anchorRef])

  useEffect(() => {
    if (!open || !autoFocus) return
    const t = window.setTimeout(() => {
      const panel = panelRef.current
      if (!panel) return
      const focusable = panel.querySelector<HTMLElement>(
        '[data-autofocus], input, button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      focusable?.focus()
    }, 0)
    return () => window.clearTimeout(t)
  }, [open, autoFocus])

  if (!open) return null

  return createPortal(
    <div
      ref={panelRef}
      role={role}
      aria-label={ariaLabel}
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: pos?.width,
        visibility: pos ? 'visible' : 'hidden',
      }}
      className={cn(
        'fixed z-[70] origin-top rounded-lg border border-line-soft bg-elevated py-2 shadow-pop',
        'animate-pop-in text-sm text-ink',
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  )
}

/* -------------------------------------------------------------------------- */
/*  Menu                                                                       */
/* -------------------------------------------------------------------------- */

export type MenuEntry =
  | {
      type?: 'item'
      id: string
      label: ReactNode
      icon?: ReactNode
      shortcut?: string
      onSelect: () => void
      disabled?: boolean
      danger?: boolean
      checked?: boolean
    }
  | { type: 'separator'; id: string }
  | { type: 'header'; id: string; label: string }

interface MenuProps {
  anchorRef: RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  entries: MenuEntry[]
  align?: Align
  side?: Side
  className?: string
  ariaLabel?: string
}

export function Menu({
  anchorRef,
  open,
  onClose,
  entries,
  align = 'start',
  side = 'bottom',
  className,
  ariaLabel,
}: MenuProps) {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const selectable = entries
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => (!e.type || e.type === 'item') && !('disabled' in e && e.disabled))

  const move = (dir: 1 | -1) => {
    const active = document.activeElement
    const currentIdx = selectable.findIndex(({ i }) => itemRefs.current[i] === active)
    const nextIdx =
      currentIdx === -1
        ? dir === 1
          ? 0
          : selectable.length - 1
        : (currentIdx + dir + selectable.length) % selectable.length
    itemRefs.current[selectable[nextIdx]?.i]?.focus()
  }

  return (
    <Popover
      anchorRef={anchorRef}
      open={open}
      onClose={onClose}
      align={align}
      side={side}
      className={cn('min-w-56 max-w-[min(20rem,92vw)]', className)}
      ariaLabel={ariaLabel}
    >
      <div
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            move(1)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            move(-1)
          }
        }}
      >
        {entries.map((entry, i) => {
          if (entry.type === 'separator') {
            return <div key={entry.id} className="my-1.5 h-px bg-line-soft" />
          }
          if (entry.type === 'header') {
            return (
              <div
                key={entry.id}
                className="px-4 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-4"
              >
                {entry.label}
              </div>
            )
          }
          return (
            <button
              key={entry.id}
              ref={(el) => {
                itemRefs.current[i] = el
              }}
              type="button"
              role="menuitem"
              disabled={entry.disabled}
              onClick={() => {
                onClose()
                entry.onSelect()
              }}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-[7px] text-left text-[13px] leading-5',
                'hover:bg-surface-2 focus:bg-surface-2 focus:outline-none',
                entry.disabled && 'pointer-events-none opacity-40',
                entry.danger && 'text-danger',
              )}
            >
              {entry.icon !== undefined && (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center text-ink-3 [&_svg]:h-[18px] [&_svg]:w-[18px]">
                  {entry.icon}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">{entry.label}</span>
              {entry.checked && <span className="text-accent-ink">✓</span>}
              {entry.shortcut && (
                <span className="shrink-0 text-[11px] text-ink-4">{entry.shortcut}</span>
              )}
            </button>
          )
        })}
      </div>
    </Popover>
  )
}
