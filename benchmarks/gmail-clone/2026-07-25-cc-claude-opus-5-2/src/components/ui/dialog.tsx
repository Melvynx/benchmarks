import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconButton } from './bits'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
  /** Hide the header chrome for media-style overlays. */
  bare?: boolean
}

export function Dialog({ open, onClose, title, children, footer, className, bare }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
      if (e.key === 'Tab' && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey, true)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>('[data-autofocus], input, button:not([disabled])')
        ?.focus()
    }, 0)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prev
      window.clearTimeout(t)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 animate-fade-in"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          'flex max-h-[min(90vh,860px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-elevated shadow-compose animate-pop-in',
          bare && 'max-w-5xl bg-transparent shadow-none',
          className,
        )}
      >
        {!bare && title && (
          <header className="flex items-center gap-3 px-6 pb-2 pt-5">
            <h2 className="min-w-0 flex-1 truncate text-[17px] font-medium text-ink">{title}</h2>
            <IconButton label="Close" size="sm" onClick={onClose}>
              <X />
            </IconButton>
          </header>
        )}
        <div className={cn('min-h-0 flex-1 overflow-y-auto scrollbar-thin', !bare && 'px-6 py-2')}>
          {children}
        </div>
        {footer && <footer className="flex justify-end gap-2 px-6 pb-5 pt-3">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}
