import { SYSTEM, type Draft, type MailData, type Message, type Thread } from './types'
import { uid } from './utils'

/* -------------------------------------------------------------------------- */
/*  Label plumbing                                                             */
/* -------------------------------------------------------------------------- */

export function addLabel(t: Thread, id: string) {
  if (!t.labelIds.includes(id)) t.labelIds.push(id)
}

export function removeLabel(t: Thread, id: string) {
  const i = t.labelIds.indexOf(id)
  if (i >= 0) t.labelIds.splice(i, 1)
}

function forThreads(d: MailData, ids: string[], fn: (t: Thread) => void) {
  for (const id of ids) {
    const t = d.threads[id]
    if (t) fn(t)
  }
}

function forMessages(d: MailData, ids: string[], fn: (m: Message) => void) {
  for (const id of ids) {
    const t = d.threads[id]
    if (!t) continue
    for (const mid of t.messageIds) {
      const m = d.messages[mid]
      if (m) fn(m)
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Thread operations                                                          */
/* -------------------------------------------------------------------------- */

export function setRead(d: MailData, ids: string[], read: boolean) {
  forMessages(d, ids, (m) => {
    m.read = read
  })
}

export function setMessageRead(d: MailData, messageId: string, read: boolean) {
  const m = d.messages[messageId]
  if (m) m.read = read
}

export function setStarred(d: MailData, ids: string[], starred: boolean) {
  for (const id of ids) {
    const t = d.threads[id]
    if (!t) continue
    if (starred) {
      // Gmail stars the most recent message when you star from the list.
      const last = t.messageIds[t.messageIds.length - 1]
      const m = d.messages[last]
      if (m) m.starred = true
    } else {
      for (const mid of t.messageIds) {
        const m = d.messages[mid]
        if (m) m.starred = false
      }
    }
  }
}

export function toggleMessageStar(d: MailData, messageId: string) {
  const m = d.messages[messageId]
  if (m) m.starred = !m.starred
}

export function setImportant(d: MailData, ids: string[], important: boolean) {
  forThreads(d, ids, (t) => (important ? addLabel(t, SYSTEM.important) : removeLabel(t, SYSTEM.important)))
}

export function archive(d: MailData, ids: string[]) {
  forThreads(d, ids, (t) => {
    removeLabel(t, SYSTEM.inbox)
    t.snoozedUntil = undefined
  })
}

export function moveToInbox(d: MailData, ids: string[]) {
  forThreads(d, ids, (t) => {
    addLabel(t, SYSTEM.inbox)
    removeLabel(t, SYSTEM.trash)
    removeLabel(t, SYSTEM.spam)
    t.snoozedUntil = undefined
  })
}

export function trash(d: MailData, ids: string[]) {
  forThreads(d, ids, (t) => {
    addLabel(t, SYSTEM.trash)
    removeLabel(t, SYSTEM.inbox)
    removeLabel(t, SYSTEM.spam)
    t.snoozedUntil = undefined
  })
}

export function untrash(d: MailData, ids: string[]) {
  forThreads(d, ids, (t) => {
    removeLabel(t, SYSTEM.trash)
    addLabel(t, SYSTEM.inbox)
  })
}

export function markSpam(d: MailData, ids: string[]) {
  forThreads(d, ids, (t) => {
    addLabel(t, SYSTEM.spam)
    removeLabel(t, SYSTEM.inbox)
    removeLabel(t, SYSTEM.trash)
    t.snoozedUntil = undefined
  })
}

export function notSpam(d: MailData, ids: string[]) {
  forThreads(d, ids, (t) => {
    removeLabel(t, SYSTEM.spam)
    addLabel(t, SYSTEM.inbox)
  })
}

export function deleteForever(d: MailData, ids: string[]) {
  for (const id of ids) {
    const t = d.threads[id]
    if (!t) continue
    for (const mid of t.messageIds) delete d.messages[mid]
    delete d.threads[id]
    for (const draft of Object.values(d.drafts)) {
      if (draft.threadId === id) delete d.drafts[draft.id]
    }
  }
}

export function applyLabel(d: MailData, ids: string[], labelId: string, on: boolean) {
  forThreads(d, ids, (t) => (on ? addLabel(t, labelId) : removeLabel(t, labelId)))
}

export function snooze(d: MailData, ids: string[], untilIso: string) {
  forThreads(d, ids, (t) => {
    t.snoozedUntil = untilIso
    addLabel(t, SYSTEM.inbox)
  })
}

export function unsnooze(d: MailData, ids: string[]) {
  forThreads(d, ids, (t) => {
    t.snoozedUntil = undefined
    addLabel(t, SYSTEM.inbox)
  })
}

export function setMuted(d: MailData, ids: string[], muted: boolean) {
  forThreads(d, ids, (t) => {
    t.muted = muted
    if (muted) removeLabel(t, SYSTEM.inbox)
  })
}

/** Snoozed threads whose time has come return to the top of the inbox, unread. */
export function wakeSnoozed(d: MailData, now = Date.now()) {
  let woke = 0
  for (const t of Object.values(d.threads)) {
    if (t.snoozedUntil && Date.parse(t.snoozedUntil) <= now) {
      t.snoozedUntil = undefined
      addLabel(t, SYSTEM.inbox)
      const last = d.messages[t.messageIds[t.messageIds.length - 1]]
      if (last) last.read = false
      woke += 1
    }
  }
  return woke
}

/* -------------------------------------------------------------------------- */
/*  Composition                                                                */
/* -------------------------------------------------------------------------- */

export function upsertDraft(d: MailData, draft: Draft) {
  d.drafts[draft.id] = { ...draft, updatedAt: new Date().toISOString() }
}

export function discardDraft(d: MailData, draftId: string) {
  delete d.drafts[draftId]
}

interface SendOptions {
  scheduledFor?: string
  now?: number
}

/**
 * Turn a draft into a real message. Replies append to their thread; new mail
 * starts one. Returns the id of the thread the message landed in.
 */
export function sendDraft(d: MailData, draft: Draft, opts: SendOptions = {}) {
  const now = opts.now ?? Date.now()
  const scheduled = Boolean(opts.scheduledFor)
  const subject = draft.subject.trim() || '(no subject)'

  let threadId = draft.threadId
  if (threadId && !d.threads[threadId]) threadId = undefined

  if (!threadId) {
    threadId = uid('t')
    d.threads[threadId] = {
      id: threadId,
      subject,
      messageIds: [],
      labelIds: scheduled ? [SYSTEM.scheduled] : [SYSTEM.sent],
      category: 'primary',
    }
  } else {
    const t = d.threads[threadId]
    if (scheduled) addLabel(t, SYSTEM.scheduled)
    else addLabel(t, SYSTEM.sent)
    removeLabel(t, SYSTEM.trash)
    t.snoozedUntil = undefined
  }

  const messageId = uid('m')
  d.messages[messageId] = {
    id: messageId,
    threadId,
    from: { name: d.account.name, email: d.account.email },
    to: draft.to,
    cc: draft.cc,
    bcc: draft.bcc,
    date: new Date(now).toISOString(),
    bodyHtml: draft.bodyHtml || '<p></p>',
    attachments: draft.attachments,
    read: true,
    starred: false,
    outgoing: true,
    scheduledFor: opts.scheduledFor,
  }
  d.threads[threadId].messageIds.push(messageId)
  delete d.drafts[draft.id]
  return { threadId, messageId }
}

/** Move a scheduled message into Sent once its time arrives. */
export function deliverScheduled(d: MailData, now = Date.now()) {
  const delivered: string[] = []
  for (const m of Object.values(d.messages)) {
    if (!m.scheduledFor || Date.parse(m.scheduledFor) > now) continue
    m.scheduledFor = undefined
    m.date = new Date(now).toISOString()
    const t = d.threads[m.threadId]
    if (t) {
      addLabel(t, SYSTEM.sent)
      if (!t.messageIds.some((id) => d.messages[id]?.scheduledFor)) removeLabel(t, SYSTEM.scheduled)
    }
    delivered.push(m.id)
  }
  return delivered
}

/** Pull a scheduled message back into Drafts. */
export function cancelScheduled(d: MailData, messageId: string) {
  const m = d.messages[messageId]
  if (!m) return null
  const t = d.threads[m.threadId]
  const draftId = uid('d')
  d.drafts[draftId] = {
    id: draftId,
    threadId: t && t.messageIds.length > 1 ? t.id : undefined,
    mode: t && t.messageIds.length > 1 ? 'reply' : 'new',
    to: m.to,
    cc: m.cc,
    bcc: m.bcc,
    subject: t?.subject ?? '',
    bodyHtml: m.bodyHtml,
    attachments: m.attachments,
    updatedAt: new Date().toISOString(),
  }
  if (t) {
    t.messageIds = t.messageIds.filter((id) => id !== messageId)
    if (!t.messageIds.some((id) => d.messages[id]?.scheduledFor)) removeLabel(t, SYSTEM.scheduled)
    if (!t.messageIds.length) delete d.threads[t.id]
  }
  delete d.messages[messageId]
  return draftId
}

/* -------------------------------------------------------------------------- */
/*  Labels                                                                     */
/* -------------------------------------------------------------------------- */

export function createLabel(d: MailData, name: string, color: { bg: string; fg: string }) {
  const id = uid('lb')
  d.labels.push({ id, name, color })
  d.labels.sort((a, b) => a.name.localeCompare(b.name))
  return id
}

export function deleteLabel(d: MailData, labelId: string) {
  d.labels = d.labels.filter((l) => l.id !== labelId)
  for (const t of Object.values(d.threads)) removeLabel(t, labelId)
}

export function emptyFolder(d: MailData, labelId: string) {
  const ids = Object.values(d.threads)
    .filter((t) => t.labelIds.includes(labelId))
    .map((t) => t.id)
  deleteForever(d, ids)
  return ids.length
}
