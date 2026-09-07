import { matchesQuery, parseQuery, queryScope, type Query } from './search'
import {
  SYSTEM,
  type Category,
  type Draft,
  type Label,
  type MailData,
  type Message,
  type Thread,
  type ViewId,
} from './types'
import { htmlToText, shortName, truncate } from './utils'

export interface ThreadSummary {
  id: string
  subject: string
  snippet: string
  messages: Message[]
  count: number
  date: string
  unread: boolean
  starred: boolean
  important: boolean
  hasAttachment: boolean
  attachmentNames: string[]
  userLabels: Label[]
  category: Category
  snoozedUntil?: string
  scheduledFor?: string
  draftId?: string
  /** e.g. "Priya, me" — chronological, deduped. */
  senders: string
  /** e.g. "Harper, Marcus" — for Sent-style views. */
  recipients: string
  lastFromMe: boolean
}

function joinPeople(names: string[]) {
  if (names.length <= 3) return names.join(', ')
  return `${names[0]}, ${names[1]} .. ${names[names.length - 1]}`
}

export function summarize(
  thread: Thread,
  data: MailData,
  labelById: Map<string, Label>,
  draftByThread: Map<string, string>,
): ThreadSummary {
  const me = data.account.email
  const messages = thread.messageIds
    .map((id) => data.messages[id])
    .filter(Boolean)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))

  const last = messages[messages.length - 1]
  const senderNames: string[] = []
  const recipientNames: string[] = []
  for (const m of messages) {
    const s = shortName(m.from, me)
    if (!senderNames.includes(s)) senderNames.push(s)
    for (const r of m.to) {
      const n = shortName(r, me)
      if (n !== 'me' && !recipientNames.includes(n)) recipientNames.push(n)
    }
  }

  const attachmentNames = messages.flatMap((m) => m.attachments.map((a) => a.name))

  return {
    id: thread.id,
    subject: thread.subject,
    snippet: last ? truncate(htmlToText(last.bodyHtml), 220) : '',
    messages,
    count: messages.length,
    date: last?.date ?? new Date(0).toISOString(),
    unread: messages.some((m) => !m.read),
    starred: messages.some((m) => m.starred),
    important: thread.labelIds.includes(SYSTEM.important),
    hasAttachment: attachmentNames.length > 0,
    attachmentNames,
    userLabels: thread.labelIds
      .map((id) => labelById.get(id))
      .filter((l): l is Label => Boolean(l)),
    category: thread.category,
    snoozedUntil: thread.snoozedUntil,
    scheduledFor: messages.find((m) => m.scheduledFor)?.scheduledFor,
    draftId: draftByThread.get(thread.id),
    senders: joinPeople(senderNames),
    recipients: joinPeople(recipientNames.length ? recipientNames : ['(no recipients)']),
    lastFromMe: Boolean(last?.outgoing),
  }
}

/* -------------------------------------------------------------------------- */
/*  View predicates                                                            */
/* -------------------------------------------------------------------------- */

const isIn = (t: Thread, l: string) => t.labelIds.includes(l)

function hasStar(t: Thread, data: MailData) {
  return t.messageIds.some((id) => data.messages[id]?.starred)
}

function hasSent(t: Thread, data: MailData) {
  return t.messageIds.some((id) => {
    const m = data.messages[id]
    return m?.outgoing && !m.scheduledFor
  })
}

function isSnoozed(t: Thread, now: number) {
  return Boolean(t.snoozedUntil && Date.parse(t.snoozedUntil) > now)
}

export function viewPredicate(view: ViewId, data: MailData, now: number) {
  switch (view) {
    case 'inbox':
      return (t: Thread) =>
        isIn(t, SYSTEM.inbox) && !isIn(t, SYSTEM.trash) && !isIn(t, SYSTEM.spam) && !isSnoozed(t, now)
    case 'starred':
      return (t: Thread) => hasStar(t, data) && !isIn(t, SYSTEM.trash) && !isIn(t, SYSTEM.spam)
    case 'snoozed':
      return (t: Thread) => isSnoozed(t, now) && !isIn(t, SYSTEM.trash)
    case 'important':
      return (t: Thread) =>
        isIn(t, SYSTEM.important) && !isIn(t, SYSTEM.trash) && !isIn(t, SYSTEM.spam)
    case 'sent':
      return (t: Thread) => hasSent(t, data) && !isIn(t, SYSTEM.trash) && !isIn(t, SYSTEM.spam)
    case 'scheduled':
      return (t: Thread) => isIn(t, SYSTEM.scheduled) && !isIn(t, SYSTEM.trash)
    case 'spam':
      return (t: Thread) => isIn(t, SYSTEM.spam)
    case 'trash':
      return (t: Thread) => isIn(t, SYSTEM.trash)
    case 'all':
      return (t: Thread) => !isIn(t, SYSTEM.trash) && !isIn(t, SYSTEM.spam)
    case 'drafts':
      return () => false
  }
}

export function labelPredicate(labelId: string) {
  return (t: Thread) =>
    t.labelIds.includes(labelId) && !isIn(t, SYSTEM.trash) && !isIn(t, SYSTEM.spam)
}

/** The scope a bare search runs over: everything except trash and spam. */
export function searchPredicate(q: Query, data: MailData, now: number) {
  const scope = queryScope(q)
  if (scope === 'anywhere') return () => true
  if (scope === 'default') return (t: Thread) => !isIn(t, SYSTEM.trash) && !isIn(t, SYSTEM.spam)
  if (scope === 'drafts') return () => false
  return viewPredicate(scope as ViewId, data, now)
}

/* -------------------------------------------------------------------------- */
/*  Counts                                                                     */
/* -------------------------------------------------------------------------- */

export interface Counts {
  inboxUnread: number
  inboxTotal: number
  starred: number
  snoozed: number
  important: number
  drafts: number
  scheduled: number
  spam: number
  trash: number
  sent: number
  byCategory: Record<Category, { total: number; unread: number }>
  byLabel: Record<string, { total: number; unread: number }>
}

export function computeCounts(data: MailData, now: number): Counts {
  const byCategory = {
    primary: { total: 0, unread: 0 },
    social: { total: 0, unread: 0 },
    promotions: { total: 0, unread: 0 },
    updates: { total: 0, unread: 0 },
    forums: { total: 0, unread: 0 },
  } as Record<Category, { total: number; unread: number }>
  const byLabel: Record<string, { total: number; unread: number }> = {}
  for (const l of data.labels) byLabel[l.id] = { total: 0, unread: 0 }

  const counts: Counts = {
    inboxUnread: 0,
    inboxTotal: 0,
    starred: 0,
    snoozed: 0,
    important: 0,
    drafts: Object.keys(data.drafts).length,
    scheduled: 0,
    spam: 0,
    trash: 0,
    sent: 0,
    byCategory,
    byLabel,
  }

  const inbox = viewPredicate('inbox', data, now)
  for (const t of Object.values(data.threads)) {
    const unread = t.messageIds.some((id) => {
      const m = data.messages[id]
      return m && !m.read
    })
    if (inbox(t)) {
      counts.inboxTotal += 1
      if (unread) counts.inboxUnread += 1
      byCategory[t.category].total += 1
      if (unread) byCategory[t.category].unread += 1
    }
    if (isIn(t, SYSTEM.trash)) counts.trash += 1
    else if (isIn(t, SYSTEM.spam)) counts.spam += 1
    else {
      if (hasStar(t, data)) counts.starred += 1
      if (isSnoozed(t, now)) counts.snoozed += 1
      if (isIn(t, SYSTEM.important)) counts.important += 1
      if (hasSent(t, data)) counts.sent += 1
      for (const id of t.labelIds) {
        if (byLabel[id]) {
          byLabel[id].total += 1
          if (unread) byLabel[id].unread += 1
        }
      }
    }
    if (isIn(t, SYSTEM.scheduled) && !isIn(t, SYSTEM.trash)) counts.scheduled += 1
  }
  return counts
}

/* -------------------------------------------------------------------------- */
/*  List building                                                              */
/* -------------------------------------------------------------------------- */

export interface ListRequest {
  view: ViewId
  labelId?: string
  searchText?: string
  category?: Category
  now: number
}

export interface ListResult {
  threads: ThreadSummary[]
  drafts: Draft[]
  query: Query | null
}

export function buildList(data: MailData, req: ListRequest): ListResult {
  const labelById = new Map(data.labels.map((l) => [l.id, l]))
  const labelsByName = new Map(data.labels.map((l) => [l.name.toLowerCase(), l]))
  const draftByThread = new Map<string, string>()
  for (const d of Object.values(data.drafts)) if (d.threadId) draftByThread.set(d.threadId, d.id)

  const searchText = req.searchText?.trim()
  const query = searchText ? parseQuery(searchText, req.now) : null

  let threads: Thread[]
  let drafts: Draft[] = []

  if (query && !query.empty) {
    const scope = searchPredicate(query, data, req.now)
    threads = Object.values(data.threads).filter(
      (t) => scope(t) && matchesQuery(t, query, data, labelsByName),
    )
    drafts = Object.values(data.drafts).filter((d) => draftMatches(d, query, data))
  } else if (req.view === 'drafts') {
    threads = []
    drafts = Object.values(data.drafts)
  } else if (req.labelId) {
    const pred = labelPredicate(req.labelId)
    threads = Object.values(data.threads).filter(pred)
  } else {
    const pred = viewPredicate(req.view, data, req.now)
    threads = Object.values(data.threads).filter(pred)
    if (req.view === 'inbox' && req.category) {
      threads = threads.filter((t) => t.category === req.category)
    }
  }

  const summaries = threads.map((t) => summarize(t, data, labelById, draftByThread))

  if (req.view === 'scheduled' && !query) {
    summaries.sort((a, b) => Date.parse(a.scheduledFor ?? a.date) - Date.parse(b.scheduledFor ?? b.date))
  } else if (req.view === 'snoozed' && !query) {
    summaries.sort((a, b) => Date.parse(a.snoozedUntil ?? a.date) - Date.parse(b.snoozedUntil ?? b.date))
  } else {
    summaries.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  }

  drafts = [...drafts].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))

  return { threads: summaries, drafts, query }
}

function draftMatches(d: Draft, q: Query, data: MailData) {
  if (q.in && q.in !== 'drafts' && q.in !== 'anywhere') return false
  if (q.isStarred || q.isImportant || q.isSnoozed || q.isRead) return false
  if (q.hasAttachment && !d.attachments.length) return false
  if (q.subject && !d.subject.toLowerCase().includes(q.subject)) return false
  if (q.from && q.from !== 'me' && !data.account.email.includes(q.from)) return false
  if (q.to && !d.to.some((a) => a.email.toLowerCase().includes(q.to!) || a.name.toLowerCase().includes(q.to!)))
    return false
  if (q.labelNames.length) return false
  const hay = `${d.subject} ${htmlToText(d.bodyHtml)} ${d.to.map((a) => `${a.name} ${a.email}`).join(' ')}`.toLowerCase()
  for (const t of q.terms) if (!hay.includes(t)) return false
  for (const p of q.phrases) if (!hay.includes(p)) return false
  return true
}
