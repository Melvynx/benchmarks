import { useCallback, useEffect, useState } from 'react'
import type { Category, ViewId } from '@/lib/types'

export interface Route {
  view: ViewId
  labelId?: string
  search?: string
  threadId?: string
  /** Settings tab id; the settings screen replaces the list when set. */
  settingsTab?: string
  category?: Category
}

const VIEWS: ViewId[] = [
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
]

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '')
  const [pathPart, queryPart] = raw.split('?')
  const params = new URLSearchParams(queryPart ?? '')
  const segments = pathPart.split('/').filter(Boolean).map(decodeURIComponent)

  const route: Route = { view: 'inbox' }
  const head = segments[0]

  if (head === 'settings') {
    route.settingsTab = segments[1] || 'general'
    return route
  }
  if (head === 'label' && segments[1]) {
    route.labelId = segments[1]
    route.view = 'all'
    route.threadId = segments[2]
  } else if (head === 'search') {
    route.view = 'all'
    route.search = params.get('q') ?? ''
    route.threadId = segments[1]
  } else if (head && (VIEWS as string[]).includes(head)) {
    route.view = head as ViewId
    route.threadId = segments[1]
  }

  const cat = params.get('cat')
  if (cat) route.category = cat as Category
  return route
}

export function serializeRoute(r: Route): string {
  if (r.settingsTab) return `#/settings/${r.settingsTab}`
  const params = new URLSearchParams()
  let path: string
  if (r.search !== undefined) {
    path = 'search'
    params.set('q', r.search)
  } else if (r.labelId) {
    path = `label/${encodeURIComponent(r.labelId)}`
  } else {
    path = r.view
  }
  if (r.threadId) path += `/${encodeURIComponent(r.threadId)}`
  if (r.category && r.view === 'inbox' && !r.search && !r.labelId) params.set('cat', r.category)
  const q = params.toString()
  return `#/${path}${q ? `?${q}` : ''}`
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    if (!window.location.hash) window.location.replace('#/inbox')
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((next: Route, replace = false) => {
    const hash = serializeRoute(next)
    if (hash === window.location.hash) {
      setRoute(next)
      return
    }
    if (replace) window.history.replaceState(null, '', hash)
    else window.history.pushState(null, '', hash)
    setRoute(parseHash(hash))
  }, [])

  const back = useCallback(() => window.history.back(), [])

  return { route, navigate, back }
}
