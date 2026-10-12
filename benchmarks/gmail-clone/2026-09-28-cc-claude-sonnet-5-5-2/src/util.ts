import type { Person, State, Thread } from './types'

export const uid = (p = 'x') => p + Math.random().toString(36).slice(2, 10)
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

export function htmlToText(html: string) {
  const d = document.createElement('div'); d.innerHTML = html.replace(/<\/(p|div|li|br)>/gi, ' $&').replace(/<br\s*\/?>/gi, ' ')
  return (d.textContent || '').replace(/\s+/g, ' ').trim()
}
export function sanitize(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach((n) => n.remove())
  doc.body.querySelectorAll('*').forEach((el) => {
    for (const at of [...el.attributes]) {
      if (/^on/i.test(at.name) || (['href', 'src'].includes(at.name) && /^\s*javascript:/i.test(at.value))) el.removeAttribute(at.name)
    }
    if (el.tagName === 'A') { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer') }
  })
  return doc.body.innerHTML
}
export function linkify(html: string) {
  return html.replace(/(^|[\s>])(https?:\/\/[^\s<]+)/g, '$1<a href="$2">$2</a>')
}
export const nameFromEmail = (e: string) => e.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
export const isEmail = (s: string) => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(s)
export const firstName = (p: Person) => p.name.split(' ')[0]

const COLORS = ['#e8710a', '#1a73e8', '#188038', '#a142f4', '#d93025', '#129eaf', '#c5221f', '#5f6368', '#e52592', '#7cb342']
export const colorFor = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length] }
export const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 1).map((x) => x[0]).join('').toUpperCase() || '?'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const timeStr = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
export function listDate(ts: number) {
  const d = new Date(ts), n = new Date()
  if (d.toDateString() === n.toDateString()) return timeStr(d)
  if (d.getFullYear() === n.getFullYear()) return `${MONTHS[d.getMonth()]} ${d.getDate()}`
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`
}
export function longDate(ts: number) {
  const d = new Date(ts)
  const diff = Date.now() - ts
  const rel = diff < 60e3 ? 'just now' : diff < 3600e3 ? `${Math.floor(diff / 60e3)} minutes ago` : diff < 86400e3 ? `${Math.floor(diff / 3600e3)} hours ago` : `${Math.floor(diff / 86400e3)} days ago`
  return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}, ${timeStr(d)} (${rel})`
}
export function fmtFuture(ts: number) {
  const d = new Date(ts)
  const n = new Date(), tm = new Date(Date.now() + 86400e3)
  const day = d.toDateString() === n.toDateString() ? 'Today' : d.toDateString() === tm.toDateString() ? 'Tomorrow' : d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  return `${day}, ${timeStr(d)}`
}
export const fmtSize = (b: number) => b < 1024 ? b + ' B' : b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(1) + ' MB'

export function snoozeOptions() {
  const now = new Date()
  const at = (d: Date, h: number) => { const x = new Date(d); x.setHours(h, 0, 0, 0); return x.getTime() }
  const tomorrow = new Date(now.getTime() + 86400e3)
  const sat = new Date(now); sat.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7))
  const mon = new Date(now); mon.setDate(now.getDate() + ((1 - now.getDay() + 7) % 7 || 7))
  const opts: { label: string; ts: number }[] = []
  if (now.getHours() < 16) opts.push({ label: 'Later today', ts: at(now, now.getHours() < 12 ? 17 : 19) })
  opts.push({ label: 'Tomorrow', ts: at(tomorrow, 8) }, { label: 'This weekend', ts: at(sat, 8) }, { label: 'Next week', ts: at(mon, 8) })
  return opts
}

/* ---------- search ---------- */
export type Query = { text: string[]; from: string[]; to: string[]; subject: string[]; label: string[]; has: string[]; is: string[]; inn?: string; after?: number; before?: number; neg: string[] }
export function parseQuery(q: string): Query {
  const out: Query = { text: [], from: [], to: [], subject: [], label: [], has: [], is: [], neg: [] }
  const re = /(-?)(\w+):("([^"]*)"|\S+)|"([^"]+)"|(-?)(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(q))) {
    if (m[2]) {
      const k = m[2].toLowerCase(), v = (m[4] ?? m[3]).toLowerCase()
      if (m[1]) { out.neg.push(v); continue }
      if (k === 'from') out.from.push(v); else if (k === 'to') out.to.push(v); else if (k === 'subject') out.subject.push(v)
      else if (k === 'label') out.label.push(v); else if (k === 'has') out.has.push(v); else if (k === 'is') out.is.push(v)
      else if (k === 'in') out.inn = v
      else if (k === 'after' || k === 'before' || k === 'newer_than' || k === 'older_than') {
        let ts = Date.parse(v.replace(/\//g, '-'))
        const rel = v.match(/^(\d+)([dmy])$/)
        if (rel) ts = Date.now() - +rel[1] * { d: 86400e3, m: 30 * 86400e3, y: 365 * 86400e3 }[rel[2] as 'd']
        if (!isNaN(ts)) { if (k === 'after' || k === 'newer_than') out.after = ts; else out.before = ts }
      } else out.text.push(m[0].toLowerCase())
    } else if (m[5]) out.text.push(m[5].toLowerCase())
    else if (m[7]) { if (m[6]) out.neg.push(m[7].toLowerCase()); else out.text.push(m[7].toLowerCase()) }
  }
  return out
}
const pstr = (p: Person) => (p.name + ' ' + p.email).toLowerCase()
export function matchThread(t: Thread, q: Query, s: State): boolean {
  const inn = q.inn
  if (inn === 'trash') { if (!t.trashed) return false }
  else if (inn === 'spam') { if (!t.spam) return false }
  else if (inn === 'inbox') { if (!t.inbox || t.trashed || t.spam) return false }
  else if (inn === 'sent') { if (t.trashed || t.spam || !t.messages.some((m) => m.from.email === 'alex.morgan@gmail.com')) return false }
  else if (inn === 'starred') { if (!t.starred || t.trashed) return false }
  else if (inn === 'anywhere') { /* all */ }
  else if (t.trashed || t.spam) return false
  const body = t.messages.map((m) => htmlToText(m.html)).join(' ').toLowerCase()
  const people = t.messages.flatMap((m) => [m.from, ...m.to, ...(m.cc ?? [])])
  const hay = (t.subject + ' ' + body + ' ' + people.map(pstr).join(' ') + ' ' + t.messages.flatMap((m) => m.atts ?? []).map((a) => a.name).join(' ')).toLowerCase()
  if (!q.text.every((w) => hay.includes(w))) return false
  if (q.neg.some((w) => hay.includes(w))) return false
  if (!q.from.every((w) => t.messages.some((m) => pstr(m.from).includes(w)))) return false
  if (!q.to.every((w) => t.messages.some((m) => [...m.to, ...(m.cc ?? [])].some((p) => pstr(p).includes(w))))) return false
  if (!q.subject.every((w) => t.subject.toLowerCase().includes(w))) return false
  for (const l of q.label) {
    const lab = s.labels.find((x) => x.name.toLowerCase() === l || x.id === l)
    if (!lab || !t.labels.includes(lab.id)) return false
  }
  for (const h of q.has) if (h === 'attachment' && !t.messages.some((m) => m.atts?.length)) return false
  for (const i of q.is) {
    if (i === 'unread' && !t.unread) return false
    if (i === 'read' && t.unread) return false
    if (i === 'starred' && !t.starred) return false
    if (i === 'important' && !t.important) return false
  }
  const d = t.messages[t.messages.length - 1].date
  if (q.after && d < q.after) return false
  if (q.before && d > q.before) return false
  return true
}
export function highlight(text: string, words: string[]) {
  const ws = words.filter((w) => w.length > 1 && !w.includes(':'))
  if (!ws.length) return text
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const re = new RegExp('(' + ws.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'ig')
  return esc.replace(re, '<mark>$1</mark>')
}
