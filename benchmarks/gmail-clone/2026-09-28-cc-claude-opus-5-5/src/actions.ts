import { useMail } from './store/mail'
import { useUI } from './store/ui'
import { formatScheduleLabel } from './lib/format'

const mail = () => useMail.getState()
const ui = () => useUI.getState()

function noun(n: number) {
  return n === 1 ? 'Conversation' : `${n} conversations`
}

function toastUndo(message: string) {
  ui().showToast(message, {
    action: {
      label: 'Undo',
      run: () => {
        if (mail().undo()) ui().showToast('Action undone', { duration: 3000 })
      },
    },
  })
}

export const actions = {
  archive(ids: string[]) {
    if (!ids.length) return
    mail().archive(ids)
    toastUndo(`${noun(ids.length)} archived.`)
  },
  moveToInbox(ids: string[]) {
    if (!ids.length) return
    mail().moveToInbox(ids)
    toastUndo(`${noun(ids.length)} moved to Inbox.`)
  },
  trash(ids: string[]) {
    if (!ids.length) return
    mail().trash(ids)
    toastUndo(`${noun(ids.length)} moved to Trash.`)
  },
  deleteForever(ids: string[]) {
    if (!ids.length) return
    mail().deleteForever(ids)
    toastUndo(`${noun(ids.length)} deleted forever.`)
  },
  spam(ids: string[]) {
    if (!ids.length) return
    mail().setSpam(ids, true)
    toastUndo(`${noun(ids.length)} marked as spam.`)
  },
  notSpam(ids: string[]) {
    if (!ids.length) return
    mail().setSpam(ids, false)
    toastUndo(`${noun(ids.length)} moved to Inbox.`)
  },
  read(ids: string[], unread: boolean) {
    if (!ids.length) return
    mail().setUnread(ids, unread)
    if (ids.length > 1) toastUndo(`${noun(ids.length)} marked as ${unread ? 'unread' : 'read'}.`)
  },
  star(ids: string[], starred: boolean) {
    if (!ids.length) return
    mail().setStar(ids, starred)
    if (ids.length > 1) toastUndo(`${noun(ids.length)} ${starred ? 'starred' : 'unstarred'}.`)
  },
  important(ids: string[], important: boolean) {
    if (!ids.length) return
    mail().setImportant(ids, important)
    toastUndo(`${noun(ids.length)} marked as ${important ? '' : 'not '}important.`)
  },
  snooze(ids: string[], until: number) {
    if (!ids.length) return
    mail().snooze(ids, until)
    toastUndo(`Snoozed until ${formatScheduleLabel(until)}`)
  },
  unsnooze(ids: string[]) {
    mail().unsnooze(ids)
    toastUndo(`${noun(ids.length)} unsnoozed.`)
  },
  label(ids: string[], labelId: string, on: boolean) {
    if (!ids.length) return
    const l = mail().labels.find((x) => x.id === labelId)
    if (on) mail().addLabel(ids, labelId)
    else mail().removeLabel(ids, labelId)
    toastUndo(`${noun(ids.length)} ${on ? 'added to' : 'removed from'} "${l?.name}".`)
  },
  moveTo(ids: string[], labelId: string) {
    if (!ids.length) return
    const l = mail().labels.find((x) => x.id === labelId)
    mail().moveToLabel(ids, labelId)
    toastUndo(`${noun(ids.length)} moved to "${l?.name}".`)
  },
}
