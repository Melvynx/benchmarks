import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Address, AttachmentKind } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

let counter = 0
export function uid(prefix = 'id') {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`
}

/* -------------------------------------------------------------------------- */
/*  Dates                                                                      */
/* -------------------------------------------------------------------------- */

const MS_DAY = 86_400_000

function startOfDay(d: Date) {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

export function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / MS_DAY)
}

/** The compact stamp shown at the right edge of a list row. */
export function formatListDate(iso: string, now = new Date()) {
  const d = new Date(iso)
  const delta = daysBetween(now, d)
  if (delta === 0) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  if (delta > 0 && delta < 7) {
    return d.toLocaleDateString(undefined, { weekday: 'short' })
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  return d.toLocaleDateString(undefined, {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
  })
}

/** The stamp shown in an expanded message header. */
export function formatMessageDate(iso: string, now = new Date()) {
  const d = new Date(iso)
  const delta = daysBetween(now, d)
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (delta === 0) return time
  if (delta === 1) return `Yesterday, ${time}`
  if (delta < 7 && delta > 0) {
    return `${d.toLocaleDateString(undefined, { weekday: 'short' })}, ${time}`
  }
  return `${d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  })}, ${time}`
}

export function formatFullDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatRelative(iso: string, now = new Date()) {
  const diff = now.getTime() - new Date(iso).getTime()
  const mins = Math.round(diff / 60_000)
  if (Math.abs(mins) < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  return `${Math.round(months / 12)} year${months < 18 ? '' : 's'} ago`
}

/** Human label for a future timestamp, e.g. "Tomorrow, 8:00 AM". */
export function formatFuture(iso: string, now = new Date()) {
  const d = new Date(iso)
  const delta = -daysBetween(now, d)
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (delta <= 0) return `Today, ${time}`
  if (delta === 1) return `Tomorrow, ${time}`
  if (delta < 7) return `${d.toLocaleDateString(undefined, { weekday: 'long' })}, ${time}`
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`
}

/* -------------------------------------------------------------------------- */
/*  People                                                                     */
/* -------------------------------------------------------------------------- */

export function initials(name: string, email = '') {
  const source = name.trim() || email
  const parts = source.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/)
  if (!parts[0]) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_COLORS = [
  '#1a73e8',
  '#d93025',
  '#188038',
  '#e37400',
  '#9334e6',
  '#0d9488',
  '#c5221f',
  '#3f51b5',
  '#795548',
  '#b06000',
  '#00796b',
  '#c2185b',
  '#5f6368',
  '#7b1fa2',
  '#0b8043',
  '#e8710a',
]

export function avatarColor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

/** "Alex Rivera" → "Alex"; falls back to the mailbox part of the address. */
export function shortName(a: Address, meEmail?: string) {
  if (meEmail && a.email === meEmail) return 'me'
  if (a.name) return a.name.split(' ')[0]
  return a.email.split('@')[0]
}

export function displayName(a: Address, meEmail?: string) {
  if (meEmail && a.email === meEmail) return 'me'
  return a.name || a.email
}

export function parseAddress(raw: string): Address | null {
  const value = raw.trim().replace(/[,;]+$/, '')
  if (!value) return null
  const angled = value.match(/^(.*?)<([^>]+)>$/)
  if (angled) {
    const email = angled[2].trim()
    if (!isEmail(email)) return null
    return { name: angled[1].trim().replace(/^["']|["']$/g, ''), email }
  }
  if (!isEmail(value)) return null
  const local = value.split('@')[0]
  const name = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ')
  return { name, email: value }
}

export function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
}

/* -------------------------------------------------------------------------- */
/*  Files                                                                      */
/* -------------------------------------------------------------------------- */

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i += 1
  }
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}

const EXT_KIND: Record<string, AttachmentKind> = {
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  heic: 'image',
  pdf: 'pdf',
  doc: 'doc',
  docx: 'doc',
  txt: 'doc',
  md: 'doc',
  rtf: 'doc',
  key: 'slide',
  ppt: 'slide',
  pptx: 'slide',
  xls: 'sheet',
  xlsx: 'sheet',
  csv: 'sheet',
  zip: 'zip',
  gz: 'zip',
  tar: 'zip',
  rar: 'zip',
  ts: 'code',
  tsx: 'code',
  js: 'code',
  json: 'code',
  py: 'code',
  go: 'code',
  rs: 'code',
  sql: 'code',
  sh: 'code',
  mp3: 'audio',
  wav: 'audio',
  m4a: 'audio',
  mp4: 'video',
  mov: 'video',
  webm: 'video',
}

export function kindForFile(name: string): AttachmentKind {
  return EXT_KIND[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'other'
}

/* -------------------------------------------------------------------------- */
/*  Text                                                                       */
/* -------------------------------------------------------------------------- */

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

let stripEl: HTMLDivElement | null = null

/** Plain-text projection of an HTML body, used for snippets and search. */
export function htmlToText(html: string) {
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, ' ')
  stripEl ??= document.createElement('div')
  stripEl.innerHTML = html
  stripEl.querySelectorAll('.quoted, style, script').forEach((n) => n.remove())
  return (stripEl.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export function truncate(s: string, n: number) {
  return s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`
}

/** Convert a plain-text paste/typing into a minimal HTML body. */
export function textToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export function pluralize(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

/** Stable sort helper — descending by date string. */
export function byDateDesc(a: { date: string }, b: { date: string }) {
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0
}
