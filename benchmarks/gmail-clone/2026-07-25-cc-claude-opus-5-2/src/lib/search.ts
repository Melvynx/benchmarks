import type { Label, MailData, Message, Thread } from './types'
import { htmlToText } from './utils'

export interface Query {
  /** Free-text terms, lowercased. */
  terms: string[]
  /** Quoted phrases that must appear verbatim (case-insensitive). */
  phrases: string[]
  from?: string
  to?: string
  subject?: string
  labelNames: string[]
  filename?: string
  in?: string
  hasAttachment?: boolean
  isUnread?: boolean
  isRead?: boolean
  isStarred?: boolean
  isImportant?: boolean
  isSnoozed?: boolean
  after?: number
  before?: number
  /** True when nothing meaningful was typed. */
  empty: boolean
}

const OPERATOR = /^(from|to|subject|label|in|is|has|filename|before|after|older_than|newer_than):(.*)$/i

/** Split on spaces but keep "quoted phrases" and label:"two words" together. */
function tokenize(raw: string) {
  const out: string[] = []
  let buf = ''
  let quoted = false
  for (const ch of raw) {
    if (ch === '"') {
      quoted = !quoted
      buf += ch
      continue
    }
    if (ch === ' ' && !quoted) {
      if (buf) out.push(buf)
      buf = ''
      continue
    }
    buf += ch
  }
  if (buf) out.push(buf)
  return out
}

function unquote(s: string) {
  return s.replace(/^"|"$/g, '')
}

function parseRelative(value: string, now: number) {
  const m = value.match(/^(\d+)\s*([dwmy])$/i)
  if (!m) return undefined
  const n = Number(m[1])
  const unit = m[2].toLowerCase()
  const days = unit === 'd' ? n : unit === 'w' ? n * 7 : unit === 'm' ? n * 30 : n * 365
  return now - days * 86_400_000
}

function parseDate(value: string) {
  const t = Date.parse(value.replace(/\//g, '-'))
  return Number.isNaN(t) ? undefined : t
}

export function parseQuery(raw: string, now = Date.now()): Query {
  const q: Query = { terms: [], phrases: [], labelNames: [], empty: true }
  for (const token of tokenize(raw.trim())) {
    const m = token.match(OPERATOR)
    if (m) {
      const op = m[1].toLowerCase()
      const value = unquote(m[2]).trim()
      if (!value) continue
      switch (op) {
        case 'from':
          q.from = value.toLowerCase()
          break
        case 'to':
          q.to = value.toLowerCase()
          break
        case 'subject':
          q.subject = value.toLowerCase()
          break
        case 'label':
          q.labelNames.push(value.toLowerCase())
          break
        case 'in':
          q.in = value.toLowerCase()
          break
        case 'filename':
          q.filename = value.toLowerCase()
          break
        case 'has':
          if (value.toLowerCase() === 'attachment') q.hasAttachment = true
          else if (['star', 'yellow-star', 'starred'].includes(value.toLowerCase()))
            q.isStarred = true
          break
        case 'is':
          switch (value.toLowerCase()) {
            case 'unread':
              q.isUnread = true
              break
            case 'read':
              q.isRead = true
              break
            case 'starred':
              q.isStarred = true
              break
            case 'important':
              q.isImportant = true
              break
            case 'snoozed':
              q.isSnoozed = true
              break
          }
          break
        case 'before':
          q.before = parseDate(value)
          break
        case 'after':
          q.after = parseDate(value)
          break
        case 'older_than':
          q.before = parseRelative(value, now)
          break
        case 'newer_than':
          q.after = parseRelative(value, now)
          break
      }
      q.empty = false
      continue
    }
    if (token.startsWith('"') && token.length > 1) {
      const phrase = unquote(token).trim()
      if (phrase) {
        q.phrases.push(phrase.toLowerCase())
        q.empty = false
      }
      continue
    }
    const t = token.toLowerCase()
    if (t) {
      q.terms.push(t)
      q.empty = false
    }
  }
  return q
}

/** Everything about a message that free text can match, computed once. */
const textCache = new WeakMap<Message, string>()

function messageText(m: Message) {
  let cached = textCache.get(m)
  if (cached === undefined) {
    cached = [
      m.from.name,
      m.from.email,
      ...m.to.flatMap((a) => [a.name, a.email]),
      ...m.cc.flatMap((a) => [a.name, a.email]),
      ...m.attachments.map((a) => a.name),
      htmlToText(m.bodyHtml),
    ]
      .join(' ')
      .toLowerCase()
    textCache.set(m, cached)
  }
  return cached
}

function personMatches(list: { name: string; email: string }[], needle: string, meEmail: string) {
  if (needle === 'me') return list.some((a) => a.email === meEmail)
  return list.some(
    (a) => a.email.toLowerCase().includes(needle) || a.name.toLowerCase().includes(needle),
  )
}

export function matchesQuery(
  thread: Thread,
  q: Query,
  data: MailData,
  labelsByName: Map<string, Label>,
): boolean {
  const msgs = thread.messageIds.map((id) => data.messages[id]).filter(Boolean)
  if (!msgs.length) return false
  const me = data.account.email

  if (q.subject && !thread.subject.toLowerCase().includes(q.subject)) return false
  if (q.isStarred && !msgs.some((m) => m.starred)) return false
  if (q.isUnread && !msgs.some((m) => !m.read)) return false
  if (q.isRead && msgs.some((m) => !m.read)) return false
  if (q.isImportant && !thread.labelIds.includes('IMPORTANT')) return false
  if (q.isSnoozed && !thread.snoozedUntil) return false
  if (q.hasAttachment && !msgs.some((m) => m.attachments.length > 0)) return false
  if (q.filename && !msgs.some((m) => m.attachments.some((a) => a.name.toLowerCase().includes(q.filename!))))
    return false

  if (q.from && !msgs.some((m) => personMatches([m.from], q.from!, me))) return false
  if (q.to && !msgs.some((m) => personMatches([...m.to, ...m.cc], q.to!, me))) return false

  for (const name of q.labelNames) {
    const label = labelsByName.get(name)
    if (!label || !thread.labelIds.includes(label.id)) return false
  }

  if (q.after !== undefined && !msgs.some((m) => Date.parse(m.date) >= q.after!)) return false
  if (q.before !== undefined && !msgs.some((m) => Date.parse(m.date) <= q.before!)) return false

  if (q.terms.length || q.phrases.length) {
    const haystack = `${thread.subject.toLowerCase()} ${msgs.map(messageText).join(' ')}`
    for (const t of q.terms) if (!haystack.includes(t)) return false
    for (const p of q.phrases) if (!haystack.includes(p)) return false
  }

  return true
}

/** The scope a search runs over, honouring `in:` when present. */
export function queryScope(q: Query) {
  switch (q.in) {
    case 'inbox':
    case 'sent':
    case 'drafts':
    case 'trash':
    case 'spam':
    case 'starred':
    case 'snoozed':
      return q.in
    case 'anywhere':
      return 'anywhere'
    default:
      return 'default'
  }
}

/** Terms worth highlighting in list rows and message bodies. */
export function highlightTerms(q: Query) {
  return [...q.phrases, ...q.terms, q.subject, q.from]
    .filter((t): t is string => Boolean(t && t.length > 1))
    .sort((a, b) => b.length - a.length)
}
