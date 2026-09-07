import { useApp } from '../lib/app'
import { Icon } from './Icon'
import { cx } from './ui'

/**
 * Bottom-left snack stack. Undo actions are serialised inverse operations, so a
 * snack can outlive the component that produced it.
 */
export function Snackbar() {
  const app = useApp()
  if (!app.snacks.length) return null

  return (
    <div
      className={cx(
        'pointer-events-none fixed left-1/2 z-[250] flex w-[min(560px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-2 sm:left-6 sm:translate-x-0 sm:bottom-4',
        // Clear the phone compose button, which only shows on the list.
        app.route.threadId ? 'bottom-4' : 'bottom-[80px]',
      )}
    >
      {app.snacks.map((s) => (
        <div
          key={s.id}
          role="status"
          className="anim-snack pointer-events-auto flex items-center gap-3 rounded-lg bg-snackbar px-4 py-3 shadow-e3"
        >
          <p className="min-w-0 flex-1 truncate text-[13px] text-snack-ink">{s.text}</p>
          {s.undo && (
            <button
              type="button"
              onClick={() => app.runUndo(s)}
              className="flex-none rounded px-1 text-[13px] font-medium text-snack-accent hover:underline"
            >
              {s.actionLabel ?? 'Undo'}
            </button>
          )}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => app.dismissSnack(s.id)}
            className="grid size-6 flex-none place-items-center rounded-full text-snack-ink/70 hover:bg-snack-ink/10 hover:text-snack-ink"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
