import { useEffect, useMemo, useState } from 'react'
import { useMail } from './store/mail'
import { useUI } from './store/ui'
import type { Category, FolderId, Thread, View } from './types'
import { inFolder, isSnoozed, lastDate, lastSentDate } from './lib/mail'
import { matchThread, parseQuery } from './lib/search'

export function useNow(interval = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(id)
  }, [interval])
  return now
}

export function useViewThreads(view: View): Thread[] {
  const threads = useMail((s) => s.threads)
  const labels = useMail((s) => s.labels)
  const categories = useMail((s) => s.settings.categories)
  const tab = useUI((s) => s.inboxTab)
  const now = useNow()
  return useMemo(() => {
    const all = Object.values(threads)
    let list: Thread[]
    let sortKey = lastDate
    if (view.kind === 'folder') {
      list = all.filter((t) => inFolder(t, view.folder, now, categories, tab))
      if (view.folder === 'sent') sortKey = lastSentDate
      if (view.folder === 'snoozed') sortKey = (t) => -(t.snoozeUntil ?? 0)
    } else if (view.kind === 'label') {
      list = all.filter((t) => t.labels.includes(view.labelId) && !t.trash && !t.spam)
    } else {
      const q = parseQuery(view.query)
      list = all.filter((t) => matchThread(t, q, labels, now))
    }
    return list.sort((a, b) => sortKey(b) - sortKey(a))
  }, [threads, labels, view, now, categories, tab])
}

export function useCounts() {
  const threads = useMail((s) => s.threads)
  const drafts = useMail((s) => s.drafts)
  const outbox = useMail((s) => s.outbox)
  const labels = useMail((s) => s.labels)
  const categories = useMail((s) => s.settings.categories)
  const now = useNow()
  return useMemo(() => {
    const all = Object.values(threads)
    const unreadIn = (f: FolderId) => all.filter((t) => t.unread && inFolder(t, f, now, false)).length
    const inboxUnread = all.filter((t) => t.unread && inFolder(t, 'inbox', now, categories, 'primary')).length
    const cat: Record<Category, number> = { primary: 0, promotions: 0, social: 0, updates: 0 }
    const catNew: Record<Category, { count: number; from: string[] }> = {
      primary: { count: 0, from: [] },
      promotions: { count: 0, from: [] },
      social: { count: 0, from: [] },
      updates: { count: 0, from: [] },
    }
    for (const t of all) {
      if (t.unread && inFolder(t, 'inbox', now, false)) {
        cat[t.category]++
        catNew[t.category].count++
        const n = t.messages[t.messages.length - 1].from.name
        if (!catNew[t.category].from.includes(n)) catNew[t.category].from.push(n)
      }
    }
    const byLabel: Record<string, number> = {}
    for (const l of labels) byLabel[l.id] = all.filter((t) => t.unread && t.labels.includes(l.id) && !t.trash && !t.spam).length
    return {
      inbox: inboxUnread,
      spam: unreadIn('spam'),
      snoozed: all.filter((t) => isSnoozed(t, now) && !t.trash).length,
      drafts: Object.keys(drafts).length,
      scheduled: Object.values(outbox).filter((d) => d.scheduled).length,
      important: unreadIn('important'),
      byLabel,
      catNew,
    }
  }, [threads, drafts, outbox, labels, categories, now])
}
