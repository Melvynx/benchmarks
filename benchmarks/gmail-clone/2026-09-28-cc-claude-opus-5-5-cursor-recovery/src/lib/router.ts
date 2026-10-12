import { useSyncExternalStore } from 'react'
import type { View } from '../types'
import { parseHash, viewToHash } from './mail'

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useHash() {
  return useSyncExternalStore(subscribe, () => window.location.hash, () => '')
}

export function useRoute() {
  const hash = useHash()
  return parseHash(hash)
}

export function navigate(hash: string, replace = false) {
  if (replace) {
    const url = new URL(window.location.href)
    url.hash = hash
    window.history.replaceState(null, '', url)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else if (window.location.hash !== hash) {
    window.location.hash = hash
  }
}

export function goView(v: View, threadId?: string, replace = false) {
  navigate(viewToHash(v, threadId), replace)
}
