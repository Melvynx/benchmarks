import { contactByEmail, ME } from './contacts'
import { snippetFromHtml } from './format'
import { SYS, type Category, type Message, type Thread, type ViewKind } from './types'

export interface MailIndex {
  threads: Thread[]
  messages: Message[]
}

export function messagesOf(index: MailIndex, thread: Thread): Message[] {
  const map = new Map(index.messages.map((m) => [m.id, m]))
  return thread.messageIds.map((id) => map.get(id)).filter((m): m is Message => Boolean(m))
}

export function lastMessage(index: MailIndex, thread: Thread): Message | undefined {
  const msgs = messagesOf(index, thread)
  return msgs[msgs.length - 1]
}

export function threadUnread(index: MailIndex, thread: Thread): boolean {
  return messagesOf(index, thread).some((m) => m.unread)
}

export function threadStarred(thread: Thread): boolean {
  return thread.labels.includes(SYS.STARRED)
}

export function sendersLine(index: MailIndex, thread: Thread, me = ME.email): string {
  const msgs = messagesOf(index, thread)
  const names: string[] = []
  const seen = new Set<string>()
  for (const m of msgs) {
    const key = m.from.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    names.push(m.from.toLowerCase() === me.toLowerCase() ? 'me' : contactByEmail(m.from).name.split(' ')[0]!)
  }
  if (names.length <= 3) return names.join(', ')
  return `${names.slice(0, 2).join(', ')} … ${names[names.length - 1]}`
}

export function matchesView(thread: Thread, kind: ViewKind, labelId?: string): boolean {
  const L = thread.labels
  const trashed = L.includes(SYS.TRASH)
  const spam = L.includes(SYS.SPAM)
  const draft = L.includes(SYS.DRAFT)
  switch (kind) {
    case 'inbox':
      return L.includes(SYS.INBOX) && !trashed && !spam
    case 'starred':
      return L.includes(SYS.STARRED) && !trashed && !spam
    case 'snoozed':
      return L.includes(SYS.SNOOZED) && !trashed && !spam
    case 'important':
      return L.includes(SYS.IMPORTANT) && !trashed && !spam
    case 'sent':
      return L.includes(SYS.SENT) && !trashed && !spam && !draft
    case 'scheduled':
      return L.includes(SYS.SCHEDULED) && !trashed
    case 'drafts':
      return draft && !trashed && !L.includes(SYS.SCHEDULED)
    case 'all':
      return !trashed && !spam
    case 'spam':
      return spam && !trashed
    case 'trash':
      return trashed
    case 'label':
      return Boolean(labelId && L.includes(labelId) && !trashed && !spam)
    case 'search':
      return true
  }
}

export interface ParsedQuery {
  text: string[]
  from?: string
  to?: string
  subject?: string
  hasAttachment?: boolean
  unread?: boolean
  starred?: boolean
  label?: string
  in?: string
}

export function parseQuery(raw: string): ParsedQuery {
  const q: ParsedQuery = { text: [] }
  const re =
    /(from|to|subject|label|in|is|has):(?:"([^"]+)"|(\S+))/gi
  let rest = raw
  let m: RegExpExecArray | null
  const consumed: string[] = []
  while ((m = re.exec(raw))) {
    consumed.push(m[0])
    const key = m[1]!.toLowerCase()
    const val = (m[2] ?? m[3] ?? '').toLowerCase()
    if (key === 'from') q.from = val
    else if (key === 'to') q.to = val
    else if (key === 'subject') q.subject = val
    else if (key === 'label') q.label = val
    else if (key === 'in') q.in = val
    else if (key === 'is') {
      if (val === 'unread') q.unread = true
      if (val === 'read') q.unread = false
      if (val === 'starred') q.starred = true
    } else if (key === 'has' && val === 'attachment') q.hasAttachment = true
  }
  for (const c of consumed) rest = rest.replace(c, ' ')
  q.text = rest.toLowerCase().split(/\s+/).filter(Boolean)
  return q
}

function haystack(index: MailIndex, thread: Thread): string {
  const msgs = messagesOf(index, thread)
  const bits = [
    thread.subject,
    ...msgs.flatMap((m) => [
      m.from,
      ...m.to,
      ...(m.cc ?? []),
      contactByEmail(m.from).name,
      snippetFromHtml(m.body, 2000),
      ...(m.attachments?.map((a) => a.name) ?? []),
    ]),
  ]
  return bits.join(' ').toLowerCase()
}

export function searchThreads(index: MailIndex, raw: string): Thread[] {
  const q = parseQuery(raw)
  return index.threads.filter((t) => {
    if (!q.in && (t.labels.includes(SYS.TRASH) || t.labels.includes(SYS.SPAM))) return false
    const msgs = messagesOf(index, t)
    if (q.from && !msgs.some((m) => m.from.toLowerCase().includes(q.from!) || contactByEmail(m.from).name.toLowerCase().includes(q.from!)))
      return false
    if (q.to && !msgs.some((m) => [...m.to, ...(m.cc ?? [])].some((e) => e.toLowerCase().includes(q.to!) || contactByEmail(e).name.toLowerCase().includes(q.to!))))
      return false
    if (q.subject && !t.subject.toLowerCase().includes(q.subject)) return false
    if (q.hasAttachment && !msgs.some((m) => (m.attachments?.length ?? 0) > 0)) return false
    if (q.unread === true && !threadUnread(index, t)) return false
    if (q.unread === false && threadUnread(index, t)) return false
    if (q.starred && !t.labels.includes(SYS.STARRED)) return false
    if (q.label && !t.labels.some((id) => id.toLowerCase().includes(q.label!) || id === q.label)) {
      return false
    }
    if (q.in) {
      const map: Record<string, ViewKind> = {
        inbox: 'inbox',
        starred: 'starred',
        snoozed: 'snoozed',
        sent: 'sent',
        drafts: 'drafts',
        trash: 'trash',
        spam: 'spam',
        scheduled: 'scheduled',
      }
      const kind = map[q.in]
      if (kind && !matchesView(t, kind)) return false
    }
    if (q.text.length && !q.text.every((w) => haystack(index, t).includes(w))) return false
    return true
  })
}

export function unreadCount(
  index: MailIndex,
  kind: ViewKind,
  labelId?: string,
  category?: Category,
): number {
  return index.threads.filter((t) => {
    if (!matchesView(t, kind, labelId)) return false
    if (category && t.category !== category) return false
    return threadUnread(index, t)
  }).length
}

export function draftCount(index: MailIndex): number {
  return index.threads.filter((t) => matchesView(t, 'drafts')).length
}
