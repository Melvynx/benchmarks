import { resolveContact } from './contacts'
import { toSnippet } from './format'
import { SYS, type Label, type Message, type Thread } from './types'

export interface Query {
  /** Free-text terms (already lowercased). */
  terms: string[]
  negTerms: string[]
  from: string[]
  to: string[]
  subject: string[]
  filename: string[]
  labels: string[]
  in?: string
  hasAttachment?: boolean
  isUnread?: boolean
  isRead?: boolean
  isStarred?: boolean
  isImportant?: boolean
  after?: number
  before?: number
  raw: string
}

const OPERATORS = [
  'from',
  'to',
  'cc',
  'bcc',
  'subject',
  'label',
  'in',
  'has',
  'is',
  'filename',
  'after',
  'before',
  'older_than',
  'newer_than',
] as const

export const SEARCH_OPERATORS: { op: string; hint: string }[] = [
  { op: 'from:', hint: 'Sender name or address' },
  { op: 'to:', hint: 'Recipient' },
  { op: 'subject:', hint: 'Words in the subject' },
  { op: 'label:', hint: 'Applied label' },
  { op: 'has:attachment', hint: 'Messages with files' },
  { op: 'is:unread', hint: 'Unread only' },
  { op: 'is:starred', hint: 'Starred only' },
  { op: 'in:trash', hint: 'Search a mailbox' },
  { op: 'filename:pdf', hint: 'Attachment name or type' },
  { op: 'newer_than:7d', hint: 'Relative age' },
]

const UNIT_MS: Record<string, number> = { d: 86_400_000, w: 604_800_000, m: 2_592_000_000, y: 31_536_000_000 }

function parseRelative(v: string) {
  const m = /^(\d+)\s*([dwmy])$/i.exec(v.trim())
  if (!m) return undefined
  return Number(m[1]) * UNIT_MS[m[2].toLowerCase()]
}

function parseDate(v: string) {
  const t = Date.parse(v.replace(/\//g, '-'))
  return Number.isNaN(t) ? undefined : t
}

/** Tokenises respecting quotes so `subject:"q3 roadmap"` works. */
function tokenize(input: string) {
  const out: string[] = []
  let cur = ''
  let quote = false
  for (const ch of input) {
    if (ch === '"') {
      quote = !quote
      cur += ch
      continue
    }
    if (!quote && /\s/.test(ch)) {
      if (cur) out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  if (cur) out.push(cur)
  return out
}

const unquote = (s: string) => s.replace(/^"|"$/g, '')

export function parseQuery(input: string, now = Date.now()): Query {
  const q: Query = {
    terms: [],
    negTerms: [],
    from: [],
    to: [],
    subject: [],
    filename: [],
    labels: [],
    raw: input,
  }

  for (const tokenRaw of tokenize(input)) {
    const neg = tokenRaw.startsWith('-')
    const token = neg ? tokenRaw.slice(1) : tokenRaw
    const idx = token.indexOf(':')
    const head = idx > 0 ? token.slice(0, idx).toLowerCase() : ''

    if (idx > 0 && (OPERATORS as readonly string[]).includes(head)) {
      const value = unquote(token.slice(idx + 1)).toLowerCase()
      if (!value) continue
      switch (head) {
        case 'from':
          q.from.push(value)
          break
        case 'to':
        case 'cc':
        case 'bcc':
          q.to.push(value)
          break
        case 'subject':
          q.subject.push(value)
          break
        case 'label':
          q.labels.push(value)
          break
        case 'filename':
          q.filename.push(value)
          break
        case 'in':
          q.in = value
          break
        case 'has':
          if (value === 'attachment' || value === 'file' || value === 'files')
            q.hasAttachment = !neg
          if (value === 'star' || value === 'yellow-star') q.isStarred = !neg
          break
        case 'is':
          if (value === 'unread') {
            if (neg) q.isRead = true
            else q.isUnread = true
          }
          if (value === 'read') {
            if (neg) q.isUnread = true
            else q.isRead = true
          }
          if (value === 'starred') q.isStarred = !neg
          if (value === 'important') q.isImportant = !neg
          break
        case 'after': {
          const t = parseDate(value)
          if (t) q.after = t
          break
        }
        case 'before': {
          const t = parseDate(value)
          if (t) q.before = t
          break
        }
        case 'newer_than': {
          const d = parseRelative(value)
          if (d) q.after = now - d
          break
        }
        case 'older_than': {
          const d = parseRelative(value)
          if (d) q.before = now - d
          break
        }
      }
      continue
    }

    const word = unquote(token).toLowerCase()
    if (!word) continue
    ;(neg ? q.negTerms : q.terms).push(word)
  }

  return q
}

export function isEmptyQuery(q: Query) {
  return (
    !q.terms.length &&
    !q.negTerms.length &&
    !q.from.length &&
    !q.to.length &&
    !q.subject.length &&
    !q.filename.length &&
    !q.labels.length &&
    !q.in &&
    q.hasAttachment === undefined &&
    q.isUnread === undefined &&
    q.isRead === undefined &&
    q.isStarred === undefined &&
    q.isImportant === undefined &&
    q.after === undefined &&
    q.before === undefined
  )
}

function personBlob(email: string) {
  const c = resolveContact(email)
  return `${c.name} ${c.email}`.toLowerCase()
}

/** Cheap per-message text cache — search runs on every keystroke. */
const blobCache = new Map<string, string>()

function messageBlob(m: Message) {
  const hit = blobCache.get(m.id)
  if (hit !== undefined) return hit
  const parts = [
    personBlob(m.from),
    ...m.to.map(personBlob),
    ...(m.cc ?? []).map(personBlob),
    toSnippet(m.body),
    ...(m.attachments ?? []).map((a) => a.name),
  ]
  const blob = parts.join('  ').toLowerCase()
  blobCache.set(m.id, blob)
  return blob
}

export function invalidateBlob(id: string) {
  blobCache.delete(id)
}

export function matchThread(
  thread: Thread,
  msgs: Message[],
  q: Query,
  labels: Label[],
): boolean {
  const subject = thread.subject.toLowerCase()

  if (q.subject.some((s) => !subject.includes(s))) return false

  if (q.labels.length) {
    const names = thread.labels.map((id) => {
      const l = labels.find((x) => x.id === id)
      return (l?.name ?? id).toLowerCase()
    })
    if (!q.labels.every((needle) => names.some((n) => n.includes(needle)))) return false
  }

  if (q.hasAttachment && !msgs.some((m) => m.attachments?.length)) return false
  if (q.hasAttachment === false && msgs.some((m) => m.attachments?.length)) return false

  if (q.filename.length) {
    const files = msgs.flatMap((m) => m.attachments ?? []).map((a) => a.name.toLowerCase())
    if (!q.filename.every((f) => files.some((n) => n.includes(f)))) return false
  }

  if (q.isStarred !== undefined && thread.labels.includes(SYS.STARRED) !== q.isStarred) return false
  if (q.isImportant !== undefined && thread.labels.includes(SYS.IMPORTANT) !== q.isImportant)
    return false

  const unread = msgs.some((m) => m.unread)
  if (q.isUnread && !unread) return false
  if (q.isRead && unread) return false

  if (q.after !== undefined && thread.lastActivity < q.after) return false
  if (q.before !== undefined && thread.lastActivity > q.before) return false

  if (q.from.length) {
    const senders = msgs.map((m) => personBlob(m.from))
    if (!q.from.every((needle) => senders.some((s) => s.includes(needle)))) return false
  }

  if (q.to.length) {
    const recips = msgs.flatMap((m) => [...m.to, ...(m.cc ?? [])].map(personBlob))
    if (!q.to.every((needle) => recips.some((s) => s.includes(needle)))) return false
  }

  if (q.terms.length || q.negTerms.length) {
    const blob = `${subject}  ${msgs.map(messageBlob).join('  ')}`
    if (!q.terms.every((t) => blob.includes(t))) return false
    if (q.negTerms.some((t) => blob.includes(t))) return false
  }

  return true
}

/** Terms worth visually highlighting in results. */
export function highlightTerms(q: Query) {
  return [...q.terms, ...q.subject, ...q.from, ...q.to].filter((t) => t.length > 1)
}

/** Splits text into [text, isMatch] runs for the given needles. */
export function splitHighlight(text: string, needles: string[]): [string, boolean][] {
  if (!needles.length || !text) return [[text, false]]
  const lower = text.toLowerCase()
  const marks: [number, number][] = []
  for (const n of needles) {
    let i = lower.indexOf(n)
    while (i !== -1) {
      marks.push([i, i + n.length])
      i = lower.indexOf(n, i + n.length)
    }
  }
  if (!marks.length) return [[text, false]]
  marks.sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = [marks[0]]
  for (const [s, e] of marks.slice(1)) {
    const last = merged[merged.length - 1]
    if (s <= last[1]) last[1] = Math.max(last[1], e)
    else merged.push([s, e])
  }
  const out: [string, boolean][] = []
  let cur = 0
  for (const [s, e] of merged) {
    if (s > cur) out.push([text.slice(cur, s), false])
    out.push([text.slice(s, e), true])
    cur = e
  }
  if (cur < text.length) out.push([text.slice(cur), false])
  return out
}
