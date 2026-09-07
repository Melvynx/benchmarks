import type { Attachment, AttachmentKind, Contact } from './types'

const DAY = 86_400_000

/** 12 well-separated avatar hues, matching Google's contact palette feel. */
export const AVATAR_COLORS = [
  '#d93025',
  '#e8710a',
  '#f9ab00',
  '#188038',
  '#1a73e8',
  '#8430ce',
  '#c5221f',
  '#137333',
  '#a8710a',
  '#1967d2',
  '#9334e6',
  '#00838f',
]

export function avatarColor(hue: number) {
  return AVATAR_COLORS[((hue % AVATAR_COLORS.length) + AVATAR_COLORS.length) % AVATAR_COLORS.length]
}

export function hueOf(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function initials(name: string) {
  const clean = name.replace(/["']/g, '').trim()
  if (!clean) return '?'
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** First name, or the mailbox part for address-only contacts. */
export function firstName(c: Contact) {
  if (c.name.includes('@')) return c.name.split('@')[0]
  return c.name.split(/\s+/)[0]
}

function startOfDay(ms: number) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const monthDay = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const monthDayYear = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})
const weekdayLong = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const full = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/** Gmail list column: time for today, "Mon DD" this year, "MM/DD/YY" beyond. */
export function listDate(ms: number, now = Date.now()) {
  const today = startOfDay(now)
  if (ms >= today) return time.format(ms)
  if (ms >= today - 6 * DAY) return weekdayLong.format(ms)
  if (new Date(ms).getFullYear() === new Date(now).getFullYear()) return monthDay.format(ms)
  return new Intl.DateTimeFormat(undefined, {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
  }).format(ms)
}

/** Message header date: "Fri, Jul 25, 2026, 9:41 AM" style, shortened when recent. */
export function messageDate(ms: number, now = Date.now()) {
  const today = startOfDay(now)
  if (ms >= today) return time.format(ms)
  if (ms >= today - 6 * DAY) return `${weekdayLong.format(ms)} ${time.format(ms)}`
  if (new Date(ms).getFullYear() === new Date(now).getFullYear())
    return `${monthDay.format(ms)}, ${time.format(ms)}`
  return `${monthDayYear.format(ms)}, ${time.format(ms)}`
}

export function fullDate(ms: number) {
  return full.format(ms)
}

/** "3 minutes ago" / "2 days ago", used in message tooltips. */
export function relativeDate(ms: number, now = Date.now()) {
  const diff = now - ms
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const table: [Intl.RelativeTimeFormatUnit, number][] = [
    ['second', 1000],
    ['minute', 60_000],
    ['hour', 3_600_000],
    ['day', DAY],
    ['month', 30 * DAY],
    ['year', 365 * DAY],
  ]
  let unit: Intl.RelativeTimeFormatUnit = 'second'
  let div = 1000
  for (const [u, d] of table) {
    if (abs >= d) {
      unit = u
      div = d
    }
  }
  return rtf.format(-Math.round(diff / div), unit)
}

/** Snooze / schedule chip: "Tomorrow, 8:00 AM". */
export function whenLabel(ms: number, now = Date.now()) {
  const today = startOfDay(now)
  const d = startOfDay(ms)
  if (d === today) return `Today, ${time.format(ms)}`
  if (d === today + DAY) return `Tomorrow, ${time.format(ms)}`
  if (d === today - DAY) return `Yesterday, ${time.format(ms)}`
  if (d > today && d < today + 7 * DAY)
    return `${new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(ms)}, ${time.format(ms)}`
  return `${monthDay.format(ms)}, ${time.format(ms)}`
}

/** Group header used by the thread list. */
export function dateGroup(ms: number, now = Date.now()) {
  const today = startOfDay(now)
  if (ms >= today) return 'Today'
  if (ms >= today - DAY) return 'Yesterday'
  if (ms >= today - 7 * DAY) return 'Last 7 days'
  if (ms >= today - 30 * DAY) return 'Last 30 days'
  if (new Date(ms).getFullYear() === new Date(now).getFullYear())
    return new Intl.DateTimeFormat(undefined, { month: 'long' }).format(ms)
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(ms)
}

export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`
}

const EXT_KIND: Record<string, AttachmentKind> = {
  pdf: 'pdf',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  heic: 'image',
  doc: 'doc',
  docx: 'doc',
  txt: 'doc',
  md: 'doc',
  rtf: 'doc',
  xls: 'sheet',
  xlsx: 'sheet',
  csv: 'sheet',
  numbers: 'sheet',
  ppt: 'slide',
  pptx: 'slide',
  key: 'slide',
  zip: 'zip',
  gz: 'zip',
  tar: 'zip',
  rar: 'zip',
  mp4: 'video',
  mov: 'video',
  webm: 'video',
  ts: 'code',
  tsx: 'code',
  js: 'code',
  json: 'code',
  py: 'code',
  sql: 'code',
  patch: 'code',
  diff: 'code',
}

export function kindFromName(name: string): AttachmentKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return EXT_KIND[ext] ?? 'doc'
}

export const ATTACHMENT_TINT: Record<AttachmentKind, string> = {
  pdf: '#d93025',
  image: '#8430ce',
  doc: '#1a73e8',
  sheet: '#188038',
  slide: '#e8710a',
  zip: '#5f6368',
  code: '#00838f',
  video: '#c5221f',
}

/** Deterministic fake image thumbnail. */
export function previewGradient(seed: string) {
  const h = hueOf(seed)
  const a = h % 360
  const b = (a + 42 + (h % 60)) % 360
  return `linear-gradient(135deg, hsl(${a} 62% 58%), hsl(${b} 68% 44%))`
}

export function makeAttachment(name: string, size: number): Attachment {
  const kind = kindFromName(name)
  return {
    id: `att_${hueOf(name + size).toString(36)}`,
    name,
    kind,
    size,
    preview: kind === 'image' ? previewGradient(name) : undefined,
  }
}

/** Plain-text snippet from an HTML body. */
export function toSnippet(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-3]|tr)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}

export function formatAddressList(cs: Contact[], me: string, max = 3) {
  const names = cs.map((c) => (c.email === me ? 'me' : firstName(c)))
  if (names.length <= max) return names.join(', ')
  return `${names.slice(0, max).join(', ')} +${names.length - max}`
}

export function attachmentSummary(atts: Attachment[]) {
  if (atts.length === 1) return atts[0].name
  return `${atts.length} attachments`
}
