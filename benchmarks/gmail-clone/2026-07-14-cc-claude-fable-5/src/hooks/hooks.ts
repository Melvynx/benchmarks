import { useEffect, useMemo, useState } from 'react'
import { useMail } from '../store/store'
import { threadsForRoute } from '../lib/mail'
import type { Contact, Route, Thread } from '../types'
import { ME } from '../data/seed'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    setMatches(mql.matches)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}

/** Ticks every `intervalMs`; used to refresh relative dates and wake snoozed mail. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/** The thread list for the current route (inbox filtered by category tab). */
export function useVisibleThreads(): Thread[] {
  const threads = useMail((s) => s.threads)
  const route = useMail((s) => s.route)
  const tab = useMail((s) => s.categoryTab)
  const labels = useMail((s) => s.labels)
  const now = useNow()
  return useMemo(() => {
    let list = threadsForRoute(threads, route, labels, now)
    if (route.folder === 'inbox') list = list.filter((t) => t.category === tab)
    return list
  }, [threads, route, tab, labels, now])
}

export interface RankedContact extends Contact {
  count: number
}

/** Contacts derived from the mailbox, ranked by frequency, for autocomplete. */
export function useContacts(): RankedContact[] {
  const threads = useMail((s) => s.threads)
  return useMemo(() => {
    const map = new Map<string, RankedContact>()
    for (const t of threads) {
      for (const m of t.messages) {
        for (const contact of [m.from, ...m.to, ...(m.cc ?? [])]) {
          if (contact.email === ME.email || !contact.email.includes('@')) continue
          if (/no-?reply|notifications?@|automated@|receipts@|crew@|news@|hello@duo/i.test(contact.email)) continue
          const existing = map.get(contact.email)
          if (existing) existing.count += 1
          else map.set(contact.email, { ...contact, count: 1 })
        }
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count)
  }, [threads])
}

// ── Hash routing ───────────────────────────────────────────────────────────

function encodeRoute(route: Route): string {
  let base: string
  if (route.folder === 'label') base = `label:${route.labelId ?? ''}`
  else if (route.folder === 'search') base = `search:${encodeURIComponent(route.query ?? '')}`
  else base = route.folder
  return `#${base}${route.threadId ? `/${route.threadId}` : ''}`
}

function decodeRoute(hash: string): Route | null {
  const raw = hash.replace(/^#/, '')
  if (!raw) return null
  const [basePart, threadId] = raw.split('/')
  let route: Route
  if (basePart.startsWith('label:')) {
    route = { folder: 'label', labelId: basePart.slice(6) }
  } else if (basePart.startsWith('search:')) {
    route = { folder: 'search', query: decodeURIComponent(basePart.slice(7)) }
  } else if (['inbox', 'starred', 'snoozed', 'sent', 'drafts', 'all', 'spam', 'trash'].includes(basePart)) {
    route = { folder: basePart as Route['folder'] }
  } else {
    return null
  }
  if (threadId) route.threadId = threadId
  return route
}

function sameRoute(a: Route, b: Route): boolean {
  return (
    a.folder === b.folder &&
    a.labelId === b.labelId &&
    (a.query ?? '') === (b.query ?? '') &&
    a.threadId === b.threadId
  )
}

/** Two-way sync between the store route and location.hash (enables back button). */
export function useHashRouter() {
  const route = useMail((s) => s.route)

  // store → hash
  useEffect(() => {
    const target = encodeRoute(route)
    if (window.location.hash !== target) {
      window.location.hash = target
    }
  }, [route])

  // hash → store
  useEffect(() => {
    const apply = () => {
      const parsed = decodeRoute(window.location.hash)
      const current = useMail.getState().route
      if (!parsed) return
      if (sameRoute(parsed, current)) return
      if (parsed.threadId && parsed.threadId !== current.threadId) {
        useMail.setState({ route: parsed })
        useMail.getState().openThread(parsed.threadId)
      } else {
        useMail.setState({
          route: parsed,
          selected: [],
          cursor: -1,
          searchInput: parsed.folder === 'search' ? (parsed.query ?? '') : '',
        })
      }
    }
    apply()
    window.addEventListener('hashchange', apply)
    return () => window.removeEventListener('hashchange', apply)
  }, [])
}
