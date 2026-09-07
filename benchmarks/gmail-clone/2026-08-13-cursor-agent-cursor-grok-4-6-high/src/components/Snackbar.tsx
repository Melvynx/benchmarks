import { useEffect } from 'react'
import { useDispatch, useStore } from '../lib/store'

export function Snackbar() {
  const snack = useStore().snack
  const dispatch = useDispatch()

  useEffect(() => {
    if (!snack) return
    const t = window.setTimeout(() => dispatch({ t: 'dismissSnack' }), snack.duration ?? 8000)
    return () => window.clearTimeout(t)
  }, [snack, dispatch])

  if (!snack) return null

  return (
    <div className="anim-up no-print fixed bottom-6 left-1/2 z-[180] flex -translate-x-1/2 items-center gap-4 rounded-md bg-ink px-4 py-3 text-[14px] text-panel shadow-e3">
      <span>{snack.text}</span>
      {snack.undo && (
        <button type="button" className="font-medium text-compose" onClick={() => dispatch({ t: 'undo' })}>
          {snack.actionLabel ?? 'Undo'}
        </button>
      )}
    </div>
  )
}
