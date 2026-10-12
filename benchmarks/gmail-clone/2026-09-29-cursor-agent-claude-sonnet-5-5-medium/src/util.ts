import type { Contact, Thread, Message, Label } from './types'
import { CONTACTS, ME, ME_NAME } from './seed'

export { ME, ME_NAME }

const PALETTE = ['#1a73e8', '#d93025', '#188038', '#e37400', '#a142f4', '#007b83', '#c5221f', '#3c4043', '#b06000', '#1967d2', '#9334e6', '#0b8043']
export function colorOf(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export function nameOf(email: string): string {
  if (email === ME) return ME_NAME
  const c = CONTACTS.find((x) => x.email === email)
  if (c) return c.name
  const local = email.split('@')[0].replace(/[._-]+/g, ' ')
  return local.replace(/\b\w/g, (m) => m.toUpperCase())
}
export const firstName = (email: string) => (email === ME ? 'me' : nameOf(email).split(' ')[0])
export const initial = (email: string) => nameOf(email).charAt(0).toUpperCase()

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, ' ')
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>|<\/tr>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function timeStr(d: Date) {
  let h = d.getHours()
  const m = d.getMinutes()
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ap}`
}

export function listDate(ts: number, now: number) {
  const d = new Date(ts)
  const n = new Date(now)
  if (d.toDateString() === n.toDateString()) return timeStr(d)
  if (d.getFullYear() === n.getFullYear()) return `${MONTHS[d.getMonth()]} ${d.getDate()}`
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`
}

export function fullDate(ts: number, now: number) {
  const d = new Date(ts)
  const diff = now - ts
  let rel = ''
  if (diff >= 0) {
    const mins = Math.floor(diff / 60000)
    const hrs = Math.floor(mins / 60)
    const days = Math.floor(hrs / 24)
    rel = mins < 1 ? 'just now' : mins < 60 ? `${mins} minute${mins > 1 ? 's' : ''} ago` : hrs < 24 ? `${hrs} hour${hrs > 1 ? 's' : ''} ago` : `${days} day${days > 1 ? 's' : ''} ago`
  }
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}${d.getFullYear() !== new Date(now).getFullYear() ? ', ' + d.getFullYear() : ''}, ${timeStr(d)}${rel ? ` (${rel})` : ''}`
}

export function snoozeLabel(ts: number) {
  const d = new Date(ts)
  return `${DAYS[d.getDay()]}, ${timeStr(d)}`
}

export function fmtSize(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export const lastMsg = (t: Thread): Message => t.messages[t.messages.length - 1]
export const lastDate = (t: Thread) => lastMsg(t).date
export const snippet = (t: Thread) => stripHtml(lastMsg(t).html).slice(0, 160)
export const hasSent = (t: Thread) => t.messages.some((m) => m.from === ME)
export const hasAttach = (t: Thread) => t.messages.some((m) => m.attachments && m.attachments.length > 0)

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

export function allContacts(extra: string[]): Contact[] {
  const list = [...CONTACTS]
  for (const e of extra) if (!list.find((c) => c.email === e)) list.push({ name: nameOf(e), email: e })
  return list
}

export interface ParsedQuery {
  terms: string[]
  ops: { key: string; value: string }[]
}
export function parseQuery(q: string): ParsedQuery {
  const terms: string[] = []
  const ops: { key: string; value: string }[] = []
  const re = /(\w+):("[^"]+"|\S+)|"([^"]+)"|(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(q))) {
    if (m[1]) ops.push({ key: m[1].toLowerCase(), value: m[2].replace(/"/g, '').toLowerCase() })
    else terms.push((m[3] || m[4]).toLowerCase())
  }
  return { terms, ops }
}

export function searchThreads(threads: Thread[], q: string, labels: Label[], now: number): Thread[] {
  const { terms, ops } = parseQuery(q)
  const inOp = ops.find((o) => o.key === 'in')?.value
  return threads.filter((t) => {
    if (inOp) {
      if (inOp === 'anywhere') {
        /* everything */
      } else if (inOp === 'sent') {
        if (!hasSent(t) || t.box === 'trash') return false
      } else if (inOp === 'starred') {
        if (!t.starred) return false
      } else if (inOp === 'snoozed') {
        if (!(t.snoozedUntil && t.snoozedUntil > now)) return false
      } else if (t.box !== inOp && !(inOp === 'all')) return false
    } else if (t.box === 'trash' || t.box === 'spam') return false
    for (const o of ops) {
      const v = o.value
      switch (o.key) {
        case 'from':
          if (!t.messages.some((m) => (m.from + ' ' + nameOf(m.from)).toLowerCase().includes(v))) return false
          break
        case 'to':
          if (!t.messages.some((m) => [...m.to, ...(m.cc || [])].some((e) => (e + ' ' + nameOf(e)).toLowerCase().includes(v)))) return false
          break
        case 'subject':
          if (!t.subject.toLowerCase().includes(v)) return false
          break
        case 'label': {
          const l = labels.find((x) => x.name.toLowerCase() === v || x.id === v)
          if (!l || !t.labels.includes(l.id)) return false
          break
        }
        case 'is':
          if (v === 'unread' && t.read) return false
          if (v === 'read' && !t.read) return false
          if (v === 'starred' && !t.starred) return false
          if (v === 'snoozed' && !(t.snoozedUntil && t.snoozedUntil > now)) return false
          break
        case 'has':
          if ((v === 'attachment' || v === 'attachments') && !hasAttach(t)) return false
          break
        case 'category':
          if (t.category !== v) return false
          break
        case 'filename':
          if (!t.messages.some((m) => m.attachments?.some((a) => a.name.toLowerCase().includes(v)))) return false
          break
      }
    }
    if (!terms.length) return true
    const hay = (t.subject + ' ' + t.messages.map((m) => nameOf(m.from) + ' ' + m.from + ' ' + stripHtml(m.html) + ' ' + (m.attachments || []).map((a) => a.name).join(' ')).join(' ')).toLowerCase()
    return terms.every((x) => hay.includes(x))
  })
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
