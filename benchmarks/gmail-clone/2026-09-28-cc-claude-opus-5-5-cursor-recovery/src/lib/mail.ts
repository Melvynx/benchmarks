import type { Contact, FolderId, Thread, View } from '../types'
import { ME } from '../data/contacts'
import { stripHtml } from './html'
import { firstName } from './avatar'

export const isMe = (c: Contact) => c.email.toLowerCase() === ME.email.toLowerCase()

export function lastDate(t: Thread) {
  let max = t.bumpedAt ?? 0
  for (const m of t.messages) if (m.date > max) max = m.date
  return max
}

export function lastSentDate(t: Thread) {
  let max = 0
  for (const m of t.messages) if (isMe(m.from) && m.date > max) max = m.date
  return max
}

export const isSent = (t: Thread) => t.messages.some((m) => isMe(m.from))
export const hasAttachments = (t: Thread) => t.messages.some((m) => m.attachments.length > 0)
export const isSnoozed = (t: Thread, now: number) => !!t.snoozeUntil && t.snoozeUntil > now

export function snippet(t: Thread) {
  const last = t.messages[t.messages.length - 1]
  return stripHtml(last.html).slice(0, 220)
}

export function threadText(t: Thread) {
  return [
    t.subject,
    ...t.messages.flatMap((m) => [
      m.from.name,
      m.from.email,
      ...m.to.map((c) => `${c.name} ${c.email}`),
      stripHtml(m.html),
      ...m.attachments.map((a) => a.name),
    ]),
  ]
    .join(' ')
    .toLowerCase()
}

/** Gmail-ish participant summary: "Priya, Marcus, me 3" */
export function participants(t: Thread, sentView = false): { names: { label: string; unread: boolean }[]; count: number } {
  if (sentView) {
    const to = t.messages.filter((m) => isMe(m.from)).flatMap((m) => m.to)
    const uniq = dedupe(to).slice(0, 3)
    const names = uniq.map((c, i) => ({
      label: (i === 0 ? 'To: ' : '') + (isMe(c) ? 'me' : uniq.length === 1 ? c.name : firstName(c.name)),
      unread: false,
    }))
    return { names, count: t.messages.length > 1 ? t.messages.length : 0 }
  }
  const senders: { c: Contact; unread: boolean }[] = []
  t.messages.forEach((m, i) => {
    const unread = t.unread && i === t.messages.length - 1
    const existing = senders.find((s) => s.c.email === m.from.email)
    if (existing) {
      existing.unread ||= unread
      return
    }
    senders.push({ c: m.from, unread })
  })
  const single = senders.length === 1
  const names = senders.map((s) => ({
    label: isMe(s.c) ? 'me' : single ? s.c.name : firstName(s.c.name),
    unread: s.unread,
  }))
  let shown = names
  if (names.length > 3) shown = [names[0], { label: '..', unread: false }, ...names.slice(-2)]
  return { names: shown, count: t.messages.length > 1 ? t.messages.length : 0 }
}

function dedupe(list: Contact[]) {
  const seen = new Set<string>()
  return list.filter((c) => (seen.has(c.email) ? false : (seen.add(c.email), true)))
}

export function inFolder(t: Thread, folder: FolderId, now: number, categories = true, tab = 'primary'): boolean {
  switch (folder) {
    case 'inbox':
      return t.inbox && !t.trash && !t.spam && !isSnoozed(t, now) && (!categories || t.category === tab)
    case 'starred':
      return t.starred && !t.trash && !t.spam
    case 'snoozed':
      return isSnoozed(t, now) && !t.trash
    case 'important':
      return t.important && !t.trash && !t.spam
    case 'sent':
      return isSent(t) && !t.trash
    case 'all':
      return !t.trash && !t.spam
    case 'spam':
      return t.spam && !t.trash
    case 'trash':
      return t.trash
    default:
      return false
  }
}

export const FOLDER_NAMES: Record<FolderId, string> = {
  inbox: 'Inbox',
  starred: 'Starred',
  snoozed: 'Snoozed',
  important: 'Important',
  sent: 'Sent',
  drafts: 'Drafts',
  scheduled: 'Scheduled',
  all: 'All Mail',
  spam: 'Spam',
  trash: 'Trash',
}

export function viewToHash(v: View, threadId?: string) {
  let base: string
  if (v.kind === 'folder') base = `#/${v.folder}`
  else if (v.kind === 'label') base = `#/label/${encodeURIComponent(v.labelId)}`
  else base = `#/search/${encodeURIComponent(v.query)}`
  return threadId ? `${base}/${threadId}` : base
}

export function parseHash(hash: string): { view: View; threadId?: string } {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const folders = Object.keys(FOLDER_NAMES)
  if (parts[0] === 'label' && parts[1]) return { view: { kind: 'label', labelId: decodeURIComponent(parts[1]) }, threadId: parts[2] }
  if (parts[0] === 'search' && parts[1] !== undefined) return { view: { kind: 'search', query: decodeURIComponent(parts[1]) }, threadId: parts[2] }
  if (parts[0] && folders.includes(parts[0])) return { view: { kind: 'folder', folder: parts[0] as FolderId }, threadId: parts[1] }
  return { view: { kind: 'folder', folder: 'inbox' } }
}

export function sameView(a: View, b: View) {
  if (a.kind !== b.kind) return false
  if (a.kind === 'folder' && b.kind === 'folder') return a.folder === b.folder
  if (a.kind === 'label' && b.kind === 'label') return a.labelId === b.labelId
  if (a.kind === 'search' && b.kind === 'search') return a.query === b.query
  return false
}
