import type { Attachment, AttachmentKind } from './types'

let n = 0
export function uid(prefix = 'id'): string {
  n += 1
  return `${prefix}_${Date.now().toString(36)}_${n.toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function kindFromName(name: string): AttachmentKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (['doc', 'docx', 'pages', 'txt', 'md'].includes(ext)) return 'doc'
  if (['xls', 'xlsx', 'csv', 'numbers'].includes(ext)) return 'sheet'
  if (['ppt', 'pptx', 'key'].includes(ext)) return 'slide'
  if (['zip', 'tar', 'gz'].includes(ext)) return 'zip'
  if (['mp4', 'mov', 'webm'].includes(ext)) return 'video'
  if (['js', 'ts', 'tsx', 'json', 'py', 'go', 'rs'].includes(ext)) return 'code'
  return 'doc'
}

export function makeAttachment(name: string, size: number, preview?: string): Attachment {
  return { id: uid('att'), name, kind: kindFromName(name), size, preview }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10_240 ? 1 : 0)} KB`
  return `${(n / (1024 * 1024)).toFixed(n < 10_485_760 ? 1 : 0)} MB`
}

export function formatListDate(ms: number, now = Date.now()): string {
  const d = new Date(ms)
  const n = new Date(now)
  const sameDay = d.toDateString() === n.toDateString()
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  const yesterday = new Date(n)
  yesterday.setDate(n.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  if (d.getFullYear() === n.getFullYear()) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatFullDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatRelative(ms: number, now = Date.now()): string {
  const diff = ms - now
  const abs = Math.abs(diff)
  const mins = Math.round(abs / 60_000)
  const hours = Math.round(abs / 3_600_000)
  const days = Math.round(abs / 86_400_000)
  const ahead = diff > 0
  if (mins < 1) return ahead ? 'in a moment' : 'just now'
  if (mins < 60) return ahead ? `in ${mins} min` : `${mins} min ago`
  if (hours < 24) return ahead ? `in ${hours} hr` : `${hours} hr ago`
  return ahead ? `in ${days} day${days === 1 ? '' : 's'}` : `${days} day${days === 1 ? '' : 's'} ago`
}

export function snippetFromHtml(html: string, max = 140): string {
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&rsquo;/g, '’')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&mdash;/g, '—')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= max) return text
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…'
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function quoteHtml(from: string, date: number, body: string): string {
  return `<p></p><blockquote><p>On ${formatFullDate(date)}, ${escapeHtml(from)} wrote:</p>${body}</blockquote>`
}

export function at(daysAgo: number, hour: number, minute: number, now = Date.now()): number {
  const d = new Date(now)
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, minute, Math.floor(Math.random() * 40), 0)
  return d.getTime()
}

export function hoursFromNow(h: number, now = Date.now()): number {
  return now + h * 3_600_000
}
