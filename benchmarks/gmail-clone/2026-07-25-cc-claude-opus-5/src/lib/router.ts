import { useCallback, useEffect, useState } from 'react'
import type { Category, ViewKind } from './types'

export interface Route {
  kind: ViewKind
  labelId?: string
  category?: Category
  query?: string
  threadId?: string
}

const KINDS: ViewKind[] = [
  'inbox',
  'starred',
  'snoozed',
  'important',
  'sent',
  'scheduled',
  'drafts',
  'all',
  'spam',
  'trash',
  'label',
  'search',
]

const CATEGORIES: Category[] = ['primary', 'social', 'promotions', 'updates', 'forums']

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '')
  const [pathPart, queryPart] = raw.split('?')
  const params = new URLSearchParams(queryPart ?? '')
  const segs = pathPart.split('/').filter(Boolean)
  const kind = (KINDS.includes(segs[0] as ViewKind) ? segs[0] : 'inbox') as ViewKind

  const route: Route = { kind }
  if (kind === 'label') route.labelId = segs[1] ? decodeURIComponent(segs[1]) : undefined
  else if (kind === 'inbox' && segs[1] && CATEGORIES.includes(segs[1] as Category))
    route.category = segs[1] as Category

  const q = params.get('q')
  if (q) route.query = q
  const t = params.get('t')
  if (t) route.threadId = t
  return route
}

export function formatHash(r: Route): string {
  let path = `/${r.kind}`
  if (r.kind === 'label' && r.labelId) path += `/${encodeURIComponent(r.labelId)}`
  if (r.kind === 'inbox' && r.category && r.category !== 'primary') path += `/${r.category}`
  const params = new URLSearchParams()
  if (r.query) params.set('q', r.query)
  if (r.threadId) params.set('t', r.threadId)
  const qs = params.toString()
  return `#${path}${qs ? `?${qs}` : ''}`
}

export function useRoute(): [Route, (r: Route, replace?: boolean) => void] {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))

  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', on)
    if (!window.location.hash) window.history.replaceState(null, '', '#/inbox')
    return () => window.removeEventListener('hashchange', on)
  }, [])

  const navigate = useCallback((r: Route, replace = false) => {
    const next = formatHash(r)
    if (next === window.location.hash) return
    if (replace) window.history.replaceState(null, '', next)
    else window.history.pushState(null, '', next)
    setRoute(parseHash(next))
  }, [])

  return [route, navigate]
}

export const VIEW_TITLES: Record<ViewKind, string> = {
  inbox: 'Inbox',
  starred: 'Starred',
  snoozed: 'Snoozed',
  important: 'Important',
  sent: 'Sent',
  scheduled: 'Scheduled',
  drafts: 'Drafts',
  all: 'All Mail',
  spam: 'Spam',
  trash: 'Trash',
  label: 'Label',
  search: 'Search results',
}
