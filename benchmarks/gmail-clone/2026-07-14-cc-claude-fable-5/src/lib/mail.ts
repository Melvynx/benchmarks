import type { FolderId, Label, Message, Route, Thread } from '../types'

export function lastMessage(t: Thread): Message {
  return t.messages[t.messages.length - 1]
}

export function lastNonDraft(t: Thread): Message | undefined {
  for (let i = t.messages.length - 1; i >= 0; i--) {
    if (!t.messages[i].draft) return t.messages[i]
  }
  return undefined
}

export function threadDate(t: Thread): number {
  return Math.max(...t.messages.map((m) => m.date))
}

export function isUnread(t: Thread): boolean {
  return t.messages.some((m) => m.unread && !m.draft)
}

export function isStarred(t: Thread): boolean {
  return t.messages.some((m) => m.starred)
}

export function hasDraft(t: Thread): boolean {
  return t.messages.some((m) => m.draft)
}

export function hasAttachment(t: Thread): boolean {
  return t.messages.some((m) => (m.attachments?.length ?? 0) > 0 && !m.draft)
}

export function isSnoozed(t: Thread, now: number): boolean {
  return t.snoozedUntil !== undefined && t.snoozedUntil > now
}

/** Senders line for the list row, Gmail style: "Sofia, Marcus, me 3". */
export function participantsSummary(t: Thread, includeDrafts = true): { text: string; hasUnread: boolean } {
  const msgs = t.messages.filter((m) => includeDrafts || !m.draft)
  const seen = new Map<string, { label: string; unread: boolean }>()
  for (const m of msgs) {
    const label = m.from.me ? 'me' : m.from.name.split(' ')[0]
    const prev = seen.get(m.from.email)
    seen.set(m.from.email, { label, unread: (prev?.unread ?? false) || m.unread })
  }
  let names = [...seen.values()]
  if (names.length === 1 && !msgs[0]?.from.me) {
    // Single sender: full name reads better than first name only
    names = [{ label: msgs[0].from.name, unread: names[0].unread }]
  }
  const shown = names.length > 3 ? [...names.slice(0, 2), names[names.length - 1]] : names
  const text = shown.map((n) => n.label).join(', ')
  return { text, hasUnread: names.some((n) => n.unread) }
}

export function folderOf(t: Thread, folder: FolderId, now: number): boolean {
  switch (folder) {
    case 'inbox':
      return t.location === 'inbox' && !isSnoozed(t, now) && t.messages.some((m) => !m.draft)
    case 'starred':
      return isStarred(t) && t.location !== 'trash' && t.location !== 'spam'
    case 'snoozed':
      return isSnoozed(t, now) && t.location !== 'trash' && t.location !== 'spam'
    case 'sent':
      return (
        t.location !== 'trash' &&
        t.location !== 'spam' &&
        t.messages.some((m) => m.from.me && !m.draft)
      )
    case 'drafts':
      return t.location !== 'trash' && t.location !== 'spam' && hasDraft(t)
    case 'all':
      return t.location === 'inbox' || t.location === 'archive'
    case 'spam':
      return t.location === 'spam'
    case 'trash':
      return t.location === 'trash'
  }
}

export interface ParsedQuery {
  terms: string[]
  from?: string
  to?: string
  label?: string
  in?: string
  is: string[]
  has?: string
}

export function parseQuery(q: string): ParsedQuery {
  const parsed: ParsedQuery = { terms: [], is: [] }
  for (const raw of q.trim().split(/\s+/)) {
    if (!raw) continue
    const m = raw.match(/^(from|to|label|in|is|has):(.*)$/i)
    if (m && m[2]) {
      const key = m[1].toLowerCase()
      const value = m[2].toLowerCase()
      if (key === 'is') parsed.is.push(value)
      else if (key === 'from') parsed.from = value
      else if (key === 'to') parsed.to = value
      else if (key === 'label') parsed.label = value
      else if (key === 'in') parsed.in = value
      else if (key === 'has') parsed.has = value
    } else {
      parsed.terms.push(raw.toLowerCase())
    }
  }
  return parsed
}

export function matchesQuery(t: Thread, q: ParsedQuery, labels: Label[], now: number): boolean {
  const msgs = t.messages

  if (q.in) {
    const folder = q.in as FolderId
    const valid: FolderId[] = ['inbox', 'starred', 'snoozed', 'sent', 'drafts', 'all', 'spam', 'trash']
    if (valid.includes(folder) && !folderOf(t, folder, now)) return false
  } else if (t.location === 'trash' || t.location === 'spam') {
    // Gmail excludes trash/spam from default search
    return false
  }

  if (q.from && !msgs.some((m) => `${m.from.name} ${m.from.email}`.toLowerCase().includes(q.from!))) return false
  if (q.to && !msgs.some((m) => m.to.some((r) => `${r.name} ${r.email}`.toLowerCase().includes(q.to!)))) return false

  if (q.label) {
    const label = labels.find((l) => l.name.toLowerCase() === q.label)
    if (!label || !t.labelIds.includes(label.id)) return false
  }

  for (const flag of q.is) {
    if (flag === 'unread' && !isUnread(t)) return false
    if (flag === 'read' && isUnread(t)) return false
    if (flag === 'starred' && !isStarred(t)) return false
    if (flag === 'snoozed' && !isSnoozed(t, now)) return false
  }

  if (q.has === 'attachment' && !hasAttachment(t)) return false

  if (q.terms.length > 0) {
    const haystack = [
      t.subject,
      ...msgs.flatMap((m) => [
        m.from.name,
        m.from.email,
        ...m.to.map((r) => `${r.name} ${r.email}`),
        m.snippet,
        m.bodyHtml.replace(/<[^>]+>/g, ' '),
      ]),
    ]
      .join(' ')
      .toLowerCase()
    for (const term of q.terms) {
      if (!haystack.includes(term)) return false
    }
  }

  return true
}

export function threadsForRoute(
  threads: Thread[],
  route: Route,
  labels: Label[],
  now: number,
): Thread[] {
  let list: Thread[]
  if (route.folder === 'search') {
    const q = parseQuery(route.query ?? '')
    list = threads.filter((t) => matchesQuery(t, q, labels, now))
  } else if (route.folder === 'label') {
    list = threads.filter(
      (t) => t.location !== 'trash' && t.location !== 'spam' && t.labelIds.includes(route.labelId ?? ''),
    )
  } else {
    list = threads.filter((t) => folderOf(t, route.folder as FolderId, now))
  }
  return [...list].sort((a, b) => threadDate(b) - threadDate(a))
}
