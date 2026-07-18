import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useMailStore } from '@/store/mail-store'

export function Snackbar() {
  const toast = useMailStore((s) => s.toast)
  const dismissToast = useMailStore((s) => s.dismissToast)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => dismissToast(), 6000)
    return () => window.clearTimeout(timer)
  }, [toast, dismissToast])

  if (!toast) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center sm:justify-start sm:px-6">
      <div className="pointer-events-auto flex items-center gap-4 rounded-lg bg-[#2b2b2f] px-4 py-3 text-white shadow-2xl">
        <span className="text-[13px]">{toast.message}</span>
        {toast.actionLabel && toast.onAction && (
          <button
            onClick={() => {
              toast.onAction?.()
              dismissToast()
            }}
            className="text-[13px] font-semibold uppercase tracking-wide text-[#8ab4f8] hover:text-[#aecbfa]"
          >
            {toast.actionLabel}
          </button>
        )}
        <button onClick={dismissToast} aria-label="Dismiss" className="text-white/70 hover:text-white">
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
