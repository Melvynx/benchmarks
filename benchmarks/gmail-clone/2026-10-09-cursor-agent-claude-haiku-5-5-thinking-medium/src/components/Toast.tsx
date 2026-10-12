import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../lib/store'

export function Toast() {
  const { state, dispatch } = useStore()
  const toast = state.ui.toast
  const { undoSeconds } = state.data.settings

  useEffect(() => {
    if (!toast) return
    const ms = (toast.undo ? undoSeconds : 4) * 1000
    const t = window.setTimeout(() => dispatch({ type: 'toast', toast: null }), ms)
    return () => window.clearTimeout(t)
  }, [toast, undoSeconds, dispatch])

  if (!toast) return null

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4 md:justify-start md:pl-6">
      <div key={toast.id} className="pointer-events-auto flex max-w-full items-center gap-4 rounded-lg bg-[#202124] py-3 pl-4 pr-2 text-[14px] text-white shadow-xl animate-toast-in dark:bg-[#e3e3e3] dark:text-[#1f1f1f]">
        <span className="truncate">{toast.text}</span>
        {toast.undo && (
          <button
            type="button"
            onClick={() => {
              const undo = toast.undo!
              dispatch(undo)
              dispatch({ type: 'toast', toast: { id: Date.now(), text: 'Undone' } })
            }}
            className="shrink-0 rounded px-2 py-1 font-medium text-[#8ab4f8] hover:bg-white/10 dark:text-[#0b57d0] dark:hover:bg-black/5"
          >
            Undo
          </button>
        )}
        <button type="button" aria-label="Dismiss" onClick={() => dispatch({ type: 'toast', toast: null })} className="shrink-0 rounded-full p-1.5 opacity-70 hover:bg-white/10 hover:opacity-100 dark:hover:bg-black/5">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
