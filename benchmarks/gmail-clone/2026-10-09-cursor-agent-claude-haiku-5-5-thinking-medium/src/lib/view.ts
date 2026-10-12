import { groupThreads, isSearchActive, matchesFolder, matchesQuery, parseQuery, type ThreadGroup } from './mail'
import type { Data, Message } from '../types'
import type { UI } from './store'

export interface ViewResult {
  groups: ThreadGroup[]
  title: string
  isSearch: boolean
  isDraftsLike: boolean
}

/** Everything the list shows for the current folder/search/category */
export function computeView(data: Data, ui: Pick<UI, 'folder' | 'query' | 'category' | 'now'>, labelName?: string): ViewResult {
  const { folder, query, category, now } = ui
  const messages = Object.values(data.messages)
  const isDraftsLike = folder === 'drafts' || folder === 'scheduled'

  if (isSearchActive(query)) {
    const q = parseQuery(query)
    const matched = messages.filter((m: Message) => matchesQuery(m, q, now, data))
    const groups = groupThreads(matched, 'all')
    return { groups, title: `Results for "${query.trim()}"`, isSearch: true, isDraftsLike: false }
  }

  let inView = messages.filter((m) => matchesFolder(m, folder, now))
  if (folder === 'inbox' && category !== 'all') inView = inView.filter((m) => m.category === category)
  const title = folder.startsWith('label:') ? labelName ?? 'Label' : ''
  return { groups: groupThreads(inView, folder), title, isSearch: false, isDraftsLike }
}

export function groupMessageIds(groups: ThreadGroup[], keys: string[]): string[] {
  const set = new Set(keys)
  return groups.filter((g) => set.has(g.key)).flatMap((g) => g.messages.map((m) => m.id))
}

export type LabelState = 'all' | 'some' | 'none'

export function labelState(data: Data, ids: string[], labelId: string): LabelState {
  const list = ids.map((id) => data.messages[id]).filter(Boolean)
  if (!list.length) return 'none'
  const count = list.filter((m) => m.labels.includes(labelId)).length
  if (count === 0) return 'none'
  return count === list.length ? 'all' : 'some'
}

/* ---------- Time presets ---------- */

function atTime(d: Date, h: number, min = 0) {
  const r = new Date(d)
  r.setHours(h, min, 0, 0)
  return r
}

export function snoozePresets(now: number): { label: string; at: number; hint: string }[] {
  const n = new Date(now)
  const laterToday = now + 3 * 3_600_000
  const tomorrow = atTime(new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1), 8)
  const dayOfWeek = n.getDay()
  const toSat = ((6 - dayOfWeek + 7) % 7) || 7
  const weekend = atTime(new Date(n.getFullYear(), n.getMonth(), n.getDate() + toSat), 9)
  const toMon = ((1 - dayOfWeek + 7) % 7) || 7
  const nextWeek = atTime(new Date(n.getFullYear(), n.getMonth(), n.getDate() + toMon), 8)
  const fmt = (t: number) => new Date(t).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })
  return [
    { label: 'Later today', at: laterToday, hint: fmt(laterToday) },
    { label: 'Tomorrow', at: tomorrow.getTime(), hint: fmt(tomorrow.getTime()) },
    { label: 'This weekend', at: weekend.getTime(), hint: fmt(weekend.getTime()) },
    { label: 'Next week', at: nextWeek.getTime(), hint: fmt(nextWeek.getTime()) },
  ]
}

export function sendLaterPresets(now: number): { label: string; at: number; hint: string }[] {
  const n = new Date(now)
  const tomorrow = atTime(new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1), 8)
  const toMon = ((1 - n.getDay() + 7) % 7) || 7
  const monday = atTime(new Date(n.getFullYear(), n.getMonth(), n.getDate() + toMon), 9)
  const fmt = (t: number) => new Date(t).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  return [
    { label: 'Tomorrow morning', at: tomorrow.getTime(), hint: fmt(tomorrow.getTime()) },
    { label: 'Monday morning', at: monday.getTime(), hint: fmt(monday.getTime()) },
  ]
}

export function toLocalInputValue(ts: number) {
  const d = new Date(ts)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
