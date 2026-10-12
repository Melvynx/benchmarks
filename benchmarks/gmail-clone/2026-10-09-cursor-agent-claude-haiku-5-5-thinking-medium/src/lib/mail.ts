import type { Contact, Data, FolderId, Message, SystemFolder } from '../types'

export const PAGE_SIZE = 50

export interface ThreadGroup {
  /** Stable key: threadId for conversations, message id for drafts/scheduled */
  key: string
  threadId: string
  /** Messages of this group that match the current view, sorted newest first */
  messages: Message[]
  latest: Message
  unread: boolean
  starred: boolean
  hasAttachments: boolean
}

const HIDDEN_FROM_ALL = new Set<SystemFolder>(['trash', 'spam'])

export function isSnoozed(m: Message, now: number) {
  return m.folder === 'inbox' && m.snoozedUntil !== undefined && m.snoozedUntil > now
}

export function matchesFolder(m: Message, folder: FolderId, now: number): boolean {
  switch (folder) {
    case 'inbox':
      return m.folder === 'inbox' && !isSnoozed(m, now)
    case 'starred':
      return m.starred && !HIDDEN_FROM_ALL.has(m.folder) && m.folder !== 'drafts'
    case 'snoozed':
      return isSnoozed(m, now)
    case 'all':
      return !HIDDEN_FROM_ALL.has(m.folder) && m.folder !== 'drafts' && m.folder !== 'scheduled'
    case 'sent':
    case 'drafts':
    case 'scheduled':
    case 'archive':
    case 'spam':
    case 'trash':
      return m.folder === folder
    default:
      if (folder.startsWith('label:')) {
        return m.labels.includes(folder.slice(6)) && !HIDDEN_FROM_ALL.has(m.folder) && m.folder !== 'drafts'
      }
      return false
  }
}

export function groupThreads(messages: Message[], folder: FolderId): ThreadGroup[] {
  const perItem = folder === 'drafts' || folder === 'scheduled'
  const map = new Map<string, Message[]>()
  for (const m of messages) {
    const key = perItem ? m.id : m.threadId
    const list = map.get(key)
    if (list) list.push(m)
    else map.set(key, [m])
  }
  const groups: ThreadGroup[] = []
  for (const [key, list] of map) {
    list.sort((a, b) => b.date - a.date)
    const latest = list[0]
    groups.push({
      key,
      threadId: latest.threadId,
      messages: list,
      latest,
      unread: list.some((m) => !m.read),
      starred: list.some((m) => m.starred),
      hasAttachments: list.some((m) => m.attachments.length > 0),
    })
  }
  return groups.sort((a, b) => b.latest.date - a.latest.date)
}

export function threadMessages(data: Data, threadId: string): Message[] {
  return Object.values(data.messages)
    .filter((m) => m.threadId === threadId && m.folder !== 'drafts' && m.folder !== 'scheduled')
    .sort((a, b) => a.date - b.date)
}

/** Messages in a conversation that belong to the current view. Falls back to the whole conversation. */
export function scopeIds(data: Data, threadId: string, folder: FolderId, now: number): string[] {
  const all = threadMessages(data, threadId)
  const inView = all.filter((m) => matchesFolder(m, folder, now))
  return (inView.length ? inView : all).map((m) => m.id)
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

export function snippetOf(m: Message) {
  return stripHtml(m.body).slice(0, 180)
}

/* ---------- Search ---------- */

export interface ParsedQuery {
  terms: string[]
  from: string[]
  to: string[]
  subject: string[]
  has: string[]
  is: string[]
  labels: string[]
  in?: string
  after?: number
  before?: number
}

const FILTER_RE = /(\w+):("[^"]*"|\S+)/g

export function parseQuery(raw: string): ParsedQuery {
  const q: ParsedQuery = { terms: [], from: [], to: [], subject: [], has: [], is: [], labels: [] }
  let rest = raw
  for (const match of raw.matchAll(FILTER_RE)) {
    const key = match[1].toLowerCase()
    const value = match[2].replace(/^"|"$/g, '').toLowerCase()
    rest = rest.replace(match[0], ' ')
    switch (key) {
      case 'from': q.from.push(value); break
      case 'to': q.to.push(value); break
      case 'subject': q.subject.push(value); break
      case 'has': q.has.push(value); break
      case 'is': q.is.push(value); break
      case 'label': q.labels.push(value); break
      case 'in': q.in = value; break
      case 'after': q.after = parseDay(value); break
      case 'before': q.before = parseDay(value); break
      default: rest += ` ${match[0]}`
    }
  }
  q.terms = rest.toLowerCase().split(/\s+/).filter(Boolean)
  return q
}

function parseDay(v: string): number | undefined {
  const t = Date.parse(v)
  return Number.isNaN(t) ? undefined : t
}

export function isSearchActive(raw: string) {
  return raw.trim().length > 0
}

export function matchesQuery(m: Message, q: ParsedQuery, now: number, data: Data): boolean {
  if (q.in) {
    const target = q.in === 'inbox' || q.in === 'anywhere' ? null : q.in
    if (target && !matchesFolder(m, target as FolderId, now)) return false
  } else if (HIDDEN_FROM_ALL.has(m.folder)) {
    return false
  }
  const fromText = `${m.from.name} ${m.from.email}`.toLowerCase()
  const toText = [...m.to, ...m.cc].map((c) => `${c.name} ${c.email}`).join(' ').toLowerCase()
  const body = stripHtml(m.body).toLowerCase()
  if (q.from.some((f) => !fromText.includes(f))) return false
  if (q.to.some((t) => !toText.includes(t))) return false
  if (q.subject.some((s) => !m.subject.toLowerCase().includes(s))) return false
  if (q.labels.some((l) => !m.labels.some((id) => id === l || data.labels.find((x) => x.id === id)?.name.toLowerCase() === l))) return false
  if (q.has.some((h) => {
    if (h === 'attachment' || h === 'attachments') return m.attachments.length === 0
    if (h === 'pdf') return !m.attachments.some((a) => a.kind === 'pdf')
    if (h === 'image') return !m.attachments.some((a) => a.kind === 'image')
    if (h === 'star' || h === 'starred') return !m.starred
    return true
  })) return false
  if (q.is.some((i) => {
    if (i === 'unread') return m.read
    if (i === 'read') return !m.read
    if (i === 'starred') return !m.starred
    if (i === 'snoozed') return !isSnoozed(m, now)
    return false
  })) return false
  if (q.after !== undefined && m.date < q.after) return false
  if (q.before !== undefined && m.date >= q.before) return false
  if (q.terms.length) {
    const hay = `${m.subject} ${fromText} ${toText} ${body}`.toLowerCase()
    if (!q.terms.every((t) => hay.includes(t))) return false
  }
  return true
}

/* ---------- Contacts (autocomplete) ---------- */

export function collectContacts(data: Data): Contact[] {
  const counts = new Map<string, { contact: Contact; n: number }>()
  const bump = (c: Contact) => {
    const key = c.email.toLowerCase()
    if (key === data.me.email) return
    const e = counts.get(key)
    if (e) e.n++
    else counts.set(key, { contact: c, n: 1 })
  }
  for (const m of Object.values(data.messages)) {
    if (m.from.email !== data.me.email) bump(m.from)
    m.to.forEach(bump)
    m.cc.forEach(bump)
  }
  return [...counts.values()].sort((a, b) => b.n - a.n).map((x) => x.contact)
}

/* ---------- Formatting ---------- */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatTime(ts: number) {
  const d = new Date(ts)
  const h = d.getHours() % 12 || 12
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m} ${d.getHours() < 12 ? 'AM' : 'PM'}`
}

export function formatListDate(ts: number, now: number) {
  const d = new Date(ts)
  const n = new Date(now)
  if (d.toDateString() === n.toDateString()) return formatTime(ts)
  const yesterday = new Date(now - 86_400_000)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  if (d.getFullYear() === n.getFullYear()) return `${MONTHS[d.getMonth()]} ${d.getDate()}`
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`
}

export function formatFull(ts: number) {
  const d = new Date(ts)
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}, ${formatTime(ts)}`
}

export function formatScheduled(ts: number) {
  const d = new Date(ts)
  return `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}, ${formatTime(ts)}`
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')
}

const AVATAR_COLORS = ['#1a73e8', '#188038', '#d93025', '#e37400', '#a142f4', '#129eaf', '#c2185b', '#5f6368', '#7cb342', '#8d6e63']
export function avatarColor(seed: string) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function folderTitle(folder: FolderId, labelName?: string): string {
  if (folder.startsWith('label:')) return labelName ?? 'Label'
  const map: Record<string, string> = {
    inbox: 'Inbox', starred: 'Starred', snoozed: 'Snoozed', sent: 'Sent', drafts: 'Drafts', scheduled: 'Scheduled',
    archive: 'All Mail', spam: 'Spam', trash: 'Trash', all: 'All Mail',
  }
  return map[folder]
}
