import type { Draft } from '@/lib/types'
import { formatFuture } from '@/lib/utils'
import { useCompose } from '@/store/compose'
import { useMail } from '@/store/mail-store'
import type { Route } from '@/store/router'
import { useSettings } from '@/store/settings'
import { useToast } from '@/store/toast'
import { ComposeWindow } from './compose-window'

/** Positions the open compose windows and owns the send → undo contract. */
export function ComposeDeck({ navigate }: { navigate: (r: Route) => void }) {
  const compose = useCompose()
  const { undo } = useMail()
  const { settings } = useSettings()
  const { show } = useToast()

  if (!compose.windows.length) return null

  const onSend = (draft: Draft, scheduledFor?: string) => {
    const result = compose.send(draft.id, scheduledFor)
    if (!result) return
    const undoSend = () => {
      undo()
      compose.openDraft(draft.id)
    }
    show(
      scheduledFor
        ? `Send scheduled for ${formatFuture(scheduledFor)}`
        : `Message sent to ${draft.to.map((a) => a.name || a.email).join(', ') || 'recipients'}`,
      {
        duration: Math.max(4, settings.undoSendSeconds) * 1000,
        actions: [
          { label: 'Undo', onClick: undoSend },
          {
            label: 'View message',
            onClick: () =>
              navigate({
                view: scheduledFor ? 'scheduled' : 'sent',
                threadId: result.threadId,
              }),
          },
        ],
      },
    )
  }

  // Minimized windows dock along the bottom; open ones cascade from the right.
  let openIndex = 0
  let minIndex = 0

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" aria-live="polite">
      {compose.windows.map((win) => {
        const index = win.state === 'minimized' ? minIndex++ : openIndex++
        return <ComposeWindow key={win.draft.id} win={win} index={index} onSend={onSend} />
      })}
    </div>
  )
}
