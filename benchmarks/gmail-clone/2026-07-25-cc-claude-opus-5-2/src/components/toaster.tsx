import { X } from 'lucide-react'
import { useToast } from '@/store/toast'

export function Toaster() {
  const { toasts, dismiss } = useToast()
  if (!toasts.length) return null

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 z-[85] flex w-full flex-col gap-2 p-3 sm:w-auto sm:p-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex animate-toast-in items-center gap-1 rounded bg-[#323232] py-1 pl-4 pr-1 text-[13px] text-white shadow-pop dark:bg-[#e3e3e3] dark:text-[#1f1f1f]"
        >
          <span className="min-w-0 flex-1 py-2 pr-2">{t.message}</span>
          {t.actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => {
                dismiss(t.id)
                a.onClick()
              }}
              className="shrink-0 rounded px-3 py-2 text-[13px] font-medium uppercase tracking-wide text-[#8ab4f8] hover:bg-white/10 dark:text-[#0b57d0] dark:hover:bg-black/5"
            >
              {a.label}
            </button>
          ))}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismiss(t.id)}
            className="shrink-0 rounded-full p-2 text-white/70 hover:bg-white/10 dark:text-black/60 dark:hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
