import { ME } from './seed'
import { threadDate } from './store'
import type { Category, State, Thread } from './types'
import { matchThread, parseQuery } from './util'

export const FOLDERS: { id: string; name: string; icon: string; more?: boolean }[] = [
  { id: 'inbox', name: 'Inbox', icon: 'inbox' }, { id: 'starred', name: 'Starred', icon: 'star' },
  { id: 'snoozed', name: 'Snoozed', icon: 'clock' }, { id: 'sent', name: 'Sent', icon: 'send' },
  { id: 'drafts', name: 'Drafts', icon: 'file' }, { id: 'scheduled', name: 'Scheduled', icon: 'sched', more: true },
  { id: 'all', name: 'All Mail', icon: 'all', more: true }, { id: 'spam', name: 'Spam', icon: 'alert', more: true },
  { id: 'trash', name: 'Trash', icon: 'trash' },
]
export const CATS: { id: Category; name: string; icon: string }[] = [
  { id: 'primary', name: 'Primary', icon: 'inbox' }, { id: 'social', name: 'Social', icon: 'users' },
  { id: 'promotions', name: 'Promotions', icon: 'tag' }, { id: 'updates', name: 'Updates', icon: 'important' },
]
export const viewName = (view: string, s: State) =>
  view === 'search' ? 'Search results' : view.startsWith('label:') ? s.labels.find((l) => l.id === view.slice(6))?.name ?? 'Label' : FOLDERS.find((f) => f.id === view)?.name ?? 'Inbox'

export function threadsFor(view: string, s: State, q: string, tab: Category): Thread[] {
  const live = (t: Thread) => !t.trashed && !t.spam
  const snoozed = (t: Thread) => !!t.snoozedUntil
  let out: Thread[]
  switch (view) {
    case 'inbox': out = s.threads.filter((t) => t.inbox && live(t) && !snoozed(t) && (!s.settings.tabs || t.category === tab)); break
    case 'starred': out = s.threads.filter((t) => t.starred && live(t)); break
    case 'snoozed': return s.threads.filter((t) => snoozed(t) && live(t)).sort((a, b) => a.snoozedUntil! - b.snoozedUntil!)
    case 'sent': out = s.threads.filter((t) => live(t) && t.messages.some((m) => m.from.email === ME.email)); break
    case 'all': out = s.threads.filter(live); break
    case 'spam': out = s.threads.filter((t) => t.spam && !t.trashed); break
    case 'trash': out = s.threads.filter((t) => t.trashed); break
    case 'search': { const pq = parseQuery(q); out = s.threads.filter((t) => matchThread(t, pq, s)); break }
    default:
      if (view.startsWith('label:')) out = s.threads.filter((t) => t.labels.includes(view.slice(6)) && live(t))
      else out = []
  }
  return out.sort((a, b) => threadDate(b) - threadDate(a))
}
