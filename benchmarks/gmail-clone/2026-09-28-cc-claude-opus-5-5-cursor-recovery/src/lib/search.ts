import type { Label, Thread } from '../types'
import { hasAttachments, isSent, isSnoozed, threadText, lastDate } from './mail'

export interface ParsedQuery {
  terms: string[]
  negated: string[]
  from: string[]
  to: string[]
  subject: string[]
  label: string[]
  is: string[]
  has: string[]
  in: string | null
  category: string | null
  filename: string[]
  before: number | null
  after: number | null
  newerThan: number | null
}

const TOKEN = /(-?)(\w+):("[^"]*"|\S+)|(-?)"([^"]*)"|(-?)(\S+)/g

export function parseQuery(q: string): ParsedQuery {
  const out: ParsedQuery = {
    terms: [], negated: [], from: [], to: [], subject: [], label: [], is: [], has: [],
    in: null, category: null, filename: [], before: null, after: null, newerThan: null,
  }
  for (const m of q.matchAll(TOKEN)) {
    if (m[2]) {
      const key = m[2].toLowerCase()
      const val = m[3].replace(/^"|"$/g, '').toLowerCase()
      switch (key) {
        case 'from': out.from.push(val); break
        case 'to': out.to.push(val); break
        case 'subject': out.subject.push(val); break
        case 'label': out.label.push(val); break
        case 'is': out.is.push(val); break
        case 'has': out.has.push(val); break
        case 'in': out.in = val; break
        case 'category': out.category = val; break
        case 'filename': out.filename.push(val); break
        case 'before': out.before = parseDate(val); break
        case 'after': out.after = parseDate(val); break
        case 'newer_than': out.newerThan = parseRel(val); break
        default: out.terms.push(`${key}:${val}`)
      }
    } else if (m[5] !== undefined) {
      ;(m[4] ? out.negated : out.terms).push(m[5].toLowerCase())
    } else if (m[7]) {
      ;(m[6] ? out.negated : out.terms).push(m[7].toLowerCase())
    }
  }
  return out
}

function parseDate(v: string) {
  const t = Date.parse(v.replace(/\//g, '-'))
  return Number.isNaN(t) ? null : t
}

function parseRel(v: string) {
  const m = /^(\d+)([dmy])$/.exec(v)
  if (!m) return null
  const n = Number(m[1])
  const days = m[2] === 'd' ? n : m[2] === 'm' ? n * 30 : n * 365
  return Date.now() - days * 86400000
}

export function matchThread(t: Thread, q: ParsedQuery, labels: Label[], now: number): boolean {
  // location
  const loc = q.in
  if (loc === 'trash') {
    if (!t.trash) return false
  } else if (loc === 'spam') {
    if (!t.spam || t.trash) return false
  } else if (loc !== 'anywhere') {
    if (t.trash || t.spam) return false
    if (loc === 'inbox' && !t.inbox) return false
    if (loc === 'sent' && !isSent(t)) return false
  }
  if (q.category && t.category !== q.category) return false

  const text = threadText(t)
  for (const term of q.terms) if (!text.includes(term)) return false
  for (const term of q.negated) if (text.includes(term)) return false

  const senders = t.messages.map((m) => `${m.from.name} ${m.from.email}`.toLowerCase())
  for (const f of q.from) {
    if (f === 'me') {
      if (!isSent(t)) return false
    } else if (!senders.some((s) => s.includes(f))) return false
  }
  const recips = t.messages.flatMap((m) => [...m.to, ...m.cc]).map((c) => `${c.name} ${c.email}`.toLowerCase())
  for (const f of q.to) {
    if (f === 'me') {
      if (!recips.some((r) => r.includes('sam.rivera'))) return false
    } else if (!recips.some((r) => r.includes(f))) return false
  }
  for (const s of q.subject) if (!t.subject.toLowerCase().includes(s)) return false
  for (const l of q.label) {
    const lab = labels.find((x) => x.name.toLowerCase() === l || x.id === l || x.name.toLowerCase().replace(/\s+/g, '-') === l)
    if (!lab || !t.labels.includes(lab.id)) return false
  }
  for (const is of q.is) {
    if (is === 'unread' && !t.unread) return false
    if (is === 'read' && t.unread) return false
    if (is === 'starred' && !t.starred) return false
    if (is === 'important' && !t.important) return false
    if (is === 'snoozed' && !isSnoozed(t, now)) return false
  }
  for (const h of q.has) {
    if (h === 'attachment' && !hasAttachments(t)) return false
    if (h === 'userlabels' && t.labels.length === 0) return false
    if (h === 'nouserlabels' && t.labels.length > 0) return false
  }
  for (const f of q.filename) {
    if (!t.messages.some((m) => m.attachments.some((a) => a.name.toLowerCase().includes(f)))) return false
  }
  const ld = lastDate(t)
  if (q.before && ld >= q.before) return false
  if (q.after && ld < q.after) return false
  if (q.newerThan && ld < q.newerThan) return false
  return true
}

/** Words worth highlighting in results */
export function highlightTerms(q: string): string[] {
  const p = parseQuery(q)
  return [...p.terms, ...p.subject].filter((x) => x.length > 1 && !x.includes(':'))
}
