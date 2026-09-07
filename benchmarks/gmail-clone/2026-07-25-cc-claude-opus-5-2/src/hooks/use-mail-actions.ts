import { useCallback, useMemo } from 'react'
import * as M from '@/lib/mutations'
import type { MailData } from '@/lib/types'
import { pluralize } from '@/lib/utils'
import { useMail } from '@/store/mail-store'
import { useToast } from '@/store/toast'

/**
 * High-level mailbox verbs. Every destructive-feeling action goes through
 * `withUndo` so the user always gets the same "did a thing · Undo" contract.
 */
export function useMailActions() {
  const { mutate, undo, data } = useMail()
  const { show } = useToast()

  const withUndo = useCallback(
    (message: string, fn: (d: MailData) => void, duration = 7000) => {
      mutate(fn, message)
      show(message, { actions: [{ label: 'Undo', onClick: undo }], duration })
    },
    [mutate, show, undo],
  )

  return useMemo(() => {
    const n = (ids: string[], noun = 'conversation') => pluralize(ids.length, noun)

    return {
      withUndo,
      archive: (ids: string[]) =>
        withUndo(`${n(ids)} archived`, (d) => M.archive(d, ids)),
      moveToInbox: (ids: string[]) =>
        withUndo(`${n(ids)} moved to Inbox`, (d) => M.moveToInbox(d, ids)),
      trash: (ids: string[]) =>
        withUndo(`${n(ids)} moved to Trash`, (d) => M.trash(d, ids)),
      untrash: (ids: string[]) =>
        withUndo(`${n(ids)} restored`, (d) => M.untrash(d, ids)),
      deleteForever: (ids: string[]) =>
        withUndo(`${n(ids)} deleted forever`, (d) => M.deleteForever(d, ids)),
      markSpam: (ids: string[]) =>
        withUndo(`${n(ids)} reported as spam`, (d) => M.markSpam(d, ids)),
      notSpam: (ids: string[]) =>
        withUndo(`${n(ids)} moved to Inbox`, (d) => M.notSpam(d, ids)),
      setRead: (ids: string[], read: boolean) =>
        withUndo(`${n(ids)} marked as ${read ? 'read' : 'unread'}`, (d) =>
          M.setRead(d, ids, read),
        ),
      setStarred: (ids: string[], starred: boolean) =>
        mutate((d) => M.setStarred(d, ids, starred)),
      toggleMessageStar: (messageId: string) => mutate((d) => M.toggleMessageStar(d, messageId)),
      setImportant: (ids: string[], important: boolean) =>
        withUndo(
          important ? `${n(ids)} marked important` : `${n(ids)} marked not important`,
          (d) => M.setImportant(d, ids, important),
        ),
      applyLabel: (ids: string[], labelId: string, on: boolean) => {
        const name = data.labels.find((l) => l.id === labelId)?.name ?? 'Label'
        withUndo(on ? `Added label "${name}"` : `Removed label "${name}"`, (d) =>
          M.applyLabel(d, ids, labelId, on),
        )
      },
      snooze: (ids: string[], untilIso: string, human: string) =>
        withUndo(`Snoozed until ${human}`, (d) => M.snooze(d, ids, untilIso)),
      unsnooze: (ids: string[]) =>
        withUndo(`${n(ids)} unsnoozed`, (d) => M.unsnooze(d, ids)),
      setMuted: (ids: string[], muted: boolean) =>
        withUndo(muted ? `${n(ids)} muted` : `${n(ids)} unmuted`, (d) =>
          M.setMuted(d, ids, muted),
        ),
      markMessageRead: (messageId: string, read: boolean) =>
        mutate((d) => M.setMessageRead(d, messageId, read)),
      cancelScheduled: (messageId: string) => {
        let draftId: string | null = null
        mutate((d) => {
          draftId = M.cancelScheduled(d, messageId)
        }, 'Send cancelled')
        show('Send cancelled — moved back to Drafts', {
          actions: [{ label: 'Undo', onClick: undo }],
        })
        return draftId
      },
      emptyFolder: (labelId: string, name: string) => {
        let count = 0
        mutate((d) => {
          count = M.emptyFolder(d, labelId)
        }, `${name} emptied`)
        show(`${pluralize(count, 'conversation')} permanently deleted`, {
          actions: [{ label: 'Undo', onClick: undo }],
        })
      },
      createLabel: (name: string, color: { bg: string; fg: string }) => {
        let id = ''
        mutate((d) => {
          id = M.createLabel(d, name, color)
        })
        show(`Label "${name}" created`)
        return id
      },
      renameLabel: (labelId: string, name: string) =>
        mutate((d) => {
          const l = d.labels.find((x) => x.id === labelId)
          if (l) l.name = name
          d.labels.sort((a, b) => a.name.localeCompare(b.name))
        }),
      recolorLabel: (labelId: string, color: { bg: string; fg: string }) =>
        mutate((d) => {
          const l = d.labels.find((x) => x.id === labelId)
          if (l) l.color = color
        }),
      deleteLabel: (labelId: string) => {
        const name = data.labels.find((l) => l.id === labelId)?.name ?? 'Label'
        withUndo(`Label "${name}" deleted`, (d) => M.deleteLabel(d, labelId))
      },
      discardDraft: (draftId: string) =>
        withUndo('Draft discarded', (d) => M.discardDraft(d, draftId)),
    }
  }, [withUndo, mutate, show, undo, data.labels])
}
